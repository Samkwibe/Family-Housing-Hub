import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useToast } from '@/src/contexts/ToastContext';
import { useChildPortal } from '@/src/portals/child/ChildPortalContext';
import { ChildAvatar } from '@/src/portals/child/components/ChildAvatar';
import { childTheme } from '@/src/portals/child/theme';
import { switchPortal } from '@/src/services/portalService';

function ageTierLabel(tier?: string, experienceType?: string): string {
  if (tier === 'teen_13_17') return 'Teen (13–17)';
  if (tier === 'child_9_12') return 'Kid (9–12)';
  if (tier === 'managed') return 'Managed by parent';
  if (experienceType === 'teen') return 'Teen (13–17)';
  if (experienceType === 'child' || experienceType === 'managed') return 'Kid (9–12)';
  return 'Family member';
}

type RowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  loading?: boolean;
};

function SettingsRow({ icon, label, value, onPress, danger, loading }: RowProps) {
  const content = (
    <View style={styles.row}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons name={icon} size={20} color={danger ? '#DC2626' : childTheme.colors.purpleDeep} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={childTheme.colors.purpleDeep} />
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color={childTheme.colors.inkMuted} />
      ) : null}
    </View>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={loading}
        style={({ pressed }) => (pressed || loading) && styles.rowPressed}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}

