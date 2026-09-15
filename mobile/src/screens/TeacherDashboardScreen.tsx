import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedSurface } from '@/components/AnimatedSurface';
import { DecorativeBackdrop } from '@/components/DecorativeBackdrop';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LocationMap } from '@/components/LocationMap';
import { NavigationBar } from '@/components/NavigationBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, radius, shadows, spacing } from '@/theme';
import { Course, DashboardResponse, DashboardStudent, User } from '@/services/api';
import { formatDistance, formatTime } from '@/utils/format';

type Props = {
  user: User;
  course: Course | null;
  dashboard: DashboardResponse | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
  onClassrooms: () => void;
  onLogout: () => void;
  onNavigate: (key: 'dashboard' | 'students' | 'classrooms' | 'statistics' | 'settings') => void;
};

export function TeacherDashboardScreen({
  user,
  course,
  dashboard,
  isLoading,
  errorMessage,
  onRefresh,
  onClassrooms,
  onLogout,
  onNavigate,
}: Props) {
  const summary = dashboard?.summary ?? {
    totalStudents: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    attendanceRate: 0,
  };
  const checkedInCount = summary.presentCount + summary.lateCount;
  const attendanceRate = summary.attendanceRate;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <DecorativeBackdrop />
      <AnimatedSurface delay={40}>
        <ScreenHeader onLogout={onLogout} subtitle={`Teacher ID: ${user.userCode}`} title="Attendance dashboard" />
      </AnimatedSurface>

      <AnimatedSurface delay={100} style={styles.presentationHeader}>
        <View style={styles.presentationCopy}>
          <Text style={styles.eyebrow}>LIVE DEMO SESSION</Text>
          <Text style={styles.presentationTitle}>Attendance overview</Text>
          <Text style={styles.presentationSubtitle}>{course ? `${course.courseCode} • ${course.courseName}` : 'No course selected'}</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </AnimatedSurface>

      <View style={styles.actions}>
        <PrimaryButton label="Refresh" onPress={onRefresh} variant="secondary" />
        <PrimaryButton label="Room settings" onPress={onClassrooms} variant="secondary" />
      </View>

      {course ? (
        <AnimatedSurface delay={160} style={styles.courseBanner}>
          <View style={styles.courseBannerTop}>
            <View style={styles.courseCopy}>
              <Text style={styles.courseCode}>{course.courseCode}</Text>
              <Text style={styles.courseName}>{course.courseName}</Text>
            </View>
            <Text style={styles.sessionLabel}>{course.isToday ? "Today's session" : `Next session • ${course.dayOfWeek ?? 'scheduled'}`}</Text>
          </View>
          <Text style={styles.courseRoom}>{course.buildingCode ? `Building ${course.buildingCode} • ` : ''}{course.roomName} • Radius {formatDistance(course.radius)}</Text>
          <Text style={styles.courseRoom}>Schedule: {course.schedule}</Text>
          <Text style={styles.courseRoom}>Check-in: {course.checkInOpenTime ?? '—'} – {course.checkInCloseTime ?? '—'} • Status: {course.sessionStatus ?? 'scheduled'}</Text>
        </AnimatedSurface>
      ) : null}

      {course ? <LocationMap classroom={course} /> : null}
      {isLoading ? <Text style={styles.muted}>Loading dashboard...</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {dashboard ? (
        <>
          <AnimatedSurface delay={220} style={styles.rateCard}>
            <View style={styles.rateRow}>
              <View style={styles.rateCopy}>
                <Text style={styles.eyebrow}>CLASS ATTENDANCE</Text>
                <Text numberOfLines={1} style={styles.rate}>{attendanceRate.toFixed(1)}%</Text>
                <Text style={styles.rateNote}>{checkedInCount} of {summary.totalStudents} students checked in</Text>
              </View>
              <AttendanceRing rate={attendanceRate} />
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progress, { width: `${Math.min(Math.max(attendanceRate, 0), 100)}%` }]} />
            </View>
          </AnimatedSurface>

          <View style={styles.statsGrid}>
            <StatCard delay={250} label="Students" value={summary.totalStudents} />
            <StatCard delay={280} label="Present" value={summary.presentCount} tone="success" />
            <StatCard delay={310} label="Late" value={summary.lateCount} tone="warning" />
            <StatCard delay={340} label="Absent" value={summary.absentCount} tone="danger" />
            <StatCard delay={370} label="Rate" value={`${summary.attendanceRate.toFixed(1)}%`} tone="blue" />
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Today&apos;s attendance</Text>
              <Text style={styles.sectionSubtitle}>Live status by enrolled student</Text>
            </View>
            <Text style={styles.studentCount}>{dashboard.students.length} students</Text>
          </View>

          <View style={styles.legend}>
            <Legend tone="present" label="Present" />
            <Legend tone="late" label="Late" />
            <Legend tone="absent" label="Absent" />
          </View>

          {dashboard.students.map((student, index) => <StudentRow key={student.userCode} delay={400 + index * 40} student={student} />)}
        </>
      ) : null}

      <NavigationBar
        items={[{ key: 'dashboard', label: 'Dashboard' }, { key: 'students', label: 'Students' }, { key: 'classrooms', label: 'Room settings' }, { key: 'statistics', label: 'Analytics' }, { key: 'settings', label: 'Settings' }]}
        onSelect={onNavigate}
        selected="dashboard"
      />
    </ScrollView>
  );
}

