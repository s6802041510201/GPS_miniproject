import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon, IconName } from '@/components/AppIcon';
import { colors, navigation, radius, shadows, spacing } from '@/theme';

export type NavigationItem<Key extends string> = { key: Key; label: string };

type Props<Key extends string> = {
  items: NavigationItem<Key>[];
  selected: Key;
  onSelect: (key: Key) => void;
};

export function NavigationBar<Key extends string>({ items, selected, onSelect }: Props<Key>) {
  const [isOpen, setIsOpen] = useState(false);

  function selectItem(key: Key) {
    setIsOpen(false);
    onSelect(key);
  }

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      {isOpen ? <Pressable accessibilityLabel="Close navigation menu" accessibilityRole="button" onPress={() => setIsOpen(false)} style={styles.scrim} /> : null}
      {isOpen ? (
        <View style={styles.drawer}>
          <View style={styles.drawerHeader}>
            <Pressable accessibilityLabel="Close navigation menu" accessibilityRole="button" onPress={() => setIsOpen(false)} style={styles.hamburgerButton}>
              <AppIcon name="close" size={20} />
            </Pressable>
            <Text style={styles.drawerTitle}>Menu</Text>
          </View>
          <View style={styles.items}>
            {items.map((item) => {
              const isSelected = selected === item.key;
              return (
                <Pressable
                  accessibilityLabel={item.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={item.key}
                  onPress={() => selectItem(item.key)}
                  style={({ pressed }) => [
                    styles.item,
                    isSelected && styles.selectedItem,
                    pressed && styles.pressed,
                  ]}
                >
                  <AppIcon color={isSelected ? colors.accentDark : colors.body} name={getIconName(item.label)} size={21} />
                  <Text style={[styles.label, isSelected && styles.selectedLabel]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.rail}>
          <Pressable accessibilityLabel="Open navigation menu" accessibilityRole="button" onPress={() => setIsOpen(true)} style={({ pressed }) => [styles.hamburgerButton, pressed && styles.pressed]}>
            <AppIcon name="menu" size={20} />
          </Pressable>
          <View style={styles.railItems}>
            {items.map((item) => {
              const isSelected = selected === item.key;
              return (
                <Pressable
                  accessibilityLabel={item.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={item.key}
                  onPress={() => selectItem(item.key)}
                  style={({ pressed }) => [
                    styles.railItem,
                    isSelected && styles.railSelectedItem,
                    pressed && styles.pressed,
                  ]}
                >
                  <AppIcon color={isSelected ? colors.accentDark : colors.body} name={getIconName(item.label)} size={23} />
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

function getIconName(label: string): IconName {
  const icons: Record<string, IconName> = {
    Analytics: 'analytics',
    Dashboard: 'dashboard',
    History: 'history',
    Home: 'home',
    Profile: 'profile',
    Rooms: 'rooms',
    Sessions: 'sessions',
    Settings: 'settings',
    Students: 'students',
  };

  return icons[label] ?? 'dashboard';
}

const styles = StyleSheet.create({
  layer: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, zIndex: 50 },
  rail: { backgroundColor: colors.surface, borderColor: '#BFDBFE', borderRightWidth: 1, bottom: 0, boxShadow: shadows.card, left: 0, paddingTop: spacing.md, position: 'absolute', top: 0, width: navigation.rail },
  railItems: { gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.sm },
  railItem: { alignItems: 'center', borderRadius: radius.pill, height: 48, justifyContent: 'center', width: '100%' },
  railSelectedItem: { backgroundColor: '#BFE7FF' },
  scrim: { backgroundColor: 'rgba(15, 23, 42, 0.25)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  drawer: { backgroundColor: colors.surface, borderBottomRightRadius: radius.lg, borderColor: '#BFDBFE', borderRightWidth: 1, borderBottomWidth: 1, boxShadow: shadows.card, gap: spacing.lg, minHeight: '100%', padding: spacing.lg, width: navigation.drawer },
  drawerHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  drawerTitle: { color: colors.accentDark, fontSize: 18, fontWeight: '800' },
  items: { gap: spacing.sm },
  item: { alignItems: 'center', borderRadius: radius.pill, flexDirection: 'row', gap: spacing.md, justifyContent: 'flex-start', minHeight: 48, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, width: '100%' },
  selectedItem: { backgroundColor: '#BFE7FF' },
  label: { color: colors.accentDark, fontSize: 14, fontWeight: '800', lineHeight: 18, textAlign: 'left' },
  selectedLabel: { color: colors.accentDark },
  hamburgerButton: { alignItems: 'center', alignSelf: 'flex-start', height: 44, justifyContent: 'center', width: 44 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
