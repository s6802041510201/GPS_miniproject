import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DecorativeBackdrop } from '@/components/DecorativeBackdrop';
import { LocationMap, MapPoint } from '@/components/LocationMap';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Course, User } from '@/services/api';
import { formatDistance } from '@/utils/format';

type Props = {
  user: User;
  course: Course;
  studentLocation?: MapPoint;
  onBack: () => void;
  onCheckIn: () => void;
  isChecking: boolean;
};

export function StudentLocationScreen({ user, course, studentLocation, onBack, onCheckIn, isChecking }: Props) {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <DecorativeBackdrop />
      <ScreenHeader onBack={onBack} subtitle={`Student ID: ${user.userCode}`} title="Course detail" />
      <View style={styles.headerCard}>
        <Text style={styles.courseCode}>{course.courseCode}</Text>
        <Text style={styles.courseName}>{course.courseName}</Text>
        <Text style={styles.detail}>Classroom: {course.roomName}</Text>
      </View>
      <LocationMap classroom={course} studentLocation={studentLocation} />
      <View style={styles.infoCard}>
        <Text style={styles.label}>Allowed radius</Text>
        <Text style={styles.value}>{formatDistance(course.radius)}</Text>
        <Text style={styles.label}>Student GPS</Text>
        <Text selectable style={styles.value}>{studentLocation ? `${studentLocation.latitude.toFixed(5)}, ${studentLocation.longitude.toFixed(5)}` : 'Not read yet'}</Text>
      </View>
      <PrimaryButton label={isChecking ? 'Checking location...' : 'Check in'} onPress={onCheckIn} disabled={isChecking} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: 16, padding: 24, backgroundColor: '#F4F7FB' },
  headerCard: { gap: 5, borderRadius: 18, padding: 18, backgroundColor: '#DBEAFE' },
  courseCode: { color: '#1D4ED8', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  courseName: { color: '#1E3A8A', fontSize: 21, fontWeight: '800' },
  detail: { color: '#1E40AF', fontSize: 13 },
  infoCard: { gap: 5, borderRadius: 16, padding: 18, backgroundColor: '#FFFFFF' },
  label: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  value: { color: '#0F172A', fontSize: 16, marginBottom: 8 },
});
