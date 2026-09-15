import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing } from '@/theme';

export type NavigationItem<Key extends string> = { key: Key; label: string };

type Props<Key extends string> = {
  items: NavigationItem<Key>[];
  selected: Key;
  onSelect: (key: Key) => void;
};

export function NavigationBar<Key extends string>({ items, selected, onSelect }: Props<Key>) {
  return (
    <View style={styles.container}>
      {items.map((item) => {
        const isSelected = selected === item.key;
        return (
          <Pressable
            accessibilityLabel={item.label}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            hitSlop={2}
            key={item.key}
            onPress={() => onSelect(item.key)}
            style={({ pressed }) => [
              styles.item,
              isSelected && styles.selectedItem,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, isSelected && styles.selectedLabel]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: spacing.xs, borderRadius: radius.lg, padding: spacing.xs, backgroundColor: colors.surface, boxShadow: shadows.card },
  item: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 48, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  selectedItem: { backgroundColor: colors.accentSoft },
  label: { color: colors.muted, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  selectedLabel: { color: colors.accentDark },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
});
