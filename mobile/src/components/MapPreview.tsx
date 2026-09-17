import { StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '@/components/AppIcon';
import { colors, radius, spacing } from '@/theme';
import type { MapPoint } from '@/components/LocationMap';

type Props = {
  classroom: MapPoint & { roomName: string; radius: number };
  studentLocation?: MapPoint;
  fullScreen?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getStudentPosition(classroom: MapPoint, studentLocation?: MapPoint) {
  if (!studentLocation) return { left: 76, top: 64 };
  const longitudeDelta = (studentLocation.longitude - classroom.longitude) * 100000;
  const latitudeDelta = (studentLocation.latitude - classroom.latitude) * 100000;
  return {
    left: clamp(50 + longitudeDelta * 0.85, 12, 88),
    top: clamp(50 - latitudeDelta * 0.85, 18, 84),
  };
}

export function MapPreview({ classroom, studentLocation, fullScreen = false }: Props) {
  const studentPosition = getStudentPosition(classroom, studentLocation);

  return (
    <View style={[styles.map, fullScreen && styles.fullScreen]}>
      <View style={styles.mapWash} />
      <View style={styles.gridHorizontal} />
      <View style={styles.gridVertical} />
      <View style={[styles.road, styles.roadMain]} />
      <View style={[styles.road, styles.roadCross]} />
      <View style={[styles.road, styles.roadDiagonal]} />
      <View style={[styles.roadLabel, styles.roadLabelMain]}>Prachasongkroh Road</View>
      <View style={[styles.roadLabel, styles.roadLabelCross]}>Campus Avenue</View>

      <View style={[styles.block, styles.blockOne]} />
      <View style={[styles.block, styles.blockTwo]} />
      <View style={[styles.block, styles.blockThree]} />
      <View style={[styles.block, styles.blockFour]} />
      <View style={[styles.park, styles.parkOne]}><Text style={styles.parkLabel}>Campus green</Text></View>
      <View style={[styles.park, styles.parkTwo]} />

      <View style={styles.mapHeader}>
        <View style={styles.mapHeaderIcon}><AppIcon color={colors.accentDark} name="map" size={16} /></View>
        <View>
          <Text style={styles.mapTitle}>Campus location</Text>
          <Text style={styles.mapSubtitle}>GPS position overview</Text>
        </View>
      </View>

      <View style={styles.classroomMarkerHalo} />
      <View style={styles.classroomMarker}>
        <AppIcon color={colors.surface} name="rooms" size={18} />
      </View>
      <View style={styles.classroomLabel}>
        <Text style={styles.labelTitle}>{classroom.roomName}</Text>
        <Text style={styles.labelText}>Classroom</Text>
      </View>

      <View style={[styles.studentMarkerHalo, { left: `${studentPosition.left}%`, top: `${studentPosition.top}%` }]} />
      <View style={[styles.studentMarker, { left: `${studentPosition.left}%`, top: `${studentPosition.top}%` }]}>
        <AppIcon color={colors.surface} name="location" size={18} />
      </View>
      <View style={[styles.studentLabel, { left: `${studentPosition.left}%`, top: `${studentPosition.top + 7}%` }]}>
        <Text style={styles.labelTitle}>You</Text>
        <Text style={styles.labelText}>{studentLocation ? 'Current position' : 'Waiting for GPS'}</Text>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendRow}><View style={[styles.legendDot, styles.legendClassroom]} /><Text style={styles.legendText}>Classroom</Text></View>
        <View style={styles.legendRow}><View style={[styles.legendDot, styles.legendStudent]} /><Text style={styles.legendText}>Your position</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { backgroundColor: '#DCEBEB', borderRadius: radius.lg, minHeight: 220, overflow: 'hidden', position: 'relative' },
  fullScreen: { borderRadius: 0, flex: 1 },
  mapWash: { backgroundColor: '#E8F3F1', bottom: 0, left: 0, opacity: 0.9, position: 'absolute', right: 0, top: 0 },
  gridHorizontal: { borderBottomColor: 'rgba(37, 99, 235, 0.08)', borderBottomWidth: 1, borderTopColor: 'rgba(37, 99, 235, 0.08)', borderTopWidth: 1, height: '34%', left: 0, position: 'absolute', right: 0, top: '31%' },
  gridVertical: { borderLeftColor: 'rgba(37, 99, 235, 0.08)', borderLeftWidth: 1, borderRightColor: 'rgba(37, 99, 235, 0.08)', borderRightWidth: 1, bottom: 0, position: 'absolute', right: '28%', top: 0, width: '24%' },
  road: { backgroundColor: '#FFFFFF', opacity: 0.95, position: 'absolute' },
  roadMain: { height: 22, left: -20, right: -20, top: '52%', transform: [{ rotate: '-7deg' }] },
  roadCross: { bottom: -35, left: '47%', top: -35, transform: [{ rotate: '10deg' }], width: 18 },
  roadDiagonal: { height: 12, left: -25, right: '35%', top: '22%', transform: [{ rotate: '28deg' }] },
  roadLabel: { color: '#7A9292', fontSize: 9, fontWeight: '700', position: 'absolute' },
  roadLabelMain: { right: '7%', top: '57%', transform: [{ rotate: '-7deg' }] },
  roadLabelCross: { left: '49%', top: '16%', transform: [{ rotate: '10deg' }] },
  block: { backgroundColor: '#B9D8D4', borderColor: '#9BC5C1', borderRadius: 6, borderWidth: 1, position: 'absolute' },
  blockOne: { height: 48, left: '10%', top: '21%', width: 78 },
  blockTwo: { height: 36, right: '11%', top: '23%', width: 64 },
  blockThree: { bottom: '11%', height: 44, left: '10%', width: 70 },
  blockFour: { bottom: '13%', height: 34, right: '10%', width: 84 },
  park: { backgroundColor: '#A9D7B8', borderRadius: radius.md, opacity: 0.85, position: 'absolute' },
  parkOne: { height: 54, left: '35%', top: '7%', width: 76 },
  parkTwo: { bottom: '5%', height: 44, left: '48%', width: 56 },
  parkLabel: { color: '#3F7B60', fontSize: 9, fontWeight: '700', left: 8, position: 'absolute', top: 18 },
  mapHeader: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, left: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, position: 'absolute', top: spacing.md },
  mapHeaderIcon: { alignItems: 'center', backgroundColor: colors.accentPale, borderRadius: radius.sm, height: 30, justifyContent: 'center', width: 30 },
  mapTitle: { color: colors.text, fontSize: 12, fontWeight: '800' },
  mapSubtitle: { color: colors.muted, fontSize: 10, marginTop: 2 },
  classroomMarkerHalo: { backgroundColor: 'rgba(37, 99, 235, 0.16)', borderRadius: 999, height: 54, left: '50%', position: 'absolute', top: '50%', transform: [{ translateX: -27 }, { translateY: -27 }], width: 54 },
  classroomMarker: { alignItems: 'center', backgroundColor: colors.accent, borderColor: colors.surface, borderRadius: 999, borderWidth: 3, height: 34, justifyContent: 'center', left: '50%', position: 'absolute', top: '50%', transform: [{ translateX: -17 }, { translateY: -17 }], width: 34 },
  classroomLabel: { backgroundColor: colors.surface, borderRadius: radius.sm, boxShadow: '0 2px 8px rgba(15, 23, 42, 0.14)', left: '50%', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, position: 'absolute', top: '58%', transform: [{ translateX: -42 }] },
  studentMarkerHalo: { backgroundColor: 'rgba(22, 163, 74, 0.16)', borderRadius: 999, height: 54, position: 'absolute', transform: [{ translateX: -27 }, { translateY: -27 }], width: 54 },
  studentMarker: { alignItems: 'center', backgroundColor: '#16A34A', borderColor: colors.surface, borderRadius: 999, borderWidth: 3, height: 34, justifyContent: 'center', position: 'absolute', transform: [{ translateX: -17 }, { translateY: -17 }], width: 34 },
  studentLabel: { backgroundColor: colors.surface, borderRadius: radius.sm, boxShadow: '0 2px 8px rgba(15, 23, 42, 0.14)', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, position: 'absolute', transform: [{ translateX: -30 }] },
  labelTitle: { color: colors.text, fontSize: 11, fontWeight: '800' },
  labelText: { color: colors.muted, fontSize: 9, marginTop: 2 },
  legend: { backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: radius.sm, bottom: spacing.md, gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, position: 'absolute', right: spacing.md },
  legendRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  legendDot: { borderRadius: 999, height: 9, width: 9 },
  legendClassroom: { backgroundColor: colors.accent },
  legendStudent: { backgroundColor: '#16A34A' },
  legendText: { color: colors.body, fontSize: 10, fontWeight: '700' },
});
