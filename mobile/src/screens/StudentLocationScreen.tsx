import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LocationMap, MapPoint } from '@/components/LocationMap';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Course, User } from '@/services/api';
import { GPS_ACCURACY_LIMIT_METERS } from '@/constants/config';
import { colors, radius, shadows, spacing } from '@/theme';
import { calculateDistanceInMeters } from '@/utils/distance';
import { formatDistance } from '@/utils/format';

export type StudentLocation = MapPoint & { accuracy: number | null };

type CheckInMessage = { kind: 'success' | 'error' | 'info'; text: string };

type Props = {
  user: User;
  course: Course;
  studentLocation?: StudentLocation;
  checkInMessage?: CheckInMessage | null;
  onBack: () => void;
  onCheckIn: (location: StudentLocation) => void;
  isChecking: boolean;
};

export function StudentLocationScreen({ user, course, studentLocation, checkInMessage, onBack, onCheckIn, isChecking }: Props) {
  const [currentLocation, setCurrentLocation] = useState<StudentLocation | undefined>(studentLocation);
  const [locationState, setLocationState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);

  async function refreshLocation() {
    setIsRefreshingLocation(true);
    setLocationState('loading');
    setLocationError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) throw new Error('Location permission was denied. Please allow location access to refresh GPS.');
      if (!(await Location.hasServicesEnabledAsync())) throw new Error('Location services are turned off. Please enable GPS and try again.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCurrentLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
      setLocationState('ready');
    } catch (error) {
      setLocationState('error');
      setLocationError(error instanceof Error ? error.message : 'Unable to refresh your location.');
    } finally {
      setIsRefreshingLocation(false);
    }
  }

  useEffect(() => {
    let active = true;
    let subscription: Location.LocationSubscription | null = null;

    async function startLocationTracking() {
      try {
        setLocationState('loading');
        setLocationError(null);
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== Location.PermissionStatus.GRANTED) {
          throw new Error('Location permission was denied. Please allow location access to use map check-in.');
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          throw new Error('Location services are turned off. Please enable GPS and try again.');
        }

        const initialPosition = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!active) return;
        setCurrentLocation({
          latitude: initialPosition.coords.latitude,
          longitude: initialPosition.coords.longitude,
          accuracy: initialPosition.coords.accuracy,
        });
        setLocationState('ready');

        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 1, timeInterval: 2000 },
          (position) => {
            if (!active) return;
            setCurrentLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
            setLocationState('ready');
          },
        );

        if (!active) subscription.remove();
      } catch (error) {
        if (!active) return;
        setLocationState('error');
        setLocationError(error instanceof Error ? error.message : 'Unable to read your location.');
      }
    }

    void startLocationTracking();
    return () => {
      active = false;
      subscription?.remove();
    };
  }, [course.id]);

  const distance = useMemo(() => currentLocation
    ? calculateDistanceInMeters(currentLocation.latitude, currentLocation.longitude, course.latitude, course.longitude)
    : null, [course.latitude, course.longitude, currentLocation]);
  const accuracyIsLow = currentLocation?.accuracy != null && currentLocation.accuracy > GPS_ACCURACY_LIMIT_METERS;
  const isInsideGeofence = distance != null && distance <= course.radius;
  const canCheckIn = Boolean(
    locationState === 'ready'
      && currentLocation
      && isInsideGeofence
      && !accuracyIsLow
      && course.checkInAllowed === true
      && !isChecking,
  );

  function getLocationMessage() {
    if (checkInMessage) return checkInMessage.text;
    if (locationError) return locationError;
    if (locationState === 'loading') return 'Requesting GPS location...';
    if (!currentLocation) return 'Waiting for your current location...';
    if (accuracyIsLow) return `GPS accuracy is ${formatDistance(currentLocation.accuracy)}. Move to an open area for a more accurate reading.`;
    if (course.checkInAllowed !== true) {
      if (course.sessionStatus === 'upcoming') return `Check-in opens at ${course.checkInOpenTime ?? 'the scheduled time'}.`;
      if (course.sessionStatus === 'scheduled') return 'Waiting for the teacher to open check-in.';
      if (course.sessionStatus === 'closed_by_teacher') return 'Check-in was closed by the teacher.';
      if (course.sessionStatus === 'cancelled') return 'This session was cancelled.';
      return 'Check-in is not available for this session.';
    }
    if (!isInsideGeofence) return `Outside check-in area. Move ${formatDistance((distance ?? 0) - course.radius)} closer to the classroom.`;
    return 'You are inside the classroom check-in area.';
  }

  return (
    <View style={styles.screenRoot}>
      <View style={styles.mapLayer}>
        <LocationMap classroom={course} fullScreen studentLocation={currentLocation} />
      </View>
      <View style={styles.headerOverlay}>
        <ScreenHeader onBack={onBack} subtitle={`Student ID: ${user.userCode}`} title="Map check-in" />
      </View>
      <View style={styles.bottomCard}>
        <View style={styles.courseHeader}>
          <View style={styles.courseCopy}>
            <Text style={styles.courseCode}>{course.courseCode}</Text>
            <Text style={styles.courseName}>{course.courseName}</Text>
            <Text style={styles.classroom}>{course.buildingCode ? `Building ${course.buildingCode} • ` : ''}{course.roomName}</Text>
          </View>
          <View style={[styles.locationBadge, isInsideGeofence && styles.locationBadgeInside]}><Text style={styles.locationBadgeText}>{isInsideGeofence ? 'IN RANGE' : 'GPS'}</Text></View>
        </View>
        <View style={styles.metricsRow}>
          <Metric label="Distance" value={formatDistance(distance)} />
          <Metric label="Allowed radius" value={formatDistance(course.radius)} />
          <Metric label="GPS accuracy" value={formatDistance(currentLocation?.accuracy)} />
        </View>
        <View style={[styles.statusMessage, checkInMessage?.kind === 'error' ? styles.errorMessage : checkInMessage?.kind === 'success' ? styles.successMessage : styles.infoMessage]}>
          <Text style={styles.statusText}>{getLocationMessage()}</Text>
        </View>
        <PrimaryButton disabled={isRefreshingLocation || isChecking} icon="refresh" label={isRefreshingLocation ? 'Refreshing location...' : 'Refresh location'} onPress={() => void refreshLocation()} variant="secondary" />
        <PrimaryButton
          disabled={!canCheckIn}
          label={isChecking ? 'Checking in...' : canCheckIn ? 'Check in now' : getButtonLabel({ accuracyIsLow, course, distance, isInsideGeofence, locationState })}
          onPress={() => { if (currentLocation && canCheckIn) onCheckIn(currentLocation); }}
        />
      </View>
    </View>
  );
}

