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
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';
import { useTheme } from '@/src/contexts/ThemeContext';

function isChildInvite(preview: HouseholdInvitePreview) {
  return preview.inviteType === 'child';
}

export default function AcceptInviteScreen() {
  const theme = useTheme();
  const styles = useAppStyles(createStyles);
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { currentUser, refreshProfile } = useAuth();
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

  const finishAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);
    try {
      const result = await acceptHouseholdInvite(token);
      await refreshProfile();
      if (result.activePortal !== 'child') {
        await refresh();
      }
      router.replace('/');
    } catch (e: unknown) {
      setError((e as Error).message || 'Could not accept invite');
    } finally {
      setAccepting(false);
    }
  };

  const onAccept = async () => {
    if (!token) return;
    if (!currentUser) {
      router.replace(`/(auth)/login?redirect=/invite/${token}`);
      return;
    }
    await finishAccept();
  };

  const childInvite = preview ? isChildInvite(preview) : false;
  const childName = preview?.displayName || 'you';

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
            <Text style={styles.emoji}>{childInvite ? '🎉' : '🏠'}</Text>
            <Text style={styles.title}>
              {childInvite ? 'Your family invited you!' : `Join ${preview.householdName}`}
            </Text>
            <Text style={styles.body}>
              {childInvite
                ? `${preview.inviterName} invited ${childName} to FamilyHub. Accept to see chores, earn rewards, and stay connected safely.`
                : `${preview.inviterName} invited you to share this home on FamilyHub.`}
            </Text>
            {childInvite ? (
              <Text style={styles.meta}>Family: {preview.householdName}</Text>
            ) : (
              <Text style={styles.meta}>Role: {preview.role}</Text>
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {!currentUser ? (
              <>
                <Button
                  title="Create my account"
                  onPress={() => router.replace(`/(auth)/register?invite=${token}`)}
                />
                <Button
                  title="I already have an account"
                  variant="secondary"
                  onPress={() => router.replace(`/(auth)/login?redirect=/invite/${token}`)}
                />
              </>
            ) : (
              <Button title={childInvite ? 'Join my family' : 'Accept invite'} onPress={onAccept} loading={accepting} />
            )}
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  emoji: { fontSize: 48, textAlign: 'center', marginBottom: 4 },
  title: { ...theme.typography.h2, color: theme.colors.text, textAlign: 'center' },
  body: { ...theme.typography.body, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  meta: { fontSize: 15, color: theme.colors.textMuted, textAlign: 'center' },
  error: { color: theme.colors.danger, fontSize: 15, textAlign: 'center' },
});
}
