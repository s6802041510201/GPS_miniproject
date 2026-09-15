import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DecorativeBackdrop } from '@/components/DecorativeBackdrop';
import { NavigationBar } from '@/components/NavigationBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Course, DashboardResponse } from '@/services/api';
import { colors, radius, shadows, spacing } from '@/theme';

type Props = {
  course: Course | null;
  dashboard: DashboardResponse | null;
  onNavigate: (key: 'dashboard' | 'students' | 'classrooms' | 'statistics' | 'settings') => void;
};

export function TeacherStatisticsScreen({ course, dashboard, onNavigate }: Props) {
  const summary = dashboard?.summary;
  const rate = summary?.attendanceRate ?? 0;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <DecorativeBackdrop />
      <ScreenHeader subtitle={course?.courseName ?? 'Course analytics'} title="Attendance analytics" />
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>THIS WEEK</Text>
            <Text style={styles.rate}>{rate.toFixed(1)}%</Text>
            <Text style={styles.rateLabel}>Attendance rate</Text>
          </View>
          <View style={styles.ring}><View style={styles.ringInner}><Text style={styles.ringValue}>{Math.round(rate)}%</Text></View></View>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progress, { width: `${Math.min(rate, 100)}%` }]} /></View>
      </View>
      <View style={styles.grid}>
        <Metric label="Total students" value={summary?.totalStudents ?? 0} />
        <Metric label="Present" value={summary?.presentCount ?? 0} tone="success" />
        <Metric label="Late" value={summary?.lateCount ?? 0} tone="warning" />
        <Metric label="Absent" value={summary?.absentCount ?? 0} tone="danger" />
      </View>
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View><Text style={styles.chartTitle}>Today&apos;s attendance</Text><Text style={styles.chartSubtitle}>Status distribution</Text></View>
          <Text style={styles.chartTotal}>{summary?.totalStudents ?? 0} students</Text>
        </View>
        <View style={styles.chart}>
          <ChartBar label="Present" value={summary?.presentCount ?? 0} total={summary?.totalStudents ?? 0} tone="present" />
          <ChartBar label="Late" value={summary?.lateCount ?? 0} total={summary?.totalStudents ?? 0} tone="late" />
          <ChartBar label="Absent" value={summary?.absentCount ?? 0} total={summary?.totalStudents ?? 0} tone="absent" />
        </View>
      </View>
      <Text style={styles.note}>Attendance rate includes students marked Present or Late. Statistics are calculated from course enrollments and today&apos;s attendance records.</Text>
      <NavigationBar
        items={[{ key: 'dashboard', label: 'Dashboard' }, { key: 'students', label: 'Students' }, { key: 'classrooms', label: 'Room settings' }, { key: 'statistics', label: 'Analytics' }, { key: 'settings', label: 'Settings' }]}
        onSelect={onNavigate}
        selected="statistics"
      />
    </ScrollView>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'success' | 'warning' | 'danger' }) {
  return <View style={[styles.metric, styles[`${tone}Metric`]]}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function ChartBar({ label, value, total, tone }: { label: string; value: number; total: number; tone: 'present' | 'late' | 'absent' }) {
  const height = total > 0 ? Math.max(12, (value / total) * 112) : 12;
  return (
    <View style={styles.barColumn}>
      <Text style={styles.barValue}>{value}</Text>
      <View style={styles.barTrack}><View style={[styles.bar, styles[`${tone}Bar`], { height }]} /></View>
      <Text style={styles.barLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.xl, padding: spacing.xl, backgroundColor: colors.canvas },
  hero: { gap: spacing.sm, borderRadius: radius.lg, padding: spacing.xl, backgroundColor: colors.accentSoft },
  heroTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg },
  heroCopy: { flex: 1, gap: spacing.xs },
  eyebrow: { color: colors.accentDark, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  rate: { color: colors.accentDark, fontSize: 42, fontWeight: '800' },
  rateLabel: { color: '#1E40AF', fontSize: 14, fontWeight: '700' },
  progressTrack: { height: 10, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: '#BFDBFE' },
  progress: { height: 10, borderRadius: radius.pill, backgroundColor: colors.accent },
  ring: { alignItems: 'center', borderColor: colors.accent, borderRadius: radius.pill, borderWidth: 10, height: 94, justifyContent: 'center', width: 94 },
  ringInner: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.pill, height: 66, justifyContent: 'center', width: 66 },
  ringValue: { color: colors.accentDark, fontSize: 16, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { flexGrow: 1, flexBasis: '30%', minWidth: 96, gap: spacing.xs, borderRadius: radius.md, padding: spacing.lg, backgroundColor: colors.surface },
  successMetric: { backgroundColor: colors.successSoft },
  warningMetric: { backgroundColor: colors.warningSoft },
  dangerMetric: { backgroundColor: colors.dangerSoft },
  defaultMetric: {},
  metricValue: { color: colors.text, fontSize: 24, fontWeight: '800' },
  metricLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  chartCard: { gap: spacing.lg, borderRadius: radius.lg, padding: spacing.xl, backgroundColor: colors.surface, boxShadow: shadows.card },
  chartHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  chartTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  chartSubtitle: { color: colors.muted, fontSize: 13, marginTop: spacing.xs },
  chartTotal: { color: colors.accentDark, fontSize: 12, fontWeight: '800' },
  chart: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.xl, height: 166, justifyContent: 'center' },
  barColumn: { alignItems: 'center', flex: 1, gap: spacing.xs, height: 166, justifyContent: 'flex-end' },
  barValue: { color: colors.text, fontSize: 12, fontWeight: '800' },
  barTrack: { alignItems: 'center', height: 116, justifyContent: 'flex-end', width: 28 },
  bar: { borderRadius: radius.pill, minHeight: 12, width: 22 },
  presentBar: { backgroundColor: '#22C55E' },
  lateBar: { backgroundColor: '#F59E0B' },
  absentBar: { backgroundColor: '#EF4444' },
  barLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  note: { color: colors.muted, fontSize: 13, lineHeight: 20 },
});
