import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { AppIcon, IconName } from '@/components/AppIcon';
import { colors, radius, shadows, spacing } from '@/theme';

type Props = {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({ icon, label, onPress, disabled = false, style }: Props) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && !disabled && styles.pressed, style]}
    >
      <AppIcon name={icon} size={22} color={colors.accentDark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', backgroundColor: colors.accentPale, borderColor: '#93C5FD', borderRadius: radius.sm, borderWidth: 1, boxShadow: shadows.card, height: 48, justifyContent: 'center', padding: spacing.sm, width: 48 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.94 }] },
});
