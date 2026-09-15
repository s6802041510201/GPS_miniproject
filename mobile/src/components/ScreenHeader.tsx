import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onLogout?: () => void;
};

export function ScreenHeader({ title, subtitle, onBack, onLogout }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.titleBlock}>
        {onBack ? (
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={4}
            onPress={onBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Text style={styles.back}>Back</Text>
          </Pressable>
        ) : null}
        <View style={styles.titleContent}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {onLogout ? (
        <Pressable
          accessibilityLabel="Log out"
          accessibilityRole="button"
          hitSlop={4}
          onPress={onLogout}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
        >
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  titleBlock: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 8, minWidth: 0 },
  titleContent: { flexShrink: 1, minWidth: 0 },
  backButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingHorizontal: 6 },
  back: { color: '#1D4ED8', fontSize: 14, fontWeight: '800' },
  title: { color: '#0F172A', flexShrink: 1, fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#64748B', fontSize: 13, marginTop: 2 },
  logoutButton: { alignItems: 'center', borderColor: '#FCA5A5', borderRadius: 10, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: 12 },
  logout: { color: '#B91C1C', flexShrink: 0, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
});
