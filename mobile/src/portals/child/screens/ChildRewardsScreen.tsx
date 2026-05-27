import { useState } from 'react';
import { ScrollView, Text, View, StyleSheet, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useChildPortal } from '@/src/portals/child/ChildPortalContext';
import { ChildEmptyState } from '@/src/portals/child/components/ChildEmptyState';
import { RewardCelebration } from '@/src/portals/child/components/RewardCelebration';
import { redeemChildReward } from '@/src/services/portalService';
import { useToast } from '@/src/contexts/ToastContext';
import { emitCelebration } from '@/src/portals/child/celebrationEvents';
import { childTheme } from '@/src/portals/child/theme';

export function ChildRewardsScreen() {
  const { data, refreshing, refresh } = useChildPortal();
  const { showToast } = useToast();
  const points = data?.profile?.pointsBalance ?? 0;
  const rewards = data?.rewards ?? [];
  const redemptions = data?.redemptions ?? [];

  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{ emoji: string; title: string; message: string } | null>(null);

  const onRedeem = async (rewardId: string, title: string, emoji: string, cost: number) => {
    setRedeemingId(rewardId);
    try {
      await redeemChildReward(rewardId);
      await refresh();
      emitCelebration({
        type: 'reward_requested',
        title: 'Request sent!',
        message: `Your parent will approve "${title}" (${cost} pts).`,
        emoji,
      });
      setCelebration({
        emoji,
        title: 'Request sent!',
        message: `Your parent will approve "${title}" (${cost} pts). You're one step closer!`,
      });
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not redeem', 'error');
    } finally {
      setRedeemingId(null);
    }
  };

  const recentApproved = redemptions.filter((r) => r.status === 'approved').slice(0, 3);

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={childTheme.colors.purpleDeep} />}
      >
        <LinearGradient colors={[...childTheme.gradients.level]} style={styles.hero}>
          <Text style={styles.heroEmoji}>⭐</Text>
          <Text style={styles.heroPoints}>{points}</Text>
          <Text style={styles.heroLabel}>Star points available</Text>
          <View style={styles.progressRing}>
            <Text style={styles.progressHint}>
              {rewards.length
                ? `Next reward: ${rewards.find((r) => r.cost > points && !r.redemptionStatus)?.cost ?? '—'} pts`
                : 'Earn points from chores!'}
            </Text>
          </View>
        </LinearGradient>

        <Text style={styles.title}>Reward shop</Text>
        <Text style={styles.sub}>Tap a reward you can afford — your parent approves the fun part!</Text>

        {rewards.length ? (
          <View style={styles.grid}>
            {rewards.map((r) => {
              const canAfford = points >= r.cost;
              const isPending = r.redemptionStatus === 'pending';
              const isLoading = redeemingId === r.id;
              return (
                <Pressable
                  key={r.id}
                  style={[styles.rewardCard, !canAfford && !isPending && styles.locked, isPending && styles.pendingCard]}
                  disabled={!canAfford || isPending || isLoading}
                  onPress={() => onRedeem(r.id, r.title, r.emoji, r.cost)}
                >
                  {isLoading ? (
                    <ActivityIndicator color={childTheme.colors.purpleDeep} style={{ marginVertical: 24 }} />
                  ) : (
                    <>
                      <Text style={styles.rewardEmoji}>{r.emoji}</Text>
                      <Text style={styles.rewardTitle}>{r.title}</Text>
                      {r.description ? <Text style={styles.rewardDesc}>{r.description}</Text> : null}
                      <View style={[styles.costPill, isPending && styles.costPillPending]}>
                        <Text style={styles.costText}>{isPending ? 'Waiting…' : `${r.cost} pts`}</Text>
                      </View>
                      {isPending ? (
                        <Text style={styles.pendingHint}>Parent is reviewing ✨</Text>
                      ) : canAfford ? (
                        <Text style={styles.tapHint}>Tap to redeem</Text>
                      ) : (
                        <Text style={styles.lockHint}>Keep earning points!</Text>
                      )}
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <ChildEmptyState
            emoji="🎁"
            title="No rewards yet"
            message="Ask a parent to add rewards you can work toward with your points."
          />
        )}

        {recentApproved.length > 0 ? (
          <View style={styles.history}>
            <Text style={styles.historyTitle}>You unlocked recently 🏆</Text>
            {recentApproved.map((r) => (
              <Text key={r.id} style={styles.historyLine}>
                {r.rewardEmoji} {r.rewardTitle}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <RewardCelebration
        visible={Boolean(celebration)}
        emoji={celebration?.emoji ?? '🎁'}
        title={celebration?.title ?? ''}
        message={celebration?.message ?? ''}
        celebrationType="reward_requested"
        onClose={() => setCelebration(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: childTheme.colors.cream },
  content: { padding: childTheme.spacing.xl, paddingBottom: 120 },
  hero: { borderRadius: childTheme.radius.xl, padding: 24, alignItems: 'center', marginBottom: 24, ...childTheme.shadow.card },
  heroEmoji: { fontSize: 36 },
  heroPoints: { fontFamily: childTheme.fonts.title, fontSize: 42, fontWeight: '700', color: childTheme.colors.white, marginTop: 4 },
  heroLabel: { fontFamily: childTheme.fonts.bodyMedium, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  progressRing: { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: childTheme.radius.pill, paddingHorizontal: 14, paddingVertical: 6 },
  progressHint: { fontFamily: childTheme.fonts.bodyMedium, fontSize: 12, color: childTheme.colors.white },
  title: { fontFamily: childTheme.fonts.title, fontSize: 24, fontWeight: '700', color: childTheme.colors.ink },
  sub: { fontFamily: childTheme.fonts.body, fontSize: 15, color: childTheme.colors.inkMuted, marginTop: 4, marginBottom: 16, lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  rewardCard: {
    width: '47%',
    backgroundColor: childTheme.colors.white,
    borderRadius: childTheme.radius.lg,
    padding: 16,
    alignItems: 'center',
    ...childTheme.shadow.card,
  },
  locked: { opacity: 0.55 },
  pendingCard: { borderWidth: 2, borderColor: childTheme.colors.sun, backgroundColor: '#FFFBEB' },
  rewardEmoji: { fontSize: 36, marginBottom: 8 },
  rewardTitle: { fontFamily: childTheme.fonts.bodyBold, fontSize: 14, color: childTheme.colors.ink, textAlign: 'center' },
  rewardDesc: { fontFamily: childTheme.fonts.body, fontSize: 12, color: childTheme.colors.inkMuted, textAlign: 'center', marginTop: 4 },
  costPill: { backgroundColor: childTheme.colors.sky, borderRadius: childTheme.radius.pill, paddingHorizontal: 12, paddingVertical: 4, marginTop: 10 },
  costPillPending: { backgroundColor: '#FEF3C7' },
  costText: { fontFamily: childTheme.fonts.bodyBold, fontSize: 12, color: childTheme.colors.purpleDeep },
  tapHint: { fontSize: 11, color: childTheme.colors.mintDeep, marginTop: 6, fontFamily: childTheme.fonts.bodyBold },
  pendingHint: { fontSize: 11, color: childTheme.colors.sunDeep, marginTop: 6, fontFamily: childTheme.fonts.bodyMedium },
  lockHint: { fontSize: 11, color: childTheme.colors.inkMuted, marginTop: 6 },
  history: { marginTop: 28, backgroundColor: childTheme.colors.white, borderRadius: childTheme.radius.lg, padding: 16, ...childTheme.shadow.card },
  historyTitle: { fontFamily: childTheme.fonts.bodyBold, fontSize: 15, color: childTheme.colors.ink, marginBottom: 8 },
  historyLine: { fontFamily: childTheme.fonts.body, fontSize: 14, color: childTheme.colors.inkSoft, marginTop: 4 },
});