export function ChildSettingsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { currentUser, logout, refreshProfile, userProfile } = useAuth();
  const { data, displayName, avatar, level, streak, refreshing, needsProfile, refresh } = useChildPortal();
  const [switchingPortal, setSwitchingPortal] = useState(false);

  const profile = data?.profile;
  const experienceType = data?.portalContext?.experience_type || String(userProfile?.experienceType || '');
  const email = currentUser?.email ?? '';
  const canSwitchToRenter =
    userProfile?.userType === 'renter' ||
    userProfile?.userType === 'owner' ||
    userProfile?.experienceType === 'renter' ||
    userProfile?.experienceType === 'owner';

  const onLogout = () => {
    Alert.alert('Log out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/(auth)/login');
          } catch (e) {
            Alert.alert('Could not log out', e instanceof Error ? e.message : 'Try again.');
          }
        },
      },
    ]);
  };

  const onRefreshData = async () => {
    try {
      await refresh();
      await refreshProfile();
      showToast(needsProfile ? 'Checked for updates — ask a parent to finish setup' : 'Your data is up to date!', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not refresh your data', 'error');
    }
  };

  const onSwitchRenter = async () => {
    setSwitchingPortal(true);
    try {
      await switchPortal({ activePortal: 'renter' });
      await refreshProfile();
      showToast('Switched to household app', 'success');
    } catch (e) {
      Alert.alert('Could not switch', e instanceof Error ? e.message : 'Try again later.');
    } finally {
      setSwitchingPortal(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Your profile and account</Text>

        {needsProfile ? (
          <View style={styles.setupBanner}>
            <Text style={styles.setupTitle}>Profile not ready yet</Text>
            <Text style={styles.setupBody}>
              Ask a parent to add you to the household, then tap Refresh my data below.
            </Text>
          </View>
        ) : null}

        <View style={styles.profileCard}>
          <ChildAvatar theme={avatar} name={displayName} level={level.level} size={64} />
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileMeta}>{ageTierLabel(profile?.ageTier, experienceType)}</Text>
          <View style={styles.statsInline}>
            <Text style={styles.statChip}>⭐ {profile?.pointsBalance ?? 0} pts</Text>
            {streak > 0 ? <Text style={styles.statChip}>🔥 {streak} day streak</Text> : null}
          </View>
        </View>

        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <SettingsRow icon="mail-outline" label="Email" value={email || '—'} />
          <View style={styles.divider} />
          <SettingsRow
            icon="refresh-outline"
            label="Refresh my data"
            value={refreshing ? 'Updating…' : 'Pull latest chores, points, and rewards'}
            onPress={onRefreshData}
            loading={refreshing}
          />
        </View>

        <Text style={styles.sectionLabel}>About your space</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Safe mode"
            value="Only chores, rewards, and family chat"
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="people-outline"
            label="Managed by"
            value="Your parent controls rewards and homework"
          />
        </View>

        {canSwitchToRenter ? (
          <>
            <Text style={styles.sectionLabel}>Portal</Text>
            <View style={styles.card}>
              <SettingsRow
                icon="swap-horizontal-outline"
                label="Switch to family app"
                value="Renter / household view"
                onPress={onSwitchRenter}
                loading={switchingPortal}
              />
            </View>
          </>
        ) : null}

        <View style={[styles.card, styles.logoutCard]}>
          <SettingsRow icon="log-out-outline" label="Log out" onPress={onLogout} danger />
        </View>

        <Text style={styles.footer}>FamilyHub Child Portal</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: childTheme.colors.cream },
  scroll: { flex: 1 },
  content: { padding: childTheme.spacing.xl, paddingBottom: 160 },
  title: {
    fontFamily: childTheme.fonts.title,
    fontSize: 28,
    fontWeight: '700',
    color: childTheme.colors.ink,
  },
  subtitle: {
    fontFamily: childTheme.fonts.body,
    fontSize: 15,
    color: childTheme.colors.inkMuted,
    marginTop: 4,
    marginBottom: childTheme.spacing.xl,
  },
  setupBanner: {
    backgroundColor: '#EDE9FE',
    borderRadius: childTheme.radius.lg,
    padding: childTheme.spacing.lg,
    marginBottom: childTheme.spacing.lg,
  },
  setupTitle: {
    fontFamily: childTheme.fonts.bodyBold,
    fontSize: 15,
    color: childTheme.colors.purpleDeep,
  },
  setupBody: {
    fontFamily: childTheme.fonts.body,
    fontSize: 14,
    color: childTheme.colors.inkSoft,
    marginTop: 4,
    lineHeight: 20,
  },
  profileCard: {
    backgroundColor: childTheme.colors.white,
    borderRadius: childTheme.radius.xl,
    padding: childTheme.spacing.xxl,
    alignItems: 'center',
    marginBottom: childTheme.spacing.xxl,
    ...childTheme.shadow.card,
  },
  profileName: {
    fontFamily: childTheme.fonts.title,
    fontSize: 22,
    fontWeight: '700',
    color: childTheme.colors.ink,
    marginTop: childTheme.spacing.md,
  },
  profileMeta: {
    fontFamily: childTheme.fonts.body,
    fontSize: 14,
    color: childTheme.colors.inkMuted,
    marginTop: 4,
  },
  statsInline: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, justifyContent: 'center' },
  statChip: {
    fontFamily: childTheme.fonts.bodyMedium,
    fontSize: 13,
    color: childTheme.colors.purpleDeep,
    backgroundColor: childTheme.colors.sky,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: childTheme.radius.pill,
  },
  sectionLabel: {
    fontFamily: childTheme.fonts.bodyBold,
    fontSize: 13,
    color: childTheme.colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  card: {
    backgroundColor: childTheme.colors.white,
    borderRadius: childTheme.radius.lg,
    marginBottom: childTheme.spacing.xl,
    overflow: 'hidden',
    ...childTheme.shadow.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  rowPressed: { opacity: 0.85 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: childTheme.colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: '#FEE2E2' },
  rowBody: { flex: 1 },
  rowLabel: { fontFamily: childTheme.fonts.bodyBold, fontSize: 16, color: childTheme.colors.ink },
  rowLabelDanger: { color: '#DC2626' },
  rowValue: { fontFamily: childTheme.fonts.body, fontSize: 13, color: childTheme.colors.inkMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 68 },
  logoutCard: { marginTop: 8 },
  footer: {
    textAlign: 'center',
    fontFamily: childTheme.fonts.body,
    fontSize: 12,
    color: childTheme.colors.inkMuted,
    marginTop: 8,
  },
});