function getButtonLabel({ accuracyIsLow, course, distance, isInsideGeofence, locationState }: { accuracyIsLow: boolean; course: Course; distance: number | null; isInsideGeofence: boolean; locationState: 'loading' | 'ready' | 'error' }) {
  if (locationState === 'loading') return 'Locating you...';
  if (locationState === 'error') return 'Location unavailable';
  if (accuracyIsLow) return 'Improving GPS accuracy...';
  if (course.checkInAllowed !== true) return 'Check-in not open';
  if (!isInsideGeofence) return `Move closer • ${formatDistance((distance ?? 0) - course.radius)}`;
  return 'Check in now';
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screenRoot: { backgroundColor: colors.canvas, flex: 1, position: 'relative' },
  mapLayer: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  headerOverlay: { backgroundColor: 'rgba(255,255,255,0.92)', left: 0, padding: spacing.lg, paddingTop: spacing.xl, position: 'absolute', right: 0, top: 0 },
  bottomCard: { backgroundColor: 'rgba(255,255,255,0.97)', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, bottom: 0, gap: spacing.md, left: 0, padding: spacing.lg, position: 'absolute', right: 0, boxShadow: shadows.overlay },
  courseHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  courseCopy: { flex: 1, gap: spacing.xs },
  courseCode: { color: colors.accent, fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  courseName: { color: colors.text, fontSize: 20, fontWeight: '900' },
  classroom: { color: colors.body, fontSize: 13, fontWeight: '700' },
  locationBadge: { backgroundColor: colors.warningSoft, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  locationBadgeInside: { backgroundColor: colors.successSoft },
  locationBadgeText: { color: colors.body, fontSize: 11, fontWeight: '900' },
  metricsRow: { flexDirection: 'row', gap: spacing.sm },
  metric: { backgroundColor: colors.accentPale, borderRadius: radius.sm, flex: 1, gap: spacing.xs, padding: spacing.sm },
  metricLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  metricValue: { color: colors.accentDark, fontSize: 15, fontWeight: '900' },
  statusMessage: { borderRadius: radius.sm, padding: spacing.md },
  infoMessage: { backgroundColor: colors.accentPale },
  successMessage: { backgroundColor: colors.successSoft },
  errorMessage: { backgroundColor: colors.dangerSoft },
  statusText: { color: colors.body, fontSize: 13, lineHeight: 19 },
});
