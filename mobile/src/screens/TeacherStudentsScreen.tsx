import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DecorativeBackdrop } from '@/components/DecorativeBackdrop';
import { NavigationBar } from '@/components/NavigationBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Course, DashboardResponse } from '@/services/api';
import { colors, radius, spacing } from '@/theme';
import { formatDistance, formatTime } from '@/utils/format';

type Props = {
  course: Course | null;
  dashboard: DashboardResponse | null;
  onNavigate: (key: 'dashboard' | 'students' | 'classrooms' | 'statistics' | 'settings') => void;
};

export function TeacherStudentsScreen({ course, dashboard, onNavigate }: Props) {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <DecorativeBackdrop />
      <ScreenHeader subtitle={course?.courseName ?? 'Course attendance'} title="Students" />
      <Text style={styles.description}>Attendance records for today&apos;s class. Present, late, and absent states are shown below.</Text>
      {dashboard?.students.map((student) => (
        <View key={student.userCode} style={styles.row}>
          <View style={styles.identity}>
            <Text style={styles.code}>{student.userCode}</Text>
            <Text style={styles.name}>{student.name}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={[styles.status, student.status === 'present' ? styles.present : student.status === 'late' ? styles.late : styles.absent]}>
              {student.status === 'present' ? 'Present' : student.status === 'late' ? 'Late' : 'Absent'}
            </Text>
            <Text style={styles.detail}>{formatTime(student.checkInTime)}</Text>
            <Text style={styles.detail}>{formatDistance(student.distance)}</Text>
          </View>
        </View>
      ))}
      {!dashboard?.students.length ? <Text style={styles.empty}>No students found for this course.</Text> : null}
      <NavigationBar
        items={[{ key: 'dashboard', label: 'Dashboard' }, { key: 'students', label: 'Students' }, { key: 'classrooms', label: 'Room settings' }, { key: 'statistics', label: 'Analytics' }, { key: 'settings', label: 'Settings' }]}
        onSelect={onNavigate}
        selected="students"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.xl, padding: spacing.xl, backgroundColor: colors.canvas },
  description: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg, borderRadius: radius.md, padding: spacing.lg, backgroundColor: colors.surface },
  identity: { flex: 1, gap: spacing.xs },
  code: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  meta: { alignItems: 'flex-end', gap: 2 },
  status: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, fontSize: 12, fontWeight: '800' },
  present: { color: colors.success, backgroundColor: colors.successSoft },
  late: { color: colors.warning, backgroundColor: colors.warningSoft },
  absent: { color: colors.danger, backgroundColor: colors.dangerSoft },
  detail: { color: colors.muted, fontSize: 11 },
  empty: { color: colors.muted, fontSize: 14, padding: spacing.lg },
});
