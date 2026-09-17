import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AppIcon, IconName } from '@/components/AppIcon';
import { colors, radius, spacing } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ label, onPress, disabled = false, variant = 'primary', icon, style }: Props) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <View style={styles.content}>
        {icon ? <AppIcon color={variant === 'secondary' ? colors.accentDark : colors.surface} name={icon} size={18} /> : null}
        <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primary: { backgroundColor: colors.accent, borderColor: colors.accentDark },
  secondary: { backgroundColor: colors.accentPale, borderColor: '#93C5FD' },
  danger: { backgroundColor: colors.danger, borderColor: '#991B1B' },
  label: { color: colors.surface, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  secondaryLabel: { color: '#1E3A8A' },
  content: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
