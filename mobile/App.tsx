import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ApiError, AttendanceRecord, Classroom, Course, DashboardResponse, User, checkIn, clearAuthToken, fetchAttendance, fetchClassrooms, fetchCourses, fetchDashboard, fetchTeacherCourses, login as loginApi, logout as logoutApi, saveClassroom, setAuthToken } from '@/services/api';
import { calculateDistanceInMeters } from '@/utils/distance';
import { AttendanceHistoryScreen } from '@/screens/AttendanceHistoryScreen';
import { ClassroomManagementScreen } from '@/screens/ClassroomManagementScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { StudentHomeScreen } from '@/screens/StudentHomeScreen';
import { TeacherDashboardScreen } from '@/screens/TeacherDashboardScreen';
import { TeacherStudentsScreen } from '@/screens/TeacherStudentsScreen';
import { TeacherStatisticsScreen } from '@/screens/TeacherStatisticsScreen';
import { TeacherSettingsScreen } from '@/screens/TeacherSettingsScreen';
import { SplashScreen } from '@/screens/SplashScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { StudentLocationScreen as CourseDetailScreen } from '@/screens/StudentLocationScreen';

type AppScreen = 'studentHome' | 'history' | 'location' | 'profile' | 'teacherDashboard' | 'teacherStudents' | 'teacherStatistics' | 'teacherSettings' | 'classrooms';
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
  const [checkInMessage, setCheckInMessage] = useState<CheckInMessage | null>(null);
  const [checkingCourseId, setCheckingCourseId] = useState<number | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [studentLocation, setStudentLocation] = useState<{ latitude: number; longitude: number }>();

  useEffect(() => {
    const timer = setTimeout(() => setIsBooting(false), 700);
    return () => clearTimeout(timer);
  }, []);

  async function loadStudentData(studentId: number) {
    setDataLoading(true);
    setDataError(null);
    try {
      const [courseData, attendanceData] = await Promise.all([
        fetchCourses(studentId),
        fetchAttendance(studentId),
      ]);
      setCourses(courseData);
      setAttendance(attendanceData);
    } catch (error) {
      setDataError(getErrorMessage(error));
    } finally {
      setDataLoading(false);
    }
  }

  async function loadTeacherData(teacherId: number) {
    setDataLoading(true);
    setDataError(null);
    try {
      const [courseData, classroomData] = await Promise.all([
        fetchTeacherCourses(teacherId),
        fetchClassrooms(),
      ]);
      setCourses(courseData);
      setClassrooms(classroomData);
      if (courseData[0]) {
        setDashboard(await fetchDashboard(courseData[0].id));
      } else {
        setDashboard(null);
      }
    } catch (error) {
      setDataError(getErrorMessage(error));
    } finally {
      setDataLoading(false);
    }
  }

  async function handleLogin(userCode: string, password: string) {
    setAuthLoading(true);
    setAuthError(null);
    clearAuthToken();
    try {
      const loginResponse = await loginApi(userCode, password);
      setAuthToken(loginResponse.token);
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
    clearAuthToken();
    setUser(null);
    setCourses([]);
    setAttendance([]);
    setDashboard(null);
    setClassrooms([]);
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
      } else if (error instanceof ApiError && error.code === 'SESSION_CLOSED') {
        setCheckInMessage({ kind: 'error', text: error.message });
      } else if (error instanceof ApiError && error.code === 'SESSION_NOT_TODAY') {
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
          onNavigate={(key) => setScreen(key === 'dashboard' ? 'teacherDashboard' : key === 'students' ? 'teacherStudents' : key === 'statistics' ? 'teacherStatistics' : key === 'settings' ? 'teacherSettings' : 'classrooms')}
          onSave={(classroom, id) => handleSaveClassroom(classroom, id)}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  const teacherNavigation = (key: 'dashboard' | 'students' | 'classrooms' | 'statistics' | 'settings') => {
    setScreen(key === 'dashboard' ? 'teacherDashboard' : key === 'students' ? 'teacherStudents' : key === 'classrooms' ? 'classrooms' : key === 'statistics' ? 'teacherStatistics' : 'teacherSettings');
  };

  if (screen === 'teacherStudents') {
    return <><TeacherStudentsScreen course={courses[0] ?? null} dashboard={dashboard} onNavigate={teacherNavigation} /><StatusBar style="dark" /></>;
  }

  if (screen === 'teacherStatistics') {
    return <><TeacherStatisticsScreen course={courses[0] ?? null} dashboard={dashboard} onNavigate={teacherNavigation} /><StatusBar style="dark" /></>;
  }

  if (screen === 'teacherSettings') {
    return <><TeacherSettingsScreen onLogout={handleLogout} onNavigate={teacherNavigation} user={user} /><StatusBar style="dark" /></>;
  }

  return (
    <>
      <TeacherDashboardScreen
        course={courses[0] ?? null}
        dashboard={dashboard}
        errorMessage={dataError}
        isLoading={dataLoading}
        onClassrooms={() => setScreen('classrooms')}
        onLogout={handleLogout}
        onNavigate={teacherNavigation}
        onRefresh={() => void handleTeacherRefresh()}
        user={user}
      />
      <StatusBar style="dark" />
    </>
  );
}
