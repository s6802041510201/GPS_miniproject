import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DecorativeBackdrop } from '@/components/DecorativeBackdrop';
import { AppIcon } from '@/components/AppIcon';
import { IconButton } from '@/components/IconButton';
import { NavigationBar } from '@/components/NavigationBar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ClassSession, Classroom, Course, SessionAttendanceResponse, SessionInput, fetchTeacherSessionAttendance } from '@/services/api';
import { colors, navigation, radius, spacing } from '@/theme';
import { formatDistance, formatTime } from '@/utils/format';

type NavigationKey = 'dashboard' | 'students' | 'classrooms' | 'statistics' | 'settings' | 'sessions';

type Props = {
  courses: Course[];
  classrooms: Classroom[];
  sessions: ClassSession[];
  isLoading: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
  onSave: (input: SessionInput) => Promise<void>;
  onUpdate: (id: number, input: SessionInput) => Promise<void>;
  onControl: (id: number, action: 'open' | 'close' | 'cancel') => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onNavigate: (key: NavigationKey) => void;
};

type FormState = Omit<SessionInput, 'courseId' | 'classroomId' | 'gpsRadius'> & {
  courseId: string;
  classroomId: string;
  gpsRadius: string;
};

type PickerKey = 'sessionDate' | 'classStartTime' | 'classEndTime' | 'checkinOpenTime' | 'checkinCloseTime' | 'gpsRadius';

type PickerOption = {
  label: string;
  value: string;
};

type ControlAction = 'open' | 'close' | 'cancel';

type PendingControl = {
  action: ControlAction;
  session: ClassSession;
};

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const emptyForm = (course?: Course, classroom?: Classroom): FormState => ({
  courseId: course ? String(course.id) : '',
  classroomId: classroom ? String(classroom.id) : '',
  sessionDate: todayString(),
  classStartTime: '08:30',
  classEndTime: '12:00',
  checkinOpenTime: '08:00',
  checkinCloseTime: '12:15',
  gpsRadius: classroom ? String(classroom.radius) : '50',
});

