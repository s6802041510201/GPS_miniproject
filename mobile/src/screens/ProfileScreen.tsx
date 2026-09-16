import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DecorativeBackdrop } from '@/components/DecorativeBackdrop';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { NavigationBar } from '@/components/NavigationBar';
import { User } from '@/services/api';
import { navigation } from '@/theme';

type Props = { user: User; onBack: () => void; onLogout: () => void; onNavigate: (key: 'home' | 'history' | 'profile') => void };

export function ProfileScreen({ user, onBack, onLogout, onNavigate }: Props) {
  return (
    <View style={styles.screenRoot}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <DecorativeBackdrop />
      <ScreenHeader onBack={onBack} subtitle="Account details" title="Profile" />
      <View style={styles.avatar}><Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text></View>
      <View style={styles.card}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.role}>{user.role === 'student' ? 'Student account' : 'Teacher account'}</Text>
        <View style={styles.details}>
          <Text style={styles.label}>User ID</Text>
          <Text selectable style={styles.value}>{user.userCode}</Text>
          <Text style={styles.label}>Email</Text>
          <Text selectable style={styles.value}>{user.email}</Text>
        </View>
      </View>
      <PrimaryButton label="Log out" onPress={onLogout} variant="danger" />
      </ScrollView>
      <NavigationBar
        items={[{ key: 'home', label: 'Home' }, { key: 'history', label: 'History' }, { key: 'profile', label: 'Profile' }]}
        onSelect={onNavigate}
        selected="profile"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1, paddingLeft: navigation.rail, position: 'relative' },
  content: { alignItems: 'stretch', flexGrow: 1, gap: 18, padding: 24, backgroundColor: '#F4F7FB' },
  avatar: { alignItems: 'center', alignSelf: 'center', justifyContent: 'center', width: 88, height: 88, borderRadius: 44, backgroundColor: '#DBEAFE' },
  avatarText: { color: '#1D4ED8', fontSize: 38, fontWeight: '800' },
  card: { gap: 8, borderRadius: 20, padding: 20, backgroundColor: '#FFFFFF' },
  name: { color: '#0F172A', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  role: { color: '#2563EB', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  details: { gap: 5, marginTop: 14 },
  label: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  value: { color: '#0F172A', fontSize: 16, marginBottom: 8 },
});
