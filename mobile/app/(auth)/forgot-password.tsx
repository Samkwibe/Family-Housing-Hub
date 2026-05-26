import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/src/components/ui';
import {
  AuthScreen,
  AuthHeader,
  AuthCard,
  FormErrorBanner,
  AuthFooterLink,
} from '@/src/components/auth/AuthScreen';
import { AuthBackButton } from '@/src/components/auth/AuthForm';
import { forgotPassword, resetPassword } from '@/src/services/authService';
import { theme } from '@/src/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSend = async () => {
    setError(null);
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPassword(email.trim().toLowerCase());
      setSent(true);
      if (res.devResetLink) {
        Alert.alert('Dev reset link', res.devResetLink);
      }
    } catch (e: unknown) {
      setError((e as Error).message || 'Could not send reset link');
    } finally {
      setLoading(false);
    }
  };

  const onReset = async () => {
    setError(null);
    if (!token.trim()) {
      setError('Paste the reset token from your email link.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token.trim(), newPassword);
      router.replace('/(auth)/login');
    } catch (e: unknown) {
      setError((e as Error).message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      footer={
        <AuthFooterLink
          text="Remember your password?"
          linkText="Sign in"
          onPress={() => router.push('/(auth)/login')}
          disabled={loading}
        />
      }
    >
      <AuthBackButton onPress={() => router.back()} />
      <Text style={styles.backHint}>Back to login</Text>

      <View style={styles.iconWrap}>
        <Ionicons name="key" size={30} color="#F59E0B" />
      </View>

      <AuthHeader
        showBrand={false}
        title="Reset password"
        subtitle="We'll email you a secure link to choose a new password."
      />

      <AuthCard>
        <FormErrorBanner message={error} />

        <Input
          label="Email address"
          placeholder="you@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        <Button
          title={sent ? 'Resend reset link' : 'Send reset link'}
          onPress={onSend}
          loading={loading}
          style={styles.cta}
        />

        {sent ? (
          <View style={styles.sentCard}>
            <Text style={styles.sentTitle}>Check your email</Text>
            <Text style={styles.sentBody}>
              Open the reset link from your email, then paste the token below if the app did not open automatically.
            </Text>
          </View>
        ) : null}

        <Input
          label="Reset token"
          placeholder="Paste token from email link"
          autoCapitalize="none"
          value={token}
          onChangeText={setToken}
          editable={!loading}
        />
        <Input
          label="New password"
          placeholder="Enter new password"
          showPasswordToggle
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          editable={!loading}
        />
        <Input
          label="Confirm new password"
          placeholder="Re-enter new password"
          showPasswordToggle
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={!loading}
        />

        <Button title="Reset password" onPress={onReset} loading={loading} />
      </AuthCard>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  backHint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: -4,
    marginBottom: 12,
    marginLeft: 4,
  },
  iconWrap: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: 'rgba(245,158,11,.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(245,158,11,.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cta: { marginBottom: 16 },
  sentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: 16,
  },
  sentTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
  sentBody: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
});
