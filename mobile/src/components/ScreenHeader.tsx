import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '@/components/AppIcon';
import { colors, spacing } from '@/theme';

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
            <AppIcon name="back" size={20} />
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
          <View style={styles.logoutContent}><AppIcon color={colors.danger} name="logout" size={17} /><Text style={styles.logout}>Log out</Text></View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  titleBlock: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: spacing.sm, minWidth: 0 },
  titleContent: { flexShrink: 1, minWidth: 0 },
  backButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingHorizontal: 6 },
  back: { color: '#1D4ED8', fontSize: 14, fontWeight: '800' },
  title: { color: colors.text, flexShrink: 1, fontSize: 24, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 2 },
  logoutButton: { alignItems: 'center', borderColor: '#FCA5A5', borderRadius: 10, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: 12 },
  logout: { color: colors.danger, flexShrink: 0, fontSize: 13, fontWeight: '800' },
  logoutContent: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
});
