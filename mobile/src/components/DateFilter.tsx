import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '@/components/AppIcon';
import { colors, radius, spacing } from '@/theme';
import { formatDate } from '@/utils/format';

function dateString(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }
function fromString(value: string) { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day, 12); }

export function DateFilter({ value, onChange, label = 'Attendance date' }: { value: string; onChange: (value: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState(fromString(value));
  const options = Array.from({ length: 14 }, (_, index) => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - index); return dateString(date); });
  function choose(next: string) { onChange(next); setOpen(false); }
  function nativeChange(event: DateTimePickerEvent, next?: Date) { if (event.type === 'dismissed') { setOpen(false); return; } if (next) { setPickerDate(next); choose(dateString(next)); } }
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`Select ${label}`} onPress={() => { setPickerDate(fromString(value)); setOpen(true); }} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <AppIcon name="calendar" size={18} color={colors.accentDark} />
        <View style={styles.copy}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{formatDate(value)}</Text></View>
        <AppIcon name="chevronDown" size={16} color={colors.accentDark} />
      </Pressable>
      <Modal animationType="slide" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}><View style={styles.card}>
          <View style={styles.header}><Text style={styles.title}>Select attendance date</Text><Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.close}><AppIcon name="close" size={17} /></Pressable></View>
          {Platform.OS !== 'web' ? <DateTimePicker value={pickerDate} mode="date" display="spinner" onChange={nativeChange} /> : <ScrollView contentContainerStyle={styles.options}>{options.map((option) => <Pressable key={option} onPress={() => choose(option)} style={[styles.option, option === value && styles.selected]}><Text style={[styles.optionText, option === value && styles.selectedText]}>{formatDate(option)}</Text></Pressable>)}</ScrollView>}
          {Platform.OS !== 'web' ? <Pressable onPress={() => setOpen(false)} style={styles.done}><Text style={styles.doneText}>Done</Text></Pressable> : null}
        </View></View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  pressed: { opacity: 0.78 }, copy: { flex: 1, gap: 2 }, label: { color: colors.muted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }, value: { color: colors.text, fontSize: 15, fontWeight: '800' },
  backdrop: { alignItems: 'center', backgroundColor: 'rgba(15,23,42,.45)', flex: 1, justifyContent: 'flex-end' }, card: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: spacing.md, maxHeight: '80%', padding: spacing.xl, width: '100%' }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, title: { color: colors.text, fontSize: 18, fontWeight: '800' }, close: { alignItems: 'center', backgroundColor: colors.accentPale, borderRadius: radius.pill, height: 36, justifyContent: 'center', width: 36 }, options: { gap: spacing.sm, paddingBottom: spacing.md }, option: { borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, padding: spacing.md }, selected: { backgroundColor: colors.accentPale, borderColor: colors.accent }, optionText: { color: colors.text, fontSize: 15, fontWeight: '600' }, selectedText: { color: colors.accentDark, fontWeight: '800' }, done: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radius.sm, padding: spacing.md }, doneText: { color: colors.surface, fontWeight: '800' },
});
