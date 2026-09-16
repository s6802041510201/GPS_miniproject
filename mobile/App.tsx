import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ApiError, AttendanceRecord, ClassSession, Classroom, Course, DashboardResponse, SessionInput, User, checkIn, controlTeacherSession, createTeacherSession, deleteClassroom, deleteTeacherSession, fetchAttendance, fetchClassrooms, fetchCourses, fetchDashboard, fetchCurrentUser, fetchTeacherCourses, fetchTeacherSessions, login as loginApi, logout as logoutApi, persistAuthToken, removePersistedAuthToken, restoreAuthToken, saveClassroom, updateTeacherSession } from '@/services/api';
import { calculateDistanceInMeters } from '@/utils/distance';
import { AttendanceHistoryScreen } from '@/screens/AttendanceHistoryScreen';
import { ClassroomManagementScreen } from '@/screens/ClassroomManagementScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { StudentHomeScreen } from '@/screens/StudentHomeScreen';
import { TeacherDashboardScreen } from '@/screens/TeacherDashboardScreen';
import { TeacherStudentsScreen } from '@/screens/TeacherStudentsScreen';
import { TeacherStatisticsScreen } from '@/screens/TeacherStatisticsScreen';
import { TeacherSettingsScreen } from '@/screens/TeacherSettingsScreen';
import { TeacherSessionsScreen } from '@/screens/TeacherSessionsScreen';
import { SplashScreen } from '@/screens/SplashScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { StudentLocationScreen as CourseDetailScreen } from '@/screens/StudentLocationScreen';

