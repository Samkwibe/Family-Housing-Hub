import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button } from '@/src/components/ui';
import { useParentToast } from '@/src/portals/shared/parentToast';
import { ChildSummaryCard } from '@/src/portals/parent/components/ChildSummaryCard';
import { ActivityFeedRow } from '@/src/portals/parent/components/ActivityFeedRow';
import { FamilyIntelligencePanel } from '@/src/portals/parent/components/FamilyIntelligencePanel';
import { RealtimeCelebrationLayer } from '@/src/portals/shared/RealtimeCelebrationLayer';
import { FamilyMemoriesPreview } from '@/src/portals/shared/components/FamilyMemoriesPreview';
import { subscribeFamilyActivity, type FamilyActivityPayload } from '@/src/portals/child/celebrationEvents';
import { familyTheme } from '@/src/portals/parent/theme';
import {
  createChildProfile,
  approveChildRedemption,
  declineChildRedemption,
  fetchParentChildrenDashboard,
  type ChildActivityItem,
  type ParentChildrenDashboard,
} from '@/src/services/parentChildService';
import { sendChildInvite } from '@/src/services/householdService';

export function MyChildrenScreen() {
  const router = useRouter();
  const { showParentToast } = useParentToast();
  const [data, setData] = useState<ParentChildrenDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<'invite' | 'managed'>('invite');
  const [childName, setChildName] = useState('');
  const [childEmail, setChildEmail] = useState('');
  const [childDob, setChildDob] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [liveActivity, setLiveActivity] = useState<ChildActivityItem[]>([]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const dash = await fetchParentChildrenDashboard();
      setData(dash);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load family hub');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsub = subscribeFamilyActivity((item: FamilyActivityPayload) => {
      setLiveActivity((prev) => [{
        id: item.id || `live-${item.ts || Date.now()}`,
        type: item.type,
        childProfileId: item.childProfileId,
        childName: item.childName || 'Child',
        title: item.title,
        message: item.message,
        emoji: item.emoji,
        createdAt: item.createdAt,
      }, ...prev].slice(0, 8));
    });
    return unsub;
  }, []);

  const onResolveRedemption = async (id: string, approve: boolean) => {
    try {
      if (approve) await approveChildRedemption(id);
      else await declineChildRedemption(id);
      showParentToast(approve ? 'Reward approved!' : 'Request declined', approve ? 'success' : 'info');
      await load(true);
    } catch (e) {
      showParentToast(e instanceof Error ? e.message : 'Could not update', 'error');
    }
  };

  const onAddChild = async () => {
    const name = childName.trim();
    const dob = childDob.trim();
    if (!name) {
      showParentToast('Enter a name', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (addMode === 'managed') {
        await createChildProfile({ displayName: name, dateOfBirth: dob || undefined });
        showParentToast(`${name} added as managed profile`, 'success');
      } else {
        const email = childEmail.trim().toLowerCase();
        if (!email.includes('@')) {
          showParentToast('Enter a valid email', 'error');
          setSubmitting(false);
          return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
          showParentToast('Birthday required (YYYY-MM-DD)', 'error');
          setSubmitting(false);
          return;
        }
        await sendChildInvite({ email, displayName: name, dateOfBirth: dob });
        showParentToast(`Invite sent to ${name}`, 'success');
      }
      setAddOpen(false);
      setChildName('');
      setChildEmail('');
      setChildDob('');
      await load(true);
    } catch (e) {
      showParentToast(e instanceof Error ? e.message : 'Could not add child', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={familyTheme.colors.purpleDeep} />
      </View>
    );
  }

  const summary = data?.summary;
  const children = data?.children ?? [];
  const invites = data?.pendingInvites ?? [];
  const pendingRedemptions = data?.pendingRedemptions ?? [];
  const activity = [...liveActivity, ...(data?.activity ?? [])].slice(0, 25);

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...familyTheme.gradients.header]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={familyTheme.colors.ink} />
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.title}>My Children</Text>
              <Text style={styles.subtitle}>Your family operating hub</Text>
            </View>
            <Pressable onPress={() => { setAddMode('invite'); setAddOpen(true); }} style={styles.addBtn}>
              <Ionicons name="add" size={24} color="#fff" />
            </Pressable>
          </View>

          {summary ? (
            <View style={styles.summaryRow}>
              <SummaryChip icon="people" value={String(summary.childCount)} label="Children" />
              <SummaryChip icon="checkbox-outline" value={String(summary.totalPendingChores)} label="Tasks" />
              <SummaryChip icon="mail-outline" value={String(summary.pendingInvites)} label="Invites" />
              <SummaryChip icon="gift-outline" value={String(summary.pendingRedemptions ?? 0)} label="Rewards" />
              {summary.openSosAlerts > 0 ? (
                <SummaryChip icon="heart" value={String(summary.openSosAlerts)} label="SOS" alert />
              ) : null}
            </View>
          ) : null}
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={familyTheme.colors.purpleDeep} />
        }
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FamilyIntelligencePanel intelligence={data?.familyIntelligence} />

        {data?.aiRecommendations?.[0] && !data?.familyIntelligence?.headline ? (
          <View style={styles.coachCard}>
            <Ionicons name="sparkles" size={18} color={familyTheme.colors.purpleDeep} />
            <Text style={styles.coachText}>{data.aiRecommendations[0]}</Text>
          </View>
        ) : null}

        {pendingRedemptions.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reward requests</Text>
            {pendingRedemptions.map((r) => (
              <View key={r.id} style={styles.redeemRow}>
                <Text style={styles.inviteEmoji}>{r.rewardEmoji}</Text>
                <View style={styles.inviteBody}>
                  <Text style={styles.inviteName}>{r.childName} wants {r.rewardTitle}</Text>
                  <Text style={styles.inviteMeta}>{r.cost} points</Text>
                </View>
                <Pressable onPress={() => onResolveRedemption(r.id, true)} style={styles.approveBtn}>
                  <Text style={styles.approveText}>✓</Text>
                </Pressable>
                <Pressable onPress={() => onResolveRedemption(r.id, false)} style={styles.declineBtn}>
                  <Text style={styles.declineText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {invites.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending invites</Text>
            {invites.map((inv) => (
              <View key={inv.token} style={styles.inviteRow}>
                <Text style={styles.inviteEmoji}>✉️</Text>
                <View style={styles.inviteBody}>
                  <Text style={styles.inviteName}>{inv.displayName || inv.email}</Text>
                  <Text style={styles.inviteMeta}>{inv.email} · {inv.childInviteStatus}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your children</Text>
          {children.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>👨‍👩‍👧‍👦</Text>
              <Text style={styles.emptyTitle}>No children yet</Text>
              <Text style={styles.emptyBody}>Invite a child with email or create a managed profile for kids under 8.</Text>
              <Button title="Add a child" onPress={() => setAddOpen(true)} style={{ marginTop: 16 }} />
            </View>
          ) : (
            children.map((child) => (
              <ChildSummaryCard
                key={child.id}
                child={child}
                onPress={() => router.push(`/(main)/my-children/${child.id}`)}
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <FamilyMemoriesPreview
            portal="parent"
            onOpenAll={() => router.push('/(main)/my-children/memories')}
          />
        </View>

        {activity.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Family activity</Text>
            <View style={styles.activityCard}>
              {activity.map((item) => (
                <ActivityFeedRow key={item.id} item={item} />
              ))}
            </View>
          </View>
        ) : null}

        <Pressable style={styles.managedLink} onPress={() => { setAddMode('managed'); setAddOpen(true); }}>
          <Ionicons name="person-add-outline" size={18} color={familyTheme.colors.purpleDeep} />
          <Text style={styles.managedLinkText}>Add managed child (under 8, no login)</Text>
        </Pressable>
      </ScrollView>

      <RealtimeCelebrationLayer
        portal="parent"
        onRefresh={() => load(true)}
        onParentToast={(msg) => showParentToast(msg, 'success')}
      />

      <Modal visible={addOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{addMode === 'managed' ? 'Managed profile' : 'Invite a child'}</Text>
            <Text style={styles.modalSub}>
              {addMode === 'managed'
                ? 'For kids under 8 — no email or login needed. You assign chores and rewards.'
                : 'They receive an email link and land directly in the child portal.'}
            </Text>
            <Input value={childName} onChangeText={setChildName} placeholder="First name" />
            {addMode === 'invite' ? (
              <>
                <Input value={childEmail} onChangeText={setChildEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" style={{ marginTop: 8 }} />
                <Input value={childDob} onChangeText={setChildDob} placeholder="Birthday YYYY-MM-DD" style={{ marginTop: 8 }} />
              </>
            ) : (
              <Input value={childDob} onChangeText={setChildDob} placeholder="Birthday YYYY-MM-DD (optional)" style={{ marginTop: 8 }} />
            )}
            <Button title={addMode === 'managed' ? 'Create profile' : 'Send invite'} onPress={onAddChild} loading={submitting} style={{ marginTop: 16 }} />
            <Button title="Cancel" variant="ghost" onPress={() => setAddOpen(false)} />
            {addMode === 'invite' ? (
              <Pressable onPress={() => setAddMode('managed')} style={{ marginTop: 8 }}>
                <Text style={styles.switchMode}>Switch to managed profile instead</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setAddMode('invite')} style={{ marginTop: 8 }}>
                <Text style={styles.switchMode}>Switch to email invite instead</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SummaryChip({ icon, value, label, alert }: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  alert?: boolean;
}) {
  return (
    <View style={[styles.chip, alert && styles.chipAlert]}>
      <Ionicons name={icon} size={16} color={alert ? '#DC2626' : familyTheme.colors.purpleDeep} />
      <Text style={styles.chipValue}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: familyTheme.colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: familyTheme.colors.bg },
  header: { paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  title: { fontFamily: familyTheme.fonts.title, fontSize: 26, fontWeight: '700', color: familyTheme.colors.ink },
  subtitle: { fontFamily: familyTheme.fonts.body, fontSize: 14, color: familyTheme.colors.inkSoft },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: familyTheme.colors.purpleDeep, alignItems: 'center', justifyContent: 'center' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, marginTop: 16 },
  chip: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, minWidth: 72, alignItems: 'center' },
  chipAlert: { backgroundColor: '#FEE2E2' },
  chipValue: { fontFamily: familyTheme.fonts.title, fontSize: 18, fontWeight: '700', color: familyTheme.colors.ink, marginTop: 4 },
  chipLabel: { fontFamily: familyTheme.fonts.body, fontSize: 11, color: familyTheme.colors.inkMuted },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  error: { color: familyTheme.colors.danger, marginBottom: 12, fontFamily: familyTheme.fonts.bodyMedium },
  coachCard: { flexDirection: 'row', gap: 10, backgroundColor: familyTheme.colors.accentSoft, borderRadius: familyTheme.radius.md, padding: 14, marginBottom: 20 },
  coachText: { flex: 1, fontFamily: familyTheme.fonts.body, fontSize: 14, color: familyTheme.colors.ink, lineHeight: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: familyTheme.fonts.title, fontSize: 18, fontWeight: '700', color: familyTheme.colors.ink, marginBottom: 12 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: familyTheme.colors.card, borderRadius: familyTheme.radius.md, padding: 14, marginBottom: 8, ...familyTheme.shadow.card },
  inviteEmoji: { fontSize: 24 },
  inviteBody: { flex: 1 },
  inviteName: { fontFamily: familyTheme.fonts.bodyBold, fontSize: 16, color: familyTheme.colors.ink },
  inviteMeta: { fontFamily: familyTheme.fonts.body, fontSize: 13, color: familyTheme.colors.inkMuted, marginTop: 2 },
  redeemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: familyTheme.colors.card, borderRadius: familyTheme.radius.md, padding: 14, marginBottom: 8, ...familyTheme.shadow.card },
  approveBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  approveText: { fontSize: 18, color: '#059669', fontWeight: '700' },
  declineBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  declineText: { fontSize: 16, color: '#DC2626', fontWeight: '700' },
  empty: { alignItems: 'center', padding: 32, backgroundColor: familyTheme.colors.card, borderRadius: familyTheme.radius.lg, ...familyTheme.shadow.card },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: familyTheme.fonts.title, fontSize: 20, fontWeight: '700', color: familyTheme.colors.ink, marginTop: 12 },
  emptyBody: { fontFamily: familyTheme.fonts.body, fontSize: 14, color: familyTheme.colors.inkMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  activityCard: { backgroundColor: familyTheme.colors.card, borderRadius: familyTheme.radius.lg, paddingHorizontal: 16, ...familyTheme.shadow.card },
  managedLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  managedLinkText: { fontFamily: familyTheme.fonts.bodyMedium, fontSize: 14, color: familyTheme.colors.purpleDeep },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontFamily: familyTheme.fonts.title, fontSize: 22, fontWeight: '700', color: familyTheme.colors.ink },
  modalSub: { fontFamily: familyTheme.fonts.body, fontSize: 14, color: familyTheme.colors.inkMuted, marginTop: 6, marginBottom: 16, lineHeight: 20 },
  switchMode: { textAlign: 'center', fontFamily: familyTheme.fonts.bodyMedium, fontSize: 14, color: familyTheme.colors.purpleDeep },
});
