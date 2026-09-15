import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

export function DecorativeBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.orb, styles.orbTop]} />
      <View style={[styles.orb, styles.orbBottom]} />
      <View style={styles.accentLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: { position: 'absolute', borderRadius: 999 },
  orbTop: { width: 260, height: 260, top: -150, right: -100, backgroundColor: colors.accentSoft, opacity: 0.9 },
  orbBottom: { width: 220, height: 220, bottom: -130, left: -100, backgroundColor: '#BFDBFE', opacity: 0.5 },
  accentLine: { position: 'absolute', top: 110, right: -35, width: 190, height: 2, backgroundColor: colors.accent, opacity: 0.18, transform: [{ rotate: '-28deg' }] },
});
