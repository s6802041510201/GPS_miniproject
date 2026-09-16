import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

export type IconName =
  | 'analytics'
  | 'back'
  | 'calendar'
  | 'check'
  | 'close'
  | 'dashboard'
  | 'history'
  | 'home'
  | 'map'
  | 'menu'
  | 'profile'
  | 'refresh'
  | 'rooms'
  | 'sessions'
  | 'settings'
  | 'students';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
};

export function AppIcon({ name, size = 22, color = colors.accentDark }: Props) {
  const stroke = Math.max(2, Math.round(size * 0.1));
  const line = { backgroundColor: color, borderRadius: size };
  const lineStyle = { ...line, height: stroke, width: size * 0.72 };

  if (name === 'menu') {
    return <View style={[styles.icon, { height: size, width: size, gap: size * 0.14 }]}><View style={lineStyle} /><View style={lineStyle} /><View style={lineStyle} /></View>;
  }

  if (name === 'refresh' || name === 'history') {
    return (
      <View style={[styles.icon, { height: size, width: size }]}>
        <View style={[styles.circle, { borderColor: color, borderWidth: stroke, height: size * 0.68, width: size * 0.68 }]} />
        <View style={[styles.arrowHead, { borderBottomColor: color, borderRightColor: color, borderBottomWidth: stroke, borderRightWidth: stroke, height: size * 0.22, width: size * 0.22, right: size * 0.03, top: size * 0.09, transform: [{ rotate: '22deg' }] }]} />
        <View style={[line, { height: stroke, position: 'absolute', right: size * 0.02, top: size * 0.07, transform: [{ rotate: '8deg' }], width: size * 0.28 }]} />
      </View>
    );
  }

  if (name === 'back') {
    return <View style={[styles.icon, { height: size, width: size }]}><View style={[line, { height: stroke, position: 'absolute', right: size * 0.08, width: size * 0.62 }]} /><View style={[styles.chevron, { borderBottomColor: color, borderLeftColor: color, borderBottomWidth: stroke, borderLeftWidth: stroke, height: size * 0.34, left: size * 0.12, transform: [{ rotate: '45deg' }], width: size * 0.34 }]} /></View>;
  }

  if (name === 'close') {
    return <View style={[styles.icon, { height: size, width: size }]}><View style={[line, { position: 'absolute', transform: [{ rotate: '45deg' }], width: size * 0.78 }]} /><View style={[line, { position: 'absolute', transform: [{ rotate: '-45deg' }], width: size * 0.78 }]} /></View>;
  }

  if (name === 'check') {
    return <View style={[styles.icon, { height: size, width: size }]}><View style={[line, { height: stroke, position: 'absolute', left: size * 0.13, transform: [{ rotate: '45deg' }], width: size * 0.32 }]} /><View style={[line, { height: stroke, position: 'absolute', left: size * 0.31, transform: [{ rotate: '-45deg' }], width: size * 0.55 }]} /></View>;
  }

  if (name === 'home') {
    return <View style={[styles.icon, { height: size, width: size }]}><View style={[styles.roof, { borderBottomColor: color, borderBottomWidth: size * 0.34, borderLeftWidth: size * 0.35, borderRightWidth: size * 0.35, left: size * 0.15, top: size * 0.03 }]} /><View style={[styles.house, { borderColor: color, borderWidth: stroke, bottom: size * 0.1, height: size * 0.42, left: size * 0.25, width: size * 0.5 }]} /><View style={[styles.door, { backgroundColor: color, bottom: size * 0.1, height: size * 0.24, left: size * 0.43, width: stroke }]} /></View>;
  }

  if (name === 'map') {
    return <View style={[styles.icon, { height: size, width: size }]}><View style={[styles.mapPanel, { borderColor: color, borderWidth: stroke, height: size * 0.6, width: size * 0.72 }]} /><View style={[line, { height: stroke * 0.7, position: 'absolute', transform: [{ rotate: '68deg' }], width: size * 0.5 }]} /><View style={[line, { height: stroke * 0.7, position: 'absolute', transform: [{ rotate: '-68deg' }], width: size * 0.5 }]} /></View>;
  }

  if (name === 'profile' || name === 'students') {
    return <View style={[styles.icon, { height: size, width: size }]}><View style={[styles.head, { backgroundColor: color, height: size * 0.27, top: size * 0.08, width: size * 0.27 }]} /><View style={[styles.shoulders, { borderColor: color, borderWidth: stroke, bottom: size * 0.08, height: size * 0.35, width: size * 0.62 }]} />{name === 'students' ? <View style={[styles.smallHead, { backgroundColor: color, height: size * 0.16, right: size * 0.04, top: size * 0.2, width: size * 0.16 }]} /> : null}</View>;
  }

  if (name === 'calendar' || name === 'sessions') {
    return <View style={[styles.icon, { height: size, width: size }]}><View style={[styles.calendar, { borderColor: color, borderWidth: stroke, borderRadius: size * 0.12, height: size * 0.65, width: size * 0.68 }]} /><View style={[line, { position: 'absolute', top: size * 0.27, width: size * 0.56 }]} /><View style={[line, { position: 'absolute', top: size * 0.13, width: stroke, height: size * 0.14 }]} /><View style={[line, { position: 'absolute', right: size * 0.25, top: size * 0.13, width: stroke, height: size * 0.14 }]} />{name === 'sessions' ? <View style={[line, { bottom: size * 0.2, height: stroke, width: size * 0.18 }]} /> : null}</View>;
  }

  if (name === 'analytics') {
    return <View style={[styles.icon, { alignItems: 'flex-end', flexDirection: 'row', gap: size * 0.1, height: size, justifyContent: 'center', width: size }]}><View style={[line, { height: size * 0.35, width: size * 0.16 }]} /><View style={[line, { height: size * 0.58, width: size * 0.16 }]} /><View style={[line, { height: size * 0.8, width: size * 0.16 }]} /></View>;
  }

  if (name === 'dashboard') {
    return <View style={[styles.icon, { flexDirection: 'row', flexWrap: 'wrap', gap: size * 0.1, height: size * 0.72, width: size * 0.72 }]}>{[0, 1, 2, 3].map((item) => <View key={item} style={[line, { borderRadius: size * 0.08, height: size * 0.28, width: size * 0.28 }]} />)}</View>;
  }

  if (name === 'settings') {
    return <View style={[styles.icon, { height: size, width: size }]}><View style={[styles.gear, { borderColor: color, borderWidth: stroke, height: size * 0.58, width: size * 0.58 }]} /><View style={[styles.gearCenter, { backgroundColor: color, height: size * 0.16, width: size * 0.16 }]} /></View>;
  }

  return <View style={[styles.icon, { height: size, width: size }]} />;
}

const styles = StyleSheet.create({
  icon: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  arrowHead: { position: 'absolute' },
  calendar: { position: 'absolute' },
  circle: { borderRadius: 999, position: 'absolute' },
  chevron: { position: 'absolute' },
  door: { position: 'absolute' },
  gear: { borderRadius: 999 },
  gearCenter: { borderRadius: 999, position: 'absolute' },
  head: { borderRadius: 999, position: 'absolute' },
  house: { position: 'absolute' },
  mapPanel: { position: 'absolute' },
  roof: { height: 0, position: 'absolute', width: 0 },
  shoulders: { borderRadius: 999, position: 'absolute' },
  smallHead: { borderRadius: 999, position: 'absolute' },
});
