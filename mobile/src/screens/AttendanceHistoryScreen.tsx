import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMemo, useState } from 'react';
import { DecorativeBackdrop } from '@/components/DecorativeBackdrop';
import { IconButton } from '@/components/IconButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { NavigationBar } from '@/components/NavigationBar';
import { AttendanceRecord, User } from '@/services/api';
import { colors, navigation, radius, shadows, spacing } from '@/theme';
import { formatDate, formatDistance, formatTime } from '@/utils/format';

type HistoryFilter = 'all' | AttendanceRecord['status'];

const filterOptions: Array<{ key: HistoryFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'present', label: 'Present' },
  { key: 'late', label: 'Late' },
  { key: 'absent', label: 'Absent' },
  { key: 'cancelled', label: 'Cancelled' },
];

type Props = {
  user: User;
  records: AttendanceRecord[];
  isLoading: boolean;
  errorMessage: string | null;
  onBack: () => void;
  onRefresh: () => void;
  onNavigate: (key: 'home' | 'history' | 'profile') => void;
};

export function AttendanceHistoryScreen({ user, records, isLoading, errorMessage, onBack, onRefresh, onNavigate }: Props) {
  const [selectedFilter, setSelectedFilter] = useState<HistoryFilter>('all');
  const summary = useMemo(() => ({
    total: records.length,
    present: records.filter((record) => record.status === 'present').length,
    late: records.filter((record) => record.status === 'late').length,
    absent: records.filter((record) => record.status === 'absent').length,
    cancelled: records.filter((record) => record.status === 'cancelled').length,
  }), [records]);
  const filteredRecords = useMemo(
    () => selectedFilter === 'all' ? records : records.filter((record) => record.status === selectedFilter),
    [records, selectedFilter],
  );

  return (
    <View style={styles.screenRoot}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <DecorativeBackdrop />
      <ScreenHeader onBack={onBack} subtitle={`Student ID: ${user.userCode}`} title="Attendance history" />
      <Text style={styles.intro}>Review every check-in result, including late, absent, and cancelled sessions.</Text>
      <IconButton icon="refresh" label="Refresh attendance history" onPress={onRefresh} />
      {isLoading ? <Text style={styles.muted}>Loading attendance history...</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View>
            <Text style={styles.summaryTitle}>Attendance overview</Text>
            <Text style={styles.summarySubtitle}>{summary.total} recorded session{summary.total === 1 ? '' : 's'}</Text>
          </View>
          <Text style={styles.summaryTotal}>{summary.present + summary.late}<Text style={styles.summaryTotalLabel}> attended</Text></Text>
        </View>
        <View style={styles.summaryGrid}>
          <SummaryMetric label="Present" value={summary.present} tone="present" />
          <SummaryMetric label="Late" value={summary.late} tone="late" />
          <SummaryMetric label="Absent" value={summary.absent} tone="absent" />
          <SummaryMetric label="Cancelled" value={summary.cancelled} tone="cancelled" />
        </View>
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.sectionTitle}>Filter history</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {filterOptions.map((option) => {
            const count = option.key === 'all' ? summary.total : summary[option.key];
            const selected = selectedFilter === option.key;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${option.label}, ${count} records`}
                onPress={() => setSelectedFilter(option.key)}
                style={[styles.filterButton, selected && styles.filterButtonSelected]}
              >
                <Text style={[styles.filterLabel, selected && styles.filterLabelSelected]}>{option.label}</Text>
                <Text style={[styles.filterCount, selected && styles.filterCountSelected]}>{count}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {!isLoading && !errorMessage && records.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyTitle}>No attendance records yet</Text><Text style={styles.muted}>Your completed and missed sessions will appear here.</Text></View>
      ) : null}
      {!isLoading && !errorMessage && records.length > 0 && filteredRecords.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyTitle}>No {selectedFilter} records</Text><Text style={styles.muted}>Try another filter to view your attendance history.</Text></View>
      ) : null}

      {filteredRecords.map((record) => (
        <View key={record.id} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.titleBlock}>
              <Text style={styles.date}>{formatDate(record.sessionDate)}</Text>
              <Text style={styles.courseCode}>{record.courseCode}</Text>
              <Text style={styles.course}>{record.courseName}</Text>
            </View>
            <Text style={[styles.status, styles[`status_${record.status}`]]}>{getStatusLabel(record.status)}</Text>
          </View>
          <View style={styles.details}>
            <Text style={styles.detail}>{record.status === 'absent' || record.status === 'cancelled' ? 'Check-in: No check-in recorded' : `Checked in: ${formatTime(record.checkInTime)}`}</Text>
            <Text style={styles.detail}>Classroom: {record.roomName}</Text>
            <Text style={styles.detail}>Distance: {formatDistance(record.distance)}</Text>
            <Text style={styles.detail}>GPS accuracy: {formatDistance(record.accuracy)}</Text>
          </View>
        </View>
      ))}
      </ScrollView>
      <NavigationBar
        items={[{ key: 'home', label: 'Home' }, { key: 'history', label: 'History' }, { key: 'profile', label: 'Profile' }]}
        onSelect={onNavigate}
        selected="history"
      />
    </View>
  );
}

function SummaryMetric({ label, value, tone }: { label: string; value: number; tone: 'present' | 'late' | 'absent' | 'cancelled' }) {
  return (
    <View style={[styles.metric, styles[`metric_${tone}`]]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function getStatusLabel(status: 'present' | 'late' | 'absent' | 'cancelled') {
  if (status === 'present') return '✓ Present';
  if (status === 'late') return 'Late';
  if (status === 'cancelled') return 'Cancelled';
  return 'Absent';
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1, paddingLeft: navigation.rail, position: 'relative' },
  content: { flexGrow: 1, gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.canvas },
  intro: { color: colors.body, fontSize: 14, lineHeight: 21 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  error: { backgroundColor: colors.dangerSoft, borderRadius: radius.sm, color: colors.danger, fontSize: 14, lineHeight: 20, padding: spacing.md },
  empty: { gap: spacing.sm, borderRadius: radius.md, padding: spacing.xl, backgroundColor: colors.surface, boxShadow: shadows.card },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  summaryCard: { gap: spacing.lg, borderRadius: radius.lg, padding: spacing.xl, backgroundColor: colors.surface, boxShadow: shadows.card },
  summaryHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  summaryTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  summarySubtitle: { color: colors.muted, fontSize: 13, marginTop: spacing.xs },
  summaryTotal: { color: colors.accentDark, fontSize: 25, fontWeight: '900' },
  summaryTotalLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { borderRadius: radius.md, flexGrow: 1, minWidth: 120, padding: spacing.md },
  metric_present: { backgroundColor: colors.successSoft },
  metric_late: { backgroundColor: colors.warningSoft },
  metric_absent: { backgroundColor: colors.dangerSoft },
  metric_cancelled: { backgroundColor: colors.accentPale },
  metricValue: { color: colors.text, fontSize: 20, fontWeight: '900' },
  metricLabel: { color: colors.body, fontSize: 12, fontWeight: '700', marginTop: spacing.xs },
  filterSection: { gap: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  filterRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  filterButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  filterButtonSelected: { backgroundColor: colors.accent, borderColor: colors.accentDark },
  filterLabel: { color: colors.body, fontSize: 13, fontWeight: '800' },
  filterLabelSelected: { color: colors.surface },
  filterCount: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  filterCountSelected: { color: colors.surface },
  card: { gap: spacing.lg, borderRadius: radius.lg, padding: spacing.xl, backgroundColor: colors.surface, boxShadow: shadows.card },
  row: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  titleBlock: { flex: 1, gap: spacing.xs },
  date: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  courseCode: { color: colors.accent, fontSize: 12, fontWeight: '900', letterSpacing: 0.6, marginTop: spacing.xs },
  course: { color: colors.text, fontSize: 18, fontWeight: '800' },
  status: { borderRadius: radius.pill, fontSize: 13, fontWeight: '800', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  status_present: { backgroundColor: colors.successSoft, color: colors.success },
  status_late: { backgroundColor: colors.warningSoft, color: colors.warning },
  status_absent: { backgroundColor: colors.dangerSoft, color: colors.danger },
  status_cancelled: { backgroundColor: colors.accentPale, color: colors.body },
  details: { gap: spacing.sm },
  detail: { color: colors.body, fontSize: 14, lineHeight: 20 },
});
