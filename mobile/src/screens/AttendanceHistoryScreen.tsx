import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DecorativeBackdrop } from '@/components/DecorativeBackdrop';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { NavigationBar } from '@/components/NavigationBar';
import { AttendanceRecord, User } from '@/services/api';
import { formatDate, formatDistance, formatTime } from '@/utils/format';

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
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <DecorativeBackdrop />
      <ScreenHeader onBack={onBack} subtitle={`Student ID: ${user.userCode}`} title="Attendance history" />
      <PrimaryButton label="Refresh history" onPress={onRefresh} variant="secondary" />
      {isLoading ? <Text style={styles.muted}>Loading attendance history...</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {!isLoading && !errorMessage && records.length === 0 ? (
        <View style={styles.empty}><Text style={styles.muted}>No attendance records yet.</Text></View>
      ) : null}
      {records.map((record) => (
        <View key={record.id} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.titleBlock}>
              <Text style={styles.date}>{formatDate(record.sessionDate)}</Text>
              <Text style={styles.course}>{record.courseName}</Text>
            </View>
            <Text style={styles.status}>✓ {record.status}</Text>
          </View>
          <View style={styles.details}>
            <Text style={styles.detail}>Time: {formatTime(record.checkInTime)}</Text>
            <Text style={styles.detail}>Classroom: {record.roomName}</Text>
            <Text style={styles.detail}>Distance: {formatDistance(record.distance)}</Text>
          </View>
        </View>
      ))}
      <NavigationBar
        items={[{ key: 'home', label: 'Home' }, { key: 'history', label: 'History' }, { key: 'profile', label: 'Profile' }]}
        onSelect={onNavigate}
        selected="history"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: 16, padding: 24, backgroundColor: '#F4F7FB' },
  muted: { color: '#64748B', fontSize: 14 },
  error: { color: '#B91C1C', fontSize: 14, lineHeight: 20 },
  empty: { borderRadius: 16, padding: 20, backgroundColor: '#FFFFFF' },
  card: { gap: 14, borderRadius: 18, padding: 18, backgroundColor: '#FFFFFF' },
  row: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  titleBlock: { flex: 1, gap: 4 },
  date: { color: '#64748B', fontSize: 13, fontWeight: '700' },
  course: { color: '#0F172A', fontSize: 17, fontWeight: '800' },
  status: { color: '#166534', fontSize: 13, fontWeight: '800' },
  details: { gap: 5 },
  detail: { color: '#475569', fontSize: 14 },
});
