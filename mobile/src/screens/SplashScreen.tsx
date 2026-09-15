import { StyleSheet, Text, View } from 'react-native';
import { DecorativeBackdrop } from '@/components/DecorativeBackdrop';
import { colors, radius, spacing } from '@/theme';

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <DecorativeBackdrop />
      <View style={styles.brandMark}>
        <View style={styles.pinHead}>
          <View style={styles.pinCore} />
        </View>
        <View style={styles.pinTail} />
        <View style={styles.mapShape} />
      </View>
      <Text style={styles.title}>Geo-Attendance</Text>
      <Text style={styles.subtitle}>Be Present, Build Your Future</Text>
      <View style={styles.statusLine}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>GPS-powered classroom attendance</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', backgroundColor: colors.canvas, flex: 1, justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  brandMark: { alignItems: 'center', height: 148, justifyContent: 'center', marginBottom: spacing.sm, width: 190 },
  mapShape: { backgroundColor: '#60A5FA', borderRadius: radius.pill, bottom: 18, height: 24, opacity: 0.9, position: 'absolute', transform: [{ rotate: '-7deg' }], width: 140 },
  pinHead: { alignItems: 'center', backgroundColor: colors.accent, borderColor: colors.surface, borderRadius: radius.pill, borderWidth: 6, height: 76, justifyContent: 'center', shadowColor: colors.accentDark, shadowOpacity: 0.25, shadowRadius: 10, transform: [{ translateY: -12 }], width: 76, zIndex: 2 },
  pinCore: { backgroundColor: colors.surface, borderRadius: radius.pill, height: 22, width: 22 },
  pinTail: { backgroundColor: colors.accentDark, bottom: 45, height: 34, position: 'absolute', transform: [{ rotate: '45deg' }], width: 34, zIndex: 1 },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.accentDark, fontSize: 16, fontWeight: '700' },
  statusLine: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  statusDot: { backgroundColor: '#22C55E', borderRadius: radius.pill, height: 8, width: 8 },
  statusText: { color: colors.muted, fontSize: 12 },
});
