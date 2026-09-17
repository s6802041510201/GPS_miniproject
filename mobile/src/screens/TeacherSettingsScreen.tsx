import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DecorativeBackdrop } from '@/components/DecorativeBackdrop';
import { NavigationBar } from '@/components/NavigationBar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { User } from '@/services/api';
import { navigation } from '@/theme';

type Props = { user: User; onNavigate: (key: 'dashboard' | 'students' | 'classrooms' | 'statistics' | 'settings' | 'sessions') => void; onLogout: () => void };

export function TeacherSettingsScreen({ user, onNavigate, onLogout }: Props) {
  return (
    <View style={styles.screenRoot}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <DecorativeBackdrop />
      <ScreenHeader subtitle={`Teacher ID: ${user.userCode}`} title="Settings" />
      <View style={styles.card}>
        <Text style={styles.title}>System configuration</Text>
        <Text style={styles.item}>Interface language: English</Text>
        <Text style={styles.item}>Backend geofencing: Enabled</Text>
        <Text style={styles.item}>GPS accuracy threshold: 150 m (configurable)</Text>
        <Text style={styles.item}>Duplicate check-in protection: Enabled</Text>
      </View>
      <Text style={styles.note}>Authentication and notification settings can be configured in the next release.</Text>
      <PrimaryButton icon="logout" label="Log out" onPress={onLogout} variant="danger" />
      </ScrollView>
      <NavigationBar
        items={[{ key: 'dashboard', label: 'Dashboard' }, { key: 'sessions', label: 'Sessions' }, { key: 'students', label: 'Students' }, { key: 'classrooms', label: 'Rooms' }, { key: 'statistics', label: 'Analytics' }, { key: 'settings', label: 'Settings' }]}
        onSelect={onNavigate}
        selected="settings"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1, paddingLeft: navigation.rail, position: 'relative' },
  content: { flexGrow: 1, gap: 16, padding: 24, backgroundColor: '#F4F7FB' },
  card: { gap: 12, borderRadius: 18, padding: 20, backgroundColor: '#FFFFFF' },
  title: { color: '#0F172A', fontSize: 19, fontWeight: '800' },
  item: { color: '#475569', fontSize: 14 },
  note: { color: '#64748B', fontSize: 13, lineHeight: 20 },
});
