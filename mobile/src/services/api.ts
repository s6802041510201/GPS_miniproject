import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../constants/config';

const AUTH_TOKEN_KEY = 'geo_attendance_access_token';
const REQUEST_TIMEOUT_MS = 15_000;

export type User = {
  id: number;
  userCode: string;
  name: string;
  email: string;
  role: 'student' | 'teacher';
};

export type LoginResponse = {
  user: User;
  token: string;
  expiresAt: string;
};

export type HealthResponse = {
  status: 'ok' | 'error';
  service: string;
  database: 'connected' | 'disconnected';
  timestamp?: string;
  message?: string;
};

export type Course = {
  id: number;
  courseCode: string;
  courseName: string;
  schedule: string;
  classroomId: number;
  roomName: string;
  buildingCode?: string | null;
  buildingName?: string | null;
  roomNumber?: string | null;
  dayOfWeek?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  isToday?: boolean;
  sessionStatus?: 'not_scheduled' | 'not_today' | 'upcoming' | 'scheduled' | 'open' | 'late' | 'closed' | 'closed_by_teacher' | 'cancelled';
  sessionControlStatus?: 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'CANCELLED' | null;
  sessionId?: number | null;
  sessionDate?: string | null;
  classStartTime?: string | null;
  classEndTime?: string | null;
  checkInAllowed?: boolean;
  onTimeAllowed?: boolean;
  checkInOpenTime?: string | null;
  onTimeUntil?: string | null;
  checkInCloseTime?: string | null;
  latitude: number;
  longitude: number;
  radius: number;
  checkInTime: string | null;
  status: 'present' | 'late' | null;
};

export type ClassSession = {
  id: number;
  courseId: number;
  teacherId: number;
  classroomId: number;
  courseCode: string;
  courseName: string;
  roomName: string;
  buildingCode?: string | null;
  sessionDate: string;
  classStartTime: string;
  classEndTime: string;
  checkinOpenTime: string;
  checkinCloseTime: string;
  gpsRadius: number;
  status: 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'CANCELLED';
  sessionStatus: 'not_today' | 'upcoming' | 'scheduled' | 'open' | 'closed' | 'closed_by_teacher' | 'cancelled';
  checkInAllowed: boolean;
  openedAt: string | null;
  closedAt: string | null;
  editableUntil?: string | null;
  canEdit?: boolean;
};

export type SessionInput = {
  courseId: number;
  classroomId: number;
  sessionDate: string;
  classStartTime: string;
  classEndTime: string;
  checkinOpenTime: string;
  checkinCloseTime: string;
  gpsRadius: number;
};

export type SessionAttendanceStudent = {
  studentId: number;
  userCode: string;
  name: string;
  checkInTime: string | null;
  distance: number | null;
  accuracy: number | null;
  status: 'present' | 'late' | null;
  attendanceSource?: 'gps' | 'manual' | null;
  notes?: string | null;
};

export type SessionAttendanceResponse = {
  session: ClassSession;
  summary: {
    totalStudents: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    attendanceRate: number;
  };
  students: SessionAttendanceStudent[];
};

export type AttendanceRecord = {
  id: number;
  courseCode: string;
  courseName: string;
  roomName: string;
  distance: number | null;
  accuracy: number | null;
  checkInTime: string | null;
  sessionDate: string;
  status: 'present' | 'late' | 'absent' | 'cancelled';
};

export type DashboardStudent = {
  userCode: string;
  name: string;
  checkInTime: string | null;
  distance: number | null;
  status: 'present' | 'late' | null;
  attendanceSource?: 'gps' | 'manual' | null;
};

export type DashboardResponse = {
  date?: string;
  summary: {
    totalStudents: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    attendanceRate: number;
  };
  students: DashboardStudent[];
};

export type Classroom = {
  id: number;
  roomName: string;
  latitude: number;
  longitude: number;
  radius: number;
  buildingCode?: string | null;
  buildingName?: string | null;
  roomNumber?: string | null;
  capacity?: number;
};

let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
}

export function clearAuthToken() {
  authToken = null;
}

export async function restoreAuthToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    authToken = token;
    return token;
  } catch {
    authToken = null;
    return null;
  }
}

export async function persistAuthToken(token: string) {
  authToken = token;
  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  } catch {
    // Keep the in-memory token available for the current session. Native builds
    // normally support SecureStore; the fallback keeps web development usable.
  }
}

export async function removePersistedAuthToken() {
  authToken = null;
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  } catch {
    // There is no persisted token to remove on unsupported platforms.
  }
}

export class ApiError extends Error {
  code: string;
  status: number;
  details: Record<string, unknown>;

