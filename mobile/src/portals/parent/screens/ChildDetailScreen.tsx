import { useCallback, useEffect, useState, type ReactNode } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button } from '@/src/components/ui';
import { useParentToast } from '@/src/portals/shared/parentToast';
import { ActivityFeedRow } from '@/src/portals/parent/components/ActivityFeedRow';
import { childCardGradient, childEmoji, familyTheme } from '@/src/portals/parent/theme';
import {
  assignChildChore,
  createChildReward,
  approveChildRedemption,
  declineChildRedemption,
  fetchChildDetail,
  grantChildBonusPoints,
  pauseChildRoutine,
  adjustChildWallet,
  setChildSavingsGoal,
  type ChildDetail,
} from '@/src/services/parentChildService';
import { RECURRENCE_OPTIONS, ROUTINE_GROUP_OPTIONS, routineGroupEmoji } from '@/src/portals/parent/recurrenceOptions';

export function ChildDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showParentToast } = useParentToast();
  const [data, setData] = useState<ChildDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [choreOpen, setChoreOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [choreTitle, setChoreTitle] = useState('');
  const [chorePoints, setChorePoints] = useState('10');
  const [choreRecurrence, setChoreRecurrence] = useState<string>('none');
  const [choreRoutineGroup, setChoreRoutineGroup] = useState<string>('');
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardCost, setRewardCost] = useState('25');
  const [bonusPoints, setBonusPoints] = useState('10');
  const [submitting, setSubmitting] = useState(false);

  const [walletOpen, setWalletOpen] = useState(false);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletDesc, setWalletDesc] = useState('');

  const [goalOpen, setGoalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const detail = await fetchChildDetail(id);
      setData(detail);
    } catch (e) {
      showParentToast(e instanceof Error ? e.message : 'Could not load child', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, showParentToast]);

  useEffect(() => {
    load();
  }, [load]);

  const profile = data?.profile;
  const gradient = childCardGradient(profile?.displayName || '');
  const emoji = childEmoji(profile?.displayName || '');

  const onAssignChore = async () => {
    if (!id || !choreTitle.trim()) return;
    setSubmitting(true);
    try {
      await assignChildChore({
        childProfileId: id,
        title: choreTitle.trim(),
        points: parseInt(chorePoints, 10) || 10,
        recurrenceRule: choreRecurrence !== 'none' ? choreRecurrence : undefined,
        routineGroup: (choreRoutineGroup || undefined) as 'morning' | 'evening' | 'after_school' | undefined,
      });
      showParentToast(choreRecurrence !== 'none' ? 'Routine assigned!' : 'Chore assigned!', 'success');
      setChoreOpen(false);
      setChoreTitle('');
      setChoreRecurrence('none');
      setChoreRoutineGroup('');
      await load(true);
    } catch (e) {
      showParentToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const onCreateReward = async () => {
    if (!rewardTitle.trim()) return;
    setSubmitting(true);
    try {
      await createChildReward({
        title: rewardTitle.trim(),
        cost: parseInt(rewardCost, 10) || 25,
        emoji: '🎁',
      });
      showParentToast('Reward created for household!', 'success');
      setRewardOpen(false);
      setRewardTitle('');
      await load(true);
    } catch (e) {
      showParentToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const onGrantBonus = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      await grantChildBonusPoints(id, parseInt(bonusPoints, 10) || 10, 'Parent bonus');
      showParentToast('Bonus points granted!', 'success');
      setBonusOpen(false);
      await load(true);
    } catch (e) {
      showParentToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const onAdjustWallet = async () => {
    if (!id || !walletAmount.trim()) return;
    setSubmitting(true);
    try {
      await adjustChildWallet(id, parseFloat(walletAmount) || 0, walletDesc.trim() || 'Parent adjustment');
      showParentToast('Wallet adjusted successfully!', 'success');
      setWalletOpen(false);
      setWalletAmount('');
      setWalletDesc('');
      await load(true);
    } catch (e) {
      showParentToast(e instanceof Error ? e.message : 'Failed to adjust wallet', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const onSetGoal = async () => {
    if (!id || !goalTitle.trim() || !goalTarget.trim()) return;
    setSubmitting(true);
    try {
      await setChildSavingsGoal(id, goalTitle.trim(), parseFloat(goalTarget) || 0);
      showParentToast('Savings goal updated successfully!', 'success');
      setGoalOpen(false);
      setGoalTitle('');
      setGoalTarget('');
      await load(true);
    } catch (e) {
      showParentToast(e instanceof Error ? e.message : 'Failed to set savings goal', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const onToggleRoutine = async (seriesId: string, paused: boolean) => {
    try {
      await pauseChildRoutine(seriesId, paused);
      showParentToast(paused ? 'Routine paused' : 'Routine resumed', 'success');
      await load(true);
    } catch (e) {
      showParentToast(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={familyTheme.colors.purpleDeep} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Child not found</Text>
        <Button title="Go back" onPress={() => router.back()} />
      </View>
    );
  }

  const pending = (data?.chores ?? []).filter((c) => !c.completed);
  const done = (data?.chores ?? []).filter((c) => c.completed);
  const pendingRedemptions = data?.pendingRedemptions ?? [];

  const onResolveRedemption = async (id: string, approve: boolean) => {
    try {
      if (approve) await approveChildRedemption(id);
      else await declineChildRedemption(id);
      showParentToast(approve ? 'Reward approved!' : 'Declined', approve ? 'success' : 'info');
      await load(true);
    } catch (e) {
      showParentToast(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...gradient]} style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={familyTheme.colors.ink} />
          </Pressable>
          <View style={styles.heroBody}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{emoji}</Text>
            </View>
            <Text style={styles.name}>{profile.displayName}</Text>
            <Text style={styles.age}>{profile.ageLabel}</Text>
            {profile.isManaged ? (
              <Text style={styles.managed}>Managed profile · no login</Text>
            ) : null}
            <View style={styles.statsRow}>
              <Stat label="Points" value={String(profile.pointsBalance)} />
              <Stat label="Streak" value={`${profile.streakDays}d`} />
              <Stat label="Wallet" value={`$${profile.walletBalance.toFixed(0)}`} />
              <Stat label="Badges" value={`${profile.badgesEarned}/${profile.badgesTotal}`} />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <View style={styles.actionsRow}>
          <ActionChip icon="add-circle-outline" label="Assign chore" onPress={() => setChoreOpen(true)} />
          <ActionChip icon="gift-outline" label="Add reward" onPress={() => setRewardOpen(true)} />
          <ActionChip icon="star-outline" label="Bonus pts" onPress={() => setBonusOpen(true)} />
          <ActionChip icon="wallet-outline" label="Pocket money" onPress={() => setWalletOpen(true)} />
          <ActionChip icon="flag-outline" label="Savings goal" onPress={() => setGoalOpen(true)} />
        </View>

        {(data?.childInsights ?? []).length > 0 ? (
          <View style={styles.insightsSection}>
            <Text style={styles.insightsSectionTitle}>Insights for {profile.displayName}</Text>
            {data!.childInsights!.map((insight) => (
              <View key={insight.id} style={styles.childInsightRow}>
                <Text style={styles.childInsightEmoji}>{insight.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.childInsightTitle}>{insight.title}</Text>
                  <Text style={styles.childInsightMsg}>{insight.message}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : data?.aiRecommendations?.[0] ? (
          <View style={styles.insightsSection}>
            <Text style={styles.childInsightMsg}>{data.aiRecommendations[0]}</Text>
          </View>
        ) : null}

        {pendingRedemptions.length > 0 ? (
          <Section title="Reward requests">
            {pendingRedemptions.map((r) => (
              <View key={r.id} style={styles.redeemRow}>
                <Text style={styles.redeemEmoji}>{r.rewardEmoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.taskTitle}>{r.rewardTitle}</Text>
                  <Text style={styles.taskMeta}>{r.cost} points requested</Text>
                </View>
                <Pressable onPress={() => onResolveRedemption(r.id, true)} style={styles.approveBtn}>
                  <Text style={styles.approveText}>Approve</Text>
                </Pressable>
              </View>
            ))}
          </Section>
        ) : null}

        <Section title={`Tasks (${pending.length} pending)`}>
          {pending.length === 0 ? (
            <Text style={styles.emptyLine}>No pending chores — assign one above!</Text>
          ) : (
            pending.map((c) => (
              <TaskRow
                key={c.id}
                title={c.title}
                meta={`+${c.points} pts${c.dueDate ? ` · due ${c.dueDate}` : ''}${c.recurrenceLabel ? ` · ${c.recurrenceLabel}` : ''}`}
                done={false}
              />
            ))
          )}
        </Section>

        {(data?.routines ?? []).length > 0 ? (
          <Section title="Family routines">
            {data!.routines!.map((r) => (
              <View key={r.seriesId} style={styles.routineRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.taskTitle}>{routineGroupEmoji(r.routineGroup)} {r.title}</Text>
                  <Text style={styles.taskMeta}>
                    {r.recurrenceLabel} · {r.seriesStreak}🔥 streak · +{r.points} pts
                    {r.paused ? ' · paused' : ''}
                  </Text>
                </View>
                <Pressable onPress={() => onToggleRoutine(r.seriesId, !r.paused)} style={styles.routineBtn}>
                  <Text style={styles.routineBtnText}>{r.paused ? 'Resume' : 'Pause'}</Text>
                </Pressable>
              </View>
            ))}
          </Section>
        ) : null}

        {done.length > 0 ? (
          <Section title="Completed">
            {done.slice(0, 5).map((c) => (
              <TaskRow key={c.id} title={c.title} meta={`+${c.points} pts`} done />
            ))}
          </Section>
        ) : null}

        {(data?.homework ?? []).length > 0 ? (
          <Section title="Homework">
            {data!.homework.map((h) => (
              <TaskRow key={h.id} title={h.title} meta={h.subject || h.dueDate || 'School'} done={h.completed} />
            ))}
          </Section>
        ) : null}

        {(data?.rewards ?? []).length > 0 ? (
          <Section title="Rewards catalog">
            <View style={styles.rewardRow}>
              {data!.rewards.map((r) => (
                <View key={r.id} style={styles.rewardChip}>
                  <Text style={styles.rewardEmoji}>{r.emoji}</Text>
                  <Text style={styles.rewardTitle}>{r.title}</Text>
                  <Text style={styles.rewardCost}>{r.cost} pts</Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {(data?.badges ?? []).some((b) => b.earned) ? (
          <Section title="Badges">
            <View style={styles.badgeRow}>
              {data!.badges.filter((b) => b.earned).map((b) => (
                <View key={b.id} style={styles.badge}>
                  <Text>{b.emoji} {b.label}</Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {(data?.activity ?? []).length > 0 ? (
          <Section title="Recent activity">
            <View style={styles.activityCard}>
              {data!.activity.map((item) => (
                <ActivityFeedRow key={item.id} item={item} />
              ))}
            </View>
          </Section>
        ) : null}
      </ScrollView>

      <ChoreModal
        visible={choreOpen}
        onClose={() => setChoreOpen(false)}
        title={choreTitle}
        setTitle={setChoreTitle}
        points={chorePoints}
        setPoints={setChorePoints}
        recurrence={choreRecurrence}
        setRecurrence={setChoreRecurrence}
        routineGroup={choreRoutineGroup}
        setRoutineGroup={setChoreRoutineGroup}
        onSubmit={onAssignChore}
        loading={submitting}
      />
      <SimpleModal visible={rewardOpen} onClose={() => setRewardOpen(false)} title="Add household reward" fields={[
        { value: rewardTitle, onChange: setRewardTitle, placeholder: 'Reward name (e.g. Movie night)' },
        { value: rewardCost, onChange: setRewardCost, placeholder: 'Cost in points' },
      ]} onSubmit={onCreateReward} loading={submitting} submitLabel="Create reward" />
      <SimpleModal visible={bonusOpen} onClose={() => setBonusOpen(false)} title="Grant bonus points" fields={[
        { value: bonusPoints, onChange: setBonusPoints, placeholder: 'Points to add' },
      ]} onSubmit={onGrantBonus} loading={submitting} submitLabel="Grant bonus" />
      <SimpleModal
        visible={walletOpen}
        onClose={() => setWalletOpen(false)}
        title="Adjust Pocket Money"
        fields={[
          { value: walletAmount, onChange: setWalletAmount, placeholder: 'Amount (e.g. 5.00 or -3.50)' },
          { value: walletDesc, onChange: setWalletDesc, placeholder: 'Reason/Description (e.g. Weekly allowance)' },
        ]}
        onSubmit={onAdjustWallet}
        loading={submitting}
        submitLabel="Adjust wallet"
      />
      <SimpleModal
        visible={goalOpen}
        onClose={() => setGoalOpen(false)}
        title="Set Savings Goal"
        fields={[
          { value: goalTitle, onChange: setGoalTitle, placeholder: 'Goal name (e.g. Nintendo Switch)' },
          { value: goalTarget, onChange: setGoalTarget, placeholder: 'Target cost in dollars' },
        ]}
        onSubmit={onSetGoal}
        loading={submitting}
        submitLabel="Set Goal"
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function TaskRow({ title, meta, done }: { title: string; meta: string; done?: boolean }) {
  return (
    <View style={styles.taskRow}>
      <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={done ? familyTheme.colors.mintDeep : familyTheme.colors.inkMuted} />
      <View style={styles.taskBody}>
        <Text style={[styles.taskTitle, done && styles.taskDone]}>{title}</Text>
        <Text style={styles.taskMeta}>{meta}</Text>
      </View>
    </View>
  );
}

function ActionChip({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.actionChip}>
      <Ionicons name={icon} size={18} color={familyTheme.colors.purpleDeep} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function ChoreModal(props: {
  visible: boolean;
  onClose: () => void;
  title: string;
  setTitle: (v: string) => void;
  points: string;
  setPoints: (v: string) => void;
  recurrence: string;
  setRecurrence: (v: string) => void;
  routineGroup: string;
  setRoutineGroup: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  return (
    <Modal visible={props.visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Assign chore or routine</Text>
          <Input value={props.title} onChangeText={props.setTitle} placeholder="Clean room, brush teeth…" />
          <Input value={props.points} onChangeText={props.setPoints} placeholder="Points (default 10)" keyboardType="number-pad" style={{ marginTop: 8 }} />
          <Text style={styles.modalLabel}>Repeat</Text>
          <View style={styles.chipRow}>
            {RECURRENCE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => props.setRecurrence(opt.id)}
                style={[styles.chip, props.recurrence === opt.id && styles.chipOn]}
              >
                <Text style={[styles.chipText, props.recurrence === opt.id && styles.chipTextOn]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
          {props.recurrence !== 'none' ? (
            <>
              <Text style={styles.modalLabel}>Routine group</Text>
              <View style={styles.chipRow}>
                {ROUTINE_GROUP_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.id || 'none'}
                    onPress={() => props.setRoutineGroup(opt.id)}
                    style={[styles.chip, props.routineGroup === opt.id && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, props.routineGroup === opt.id && styles.chipTextOn]}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
          <Button title="Assign" onPress={props.onSubmit} loading={props.loading} style={{ marginTop: 16 }} />
          <Button title="Cancel" variant="ghost" onPress={props.onClose} />
        </View>
      </View>
    </Modal>
  );
}

function SimpleModal(props: {
  visible: boolean;
  onClose: () => void;
  title: string;
  fields: Array<{ value: string; onChange: (v: string) => void; placeholder: string }>;
  onSubmit: () => void;
  loading: boolean;
  submitLabel: string;
}) {
  return (
    <Modal visible={props.visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{props.title}</Text>
          {props.fields.map((f, i) => (
            <Input key={f.placeholder} value={f.value} onChangeText={f.onChange} placeholder={f.placeholder} style={i > 0 ? { marginTop: 8 } : undefined} />
          ))}
          <Button title={props.submitLabel} onPress={props.onSubmit} loading={props.loading} style={{ marginTop: 16 }} />
          <Button title="Cancel" variant="ghost" onPress={props.onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: familyTheme.colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontFamily: familyTheme.fonts.body, color: familyTheme.colors.danger, marginBottom: 16 },
  hero: { paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backBtn: { marginLeft: 16, marginTop: 8, width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  heroBody: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 36 },
  name: { fontFamily: familyTheme.fonts.title, fontSize: 26, fontWeight: '700', color: familyTheme.colors.ink, marginTop: 12 },
  age: { fontFamily: familyTheme.fonts.body, fontSize: 14, color: familyTheme.colors.inkSoft, marginTop: 4 },
  managed: { fontFamily: familyTheme.fonts.bodyMedium, fontSize: 12, color: familyTheme.colors.purpleDeep, marginTop: 6 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 16, justifyContent: 'center' },
  stat: { alignItems: 'center', minWidth: 64 },
  statValue: { fontFamily: familyTheme.fonts.title, fontSize: 18, fontWeight: '700', color: familyTheme.colors.ink },
  statLabel: { fontFamily: familyTheme.fonts.body, fontSize: 11, color: familyTheme.colors.inkMuted, marginTop: 2 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: familyTheme.colors.accentSoft, paddingHorizontal: 14, paddingVertical: 10, borderRadius: familyTheme.radius.pill },
  actionLabel: { fontFamily: familyTheme.fonts.bodyBold, fontSize: 13, color: familyTheme.colors.purpleDeep },
  section: { marginBottom: 22 },
  sectionTitle: { fontFamily: familyTheme.fonts.title, fontSize: 17, fontWeight: '700', color: familyTheme.colors.ink, marginBottom: 10 },
  emptyLine: { fontFamily: familyTheme.fonts.body, fontSize: 14, color: familyTheme.colors.inkMuted },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: familyTheme.colors.card, padding: 14, borderRadius: familyTheme.radius.md, marginBottom: 8, ...familyTheme.shadow.card },
  taskBody: { flex: 1 },
  taskTitle: { fontFamily: familyTheme.fonts.bodyBold, fontSize: 15, color: familyTheme.colors.ink },
  taskDone: { textDecorationLine: 'line-through', color: familyTheme.colors.inkMuted },
  taskMeta: { fontFamily: familyTheme.fonts.body, fontSize: 12, color: familyTheme.colors.inkMuted, marginTop: 2 },
  rewardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  rewardChip: { backgroundColor: familyTheme.colors.card, borderRadius: familyTheme.radius.md, padding: 12, alignItems: 'center', minWidth: 90, ...familyTheme.shadow.card },
  rewardEmoji: { fontSize: 24 },
  rewardTitle: { fontFamily: familyTheme.fonts.bodyBold, fontSize: 12, color: familyTheme.colors.ink, marginTop: 4, textAlign: 'center' },
  rewardCost: { fontFamily: familyTheme.fonts.body, fontSize: 11, color: familyTheme.colors.sunDeep, marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { backgroundColor: familyTheme.colors.accentSoft, borderRadius: familyTheme.radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  activityCard: { backgroundColor: familyTheme.colors.card, borderRadius: familyTheme.radius.lg, paddingHorizontal: 16, ...familyTheme.shadow.card },
  redeemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFBEB', borderRadius: familyTheme.radius.md, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#FDE68A' },
  redeemEmoji: { fontSize: 28 },
  approveBtn: { backgroundColor: familyTheme.colors.mintDeep, borderRadius: familyTheme.radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  approveText: { fontFamily: familyTheme.fonts.bodyBold, fontSize: 13, color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontFamily: familyTheme.fonts.title, fontSize: 20, fontWeight: '700', marginBottom: 16, color: familyTheme.colors.ink },
  modalLabel: { fontFamily: familyTheme.fonts.bodyBold, fontSize: 13, color: familyTheme.colors.inkSoft, marginTop: 14, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: familyTheme.colors.accentSoft, borderRadius: familyTheme.radius.pill, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'transparent' },
  chipOn: { backgroundColor: familyTheme.colors.purpleDeep, borderColor: familyTheme.colors.purpleDeep },
  chipText: { fontFamily: familyTheme.fonts.bodyMedium, fontSize: 12, color: familyTheme.colors.purpleDeep },
  chipTextOn: { color: '#fff' },
  routineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: familyTheme.colors.card, padding: 14, borderRadius: familyTheme.radius.md, marginBottom: 8, ...familyTheme.shadow.card },
  routineBtn: { backgroundColor: familyTheme.colors.accentSoft, borderRadius: familyTheme.radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  routineBtnText: { fontFamily: familyTheme.fonts.bodyBold, fontSize: 12, color: familyTheme.colors.purpleDeep },
  insightsSection: { backgroundColor: familyTheme.colors.accentSoft, borderRadius: familyTheme.radius.lg, padding: 14, marginBottom: 20 },
  insightsSectionTitle: { fontFamily: familyTheme.fonts.bodyBold, fontSize: 13, color: familyTheme.colors.purpleDeep, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  childInsightRow: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  childInsightEmoji: { fontSize: 22 },
  childInsightTitle: { fontFamily: familyTheme.fonts.bodyBold, fontSize: 15, color: familyTheme.colors.ink },
  childInsightMsg: { fontFamily: familyTheme.fonts.body, fontSize: 13, color: familyTheme.colors.inkSoft, marginTop: 3, lineHeight: 19 },
});
