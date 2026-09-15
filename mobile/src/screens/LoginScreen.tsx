import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedSurface } from '@/components/AnimatedSurface';
import { DecorativeBackdrop } from '@/components/DecorativeBackdrop';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radius, shadows, spacing } from '@/theme';

type Props = {
  isLoading: boolean;
  errorMessage: string | null;
  onLogin: (userCode: string, password: string) => void;
};

export function LoginScreen({ isLoading, errorMessage, onLogin }: Props) {
  const [portal, setPortal] = useState<'student' | 'teacher'>('student');
  const [userCode, setUserCode] = useState('65001');
  const [password, setPassword] = useState('123456');

  function selectPortal(nextPortal: 'student' | 'teacher') {
    setPortal(nextPortal);
    setUserCode(nextPortal === 'student' ? '65001' : 'T001');
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <DecorativeBackdrop />

      <AnimatedSurface delay={40} style={styles.brandBlock}>
        <Text style={styles.eyebrow}>GPS ATTENDANCE</Text>
        <Text style={styles.title}>Geo-Attendance</Text>
        <Text style={styles.subtitle}>
          Check in when you are inside the classroom area.
        </Text>
      </AnimatedSurface>

      <AnimatedSurface delay={120} style={styles.card}>
        <Text style={styles.heading}>Welcome</Text>
        <Text style={styles.helper}>Sign in to continue</Text>

        <View accessibilityRole="tablist" style={styles.portalSelector}>
          {(['student', 'teacher'] as const).map((item) => {
            const selected = portal === item;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                key={item}
                onPress={() => selectPortal(item)}
                style={({ pressed }) => [styles.portalOption, selected && styles.portalOptionSelected, pressed && styles.portalPressed]}
              >
                <Text style={[styles.portalLabel, selected && styles.portalLabelSelected]}>{item === 'student' ? 'Student' : 'Teacher'}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{portal === 'student' ? 'Student ID' : 'Teacher ID'}</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setUserCode}
            placeholder={portal === 'student' ? 'e.g. 65001' : 'e.g. T001'}
            style={styles.input}
            value={userCode}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            onChangeText={setPassword}
            placeholder="Enter password"
            secureTextEntry
            style={styles.input}
            value={password}
          />
        </View>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <PrimaryButton
          disabled={isLoading || !userCode.trim() || !password}
          label={isLoading ? 'Signing in...' : 'Login'}
          onPress={() => onLogin(userCode.trim(), password)}
        />
      </AnimatedSurface>

      <AnimatedSurface delay={200} style={styles.demoCard}>
        <Text style={styles.demoTitle}>Demo accounts</Text>
        <Text style={styles.demoText}>Student: 65001 / 123456</Text>
        <Text style={styles.demoText}>Teacher: T001 / 123456</Text>
      </AnimatedSurface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.xl, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.canvas },
  brandBlock: { gap: spacing.sm },
  eyebrow: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 36, fontWeight: '800' },
  subtitle: { color: colors.body, fontSize: 16, lineHeight: 24 },
  card: { gap: spacing.lg, borderRadius: radius.lg, padding: 20, backgroundColor: colors.surface, boxShadow: shadows.card },
  heading: { color: colors.text, fontSize: 22, fontWeight: '800' },
  helper: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  portalSelector: { flexDirection: 'row', gap: spacing.xs, borderRadius: radius.pill, padding: spacing.xs, backgroundColor: colors.accentPale },
  portalOption: { alignItems: 'center', flex: 1, minHeight: 42, justifyContent: 'center', borderRadius: radius.pill },
  portalOptionSelected: { backgroundColor: colors.accent },
  portalPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  portalLabel: { color: colors.accentDark, fontSize: 13, fontWeight: '800' },
  portalLabelSelected: { color: colors.surface },
  fieldGroup: { gap: spacing.sm },
  label: { color: '#334155', fontSize: 13, fontWeight: '700' },
  input: { borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, color: colors.text, fontSize: 16, paddingHorizontal: 14, paddingVertical: 12 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  demoCard: { gap: 6, borderRadius: radius.md, padding: spacing.lg, backgroundColor: colors.accentPale },
  demoTitle: { color: '#1E3A8A', fontSize: 13, fontWeight: '800' },
  demoText: { color: '#1E3A8A', fontSize: 13 },
});