  constructor(message: string, status: number, code = 'API_ERROR', details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options.headers,
      },
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      throw new ApiError(
        typeof body.message === 'string' ? body.message : 'The server returned an error.',
        response.status,
        typeof body.code === 'string' ? body.code : 'API_ERROR',
        body,
      );
    }

    return body as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('The API request timed out. Check the network and try again.', 0, 'NETWORK_TIMEOUT');
    }

    throw new ApiError('Unable to connect to the API server.', 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, { signal: signal ?? controller.signal });

    if (!response.ok) {
      throw new Error('The API server returned an error.');
    }

    return (await response.json()) as HealthResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }

    throw new Error('Unable to connect to the API server.');
  } finally {
    clearTimeout(timeout);
  }
}

export async function login(userCode: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userCode, password }),
  });
}

export async function registerStudent(input: { userCode: string; name: string; email: string; password: string }): Promise<LoginResponse> {
  return request<LoginResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(input) });
}

export async function fetchCurrentUser(): Promise<User> {
  const response = await request<{ user: User }>('/api/users/me');
  return response.user;
}

export async function logout(): Promise<void> {
  await request<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
}

export async function fetchCourses(studentId: number): Promise<Course[]> {
  const response = await request<{ courses: Course[] }>(`/api/courses?studentId=${studentId}`);
  return response.courses;
}

export async function fetchTeacherCourses(teacherId: number): Promise<Course[]> {
  const response = await request<{ courses: Course[] }>(`/api/teacher/courses?teacherId=${teacherId}`);
  return response.courses;
}

export async function createTeacherCourse(input: { courseCode: string; courseName: string; classroomId: number }): Promise<number> {
  const response = await request<{ courseId: number }>('/api/teacher/courses', { method: 'POST', body: JSON.stringify(input) });
  return response.courseId;
}

export async function fetchTeacherSessions(teacherId: number): Promise<ClassSession[]> {
  const response = await request<{ sessions: ClassSession[] }>(`/api/teacher/sessions?teacherId=${teacherId}`);
  return response.sessions;
}

export async function fetchTeacherSessionAttendance(id: number): Promise<SessionAttendanceResponse> {
  return request<SessionAttendanceResponse>(`/api/teacher/sessions/${id}/attendance`);
}

export async function correctTeacherAttendance(sessionId: number, studentId: number, status: 'present' | 'late', notes?: string) {
  return request<{ attendance: { id: number; status: string; attendanceSource: string; notes: string }; student: { userCode: string; name: string } }>(
    `/api/teacher/sessions/${sessionId}/attendance/${studentId}`,
    { method: 'PATCH', body: JSON.stringify({ status, notes }) },
  );
}

export async function createTeacherSession(input: SessionInput): Promise<ClassSession> {
  const response = await request<{ session: ClassSession }>('/api/teacher/sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.session;
}

export async function updateTeacherSession(id: number, input: SessionInput): Promise<ClassSession> {
  const response = await request<{ session: ClassSession }>(`/api/teacher/sessions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return response.session;
}

export async function controlTeacherSession(id: number, action: 'open' | 'close' | 'cancel'): Promise<ClassSession> {
  const response = await request<{ session: ClassSession }>(`/api/teacher/sessions/${id}/${action}`, {
    method: 'POST',
  });
  return response.session;
}

export async function deleteTeacherSession(id: number): Promise<void> {
  await request<{ deletedSessionId: number }>(`/api/teacher/sessions/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchAttendance(studentId: number, date?: string | null): Promise<AttendanceRecord[]> {
  const response = await request<{ records: AttendanceRecord[] }>(
    `/api/attendance/student/${studentId}${date ? `?date=${encodeURIComponent(date)}` : ''}`,
  );
  return response.records;
}

export async function checkIn(payload: {
  studentId: number;
  courseId: number;
  classroomId: number;
  sessionId?: number | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
}): Promise<{ id: number; distance: number; radius: number; checkInTime: string; status: string }> {
  const response = await request<{ attendance: { id: number; distance: number; radius: number; checkInTime: string; status: string } }>(
    '/api/attendance/check-in',
    { method: 'POST', body: JSON.stringify(payload) },
  );
  return response.attendance;
}

export async function fetchDashboard(courseId: number, date?: string | null): Promise<DashboardResponse> {
  return request<DashboardResponse>(`/api/dashboard?courseId=${courseId}${date ? `&date=${encodeURIComponent(date)}` : ''}`);
}

export async function fetchClassrooms(): Promise<Classroom[]> {
  const response = await request<{ classrooms: Classroom[] }>('/api/classrooms');
  return response.classrooms;
}

export async function saveClassroom(
  classroom: Omit<Classroom, 'id'>,
  id?: number,
): Promise<Classroom> {
  const response = await request<{ classroom: Classroom }>(
    id ? `/api/classrooms/${id}` : '/api/classrooms',
    {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(classroom),
    },
  );
  return response.classroom;
}

export async function deleteClassroom(id: number): Promise<void> {
  await request<{ deletedClassroomId: number }>(`/api/classrooms/${id}`, {
    method: 'DELETE',
  });
}