type AppScreen = 'studentHome' | 'history' | 'location' | 'profile' | 'teacherDashboard' | 'teacherStudents' | 'teacherStatistics' | 'teacherSettings' | 'teacherSessions' | 'classrooms';
type CheckInMessage = { kind: 'success' | 'error' | 'info'; text: string };

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export default function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<AppScreen>('studentHome');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teacherSessions, setTeacherSessions] = useState<ClassSession[]>([]);
  const [selectedTeacherCourseId, setSelectedTeacherCourseId] = useState<number | null>(null);
  const [checkInMessage, setCheckInMessage] = useState<CheckInMessage | null>(null);
  const [checkingCourseId, setCheckingCourseId] = useState<number | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [studentLocation, setStudentLocation] = useState<{ latitude: number; longitude: number }>();

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const minimumSplash = new Promise((resolve) => setTimeout(resolve, 700));
      const token = await restoreAuthToken();

      if (token) {
        try {
          const currentUser = await fetchCurrentUser();
          if (active) {
            setUser(currentUser);
            setScreen(currentUser.role === 'student' ? 'studentHome' : 'teacherDashboard');
            if (currentUser.role === 'student') await loadStudentData(currentUser.id);
            else await loadTeacherData(currentUser.id);
          }
        } catch (error) {
          if (error instanceof ApiError && (error.code === 'AUTH_INVALID' || error.code === 'AUTH_REQUIRED')) {
            await removePersistedAuthToken();
          } else if (active) {
            setAuthError('Unable to restore the previous session. Check the API connection and try again.');
          }
        }
      }

      await minimumSplash;
      if (active) setIsBooting(false);
    }

    void restoreSession();
    return () => { active = false; };
  }, []);

  async function loadStudentData(studentId: number, showLoading = true) {
    if (showLoading) setDataLoading(true);
    setDataError(null);
    try {
      const [courseData, attendanceData] = await Promise.all([
        fetchCourses(studentId),
        fetchAttendance(studentId),
      ]);
      setCourses(courseData);
      setAttendance(attendanceData);
    } catch (error) {
      if (error instanceof ApiError && (error.code === 'AUTH_INVALID' || error.code === 'AUTH_REQUIRED')) {
        await removePersistedAuthToken();
        setUser(null);
      }
      setDataError(getErrorMessage(error));
    } finally {
      if (showLoading) setDataLoading(false);
    }
  }

  useEffect(() => {
    if (!user || user.role !== 'student') return undefined;

    // Keep the student view synchronized when a teacher opens or closes a
    // session from another device. Existing course data remains visible while
    // the background refresh is in progress.
    const refreshTimer = setInterval(() => {
      void loadStudentData(user.id, false);
    }, 5000);

    return () => clearInterval(refreshTimer);
  }, [user]);

  async function loadTeacherData(teacherId: number) {
    setDataLoading(true);
    setDataError(null);
    try {
      const [courseData, classroomData, sessionData] = await Promise.all([
        fetchTeacherCourses(teacherId),
        fetchClassrooms(),
        fetchTeacherSessions(teacherId),
      ]);
      setCourses(courseData);
      setClassrooms(classroomData);
      setTeacherSessions(sessionData);
      const nextSelectedCourseId = selectedTeacherCourseId && courseData.some((course) => course.id === selectedTeacherCourseId)
        ? selectedTeacherCourseId
        : courseData[0]?.id ?? null;
      setSelectedTeacherCourseId(nextSelectedCourseId);
      if (nextSelectedCourseId) {
        setDashboard(await fetchDashboard(nextSelectedCourseId));
      } else {
        setDashboard(null);
      }
    } catch (error) {
      if (error instanceof ApiError && (error.code === 'AUTH_INVALID' || error.code === 'AUTH_REQUIRED')) {
        await removePersistedAuthToken();
        setUser(null);
      }
      setDataError(getErrorMessage(error));
    } finally {
      setDataLoading(false);
    }
  }

  async function handleLogin(userCode: string, password: string) {
    setAuthLoading(true);
    setAuthError(null);
    await removePersistedAuthToken();
    try {
      const loginResponse = await loginApi(userCode, password);
      await persistAuthToken(loginResponse.token);
      const currentUser = loginResponse.user;
      setUser(currentUser);
      setScreen(currentUser.role === 'student' ? 'studentHome' : 'teacherDashboard');
      if (currentUser.role === 'student') {
        await loadStudentData(currentUser.id);
      } else {
        await loadTeacherData(currentUser.id);
      }
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    void logoutApi().catch(() => undefined);
    void removePersistedAuthToken();
    setUser(null);
    setCourses([]);
    setAttendance([]);
    setDashboard(null);
    setClassrooms([]);
    setTeacherSessions([]);
    setSelectedTeacherCourseId(null);
    setCheckInMessage(null);
    setDataError(null);
    setAuthError(null);
    setSelectedCourse(null);
    setStudentLocation(undefined);
  }

  async function handleCheckIn(course: Course) {
    if (!user || user.role !== 'student') return;

    setCheckingCourseId(course.id);
    setCheckInMessage({ kind: 'info', text: 'Checking permission and reading your location...' });

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        throw new Error('Location permission was denied. Please allow location access and try again.');
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        throw new Error('Location services are turned off. Please enable GPS and try again.');
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude, accuracy } = position.coords;
      setStudentLocation({ latitude, longitude });
      const distance = calculateDistanceInMeters(latitude, longitude, course.latitude, course.longitude);

      if (accuracy != null && accuracy > 100) {
        throw new Error('GPS accuracy is too low. Move to an open area and try again.');
      }

      setCheckInMessage({
        kind: 'info',
        text: `Location captured. Distance from classroom: ${Math.round(distance)} m. Sending secure check-in...`,
      });

      const result = await checkIn({
        studentId: user.id,
        courseId: course.id,
        classroomId: course.classroomId,
        sessionId: course.sessionId,
        latitude,
        longitude,
        accuracy,
      });

      setCheckInMessage({
        kind: 'success',
        text: `Check-in successful. Distance: ${Math.round(result.distance)} m.`,
      });
      await loadStudentData(user.id);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'OUTSIDE_GEOFENCE') {
        const distance = Number(error.details.distance);
        const radius = Number(error.details.radius);
        setCheckInMessage({
          kind: 'error',
          text: `Check-in rejected. You are outside the classroom area (${Math.round(distance)} m away; allowed radius ${Math.round(radius)} m).`,
        });
      } else if (error instanceof ApiError && error.code === 'DUPLICATE_CHECK_IN') {
        setCheckInMessage({ kind: 'error', text: 'You have already checked in for this session.' });
      } else if (error instanceof ApiError && error.code === 'SESSION_NOT_OPEN') {
        setCheckInMessage({ kind: 'info', text: error.message });
      } else if (error instanceof ApiError && error.code === 'SESSION_CLOSED_BY_TEACHER') {
        setCheckInMessage({ kind: 'error', text: error.message });
      } else if (error instanceof ApiError && error.code === 'SESSION_CANCELLED') {
        setCheckInMessage({ kind: 'error', text: error.message });
      } else if (error instanceof ApiError && error.code === 'SESSION_CLOSED') {
        setCheckInMessage({ kind: 'error', text: error.message });
      } else if (error instanceof ApiError && error.code === 'SESSION_NOT_TODAY') {
        setCheckInMessage({ kind: 'info', text: error.message });
      } else if (error instanceof ApiError && error.code === 'SESSION_NOT_SCHEDULED') {
        setCheckInMessage({ kind: 'info', text: error.message });
      } else {
        setCheckInMessage({ kind: 'error', text: getErrorMessage(error) });
      }
    } finally {
      setCheckingCourseId(null);
    }
  }

  async function handleTeacherRefresh() {
    if (user?.role === 'teacher') await loadTeacherData(user.id);
  }

  async function handleTeacherCourseSelect(courseId: number) {
    setSelectedTeacherCourseId(courseId);
    setDataLoading(true);
    setDataError(null);
    try {
      setDashboard(await fetchDashboard(courseId));
    } catch (error) {
      setDataError(getErrorMessage(error));
    } finally {
      setDataLoading(false);
    }
  }

  async function handleTeacherSessionsRefresh() {
    if (user?.role !== 'teacher') return;
    setDataLoading(true);
    setDataError(null);
    try {
      setTeacherSessions(await fetchTeacherSessions(user.id));
    } catch (error) {
      setDataError(getErrorMessage(error));
    } finally {
      setDataLoading(false);
    }
  }

  async function handleCreateTeacherSession(input: SessionInput) {
    if (user?.role !== 'teacher') return;
    setDataLoading(true);
    setDataError(null);
    try {
      await createTeacherSession(input);
      await loadTeacherData(user.id);
    } catch (error) {
      setDataError(getErrorMessage(error));
      throw error;
    } finally {
      setDataLoading(false);
    }
  }

  async function handleUpdateTeacherSession(id: number, input: SessionInput) {
    if (user?.role !== 'teacher') return;
    setDataLoading(true);
    setDataError(null);
    try {
      await updateTeacherSession(id, input);
      await loadTeacherData(user.id);
    } catch (error) {
      setDataError(getErrorMessage(error));
      throw error;
    } finally {
      setDataLoading(false);
    }
  }

  async function handleControlTeacherSession(id: number, action: 'open' | 'close' | 'cancel') {
    if (user?.role !== 'teacher') return;
    setDataLoading(true);
    setDataError(null);
    try {
      await controlTeacherSession(id, action);
      await loadTeacherData(user.id);
    } catch (error) {
      setDataError(getErrorMessage(error));
      throw error;
    } finally {
      setDataLoading(false);
    }
  }

  async function handleDeleteTeacherSession(id: number) {
    if (user?.role !== 'teacher') return;
    setDataLoading(true);
    setDataError(null);
    try {
      await deleteTeacherSession(id);
      await loadTeacherData(user.id);
    } catch (error) {
      setDataError(getErrorMessage(error));
      throw error;
    } finally {
      setDataLoading(false);
    }
  }

  async function handleClassroomRefresh() {
    setDataLoading(true);
    setDataError(null);
    try {
      setClassrooms(await fetchClassrooms());
    } catch (error) {
      setDataError(getErrorMessage(error));
    } finally {
      setDataLoading(false);
    }
  }

  async function handleSaveClassroom(classroom: Omit<Classroom, 'id'>, id?: number) {
    setDataLoading(true);
    setDataError(null);
    try {
      await saveClassroom(classroom, id);
      // Reload the complete teacher data graph so Room Settings changes are
      // immediately reflected in course cards, dashboard, analytics, and maps.
      if (user?.role === 'teacher') {
        await loadTeacherData(user.id);
      } else {
        setClassrooms(await fetchClassrooms());
      }
    } catch (error) {
      setDataError(getErrorMessage(error));
      throw error;
    } finally {
      setDataLoading(false);
    }
  }

  async function handleDeleteClassroom(id: number) {
    setDataLoading(true);
    setDataError(null);
    try {
      await deleteClassroom(id);
      if (user?.role === 'teacher') {
        await loadTeacherData(user.id);
      } else {
        setClassrooms(await fetchClassrooms());
      }
    } catch (error) {
      setDataError(getErrorMessage(error));
      throw error;
    } finally {
      setDataLoading(false);
    }
  }

  if (!user) {
    if (isBooting) {
      return <SplashScreen />;
    }
    return (
      <>
        <LoginScreen errorMessage={authError} isLoading={authLoading} onLogin={handleLogin} />
        <StatusBar style="dark" />
      </>
    );
  }

  if (user.role === 'student') {
    if (screen === 'profile') {
      return (
        <>
          <ProfileScreen onBack={() => setScreen('studentHome')} onLogout={handleLogout} onNavigate={(key) => setScreen(key === 'home' ? 'studentHome' : key)} user={user} />
          <StatusBar style="dark" />
        </>
      );
    }

    if (screen === 'location' && selectedCourse) {
      return (
        <>
          <CourseDetailScreen
            course={selectedCourse}
            isChecking={checkingCourseId === selectedCourse.id}
            onBack={() => setScreen('studentHome')}
            onCheckIn={() => void handleCheckIn(selectedCourse)}
            studentLocation={studentLocation}
            user={user}
          />
          <StatusBar style="dark" />
        </>
      );
    }

    if (screen === 'history') {
      return (
        <>
          <AttendanceHistoryScreen
            errorMessage={dataError}
            isLoading={dataLoading}
            onBack={() => setScreen('studentHome')}
            onRefresh={() => void loadStudentData(user.id)}
            onNavigate={(key) => setScreen(key === 'home' ? 'studentHome' : key)}
            records={attendance}
            user={user}
          />
          <StatusBar style="dark" />
        </>
      );
    }

    return (
      <>
        <StudentHomeScreen
          checkingCourseId={checkingCourseId}
          checkInMessage={checkInMessage}
          courses={courses}
          errorMessage={dataError}
          isLoading={dataLoading}
          onCheckIn={(course) => void handleCheckIn(course)}
          onHistory={() => setScreen('history')}
          onLocation={(course) => { setSelectedCourse(course); setScreen('location'); }}
          onNavigate={(key) => setScreen(key === 'home' ? 'studentHome' : key)}
          onProfile={() => setScreen('profile')}
          onLogout={handleLogout}
          onRefresh={() => void loadStudentData(user.id)}
          user={user}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  if (screen === 'classrooms') {
    return (
      <>
        <ClassroomManagementScreen
          classrooms={classrooms}
          errorMessage={dataError}
          isLoading={dataLoading}
          onBack={() => setScreen('teacherDashboard')}
          onRefresh={() => void handleClassroomRefresh()}
          onNavigate={(key) => setScreen(key === 'dashboard' ? 'teacherDashboard' : key === 'students' ? 'teacherStudents' : key === 'statistics' ? 'teacherStatistics' : key === 'settings' ? 'teacherSettings' : key === 'sessions' ? 'teacherSessions' : 'classrooms')}
          onSave={(classroom, id) => handleSaveClassroom(classroom, id)}
          onDelete={(id) => handleDeleteClassroom(id)}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  const teacherNavigation = (key: 'dashboard' | 'students' | 'classrooms' | 'statistics' | 'settings' | 'sessions') => {
    setScreen(key === 'dashboard' ? 'teacherDashboard' : key === 'students' ? 'teacherStudents' : key === 'classrooms' ? 'classrooms' : key === 'statistics' ? 'teacherStatistics' : key === 'sessions' ? 'teacherSessions' : 'teacherSettings');
  };

  const selectedTeacherCourse = courses.find((course) => course.id === selectedTeacherCourseId) ?? courses[0] ?? null;

  if (screen === 'teacherStudents') {
    return <><TeacherStudentsScreen course={selectedTeacherCourse} dashboard={dashboard} errorMessage={dataError} isLoading={dataLoading} onNavigate={teacherNavigation} onRefresh={() => void handleTeacherRefresh()} /><StatusBar style="dark" /></>;
  }

  if (screen === 'teacherStatistics') {
    return <><TeacherStatisticsScreen course={selectedTeacherCourse} dashboard={dashboard} errorMessage={dataError} isLoading={dataLoading} onNavigate={teacherNavigation} onRefresh={() => void handleTeacherRefresh()} /><StatusBar style="dark" /></>;
  }

  if (screen === 'teacherSessions') {
    return <><TeacherSessionsScreen classrooms={classrooms} courses={courses} errorMessage={dataError} isLoading={dataLoading} onControl={handleControlTeacherSession} onDelete={handleDeleteTeacherSession} onNavigate={teacherNavigation} onRefresh={() => void handleTeacherSessionsRefresh()} onSave={handleCreateTeacherSession} onUpdate={handleUpdateTeacherSession} sessions={teacherSessions} /><StatusBar style="dark" /></>;
  }

  if (screen === 'teacherSettings') {
    return <><TeacherSettingsScreen onLogout={handleLogout} onNavigate={teacherNavigation} user={user} /><StatusBar style="dark" /></>;
  }

  return (
    <>
      <TeacherDashboardScreen
        course={selectedTeacherCourse}
        courses={courses}
        dashboard={dashboard}
        errorMessage={dataError}
        isLoading={dataLoading}
        onClassrooms={() => setScreen('classrooms')}
        onLogout={handleLogout}
        onNavigate={teacherNavigation}
        onCourseSelect={(courseId) => void handleTeacherCourseSelect(courseId)}
        onRefresh={() => void handleTeacherRefresh()}
        selectedCourseId={selectedTeacherCourse?.id ?? null}
        user={user}
      />
      <StatusBar style="dark" />
    </>
  );
}
