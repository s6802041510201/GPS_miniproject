import { API_BASE_URL } from '../constants/config';

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
  sessionStatus?: 'not_scheduled' | 'not_today' | 'upcoming' | 'open' | 'late' | 'closed';
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

export type AttendanceRecord = {
  id: number;
  courseCode: string;
  courseName: string;
  roomName: string;
  distance: number;
  accuracy: number | null;
  checkInTime: string;
  sessionDate: string;
  status: 'present' | 'late' | 'absent';
};

export type DashboardStudent = {
  userCode: string;
  name: string;
  checkInTime: string | null;
  distance: number | null;
  status: 'present' | 'late' | null;
};

export type DashboardResponse = {
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
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
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

    throw new ApiError('Unable to connect to the API server.', 0, 'NETWORK_ERROR');
  }
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, { signal });

    if (!response.ok) {
      throw new Error('The API server returned an error.');
    }

    return (await response.json()) as HealthResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }

    throw new Error('Unable to connect to the API server.');
  }
}

export async function login(userCode: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userCode, password }),
  });
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

export async function fetchAttendance(studentId: number): Promise<AttendanceRecord[]> {
  const response = await request<{ records: AttendanceRecord[] }>(
    `/api/attendance/student/${studentId}`,
  );
  return response.records;
}

export async function checkIn(payload: {
  studentId: number;
  courseId: number;
  classroomId: number;
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

export async function fetchDashboard(courseId: number): Promise<DashboardResponse> {
  return request<DashboardResponse>(`/api/dashboard?courseId=${courseId}`);
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
