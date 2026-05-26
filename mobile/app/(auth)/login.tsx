import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  SocialAuthButtons,
  loadRememberedIdentifier,
  saveRememberedIdentifier,
} from '@/src/components/SocialAuthButtons';
import {
  AuthScreen,
  FormErrorBanner,
  AuthFooterLink,
} from '@/src/components/auth/AuthScreen';
import {
  FamilyHubBrand,
  AuthHeroLogin,
  AuthSegmentTabs,
  AuthField,
  AuthGradientButton,
  AuthCheckbox,
  SecurityBanner,
} from '@/src/components/auth/AuthForm';
import { normalizeUSPhone } from '@/src/utils/phone';
import { hasCompletedIntro } from '@/src/services/onboardingStorage';
import { theme } from '@/src/theme';

type LoginMode = 'email' | 'phone';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRememberedIdentifier().then((saved) => {
      if (saved) {
        setIdentifier(saved);
        setRememberMe(true);
      }
    });
  }, []);

  const onSubmit = async () => {
    setError(null);
    const trimmed = identifier.trim();
    if (!trimmed || !password) {
      setError(mode === 'email' ? 'Enter your email and password.' : 'Enter your phone and password.');
      return;
    }

    const loginId =
      mode === 'phone' ? normalizeUSPhone(trimmed) || trimmed.replace(/\D/g, '') : trimmed;

    if (mode === 'email' && !loginId.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (mode === 'phone' && loginId.replace(/\D/g, '').length < 10) {
      setError('Enter a valid US phone number.');
      return;
    }

    try {
      setLoading(true);
      await login(loginId, password);
      if (rememberMe) {
        await saveRememberedIdentifier(trimmed);
      } else {
        await saveRememberedIdentifier(null);
      }
      router.replace('/');
    } catch (e: unknown) {
      setError((e as Error).message || 'Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const goToSignup = async () => {
    const ready = await hasCompletedIntro();
    router.push(ready ? '/(auth)/register' : '/(auth)/intro');
  };

  return (
    <AuthScreen
      footer={
        <AuthFooterLink
          text="New here?"
          linkText="Create account"
          onPress={goToSignup}
          disabled={loading}
        />
      }
    >
      <FamilyHubBrand />

      <Text style={styles.title}>Welcome back 👋</Text>
      <Text style={styles.subtitle}>
        Log in to continue managing your home, finances, and everything that matters.
      </Text>

      <AuthHeroLogin />

      <FormErrorBanner message={error} />

      <AuthSegmentTabs
        tabs={[
          { id: 'email', label: 'Email' },
          { id: 'phone', label: 'Phone' },
        ]}
        value={mode}
        onChange={(id) => {
          setMode(id as LoginMode);
          setError(null);
        }}
        disabled={loading}
      />

      {mode === 'email' ? (
        <AuthField
          label="Email address"
          icon="mail-outline"
          placeholder="you@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="username"
          textContentType="username"
          value={identifier}
          onChangeText={(v) => {
            setIdentifier(v);
            if (error) setError(null);
          }}
          editable={!loading}
        />
      ) : (
        <AuthField
          label="Phone number"
          icon="call-outline"
          placeholder="(555) 000-0000"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          value={identifier}
          onChangeText={(v) => {
            setIdentifier(v);
            if (error) setError(null);
          }}
          editable={!loading}
        />
      )}

      <AuthField
        label="Password"
        icon="lock-closed-outline"
        placeholder="••••••••"
        showPasswordToggle
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (error) setError(null);
        }}
        editable={!loading}
      />

      <View style={styles.row}>
        <AuthCheckbox
          checked={rememberMe}
          onToggle={() => setRememberMe((v) => !v)}
          disabled={loading}
          label="Remember me"
        />
        <Pressable
          onPress={() => router.push('/(auth)/forgot-password')}
          disabled={loading}
          hitSlop={8}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Pressable>
      </View>

      <AuthGradientButton title="Log in" onPress={onSubmit} loading={loading} disabled={loading} />

      <SocialAuthButtons
        disabled={loading}
        onSuccess={() => router.replace('/')}
        onError={setError}
      />

      <SecurityBanner />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: theme.fonts.titleExtra,
    fontSize: 26,
    color: theme.colors.text,
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    marginBottom: 4,
    maxWidth: 340,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 2,
    gap: 8,
  },
  forgotText: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryLight,
  },
});
