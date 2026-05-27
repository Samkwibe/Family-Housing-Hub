import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Switch, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { useHousehold } from '@/src/contexts/HouseholdContext';
import { useToast } from '@/src/contexts/ToastContext';
import { useTheme, useThemePreference, type ThemePreference } from '@/src/contexts/ThemeContext';
import { Button, Input } from '@/src/components/ui';
import {
  fetchHouseholds,
  fetchHouseholdPermissions,
  fetchLocationSharing,
  grantMemberPermission,
  sendHouseholdInvite,
  sendChildInvite,
  fetchHouseholdInvites,
  switchHousehold,
  updateLocationSharing,
  type HouseholdSummary,
  type MemberPermissions,
  type HouseholdInvitePreview,
} from '@/src/services/householdService';
import {
  refreshGeofenceSharingState,
  setGeofenceSharingEnabled,
  startGeofenceBackgroundPings,
} from '@/src/services/geofenceLocation';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';

const THEME_OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'System' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();
  const styles = useAppStyles(createStyles);
  const { logout, currentUser } = useAuth();
  const { members, refresh } = useHousehold();
  const toast = useToast();
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [childName, setChildName] = useState('');
  const [childEmail, setChildEmail] = useState('');
  const [childDob, setChildDob] = useState('');
  const [invitingChild, setInvitingChild] = useState(false);
  const [pendingChildInvites, setPendingChildInvites] = useState<HouseholdInvitePreview[]>([]);
  const [households, setHouseholds] = useState<HouseholdSummary[]>([]);
  const [activeHouseholdId, setActiveHouseholdId] = useState<string | null>(null);
  const [locationSharing, setLocationSharing] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [permMembers, setPermMembers] = useState<MemberPermissions[]>([]);
  const [permLoading, setPermLoading] = useState(false);

  const loadHouseholds = useCallback(async () => {
    try {
      const res = await fetchHouseholds();
      setHouseholds(res.households);
      setActiveHouseholdId(res.activeHouseholdId);
    } catch {
      // non-blocking
    }
  }, []);

  const loadLocationSharing = useCallback(async () => {
    try {
      const res = await fetchLocationSharing();
      setLocationSharing(res.locationSharingEnabled);
    } catch {
      setLocationSharing(false);
    }
  }, []);

  const loadPermissions = useCallback(async () => {
    setPermLoading(true);
    try {
      const res = await fetchHouseholdPermissions();
      setPermMembers(res.members);
    } catch {
      setPermMembers([]);
    } finally {
      setPermLoading(false);
    }
  }, []);

  const loadChildInvites = useCallback(async () => {
    try {
      const res = await fetchHouseholdInvites('child');
      setPendingChildInvites(res.invites);
    } catch {
      setPendingChildInvites([]);
    }
  }, []);

  useEffect(() => {
    loadHouseholds();
    loadLocationSharing();
    loadPermissions();
    loadChildInvites();
  }, [loadHouseholds, loadLocationSharing, loadPermissions, loadChildInvites]);

  const onInviteChild = async () => {
    const email = childEmail.trim().toLowerCase();
    const displayName = childName.trim();
    const dateOfBirth = childDob.trim();
    if (!displayName) {
      toast.error("Enter your child's name");
      return;
    }
    if (!email.includes('@')) {
      toast.error('Enter a valid email for your child');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      toast.error('Enter birthday as YYYY-MM-DD');
      return;
    }
    setInvitingChild(true);
    try {
      const res = await sendChildInvite({ email, displayName, dateOfBirth });
      setChildName('');
      setChildEmail('');
      setChildDob('');
      await loadChildInvites();
      toast.success(`Invite sent to ${displayName}`);
      if (__DEV__ && res.invite.inviteLink) {
        Alert.alert('Dev child invite link', res.invite.inviteLink);
      }
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Could not send child invite');
    } finally {
      setInvitingChild(false);
    }
  };

  const onLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const onInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email.includes('@')) {
      toast.error('Enter a valid email address');
      return;
    }
    setInviting(true);
    try {
      const res = await sendHouseholdInvite(email);
      setInviteEmail('');
      toast.success(`Invite sent to ${email}`);
      if (__DEV__ && res.invite.inviteLink) {
        Alert.alert('Dev invite link', res.invite.inviteLink);
      }
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Could not send invite');
    } finally {
      setInviting(false);
    }
  };

  const onSwitchHousehold = async (householdId: string) => {
    if (householdId === activeHouseholdId) return;
    try {
      await switchHousehold(householdId);
      await refresh();
      await loadHouseholds();
      await loadPermissions();
      toast.success('Switched household');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Could not switch household');
    }
  };

  const onToggleLocation = async (enabled: boolean) => {
    setLocationLoading(true);
    try {
      await updateLocationSharing(enabled);
      setLocationSharing(enabled);
      await setGeofenceSharingEnabled(enabled);
      if (enabled) {
        await startGeofenceBackgroundPings();
      }
      toast.success(enabled ? 'Location sharing enabled' : 'Location sharing off');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Could not update location sharing');
      await refreshGeofenceSharingState();
    } finally {
      setLocationLoading(false);
    }
  };

  const onToggleDocumentAccess = async (targetUserId: string, current: boolean) => {
    try {
      await grantMemberPermission(targetUserId, 'documents', !current);
      await loadPermissions();
      toast.success(!current ? 'Document access granted' : 'Document access revoked');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Could not update permission');
    }
  };

  const activeHousehold = households.find((h) => h.isActive);
  const isOwner = activeHousehold?.role === 'owner';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{currentUser?.email}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appearance</Text>
          <Text style={styles.meta}>Choose light, dark, or match your device setting.</Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((opt) => {
              const active = preference === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.themeOption, active && styles.themeOptionActive]}
                  onPress={() => setPreference(opt.key)}
                >
                  <Text style={[styles.themeOptionText, active && styles.themeOptionTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Privacy & location</Text>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.value}>Share location with household</Text>
              <Text style={styles.meta}>
                Sends GPS to safe-zone checks every 5 minutes when enabled. Children&apos;s location is visible to parents only.
              </Text>
            </View>
            <Switch
              value={locationSharing}
              onValueChange={onToggleLocation}
              disabled={locationLoading}
              trackColor={{ true: theme.colors.primary }}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Household</Text>
          {households.map((hh) => (
            <View key={hh.id} style={styles.householdRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.value}>{hh.name}</Text>
                <Text style={styles.meta}>
                  {hh.memberCount} member{hh.memberCount === 1 ? '' : 's'} · {hh.role}
                  {hh.isActive ? ' · active' : ''}
                </Text>
              </View>
              {!hh.isActive && households.length > 1 ? (
                <Button
                  title="Switch"
                  variant="secondary"
                  onPress={() => onSwitchHousehold(hh.id)}
                  style={styles.switchBtn}
                />
              ) : null}
            </View>
          ))}
          {members.map((m) => (
            <Text key={m.id} style={styles.memberLine}>
              {m.initials} · {m.name} ({m.role})
            </Text>
          ))}
          {isOwner ? (
            <>
              <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Invite a child</Text>
              <Text style={styles.meta}>
                Send a family invite with your child&apos;s name and birthday. They&apos;ll land directly in the child portal.
              </Text>
              <Input
                value={childName}
                onChangeText={setChildName}
                placeholder="Child's first name"
                autoCapitalize="words"
              />
              <Input
                value={childEmail}
                onChangeText={setChildEmail}
                placeholder="child@email.com"
                autoCapitalize="none"
                keyboardType="email-address"
                style={{ marginTop: 8 }}
              />
              <Input
                value={childDob}
                onChangeText={setChildDob}
                placeholder="Birthday YYYY-MM-DD"
                autoCapitalize="none"
                style={{ marginTop: 8 }}
              />
              <Button title="Invite child" onPress={onInviteChild} loading={invitingChild} style={{ marginTop: 8 }} />
              {pendingChildInvites.length > 0 ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.label}>Pending child invites</Text>
                  {pendingChildInvites.map((inv) => (
                    <Text key={inv.token} style={styles.memberLine}>
                      {inv.displayName || inv.email} · {inv.childInviteStatus || 'pending'}
                    </Text>
                  ))}
                </View>
              ) : null}

              <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Invite roommate</Text>
              <Input
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="roommate@email.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Button title="Send invite" onPress={onInvite} loading={inviting} style={{ marginTop: 8 }} />
            </>
          ) : (
            <Text style={styles.meta}>Only the household owner can send invites.</Text>
          )}
        </View>

        {isOwner ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Manage permissions</Text>
            {permLoading ? (
              <Text style={styles.meta}>Loading…</Text>
            ) : (
              permMembers
                .filter((m) => m.role !== 'owner')
                .map((m) => (
                  <View key={m.userId} style={styles.permBlock}>
                    <Text style={styles.value}>{m.displayName}</Text>
                    <Text style={styles.meta}>Role: {m.role}</Text>
                    <View style={styles.toggleRow}>
                      <Text style={styles.permLabel}>Document vault access</Text>
                      <Switch
                        value={Boolean(m.permissions.documents)}
                        onValueChange={() => onToggleDocumentAccess(m.userId, Boolean(m.permissions.documents))}
                      />
                    </View>
                  </View>
                ))
            )}
          </View>
        ) : null}

        <Button
          title="Edit profile"
          onPress={() => router.push('/(main)/profile')}
          variant="secondary"
          style={{ marginBottom: 8 }}
        />
        <Button title="Sign out" onPress={onLogout} variant="danger" style={styles.logout} />
        <Button
          title="About"
          onPress={() =>
            Alert.alert('Family Housing Hub', 'FamilyHub v1.0\nManage housing for your family.')
          }
          variant="ghost"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  cardTitle: { ...theme.typography.label, color: theme.colors.text, marginBottom: 12 },
  sectionHeading: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
  label: { fontSize: 12, color: theme.colors.textMuted, textTransform: 'uppercase', fontWeight: '600' },
  value: { fontSize: 17, fontWeight: '600', color: theme.colors.text, marginTop: 4 },
  meta: { fontSize: 14, color: theme.colors.textMuted, marginTop: 2 },
  memberLine: { fontSize: 15, color: theme.colors.textSecondary, marginTop: 6 },
  householdRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  switchBtn: { paddingHorizontal: 12, minHeight: 36 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  permBlock: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  permLabel: { flex: 1, fontSize: 15, color: theme.colors.textSecondary },
  logout: { marginTop: 20, marginBottom: 8 },
  themeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  themeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surfaceInset,
    alignItems: 'center',
  },
  themeOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.glowPurple,
  },
  themeOptionText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  themeOptionTextActive: { color: theme.colors.text },
});
}
