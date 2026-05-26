import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { useHousehold } from '@/src/contexts/HouseholdContext';
import { Button } from '@/src/components/ui';
import {
  acceptHouseholdInvite,
  fetchInvitePreview,
  type HouseholdInvitePreview,
} from '@/src/services/householdService';
import { theme } from '@/src/theme';

export default function AcceptInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { refresh } = useHousehold();
  const [preview, setPreview] = useState<HouseholdInvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link.');
      setLoading(false);
      return;
    }
    fetchInvitePreview(token)
      .then((res) => setPreview(res.invite))
      .catch((e: Error) => setError(e.message || 'Invite not found'))
      .finally(() => setLoading(false));
  }, [token]);

  const onAccept = async () => {
    if (!token) return;
    if (!currentUser) {
      router.replace(`/(auth)/login?redirect=/invite/${token}`);
      return;
    }
    setAccepting(true);
    setError(null);
    try {
      await acceptHouseholdInvite(token);
      await refresh();
      router.replace('/(main)/(tabs)/dashboard');
    } catch (e: unknown) {
      setError((e as Error).message || 'Could not accept invite');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : error && !preview ? (
          <>
            <Text style={styles.title}>Invite unavailable</Text>
            <Text style={styles.body}>{error}</Text>
            <Button title="Go to login" onPress={() => router.replace('/(auth)/login')} />
          </>
        ) : preview ? (
          <>
            <Text style={styles.title}>Join {preview.householdName}</Text>
            <Text style={styles.body}>
              {preview.inviterName} invited you to share this home on FamilyHub.
            </Text>
            <Text style={styles.meta}>Role: {preview.role}</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {!currentUser ? (
              <Button
                title="Log in to accept"
                onPress={() => router.replace(`/(auth)/login?redirect=/invite/${token}`)}
              />
            ) : (
              <Button title="Accept invite" onPress={onAccept} loading={accepting} />
            )}
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  title: { ...theme.typography.h2, color: theme.colors.text },
  body: { ...theme.typography.body, color: theme.colors.textSecondary },
  meta: { fontSize: 15, color: theme.colors.textMuted },
  error: { color: theme.colors.danger, fontSize: 15 },
});
