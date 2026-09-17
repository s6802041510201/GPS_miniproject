import { useEffect, useRef } from 'react';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Platform, StyleSheet, View } from 'react-native';
import { MapPoint } from './LocationMap';

type Props = {
  classroom: MapPoint & { roomName: string; radius: number };
  studentLocation?: MapPoint;
  fullScreen?: boolean;
};

export function LocationMap({ classroom, studentLocation, fullScreen = false }: Props) {
  const center = studentLocation ?? classroom;
  const mapRef = useRef<MapView>(null);
  const hasFittedCoordinates = useRef(false);

  function fitToVisibleCoordinates() {
    if (!mapRef.current) return;
    if (studentLocation) {
      mapRef.current.fitToCoordinates([classroom, studentLocation], {
        animated: true,
        edgePadding: { top: 180, right: 70, bottom: 280, left: 70 },
      });
    } else {
      mapRef.current.animateToRegion({
        latitude: classroom.latitude,
        longitude: classroom.longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      }, 500);
    }
  }

  useEffect(() => {
    if (!hasFittedCoordinates.current && studentLocation) {
      hasFittedCoordinates.current = true;
      fitToVisibleCoordinates();
    }
  }, [studentLocation]);

  return (
    <View style={[styles.container, fullScreen && styles.fullScreenContainer]}>
      <MapView
        ref={mapRef}
        initialRegion={{
          latitude: center.latitude,
          longitude: center.longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        }}
        onMapReady={fitToVisibleCoordinates}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        showsUserLocation={Boolean(studentLocation)}
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
  fullScreenContainer: { borderRadius: 0, flex: 1, height: undefined },
  map: { flex: 1 },
});
