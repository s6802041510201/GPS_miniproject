import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedSurface } from '@/components/AnimatedSurface';
import { DecorativeBackdrop } from '@/components/DecorativeBackdrop';
import { AppIcon } from '@/components/AppIcon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radius, shadows, spacing } from '@/theme';

type Props = {
  isLoading: boolean;
  errorMessage: string | null;
  onLogin: (userCode: string, password: string) => void;
  onRegister: (input: { userCode: string; name: string; email: string; password: string }) => void;
};

export function LoginScreen({ isLoading, errorMessage, onLogin, onRegister }: Props) {
  const [portal, setPortal] = useState<'student' | 'teacher'>('student');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [userCode, setUserCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function selectPortal(nextPortal: 'student' | 'teacher') {
    setPortal(nextPortal);
    setMode('login');
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <DecorativeBackdrop />

      <AnimatedSurface delay={40} style={styles.brandBlock}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}><AppIcon color={colors.surface} name="location" size={28} /></View>
          <View style={styles.brandCopy}>
            <Text style={styles.eyebrow}>GPS ATTENDANCE</Text>
            <Text style={styles.title}>Geo-Attendance</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Location-based attendance for secure classroom check-in.</Text>
      </AnimatedSurface>

      <AnimatedSurface delay={120} style={styles.card}>
        <View style={styles.cardHeading}>
          <View>
            <Text style={styles.heading}>{mode === 'register' ? 'Create student account' : 'Welcome back'}</Text>
            <Text style={styles.helper}>{mode === 'register' ? 'Register with your real student information.' : 'Sign in to continue'}</Text>
          </View>
          <View style={styles.secureBadge}><AppIcon color={colors.accentDark} name="lock" size={17} /><Text style={styles.secureText}>Secure</Text></View>
        </View>

        {mode === 'login' ? <View accessibilityRole="tablist" style={styles.portalSelector}>
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
                <View style={styles.portalContent}>
                  <AppIcon color={selected ? colors.surface : colors.accentDark} name={item === 'student' ? 'profile' : 'students'} size={17} />
                  <Text style={[styles.portalLabel, selected && styles.portalLabelSelected]}>{item === 'student' ? 'Student' : 'Teacher'}</Text>
                </View>
              </Pressable>
            );
          })}
        </View> : null}

        {mode === 'register' ? <>
          <View style={styles.fieldGroup}><Text style={styles.label}>Full name</Text><View style={styles.inputShell}><AppIcon color={colors.accent} name="profile" size={19} /><TextInput autoCapitalize="words" onChangeText={setName} placeholder="Your full name" style={styles.input} value={name} /></View></View>
          <View style={styles.fieldGroup}><Text style={styles.label}>Email</Text><View style={styles.inputShell}><AppIcon color={colors.accent} name="login" size={19} /><TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="name@example.com" style={styles.input} value={email} /></View></View>
        </> : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{portal === 'student' ? 'Student ID' : 'Teacher ID'}</Text>
          <View style={styles.inputShell}>
            <AppIcon color={colors.accent} name={portal === 'student' ? 'profile' : 'students'} size={19} />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setUserCode}
              placeholder={portal === 'student' ? 'Student ID' : 'Teacher ID'}
              style={styles.input}
              value={userCode}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{mode === 'register' ? 'Password (8+ characters)' : 'Password'}</Text>
          <View style={styles.inputShell}>
            <AppIcon color={colors.accent} name="lock" size={19} />
            <TextInput
              onChangeText={setPassword}
              placeholder="Enter password"
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>
        </View>

        {errorMessage ? <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text> : null}

        <PrimaryButton
          disabled={isLoading || !userCode.trim() || !password || (mode === 'register' && (!name.trim() || !email.trim() || password.length < 8))}
          icon="login"
          label={isLoading ? (mode === 'register' ? 'Creating account...' : 'Signing in...') : mode === 'register' ? 'Create account' : 'Login'}
          onPress={() => mode === 'register' ? onRegister({ userCode: userCode.trim(), name: name.trim(), email: email.trim(), password }) : onLogin(userCode.trim(), password)}
        />
        <Pressable accessibilityRole="button" onPress={() => setMode(mode === 'register' ? 'login' : 'register')} style={styles.modeSwitch}><Text style={styles.modeSwitchText}>{mode === 'register' ? 'Already have an account? Sign in' : 'New student? Create an account'}</Text></Pressable>
      </AnimatedSurface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.xl, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.canvas },
  brandBlock: { gap: spacing.md },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  brandMark: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radius.md, boxShadow: '0 6px 14px rgba(37, 99, 235, 0.25)', height: 54, justifyContent: 'center', width: 54 },
  brandCopy: { flex: 1, gap: spacing.xs },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.body, fontSize: 15, lineHeight: 22, maxWidth: 360 },
  card: { gap: spacing.lg, borderColor: '#E2E8F0', borderRadius: radius.lg, borderWidth: 1, padding: 20, backgroundColor: colors.surface, boxShadow: shadows.card },
  cardHeading: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  heading: { color: colors.text, fontSize: 23, fontWeight: '800' },
  helper: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  secureBadge: { alignItems: 'center', backgroundColor: colors.successSoft, borderRadius: radius.pill, flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  secureText: { color: colors.success, fontSize: 11, fontWeight: '800' },
  portalSelector: { flexDirection: 'row', gap: spacing.xs, borderRadius: radius.pill, padding: spacing.xs, backgroundColor: colors.accentPale },
  portalOption: { alignItems: 'center', flex: 1, minHeight: 46, justifyContent: 'center', borderRadius: radius.pill },
  portalOptionSelected: { backgroundColor: colors.accent },
  portalPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  portalContent: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  portalLabel: { color: colors.accentDark, fontSize: 13, fontWeight: '800' },
  portalLabelSelected: { color: colors.surface },
  fieldGroup: { gap: spacing.sm },
  label: { color: colors.text, fontSize: 13, fontWeight: '800' },
  inputShell: { alignItems: 'center', borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 52, paddingHorizontal: spacing.md },
  input: { color: colors.text, flex: 1, fontSize: 16, paddingVertical: 12 },
  error: { backgroundColor: colors.dangerSoft, borderRadius: radius.sm, color: colors.danger, fontSize: 14, lineHeight: 20, padding: spacing.md },
  modeSwitch: { alignItems: 'center', paddingVertical: spacing.sm },
  modeSwitchText: { color: colors.accentDark, fontSize: 13, fontWeight: '800' },
});
