import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '@/src/components/ui';
import { resetPassword } from '@/src/services/authService';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';

export default function ResetPasswordDeepLinkScreen() {
  const styles = useAppStyles(createStyles);
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onReset = async () => {
    if (!token) {
      setError('Invalid reset link');
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
    setError(null);
    try {
      await resetPassword(String(token), newPassword);
      router.replace('/(auth)/login');
    } catch (e: unknown) {
      setError((e as Error).message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Choose a new password</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Input label="New password" secureTextEntry showPasswordToggle value={newPassword} onChangeText={setNewPassword} />
        <Input label="Confirm password" secureTextEntry showPasswordToggle value={confirmPassword} onChangeText={setConfirmPassword} />
        <Button title="Update password" onPress={onReset} loading={loading} />
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  title: { ...theme.typography.h2, color: theme.colors.text, marginBottom: 8 },
  error: { color: theme.colors.danger, fontSize: 14 },
});
}