export function TeacherSessionsScreen({ courses, classrooms, sessions, isLoading, errorMessage, onRefresh, onSave, onUpdate, onControl, onDelete, onNavigate }: Props) {
  const uniqueCourses = useMemo(() => courses.filter((course, index, list) => list.findIndex((candidate) => candidate.id === course.id) === index), [courses]);
  const [form, setForm] = useState<FormState>(emptyForm(uniqueCourses[0], classrooms[0]));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [pickerKey, setPickerKey] = useState<PickerKey | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [pendingControl, setPendingControl] = useState<PendingControl | null>(null);
  const [controlError, setControlError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ClassSession | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [attendanceTarget, setAttendanceTarget] = useState<ClassSession | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<SessionAttendanceResponse | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  useEffect(() => {
    if (!form.courseId && uniqueCourses[0]) setForm((current) => ({ ...current, courseId: String(uniqueCourses[0].id) }));
    if (!form.classroomId && classrooms[0]) setForm((current) => ({ ...current, classroomId: String(classrooms[0].id), gpsRadius: String(classrooms[0].radius) }));
  }, [classrooms, form.classroomId, form.courseId, uniqueCourses]);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setValidationMessage(null);
    setSaveMessage(null);
  }

  function openPicker(key: PickerKey) {
    if (key !== 'gpsRadius') {
      setPickerDate(key === 'sessionDate' ? dateFromString(form.sessionDate) : timeFromString(form[key]));
    }
    setPickerKey(key);
  }

  function applyNativePickerValue(key: PickerKey, value: Date) {
    if (key === 'sessionDate') updateField('sessionDate', dateToString(value));
    else if (key === 'classStartTime') updateField('classStartTime', timeToString(value));
    else if (key === 'classEndTime') updateField('classEndTime', timeToString(value));
    else if (key === 'checkinOpenTime') updateField('checkinOpenTime', timeToString(value));
    else if (key === 'checkinCloseTime') updateField('checkinCloseTime', timeToString(value));
  }

  function handleNativePickerChange(event: DateTimePickerEvent, value?: Date) {
    if (event.type === 'dismissed' || !value || !pickerKey) {
      if (event.type === 'dismissed') setPickerKey(null);
      return;
    }

    setPickerDate(value);
    if (Platform.OS === 'android') {
      applyNativePickerValue(pickerKey, value);
      setPickerKey(null);
    }
  }

  function confirmNativePicker() {
    if (!pickerKey || pickerKey === 'gpsRadius') return;
    applyNativePickerValue(pickerKey, pickerDate);
    setPickerKey(null);
  }

  function selectPickerValue(value: string) {
    if (!pickerKey) return;
    if (pickerKey === 'gpsRadius') updateField('gpsRadius', value);
    else updateField(pickerKey, value);
    setPickerKey(null);
  }

  const pickerOptions = useMemo(() => {
    if (!pickerKey) return [];
    if (pickerKey === 'sessionDate') return dateOptions(form.sessionDate);
    if (pickerKey === 'gpsRadius') return radiusOptions(form.gpsRadius);
    return timeOptions(form[pickerKey]);
  }, [form, pickerKey]);

  const pickerTitle = pickerKey ? pickerLabels[pickerKey] : '';

  function selectCourse(courseId: number) {
    const course = uniqueCourses.find((item) => item.id === courseId);
    updateField('courseId', String(courseId));
    if (course) updateField('classroomId', String(course.classroomId));
  }

  function startNew() {
    setEditingId(null);
    setForm(emptyForm(uniqueCourses[0], classrooms[0]));
    setValidationMessage(null);
    setSaveMessage(null);
  }

  function editSession(session: ClassSession) {
    setEditingId(session.id);
    setForm({
      courseId: String(session.courseId),
      classroomId: String(session.classroomId),
      sessionDate: session.sessionDate,
      classStartTime: session.classStartTime,
      classEndTime: session.classEndTime,
      checkinOpenTime: session.checkinOpenTime,
      checkinCloseTime: session.checkinCloseTime,
      gpsRadius: String(session.gpsRadius),
    });
    setValidationMessage(null);
    setSaveMessage(null);
  }

  function requestControl(session: ClassSession, action: ControlAction) {
    setControlError(null);
    setPendingControl({ session, action });
  }

  async function viewAttendanceHistory(session: ClassSession) {
    setAttendanceTarget(session);
    setAttendanceHistory(null);
    setAttendanceError(null);
    setAttendanceLoading(true);
    try {
      setAttendanceHistory(await fetchTeacherSessionAttendance(session.id));
    } catch (error) {
      setAttendanceError(error instanceof Error ? error.message : 'Attendance history could not be loaded.');
    } finally {
      setAttendanceLoading(false);
    }
  }

  function requestDelete(session: ClassSession) {
    setDeleteError(null);
    setPendingDelete(session);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleteError(null);
    try {
      await onDelete(pendingDelete.id);
      setPendingDelete(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'The session could not be deleted.');
    }
  }

  async function confirmControl() {
    if (!pendingControl) return;
    setControlError(null);
    try {
      await onControl(pendingControl.session.id, pendingControl.action);
      setPendingControl(null);
    } catch (error) {
      setControlError(error instanceof Error ? error.message : 'The session status could not be updated.');
    }
  }

  async function submit() {
    const input: SessionInput = {
      courseId: Number(form.courseId),
      classroomId: Number(form.classroomId),
      sessionDate: form.sessionDate.trim(),
      classStartTime: form.classStartTime.trim(),
      classEndTime: form.classEndTime.trim(),
      checkinOpenTime: form.checkinOpenTime.trim(),
      checkinCloseTime: form.checkinCloseTime.trim(),
      gpsRadius: Number(form.gpsRadius),
    };
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!input.courseId || !input.classroomId || !/^\d{4}-\d{2}-\d{2}$/.test(input.sessionDate) || !timePattern.test(input.classStartTime) || !timePattern.test(input.classEndTime) || !timePattern.test(input.checkinOpenTime) || !timePattern.test(input.checkinCloseTime) || input.classStartTime >= input.classEndTime || input.checkinOpenTime >= input.checkinCloseTime || !Number.isFinite(input.gpsRadius) || input.gpsRadius <= 0) {
      setValidationMessage('Enter a valid course, classroom, date, time range, check-in window, and GPS radius.');
      return;
    }

    try {
      if (editingId) await onUpdate(editingId, input);
      else await onSave(input);
      setSaveMessage(editingId ? 'Session updated successfully.' : 'Session created. Open it when students may check in.');
      setEditingId(null);
      if (!editingId) setForm(emptyForm(uniqueCourses[0], classrooms[0]));
    } catch (error) {
      setValidationMessage(error instanceof Error ? error.message : 'The session could not be saved. Check the form and try again.');
    }
  }

  return (
    <View style={styles.screenRoot}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <DecorativeBackdrop />
      <ScreenHeader subtitle="Teacher tools" title="Session management" />
      <Text style={styles.description}>Create a real session for a course, then open or close check-in when the class is ready.</Text>
      <View style={styles.actions}>
        <PrimaryButton label="New session" onPress={startNew} variant="secondary" />
        <IconButton disabled={isLoading} icon="refresh" label={isLoading ? 'Refreshing sessions' : 'Refresh sessions'} onPress={onRefresh} />
      </View>
      {isLoading ? <Text style={styles.muted}>Updating sessions...</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>{editingId ? 'Edit scheduled session' : 'Create session'}</Text>
        <Text style={styles.helper}>Students can check in only when this session is opened by the teacher and their GPS is inside the selected classroom radius.</Text>
        <Text style={styles.label}>Course</Text>
        <View style={styles.optionList}>{uniqueCourses.map((course) => <PrimaryButton key={course.id} label={`${course.courseCode} · ${course.courseName}`} onPress={() => selectCourse(course.id)} variant={Number(form.courseId) === course.id ? 'primary' : 'secondary'} />)}</View>
        <PickerField label="Session date" value={form.sessionDate} onPress={() => openPicker('sessionDate')} />
        <View style={styles.twoColumns}>
          <PickerField label="Class starts" value={form.classStartTime} onPress={() => openPicker('classStartTime')} />
          <PickerField label="Class ends" value={form.classEndTime} onPress={() => openPicker('classEndTime')} />
        </View>
        <View style={styles.twoColumns}>
          <PickerField label="Check-in opens" value={form.checkinOpenTime} onPress={() => openPicker('checkinOpenTime')} />
          <PickerField label="Check-in closes" value={form.checkinCloseTime} onPress={() => openPicker('checkinCloseTime')} />
        </View>
        <Text style={styles.label}>Classroom</Text>
        <View style={styles.optionList}>{classrooms.map((classroom) => <PrimaryButton key={classroom.id} label={`${classroom.buildingCode ? `Building ${classroom.buildingCode} · ` : ''}${classroom.roomName}`} onPress={() => { updateField('classroomId', String(classroom.id)); updateField('gpsRadius', String(classroom.radius)); }} variant={Number(form.classroomId) === classroom.id ? 'primary' : 'secondary'} />)}</View>
        <PickerField label="GPS radius (meters)" value={`${form.gpsRadius} meters`} onPress={() => openPicker('gpsRadius')} />
        {validationMessage ? <Text style={styles.error}>{validationMessage}</Text> : null}
        {saveMessage ? <Text style={styles.success}>{saveMessage}</Text> : null}
        <PrimaryButton disabled={isLoading || uniqueCourses.length === 0 || classrooms.length === 0} label={editingId ? (isLoading ? 'Saving...' : 'Save session changes') : (isLoading ? 'Creating...' : 'Create session')} onPress={() => void submit()} />
      </View>

      <Text style={styles.sectionTitle}>Managed sessions</Text>
      {sessions.length === 0 && !isLoading ? <Text style={styles.empty}>No teacher-controlled sessions have been created yet.</Text> : null}
      {sessions.map((session) => (
        <View key={session.id} style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <View style={styles.sessionCopy}>
              <Text style={styles.courseCode}>{session.courseCode}</Text>
              <Text style={styles.sessionTitle}>{session.courseName}</Text>
              <Text style={styles.detail}>{session.sessionDate} · {session.classStartTime} - {session.classEndTime}</Text>
              <Text style={styles.detail}>{session.buildingCode ? `Building ${session.buildingCode} · ` : ''}{session.roomName} · {session.gpsRadius} m</Text>
            </View>
            <Text style={[styles.status, styles[`status${session.status}`]]}>{session.status === 'CLOSED' && session.sessionStatus === 'closed_by_teacher' ? 'Closed by teacher' : session.status}</Text>
          </View>
          <Text style={styles.detail}>Check-in window: {session.checkinOpenTime} - {session.checkinCloseTime}</Text>
          <View style={styles.sessionActions}>
            {session.status === 'SCHEDULED' ? <PrimaryButton label="Open check-in" onPress={() => requestControl(session, 'open')} /> : null}
            {session.status === 'OPEN' ? <PrimaryButton label="Close check-in" onPress={() => requestControl(session, 'close')} variant="danger" /> : null}
            {session.status === 'SCHEDULED' ? <PrimaryButton label="Edit" onPress={() => editSession(session)} variant="secondary" /> : null}
            {session.status === 'CLOSED' || session.status === 'CANCELLED' ? <PrimaryButton label="View attendance history" onPress={() => void viewAttendanceHistory(session)} variant="secondary" /> : null}
            {session.status !== 'CLOSED' && session.status !== 'CANCELLED' ? <PrimaryButton label="Cancel" onPress={() => requestControl(session, 'cancel')} variant="secondary" /> : null}
            {session.status === 'CLOSED' || session.status === 'CANCELLED' ? <PrimaryButton label="Delete" onPress={() => requestDelete(session)} variant="danger" /> : null}
          </View>
          {session.status === 'CLOSED' || session.status === 'CANCELLED' ? <Text style={styles.finalNote}>Final status: this session is read-only.</Text> : null}
        </View>
      ))}

      {attendanceTarget ? (
        <Modal animationType="slide" transparent visible onRequestClose={() => setAttendanceTarget(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View style={styles.historyCopy}>
                  <Text style={styles.pickerTitle}>Attendance history</Text>
                  <Text style={styles.historySubtitle}>{attendanceTarget.courseCode} · {attendanceTarget.sessionDate}</Text>
                </View>
                <Pressable accessibilityLabel="Close attendance history" accessibilityRole="button" onPress={() => setAttendanceTarget(null)} style={styles.closeButton}>
                  <AppIcon name="close" size={18} />
                </Pressable>
              </View>
              {attendanceLoading ? <Text style={styles.muted}>Loading attendance records...</Text> : null}
              {attendanceError ? <Text style={styles.error}>{attendanceError}</Text> : null}
              {attendanceHistory ? (
                <>
                  <View style={styles.historySummary}>
                    <HistoryMetric label="Total" value={attendanceHistory.summary.totalStudents} />
                    <HistoryMetric label="Present" value={attendanceHistory.summary.presentCount} tone="present" />
                    <HistoryMetric label="Late" value={attendanceHistory.summary.lateCount} tone="late" />
                    <HistoryMetric label="Absent" value={attendanceHistory.summary.absentCount} tone="absent" />
                  </View>
                  <ScrollView contentContainerStyle={styles.historyList}>
                    {attendanceHistory.students.map((student) => (
                      <View key={student.userCode} style={styles.historyRow}>
                        <View style={styles.historyStudent}>
                          <Text style={styles.historyCode}>{student.userCode}</Text>
                          <Text style={styles.historyName}>{student.name}</Text>
                        </View>
                        <View style={styles.historyStatusCopy}>
                          <Text style={[styles.historyStatus, student.status === 'present' ? styles.historyPresent : student.status === 'late' ? styles.historyLate : styles.historyAbsent]}>
                            {student.status === 'present' ? 'Present' : student.status === 'late' ? 'Late' : 'Absent'}
                          </Text>
                          <Text style={styles.detail}>{formatTime(student.checkInTime)} · {formatDistance(student.distance)}</Text>
                        </View>
                      </View>
                    ))}
                    {attendanceHistory.students.length === 0 ? <Text style={styles.empty}>No enrolled students found for this session.</Text> : null}
                  </ScrollView>
                </>
              ) : null}
              <PrimaryButton label="Close" onPress={() => setAttendanceTarget(null)} variant="secondary" />
            </View>
          </View>
        </Modal>
      ) : null}

      {pendingControl ? (
        <Modal animationType="slide" transparent visible onRequestClose={() => setPendingControl(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.confirmCard}>
              <Text style={styles.pickerTitle}>{controlTitle(pendingControl.action)}</Text>
              <Text style={styles.confirmText}>{controlDescription(pendingControl.action, pendingControl.session)}</Text>
              {controlError ? <Text style={styles.error}>{controlError}</Text> : null}
              <View style={styles.pickerActions}>
                <PrimaryButton label="Go back" onPress={() => setPendingControl(null)} variant="secondary" />
                <PrimaryButton disabled={isLoading} label={controlButtonLabel(pendingControl.action)} onPress={() => void confirmControl()} variant={pendingControl.action === 'open' ? 'primary' : 'danger'} />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {pendingDelete ? (
        <Modal animationType="slide" transparent visible onRequestClose={() => setPendingDelete(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.confirmCard}>
              <Text style={styles.pickerTitle}>Delete session?</Text>
              <Text style={styles.confirmText}>Delete the {pendingDelete.courseCode} session from {pendingDelete.sessionDate}? This cannot be undone.</Text>
              <Text style={styles.confirmHint}>Sessions with attendance records are protected and cannot be deleted.</Text>
              {deleteError ? <Text style={styles.error}>{deleteError}</Text> : null}
              <View style={styles.pickerActions}>
                <PrimaryButton label="Go back" onPress={() => setPendingDelete(null)} variant="secondary" />
                <PrimaryButton disabled={isLoading} label="Delete session" onPress={() => void confirmDelete()} variant="danger" />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {pickerKey && Platform.OS === 'web' ? (
        <OptionPickerModal title={pickerTitle} options={pickerOptions} selectedValue={pickerKey === 'gpsRadius' ? form.gpsRadius : form[pickerKey]} onClose={() => setPickerKey(null)} onSelect={selectPickerValue} />
      ) : null}
      {pickerKey && pickerKey === 'gpsRadius' && Platform.OS !== 'web' ? (
        <OptionPickerModal title={pickerTitle} options={radiusOptions(form.gpsRadius)} selectedValue={form.gpsRadius} onClose={() => setPickerKey(null)} onSelect={selectPickerValue} />
      ) : null}
      {pickerKey && pickerKey !== 'gpsRadius' && Platform.OS === 'ios' ? (
        <Modal animationType="slide" transparent visible onRequestClose={() => setPickerKey(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.nativePickerCard}>
              <Text style={styles.pickerTitle}>{pickerTitle}</Text>
              <DateTimePicker display="spinner" mode={pickerKey === 'sessionDate' ? 'date' : 'time'} value={pickerDate} onChange={handleNativePickerChange} />
              <View style={styles.pickerActions}>
                <PrimaryButton label="Cancel" onPress={() => setPickerKey(null)} variant="secondary" />
                <PrimaryButton label="Done" onPress={confirmNativePicker} />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
      {pickerKey && pickerKey !== 'gpsRadius' && Platform.OS === 'android' ? (
        <DateTimePicker mode={pickerKey === 'sessionDate' ? 'date' : 'time'} value={pickerDate} onChange={handleNativePickerChange} />
      ) : null}
      </ScrollView>
      <NavigationBar
        items={[{ key: 'dashboard', label: 'Dashboard' }, { key: 'sessions', label: 'Sessions' }, { key: 'students', label: 'Students' }, { key: 'classrooms', label: 'Rooms' }, { key: 'statistics', label: 'Analytics' }, { key: 'settings', label: 'Settings' }]}
        onSelect={onNavigate}
        selected="sessions"
      />
    </View>
  );
}

function PickerField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return <View style={styles.fieldGroup}><Text style={styles.label}>{label}</Text><Pressable accessibilityRole="button" onPress={onPress} style={styles.input}><Text style={styles.inputValue}>{value}</Text><Text style={styles.chevron}>⌄</Text></Pressable></View>;
}

function OptionPickerModal({ title, options, selectedValue, onClose, onSelect }: { title: string; options: PickerOption[]; selectedValue: string; onClose: () => void; onSelect: (value: string) => void }) {
  return <Modal animationType="slide" transparent visible onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.optionPickerCard}><Text style={styles.pickerTitle}>{title}</Text><ScrollView contentContainerStyle={styles.optionPickerList}>{options.map((option) => <Pressable key={option.value} onPress={() => onSelect(option.value)} style={[styles.optionRow, option.value === selectedValue ? styles.optionRowSelected : null]}><Text style={[styles.optionText, option.value === selectedValue ? styles.optionTextSelected : null]}>{option.label}</Text></Pressable>)}</ScrollView><PrimaryButton label="Cancel" onPress={onClose} variant="secondary" /></View></View></Modal>;
}

function HistoryMetric({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'present' | 'late' | 'absent' }) {
  return <View style={[styles.historyMetric, styles[`historyMetric${tone}`]]}><Text style={styles.historyMetricValue}>{value}</Text><Text style={styles.historyMetricLabel}>{label}</Text></View>;
}

function controlTitle(action: ControlAction) {
  if (action === 'open') return 'Open check-in?';
  if (action === 'close') return 'Close check-in?';
  return 'Cancel session?';
}

function controlButtonLabel(action: ControlAction) {
  if (action === 'open') return 'Open check-in';
  if (action === 'close') return 'Close check-in';
  return 'Cancel session';
}

function controlDescription(action: ControlAction, session: ClassSession) {
  if (action === 'open') return `Students can check in for ${session.courseCode} after you open this session.`;
  if (action === 'close') return `Close check-in for ${session.courseCode}? Students will no longer be able to submit attendance for this session.`;
  return `Cancel ${session.courseCode}? Students will not be able to check in, and this session will become read-only.`;
}

function dateFromString(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day) ? new Date(year, month - 1, day, 12) : new Date();
}

function dateToString(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function timeFromString(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const result = new Date();
  result.setHours(Number.isFinite(hours) ? hours : 8, Number.isFinite(minutes) ? minutes : 30, 0, 0);
  return result;
}

function timeToString(value: Date) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

function dateOptions(selectedValue: string): PickerOption[] {
  const selected = dateFromString(selectedValue);
  const options = Array.from({ length: 181 }, (_, index) => {
    const value = new Date();
    value.setHours(12, 0, 0, 0);
    value.setDate(value.getDate() + index);
    return { label: value.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }), value: dateToString(value) };
  });
  const selectedOption = { label: selected.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }), value: selectedValue };
  return options.some((option) => option.value === selectedValue) ? options : [selectedOption, ...options];
}

function timeOptions(selectedValue: string): PickerOption[] {
  const options = Array.from({ length: 96 }, (_, index) => {
    const hours = Math.floor(index / 4);
    const minutes = (index % 4) * 15;
    const value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return { label: value, value };
  });
  return options.some((option) => option.value === selectedValue) ? options : [{ label: selectedValue, value: selectedValue }, ...options];
}

function radiusOptions(selectedValue: string): PickerOption[] {
  const options = Array.from({ length: 20 }, (_, index) => { const value = String((index + 1) * 10); return { label: `${value} meters`, value }; });
  return options.some((option) => option.value === selectedValue) ? options : [{ label: `${selectedValue} meters`, value: selectedValue }, ...options];
}

const pickerLabels: Record<PickerKey, string> = { sessionDate: 'Select session date', classStartTime: 'Select class start time', classEndTime: 'Select class end time', checkinOpenTime: 'Select check-in opening time', checkinCloseTime: 'Select check-in closing time', gpsRadius: 'Select GPS radius' };

const styles = StyleSheet.create({
  screenRoot: { flex: 1, paddingLeft: navigation.rail, position: 'relative' },
  content: { flexGrow: 1, gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.canvas },
  actions: { flexDirection: 'row', gap: spacing.md },
  description: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  muted: { color: colors.muted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  success: { color: colors.success, fontSize: 14, lineHeight: 20 },
  empty: { color: colors.muted, fontSize: 14, padding: spacing.lg },
  formCard: { gap: spacing.md, borderRadius: radius.lg, padding: spacing.lg, backgroundColor: colors.surface },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  helper: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  label: { color: colors.body, fontSize: 13, fontWeight: '800' },
  optionList: { gap: spacing.sm },
  twoColumns: { flexDirection: 'row', gap: spacing.md },
  fieldGroup: { flex: 1, gap: spacing.xs },
  input: { alignItems: 'center', borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  inputValue: { color: colors.text, flex: 1, fontSize: 16 },
  chevron: { color: colors.accent, fontSize: 20, fontWeight: '800', lineHeight: 18 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.45)', flex: 1, justifyContent: 'flex-end' },
  nativePickerCard: { alignItems: 'center', backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: spacing.lg, padding: spacing.xl, width: '100%' },
  optionPickerCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: spacing.md, maxHeight: '82%', padding: spacing.xl, width: '100%' },
  pickerTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  pickerActions: { flexDirection: 'row', gap: spacing.md, justifyContent: 'flex-end', width: '100%' },
  optionPickerList: { gap: spacing.sm, paddingBottom: spacing.sm },
  optionRow: { alignItems: 'center', borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, padding: spacing.md },
  optionRowSelected: { backgroundColor: colors.accentPale, borderColor: colors.accent },
  optionText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  optionTextSelected: { color: colors.accent, fontWeight: '800' },
  sessionCard: { gap: spacing.md, borderRadius: radius.lg, padding: spacing.lg, backgroundColor: colors.surface },
  sessionHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  sessionCopy: { flex: 1, gap: spacing.xs },
  courseCode: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  sessionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  detail: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  status: { borderRadius: radius.pill, fontSize: 11, fontWeight: '800', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  statusSCHEDULED: { color: colors.warning, backgroundColor: colors.warningSoft },
  statusOPEN: { color: colors.success, backgroundColor: colors.successSoft },
  statusCLOSED: { color: colors.muted, backgroundColor: colors.accentPale },
  statusCANCELLED: { color: colors.danger, backgroundColor: colors.dangerSoft },
  sessionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  finalNote: { color: colors.muted, fontSize: 12, fontStyle: 'italic' },
  confirmCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: spacing.md, padding: spacing.xl, width: '100%' },
  confirmText: { color: colors.body, fontSize: 15, lineHeight: 22 },
  confirmHint: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  closeButton: { alignItems: 'center', backgroundColor: colors.accentPale, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  historyCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: spacing.md, maxHeight: '88%', padding: spacing.xl, width: '100%' },
  historyHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  historyCopy: { flex: 1, gap: spacing.xs },
  historySubtitle: { color: colors.muted, fontSize: 13 },
  historySummary: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  historyMetric: { flexGrow: 1, flexBasis: '22%', gap: spacing.xs, borderRadius: radius.sm, padding: spacing.sm, backgroundColor: colors.accentPale },
  historyMetricpresent: { backgroundColor: colors.successSoft },
  historyMetriclate: { backgroundColor: colors.warningSoft },
  historyMetricabsent: { backgroundColor: colors.dangerSoft },
  historyMetricdefault: {},
  historyMetricValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  historyMetricLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  historyList: { gap: spacing.sm, paddingBottom: spacing.sm },
  historyRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, borderColor: colors.border, borderBottomWidth: 1, paddingVertical: spacing.md },
  historyStudent: { flex: 1, gap: spacing.xs },
  historyCode: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  historyName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  historyStatusCopy: { alignItems: 'flex-end', gap: spacing.xs },
  historyStatus: { borderRadius: radius.pill, fontSize: 11, fontWeight: '800', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  historyPresent: { backgroundColor: colors.successSoft, color: colors.success },
  historyLate: { backgroundColor: colors.warningSoft, color: colors.warning },
  historyAbsent: { backgroundColor: colors.dangerSoft, color: colors.danger },
});
