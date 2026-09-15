import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DecorativeBackdrop } from '@/components/DecorativeBackdrop';
import { NavigationBar } from '@/components/NavigationBar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { User } from '@/services/api';

type Props = { user: User; onNavigate: (key: 'dashboard' | 'students' | 'classrooms' | 'statistics' | 'settings') => void; onLogout: () => void };

export function TeacherSettingsScreen({ user, onNavigate, onLogout }: Props) {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <DecorativeBackdrop />
      <ScreenHeader subtitle={`Teacher ID: ${user.userCode}`} title="Settings" />
      <View style={styles.card}>
        <Text style={styles.title}>Demo configuration</Text>
        <Text style={styles.item}>Interface language: English</Text>
        <Text style={styles.item}>Backend geofencing: Enabled</Text>
        <Text style={styles.item}>GPS accuracy threshold: 100 m</Text>
        <Text style={styles.item}>Duplicate check-in protection: Enabled</Text>
      </View>
      <Text style={styles.note}>Authentication and notification settings can be added after the core demo is stable.</Text>
      <PrimaryButton label="Log out" onPress={onLogout} variant="danger" />
      <NavigationBar
        items={[{ key: 'dashboard', label: 'Dashboard' }, { key: 'students', label: 'Students' }, { key: 'classrooms', label: 'Room settings' }, { key: 'statistics', label: 'Analytics' }, { key: 'settings', label: 'Settings' }]}
        onSelect={onNavigate}
        selected="settings"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: 16, padding: 24, backgroundColor: '#F4F7FB' },
  card: { gap: 12, borderRadius: 18, padding: 20, backgroundColor: '#FFFFFF' },
  title: { color: '#0F172A', fontSize: 19, fontWeight: '800' },
  item: { color: '#475569', fontSize: 14 },
  note: { color: '#64748B', fontSize: 13, lineHeight: 20 },
});