function StatCard({ label, value, tone = 'default', delay = 0 }: { label: string; value: string | number; tone?: 'default' | 'success' | 'warning' | 'danger' | 'blue'; delay?: number }) {
  return (
    <AnimatedSurface delay={delay} style={[styles.statCard, styles[`${tone}Stat`]]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </AnimatedSurface>
  );
}

function StudentRow({ student, delay = 0 }: { student: DashboardStudent; delay?: number }) {
  const status = student.status ?? 'absent';
  return (
    <AnimatedSurface delay={delay} style={styles.studentRow}>
      <View style={styles.studentTitle}>
        <Text style={styles.studentCode}>{student.userCode}</Text>
        <Text style={styles.studentName}>{student.name}</Text>
      </View>
      <View style={styles.studentMeta}>
        <StatusBadge status={status} />
        <Text style={styles.metaText}>{formatTime(student.checkInTime)}</Text>
        <Text style={styles.metaText}>{formatDistance(student.distance)}</Text>
      </View>
    </AnimatedSurface>
  );
}

function StatusBadge({ status }: { status: 'present' | 'late' | 'absent' }) {
  const label = status === 'present' ? 'Present' : status === 'late' ? 'Late' : 'Absent';
  return <Text style={[styles.statusBadge, styles[`${status}Badge`]]}>{label}</Text>;
}

function Legend({ tone, label }: { tone: 'present' | 'late' | 'absent'; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, styles[`${tone}Dot`]]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function AttendanceRing({ rate }: { rate: number }) {
  return (
    <View accessibilityLabel={`Attendance rate ${rate.toFixed(1)} percent`} accessibilityRole="image" style={styles.ring}>
      <View style={styles.ringInner}>
        <Text style={styles.ringValue}>{Math.round(rate)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.xl, padding: spacing.xl, backgroundColor: colors.canvas },
  presentationHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg, borderRadius: radius.lg, padding: spacing.xl, backgroundColor: colors.text, boxShadow: shadows.card },
  presentationCopy: { flex: 1, gap: spacing.sm },
  eyebrow: { color: colors.accentDark, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  presentationTitle: { color: colors.surface, fontSize: 25, fontWeight: '800' },
  presentationSubtitle: { color: '#CBD5E1', fontSize: 13, lineHeight: 19 },
  liveBadge: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: '#1E293B' },
  liveDot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: '#4ADE80' },
  liveText: { color: '#BBF7D0', fontSize: 12, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: spacing.md },
  courseBanner: { gap: spacing.sm, borderRadius: radius.md, padding: spacing.lg, backgroundColor: colors.accentSoft },
  courseBannerTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  courseCopy: { flex: 1, gap: spacing.xs },
  courseCode: { color: colors.accentDark, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  courseName: { color: '#1E3A8A', fontSize: 20, fontWeight: '800' },
  sessionLabel: { color: colors.accentDark, fontSize: 11, fontWeight: '800', textAlign: 'right' },
  courseRoom: { color: '#1E40AF', fontSize: 13 },
  muted: { color: colors.muted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  rateCard: { gap: spacing.lg, borderRadius: radius.lg, padding: spacing.xl, backgroundColor: colors.surface, boxShadow: shadows.card },
  rateRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg },
  rateCopy: { flex: 1, gap: spacing.xs },
  rate: { color: colors.text, fontSize: 36, fontWeight: '800', fontVariant: ['tabular-nums'] },
  rateNote: { color: colors.muted, fontSize: 13 },
  progressTrack: { height: 12, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: colors.accentPale },
  progress: { height: 12, borderRadius: radius.pill, backgroundColor: colors.accent },
  ring: { alignItems: 'center', borderColor: colors.accent, borderRadius: radius.pill, borderWidth: 12, height: 108, justifyContent: 'center', width: 108 },
  ringInner: { alignItems: 'center', backgroundColor: colors.accentPale, borderRadius: radius.pill, height: 74, justifyContent: 'center', width: 74 },
  ringValue: { color: colors.accentDark, fontSize: 18, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard: { flexGrow: 1, flexBasis: '30%', minWidth: 96, gap: spacing.xs, borderRadius: radius.md, padding: spacing.lg, backgroundColor: colors.surface },
  defaultStat: {},
  successStat: { backgroundColor: colors.successSoft },
  warningStat: { backgroundColor: colors.warningSoft },
  dangerStat: { backgroundColor: colors.dangerSoft },
  blueStat: { backgroundColor: '#E0E7FF' },
  statValue: { color: colors.text, fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  sectionHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  sectionSubtitle: { color: colors.muted, fontSize: 13, marginTop: spacing.xs },
  studentCount: { color: colors.accentDark, fontSize: 12, fontWeight: '800' },
  legend: { flexDirection: 'row', gap: spacing.lg },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  legendDot: { width: 8, height: 8, borderRadius: radius.pill },
  presentDot: { backgroundColor: '#22C55E' },
  lateDot: { backgroundColor: '#F59E0B' },
  absentDot: { backgroundColor: '#EF4444' },
  legendText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  studentRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg, borderRadius: radius.md, padding: spacing.lg, backgroundColor: colors.surface, boxShadow: shadows.card },
  studentTitle: { flex: 1, gap: spacing.xs },
  studentCode: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  studentName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  studentMeta: { alignItems: 'flex-end', gap: 2 },
  statusBadge: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, fontSize: 12, fontWeight: '800' },
  presentBadge: { color: colors.success, backgroundColor: colors.successSoft },
  lateBadge: { color: colors.warning, backgroundColor: colors.warningSoft },
  absentBadge: { color: colors.danger, backgroundColor: colors.dangerSoft },
  metaText: { color: colors.muted, fontSize: 11 },
});
