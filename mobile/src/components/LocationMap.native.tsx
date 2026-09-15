import MapView, { Circle, Marker } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';
import { MapPoint } from './LocationMap';

type Props = {
  classroom: MapPoint & { roomName: string; radius: number };
  studentLocation?: MapPoint;
};

export function LocationMap({ classroom, studentLocation }: Props) {
  const center = studentLocation ?? classroom;

  return (
    <View style={styles.container}>
      <MapView
        initialRegion={{
          latitude: center.latitude,
          longitude: center.longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        }}
        style={styles.map}
      >
        <Circle
          center={classroom}
          fillColor="rgba(37, 99, 235, 0.18)"
          radius={classroom.radius}
          strokeColor="#2563EB"
          strokeWidth={2}
        />
        <Marker coordinate={classroom} title={classroom.roomName} description="Classroom location" />
        {studentLocation ? <Marker coordinate={studentLocation} pinColor="#16A34A" title="Student location" /> : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', height: 220, borderRadius: 16 },
  map: { flex: 1 },
});
