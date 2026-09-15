import { StyleSheet, Text, View } from 'react-native';
import { MapPoint } from './LocationMap';

type Props = {
  classroom: MapPoint & { roomName: string; radius: number };
  studentLocation?: MapPoint;
};

export function LocationMap({ classroom, studentLocation }: Props) {
  return (
    <View style={styles.fallback}>
      <Text style={styles.title}>Map preview</Text>
      <Text style={styles.text}>Classroom: {classroom.roomName}</Text>
      <Text style={styles.text}>Latitude: {classroom.latitude}</Text>
      <Text style={styles.text}>Longitude: {classroom.longitude}</Text>
      <Text style={styles.text}>Allowed radius: {classroom.radius} m</Text>
      {studentLocation ? (
        <Text style={styles.text}>Student location: {studentLocation.latitude.toFixed(5)}, {studentLocation.longitude.toFixed(5)}</Text>
      ) : null}
      <Text style={styles.note}>Interactive maps are available on Android and iOS.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { gap: 6, justifyContent: 'center', minHeight: 180, borderRadius: 16, padding: 18, backgroundColor: '#E8F0FE' },
  title: { color: '#1E3A8A', fontSize: 16, fontWeight: '800' },
  text: { color: '#1E40AF', fontSize: 13 },
  note: { color: '#64748B', fontSize: 12, marginTop: 6 },
});
