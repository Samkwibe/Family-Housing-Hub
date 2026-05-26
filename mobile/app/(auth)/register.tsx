import { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, ActivityIndicator } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { SocialAuthButtons } from '@/src/components/SocialAuthButtons';
import {
  AuthScreen,
  FormErrorBanner,
  AuthFooterLink,
  RolePicker,
  PasswordStrength,
  PasswordMatchHint,
  UserRole,
} from '@/src/components/auth/AuthScreen';
import {
  AuthBackButton,
  AuthHeroRegister,
  AuthField,
  AuthGradientButton,
  PhonePrefix,
} from '@/src/components/auth/AuthForm';
import { formatUSPhone } from '@/src/utils/phone';
import { loadPreSignupAnswers, hasCompletedIntro } from '@/src/services/onboardingStorage';
import {
  sendEmailVerificationCode,
  verifyEmailCode,
} from '@/src/services/verification';
import { theme } from '@/src/theme';

export default function RegisterScreen() {
  const { signup } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('renter');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingReady, setOnboardingReady] = useState<boolean | null>(null);
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);

  useEffect(() => {
    hasCompletedIntro().then(setOnboardingReady);
    loadPreSignupAnswers().then((saved) => {
      if (saved?.role) setRole(saved.role);
    });
  }, []);

  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return null;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  if (onboardingReady === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!onboardingReady) {
    return <Redirect href="/(auth)/intro" />;
  }

  const onSendVerification = async () => {
    setError(null);
    if (!firstName.trim()) {
      setError('Please enter your first name.');
      return;
    }
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!termsAccepted) {
      setError('Please accept the Terms of Service and Privacy Policy.');
      return;
    }
    try {
      setLoading(true);
      const result = await sendEmailVerificationCode(email.trim().toLowerCase());
      if (result.showCodeInUi) {
        setDevCodeHint(result.code);
      }
      setStep('verify');
    } catch (e: unknown) {
      setError((e as Error).message || 'Could not send verification code');
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async () => {
    setError(null);
    if (!verificationCode.trim()) {
      setError('Enter the 6-digit verification code from your email.');
      return;
    }

    const finalEmail = email.trim().toLowerCase();
    const userType = role === 'owner' ? 'owner' : role === 'family' ? 'family' : 'renter';
    const savedAnswers = await loadPreSignupAnswers();
    try {
      setLoading(true);
      await verifyEmailCode(finalEmail, verificationCode.trim());
      await signup(finalEmail, password, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        emailVerified: true,
        phoneVerified: Boolean(phone.trim()),
        userType,
        householdSize: savedAnswers?.householdSize,
        onboardingPriorities: savedAnswers?.priorities,
      });
      router.replace('/');
    } catch (e: unknown) {
      setError((e as Error).message || 'Could not create your account. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      footer={
        <AuthFooterLink
          text="Already have an account?"
          linkText="Log in"
          onPress={() => router.push('/(auth)/login')}
          disabled={loading}
        />
      }
    >
      <AuthBackButton onPress={() => router.back()} />

      <Text style={styles.title}>Create your account ✨</Text>
      <Text style={styles.subtitle}>
        Join FamilyHub and bring all aspects of your home life into one smart app.
      </Text>

      <AuthHeroRegister />

      <RolePicker value={role} onChange={setRole} disabled={loading} />

      <FormErrorBanner message={error} />

      <View style={styles.nameRow}>
        <View style={styles.nameField}>
          <AuthField
            label="First name"
            icon="person-outline"
            placeholder="Sarah"
            autoComplete="given-name"
            value={firstName}
            onChangeText={setFirstName}
            editable={!loading}
          />
        </View>
        <View style={styles.nameField}>
          <AuthField
            label="Last name"
            icon="person-outline"
            placeholder="Johnson"
            autoComplete="family-name"
            value={lastName}
            onChangeText={setLastName}
            editable={!loading}
          />
        </View>
      </View>

      <AuthField
        label="Email address"
        icon="mail-outline"
        placeholder="you@email.com"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
      />

      <AuthField
        label="Phone number (optional)"
        placeholder="(555) 000-0000"
        keyboardType="phone-pad"
        autoComplete="tel"
        prefix={<PhonePrefix />}
        value={phone}
        onChangeText={(v) => setPhone(formatUSPhone(v))}
        editable={!loading}
      />

      <AuthField
        label="Password"
        icon="lock-closed-outline"
        placeholder="Create a strong password"
        showPasswordToggle
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
        editable={!loading}
      />
      <PasswordStrength password={password} />

      <AuthField
        label="Confirm password"
        icon="lock-closed-outline"
        placeholder="Re-enter password"
        showPasswordToggle
        secureTextEntry
        autoComplete="new-password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        editable={!loading}
      />
      <PasswordMatchHint match={passwordsMatch} />

      {step === 'verify' ? (
        <>
          <Text style={styles.verifyHint}>
            We sent a 6-digit code to {email.trim().toLowerCase()}. Enter it below to verify your email.
          </Text>
          {devCodeHint ? (
            <Text style={styles.devCode}>Dev code: {devCodeHint}</Text>
          ) : null}
          <AuthField
            label="Verification code"
            icon="key-outline"
            placeholder="123456"
            keyboardType="number-pad"
            value={verificationCode}
            onChangeText={setVerificationCode}
            editable={!loading}
          />
        </>
      ) : null}

      <Pressable
        style={styles.termsRow}
        onPress={() => setTermsAccepted((v) => !v)}
        disabled={loading}
      >
        <View style={[styles.termsBox, termsAccepted && styles.termsBoxChecked]}>
          {termsAccepted ? <Text style={styles.termsCheck}>✓</Text> : null}
        </View>
        <Text style={styles.termsText}>
          I agree to the{' '}
          <Text
            style={styles.termsLink}
            onPress={() => Linking.openURL('https://familyhousinghub.com/terms')}
          >
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text
            style={styles.termsLink}
            onPress={() => Linking.openURL('https://familyhousinghub.com/privacy')}
          >
            Privacy Policy
          </Text>
        </Text>
      </Pressable>

      <AuthGradientButton
        title={step === 'verify' ? 'Verify & create account' : 'Send verification code'}
        onPress={step === 'verify' ? onRegister : onSendVerification}
        loading={loading}
        disabled={loading}
      />

      <SocialAuthButtons
        disabled={loading}
        onSuccess={() => router.replace('/')}
        onError={setError}
        dividerLabel="or sign up with Google"
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  title: {
    fontFamily: theme.fonts.titleExtra,
    fontSize: 24,
    color: theme.colors.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    marginBottom: 4,
    maxWidth: 340,
  },
  nameRow: { flexDirection: 'row', gap: 10 },
  nameField: { flex: 1 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 14, marginTop: 4 },
  termsBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  termsBoxChecked: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  termsCheck: { color: '#fff', fontSize: 11, fontWeight: '700' },
  termsText: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  termsLink: { color: '#A78BFA', fontWeight: '700' },
  verifyHint: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 12, lineHeight: 20 },
  devCode: { fontSize: 13, color: '#A78BFA', fontWeight: '700', marginBottom: 10 },
});
