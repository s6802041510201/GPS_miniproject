import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DecorativeBackdrop } from '@/components/DecorativeBackdrop';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { NavigationBar } from '@/components/NavigationBar';
import { Classroom } from '@/services/api';

type Props = {
  classrooms: Classroom[];
  isLoading: boolean;
  errorMessage: string | null;
  onBack: () => void;
  onRefresh: () => void;
  onSave: (classroom: Omit<Classroom, 'id'>, id?: number) => Promise<void>;
  onNavigate: (key: 'dashboard' | 'students' | 'classrooms' | 'statistics' | 'settings') => void;
};

const emptyForm = { roomName: '', latitude: '', longitude: '', radius: '50' };

export function ClassroomManagementScreen({ classrooms, isLoading, errorMessage, onBack, onRefresh, onSave, onNavigate }: Props) {
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [form, setForm] = useState(emptyForm);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    const selected = classrooms.find((classroom) => classroom.id === selectedId);
    if (selected) {
      setForm({
        roomName: selected.roomName,
        latitude: String(selected.latitude),
        longitude: String(selected.longitude),
        radius: String(selected.radius),
      });
    }
  }, [classrooms, selectedId]);

  function selectClassroom(classroom: Classroom) {
    setSelectedId(classroom.id);
    setValidationMessage(null);
    setSaveMessage(null);
  }

  function startNew() {
    setSelectedId(undefined);
    setForm(emptyForm);
    setValidationMessage(null);
    setSaveMessage(null);
  }

  async function submit() {
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const radius = Number(form.radius);

    if (!form.roomName.trim() || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !Number.isFinite(radius) || radius <= 0) {
      setValidationMessage('Enter a room name, valid coordinates, and a radius greater than 0.');
      return;
    }

    setValidationMessage(null);
    setSaveMessage(null);
    try {
      await onSave({ roomName: form.roomName.trim(), latitude, longitude, radius }, selectedId);
      setSaveMessage('Saved. Courses, dashboard, analytics, and maps now use this room data.');
    } catch {
      // The parent displays the API error. Keep the form values so the user can retry.
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <DecorativeBackdrop />
      <ScreenHeader onBack={onBack} subtitle="Teacher tools" title="Classroom management" />
      <View style={styles.actions}>
        <PrimaryButton label="New classroom" onPress={startNew} variant="secondary" />
        <PrimaryButton label="Refresh" onPress={onRefresh} variant="secondary" />
      </View>
      {isLoading ? <Text style={styles.muted}>Loading classrooms...</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <Text style={styles.sectionTitle}>Saved classrooms</Text>
      {classrooms.map((classroom) => (
        <View key={classroom.id} style={styles.classroomRow}>
          <View style={styles.classroomInfo}>
            <Text style={styles.roomName}>{classroom.roomName}</Text>
            <Text style={styles.building}>{classroom.buildingCode ? `Building ${classroom.buildingCode} • Room ${classroom.roomNumber ?? classroom.roomName}` : 'Building not assigned'}</Text>
            <Text style={styles.detail}>Radius: {classroom.radius} m</Text>
            <Text style={styles.detail}>GPS: {classroom.latitude}, {classroom.longitude}</Text>
          </View>
          <PrimaryButton label="Edit" onPress={() => selectClassroom(classroom)} variant="secondary" />
        </View>
      ))}

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>{selectedId ? 'Edit classroom' : 'Add classroom'}</Text>
        <Text style={styles.helper}>Changes to a mapped room are reflected in linked courses, dashboard, analytics, and maps after saving.</Text>
        <Field label="Room name" value={form.roomName} onChange={(value) => setForm((current) => ({ ...current, roomName: value }))} placeholder="Room 701" />
        <Field label="Latitude" value={form.latitude} onChange={(value) => setForm((current) => ({ ...current, latitude: value }))} placeholder="13.7563" keyboardType="decimal-pad" />
        <Field label="Longitude" value={form.longitude} onChange={(value) => setForm((current) => ({ ...current, longitude: value }))} placeholder="100.5018" keyboardType="decimal-pad" />
        <Field label="Radius (meters)" value={form.radius} onChange={(value) => setForm((current) => ({ ...current, radius: value }))} placeholder="50" keyboardType="decimal-pad" />
        {validationMessage ? <Text style={styles.error}>{validationMessage}</Text> : null}
        {saveMessage ? <Text style={styles.success}>{saveMessage}</Text> : null}
        <PrimaryButton label={selectedId ? 'Save changes' : 'Create classroom'} onPress={submit} />
      </View>
      <NavigationBar
        items={[{ key: 'dashboard', label: 'Dashboard' }, { key: 'students', label: 'Students' }, { key: 'classrooms', label: 'Room settings' }, { key: 'statistics', label: 'Analytics' }, { key: 'settings', label: 'Settings' }]}
        onSelect={onNavigate}
        selected="classrooms"
      />
    </ScrollView>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType = 'default' }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'decimal-pad' }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput keyboardType={keyboardType} onChangeText={onChange} placeholder={placeholder} style={styles.input} value={value} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: 16, padding: 24, backgroundColor: '#F4F7FB' },
  actions: { flexDirection: 'row', gap: 10 },
  muted: { color: '#64748B', fontSize: 14 },
  error: { color: '#B91C1C', fontSize: 14, lineHeight: 20 },
  success: { color: '#166534', fontSize: 14, lineHeight: 20 },
  sectionTitle: { color: '#0F172A', fontSize: 20, fontWeight: '800' },
  classroomRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderRadius: 16, padding: 16, backgroundColor: '#FFFFFF' },
  classroomInfo: { flex: 1, gap: 4 },
  roomName: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  building: { color: '#1D4ED8', fontSize: 12, fontWeight: '700' },
  detail: { color: '#64748B', fontSize: 12 },
  formCard: { gap: 14, borderRadius: 18, padding: 18, backgroundColor: '#FFFFFF' },
  helper: { color: '#64748B', fontSize: 13, lineHeight: 19 },
  fieldGroup: { gap: 7 },
  label: { color: '#334155', fontSize: 13, fontWeight: '700' },
  input: { borderColor: '#CBD5E1', borderRadius: 12, borderWidth: 1, color: '#0F172A', fontSize: 16, paddingHorizontal: 14, paddingVertical: 12 },
});
