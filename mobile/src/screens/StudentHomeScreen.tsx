import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedSurface } from '@/components/AnimatedSurface';
import { DecorativeBackdrop } from '@/components/DecorativeBackdrop';
import { AppIcon } from '@/components/AppIcon';
import { IconButton } from '@/components/IconButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { NavigationBar } from '@/components/NavigationBar';
import { Course, User } from '@/services/api';
import { colors, navigation, radius, shadows, spacing } from '@/theme';
import { formatDistance, formatTime } from '@/utils/format';

type Props = {
  user: User;
  courses: Course[];
  isLoading: boolean;
  errorMessage: string | null;
  checkInMessage: { kind: 'success' | 'error' | 'info'; text: string } | null;
  checkingCourseId: number | null;
  onCheckIn: (course: Course) => void;
  onRefresh: () => void;
  onHistory: () => void;
  onLocation: (course: Course) => void;
  onProfile: () => void;
  onNavigate: (key: 'home' | 'history' | 'profile') => void;
  onLogout: () => void;
};

export function StudentHomeScreen({
  user,
  courses,
  isLoading,
  errorMessage,
  checkInMessage,
  checkingCourseId,
  onCheckIn,
  onRefresh,
  onHistory,
  onLocation,
  onProfile,
  onNavigate,
  onLogout,
}: Props) {
  const newCheckInCourses = courses.filter(isNewCheckInCourse);
  const visibleCourses = courses.filter((course) => !isCompletedOrMissedCourse(course) && !isNewCheckInCourse(course));

  return (
    <View style={styles.screenRoot}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <DecorativeBackdrop />
      <AnimatedSurface delay={40}>
        <ScreenHeader onLogout={onLogout} subtitle={`Student ID: ${user.userCode}`} title={`Hello, ${user.name}`} />
      </AnimatedSurface>

      {newCheckInCourses.length > 0 ? (
        <View style={styles.sessionGroup}>
          <Text style={styles.sessionGroupTitle}>NEW CHECK-IN</Text>
          {newCheckInCourses.map((course, index) => {
            const alreadyCheckedIn = course.status === 'present' || course.status === 'late';
            return (
              <AnimatedSurface key={course.id} delay={90 + index * 50} style={styles.todayCard}>
                <View style={styles.todayHeader}>
                  <View style={styles.courseTitleBlock}>
                    <Text style={styles.courseCode}>{course.courseCode}</Text>
                    <Text style={styles.todayTitle}>{course.courseName}</Text>
                  </View>
                  <View style={styles.todayIcon}><AppIcon color={colors.accentDark} name={alreadyCheckedIn ? 'check' : 'calendar'} size={22} /></View>
                </View>
                <View style={styles.todayMeta}>
                  <Text style={styles.todayMetaText}>{course.dayOfWeek ?? 'Scheduled'} • {course.schedule}</Text>
                  <Text style={styles.todayMetaText}>{course.buildingCode ? `Building ${course.buildingCode} • ` : ''}{course.roomName}</Text>
                </View>
                <Text style={styles.sessionWindow}>
                  {course.checkInOpenTime ? `Check-in ${course.checkInOpenTime} – ${course.checkInCloseTime}` : 'Check-in window follows the class schedule'}
                </Text>
                <PrimaryButton
                  disabled={alreadyCheckedIn || course.checkInAllowed === false || checkingCourseId === course.id}
                  label={getCheckInLabel(course, alreadyCheckedIn, checkingCourseId === course.id)}
                  onPress={() => onCheckIn(course)}
                />
              </AnimatedSurface>
            );
          })}
        </View>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton label="Attendance history" onPress={onHistory} variant="secondary" />
        <PrimaryButton label="Profile" onPress={onProfile} variant="secondary" />
        <IconButton icon="refresh" label="Refresh student courses" onPress={onRefresh} />
      </View>

      {checkInMessage ? (
        <View style={[styles.message, styles[checkInMessage.kind]]}>
          <Text selectable style={styles.messageText}>{checkInMessage.text}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>My courses</Text>
      {isLoading ? <Text style={styles.muted}>Loading your courses...</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {!isLoading && !errorMessage && courses.length === 0 ? (
        <View style={styles.empty}><Text style={styles.muted}>No enrolled courses were found.</Text></View>
      ) : null}

      {visibleCourses.length === 0 && newCheckInCourses.length === 0 && courses.length > 0 && !isLoading && !errorMessage ? (
        <View style={styles.empty}><Text style={styles.muted}>Completed and missed sessions are available in Attendance history.</Text></View>
      ) : null}

      {visibleCourses.map((course, index) => {
        const alreadyCheckedIn = course.status === 'present' || course.status === 'late';
        return (
          <AnimatedSurface key={course.id} delay={140 + index * 60} style={styles.courseCard}>
            <View style={styles.courseTop}>
              <View style={styles.courseTitleBlock}>
                <Text style={styles.courseCode}>{course.courseCode}</Text>
                <Text style={styles.courseName}>{course.courseName}</Text>
              </View>
              <View style={[styles.statusPill, alreadyCheckedIn ? styles.presentPill : styles.pendingPill]}>
                <Text style={[styles.statusPillText, alreadyCheckedIn ? styles.presentText : styles.pendingText]}>
                  {alreadyCheckedIn ? 'Checked in' : 'Not checked in'}
                </Text>
              </View>
            </View>
            <View style={styles.details}>
              <Text style={styles.detail}>Building: {course.buildingCode ?? '—'}</Text>
              <Text style={styles.detail}>Classroom: {course.roomName}</Text>
              <Text style={styles.detail}>Schedule: {course.schedule}</Text>
              <Text style={styles.detail}>Check-in window: {course.checkInOpenTime ?? '—'} - {course.checkInCloseTime ?? '—'}</Text>
              <Text style={styles.detail}>Allowed radius: {formatDistance(course.radius)}</Text>
              <Text style={styles.detail}>Check-in time: {formatTime(course.checkInTime)}</Text>
            </View>
            <PrimaryButton
              disabled={alreadyCheckedIn || course.checkInAllowed === false || checkingCourseId === course.id}
              label={getCheckInLabel(course, alreadyCheckedIn, checkingCourseId === course.id)}
              onPress={() => onCheckIn(course)}
            />
            <PrimaryButton label="Course details" onPress={() => onLocation(course)} variant="secondary" />
          </AnimatedSurface>
        );
      })}
      </ScrollView>
      <NavigationBar
        items={[{ key: 'home', label: 'Home' }, { key: 'history', label: 'History' }, { key: 'profile', label: 'Profile' }]}
        onSelect={onNavigate}
        selected="home"
      />
    </View>
  );
}

function getCheckInLabel(course: Course, alreadyCheckedIn: boolean, isChecking: boolean) {
  if (alreadyCheckedIn) return 'Check-in completed';
  if (isChecking) return 'Reading location...';
  if (course.sessionStatus === 'upcoming') return `Opens at ${course.checkInOpenTime ?? 'scheduled time'}`;
  if (course.sessionStatus === 'scheduled') return 'Waiting for teacher to open';
  if (course.sessionStatus === 'not_today') return `Available ${course.dayOfWeek ?? 'on schedule'}`;
  if (course.sessionStatus === 'closed_by_teacher') return 'Closed by teacher';
  if (course.sessionStatus === 'cancelled') return 'Session cancelled';
  if (course.sessionStatus === 'closed') return 'Check-in closed';
  if (course.sessionStatus === 'late') return 'Check in late';
  return 'Check in';
}

function isCompletedOrMissedCourse(course: Course) {
  return course.status === 'present'
    || course.status === 'late'
    || course.sessionStatus === 'closed'
    || course.sessionStatus === 'closed_by_teacher'
    || course.sessionStatus === 'cancelled';
}

function isNewCheckInCourse(course: Course) {
  return Boolean(
    course.isToday
      && !isCompletedOrMissedCourse(course)
      && ['upcoming', 'scheduled', 'open', 'late'].includes(course.sessionStatus ?? ''),
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1, paddingLeft: navigation.rail, position: 'relative' },
  content: { flexGrow: 1, gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.canvas },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  sessionGroup: { gap: spacing.md },
  sessionGroupTitle: { color: colors.accentDark, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  todayCard: { gap: spacing.lg, borderRadius: radius.lg, padding: spacing.xl, backgroundColor: colors.surface, boxShadow: shadows.card },
  todayHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  todayEyebrow: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  todayTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: spacing.xs },
  todayIcon: { alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: radius.md, height: 44, justifyContent: 'center', width: 44 },
  todayMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  todayMetaText: { color: colors.body, fontSize: 14, fontWeight: '700' },
  sessionWindow: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  message: { borderRadius: radius.sm, padding: spacing.md },
  success: { backgroundColor: colors.successSoft },
  error: { backgroundColor: colors.dangerSoft, color: colors.danger, fontSize: 14, lineHeight: 20 },
  info: { backgroundColor: colors.accentSoft },
  messageText: { color: '#334155', fontSize: 14, lineHeight: 20 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: spacing.sm },
  muted: { color: colors.muted, fontSize: 14 },
  empty: { borderRadius: radius.md, padding: spacing.xl, backgroundColor: colors.surface },
  courseCard: { gap: spacing.lg, borderRadius: radius.lg, padding: 18, backgroundColor: colors.surface, boxShadow: shadows.card },
  courseTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  courseTitleBlock: { flex: 1, gap: spacing.xs },
  courseCode: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  courseName: { color: colors.text, fontSize: 20, fontWeight: '800' },
  statusPill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  presentPill: { backgroundColor: colors.successSoft },
  pendingPill: { backgroundColor: colors.warningSoft },
  statusPillText: { fontSize: 11, fontWeight: '800' },
  presentText: { color: colors.success },
  pendingText: { color: colors.warning },
  details: { gap: spacing.sm },
  detail: { color: colors.body, fontSize: 14 },
});
