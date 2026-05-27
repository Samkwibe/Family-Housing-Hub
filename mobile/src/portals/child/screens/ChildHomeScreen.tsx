import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useChildPortal } from '@/src/portals/child/ChildPortalContext';
import { ChildAvatar } from '@/src/portals/child/components/ChildAvatar';
import { ChildStatCard } from '@/src/portals/child/components/ChildStatCard';
import { ChildProgressBar } from '@/src/portals/child/components/ChildProgressBar';
import { ChildProgressRing } from '@/src/portals/child/components/ChildProgressRing';
import { ChoreCard } from '@/src/portals/child/components/ChoreCard';
import { ChildEmptyState } from '@/src/portals/child/components/ChildEmptyState';
import { FamilyMemoriesPreview } from '@/src/portals/shared/components/FamilyMemoriesPreview';
import { FamilyMemoriesScreen } from '@/src/portals/shared/screens/FamilyMemoriesScreen';
import { ChildWalletScreen } from '@/src/portals/child/screens/ChildWalletScreen';
import { buddyMessage, childTheme, dailyEncouragement } from '@/src/portals/child/theme';

export function ChildHomeScreen() {
  const {
    data,
    loading,
    refreshing,
    error,
    displayName,
    avatar,
    colorTheme,
    level,
    streak,
    choreProgress,
    needsProfile,
    refresh,
    completeChore,
  } = useChildPortal();

  const chores = data?.chores ?? [];
  const pending = chores.filter((c) => !c.completed);
  const routineGroups = ['morning', 'evening', 'after_school'] as const;
  const groupedRoutine = routineGroups
    .map((group) => ({
      group,
      items: pending.filter((c) => c.routineGroup === group),
    }))
    .filter((g) => g.items.length > 0);
  const ungroupedPending = pending.filter((c) => !c.routineGroup);
  const allDone = chores.length > 0 && pending.length === 0;
  const points = data?.profile?.pointsBalance ?? 0;
  const wallet = data?.walletBalance ?? 0;
  const badges = data?.badges ?? [];
  const earnedBadges = badges.filter((b) => b.earned);
  const rewards = data?.rewards ?? [];
  const nextReward = rewards.find((r) => r.cost <= points + 20) || rewards[0];
  const buddy = buddyMessage(displayName, pending.length, points);
  const [memoriesOpen, setMemoriesOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colorTheme.accent} />
        <Text style={styles.loadingText}>Opening your world…</Text>
      </View>
    );
  }

  if (needsProfile) {
    return (
      <View style={styles.center}>
        <ChildEmptyState
          variant="warm"
          emoji="🏠"
          title="Almost ready!"
          message="Ask a parent to add you to the household — we'll set up your profile automatically."
          hint="Pull down to refresh after your parent finishes setup"
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colorTheme.accent} />
      }
    >
      <LinearGradient colors={[...colorTheme.hero]} style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text style={styles.welcome}>Hey {displayName}! 👋</Text>
              <Text style={styles.encourage}>{dailyEncouragement(displayName, streak)}</Text>
            </View>
            <ChildProgressRing progress={level.progress} size={104} ringColors={colorTheme.gradients.level}>
              <ChildAvatar theme={avatar} name={displayName} level={level.level} size={76} />
            </ChildProgressRing>
          </View>

          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>Level {level.level}</Text>
            <Text style={styles.levelXp}>{Math.round(level.progress * 100)}% to Level {level.level + 1}</Text>
          </View>
          <ChildProgressBar progress={level.progress} label={`${Math.round(level.progress * 100)}% to Level ${level.level + 1}`} />

          {streak > 0 ? (
            <LinearGradient colors={[...colorTheme.gradients.streak]} style={styles.streakCard}>
              <Ionicons name="flame" size={22} color="#BE185D" />
              <View style={styles.streakTextWrap}>
                <Text style={styles.streakTitle}>{streak}-day streak!</Text>
                <Text style={styles.streakSub}>Keep showing up — you're building something awesome.</Text>
              </View>
            </LinearGradient>
          ) : null}
        </SafeAreaView>
      </LinearGradient>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <ChildStatCard label="Star points" value={String(points)} icon="star" gradient={colorTheme.gradients.points} />
        <ChildStatCard label="Wallet" value={`$${wallet.toFixed(0)}`} icon="wallet" gradient={colorTheme.gradients.wallet} onPress={() => setWalletOpen(true)} />
        <ChildStatCard label="Missions" value={String(pending.length)} icon="checkbox" gradient={colorTheme.gradients.chores} />
      </View>

      <LinearGradient colors={['#EDE9FE', '#DDD6FE']} style={styles.buddyCard}>
        <Text style={styles.buddyEmoji}>🤖✨</Text>
        <View style={styles.buddyCopy}>
          <Text style={styles.buddyLabel}>FamilyHub Buddy</Text>
          <Text style={styles.buddyText}>{data?.aiRecommendations?.[0] || buddy}</Text>
        </View>
      </LinearGradient>

      {nextReward ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active goal</Text>
          <Pressable style={styles.goalFloat}>
            <LinearGradient colors={['#FEF3C7', '#FDE68A']} style={styles.goalFloatInner}>
              <Text style={styles.goalEmoji}>{nextReward.emoji || '🎁'}</Text>
              <View style={styles.goalCopy}>
                <Text style={styles.goalTitle}>{nextReward.title}</Text>
                <Text style={styles.goalCost}>{nextReward.cost} stars · {Math.max(0, nextReward.cost - points)} to go</Text>
              </View>
              <ChildProgressBar progress={Math.min(1, points / Math.max(nextReward.cost, 1))} label="" />
            </LinearGradient>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's missions</Text>
        <ChildProgressBar progress={choreProgress} label="Daily progress" />
        <View style={styles.choreList}>
          {chores.length === 0 ? (
            <ChildEmptyState
              variant="playful"
              emoji="🌈"
              title="Your next adventure is coming soon!"
              message="Awesome — you're all caught up! When your parent assigns a chore, it'll appear here."
              hint="Ask a parent to add your first mission"
            />
          ) : allDone ? (
            <ChildEmptyState
              variant="celebrate"
              emoji="🏆"
              title="You finished everything today!"
              message="Amazing work! Your stars and streak are growing. Time to check rewards!"
            />
          ) : (
            <>
              {groupedRoutine.map(({ group, items }) => (
                <View key={group} style={styles.routineBlock}>
                  <Text style={styles.routineTitle}>
                    {group === 'morning' ? '🌅 Morning routine' : group === 'evening' ? '🌙 Bedtime routine' : '🎒 After school'}
                  </Text>
                  {items.map((c) => (
                    <ChoreCard
                      key={c.id}
                      title={c.title}
                      dueDate={c.dueDate}
                      points={c.points || 5}
                      completed={c.completed}
                      isRecurring={c.isRecurring}
                      recurrenceLabel={c.recurrenceLabel}
                      routineGroup={c.routineGroup}
                      seriesStreak={c.seriesStreak}
                      onComplete={() => completeChore(c.id, c.source)}
                    />
                  ))}
                </View>
              ))}
              {ungroupedPending.slice(0, 4).map((c) => (
                <ChoreCard
                  key={c.id}
                  title={c.title}
                  dueDate={c.dueDate}
                  points={c.points || 5}
                  completed={c.completed}
                  isRecurring={c.isRecurring}
                  recurrenceLabel={c.recurrenceLabel}
                  routineGroup={c.routineGroup}
                  seriesStreak={c.seriesStreak}
                  onComplete={() => completeChore(c.id, c.source)}
                />
              ))}
            </>
          )}
        </View>
      </View>

      {badges.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your badges · {earnedBadges.length}/{badges.length}</Text>
          <View style={styles.badgeRow}>
            {badges.map((b) => (
              <View key={b.id} style={[styles.badge, !b.earned && styles.badgeLocked]}>
                <Text style={styles.badgeText}>{b.emoji} {b.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <FamilyMemoriesPreview
          portal="child"
          onOpenAll={() => setMemoriesOpen(true)}
        />
      </View>

      <View style={styles.familyHub}>
        <Ionicons name="home" size={14} color={colorTheme.accent} />
        <Text style={[styles.familyHubText, { color: colorTheme.accent }]}>FamilyHub · Your safe space</Text>
      </View>
    </ScrollView>

      {memoriesOpen ? (
        <View style={styles.memoriesOverlay}>
          <FamilyMemoriesScreen portal="child" onClose={() => setMemoriesOpen(false)} />
        </View>
      ) : null}

      {walletOpen ? (
        <View style={styles.memoriesOverlay}>
          <ChildWalletScreen onClose={() => setWalletOpen(false)} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1, backgroundColor: childTheme.colors.cream },
  content: { paddingBottom: 120 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: childTheme.colors.cream, padding: 24 },
  loadingText: { marginTop: 12, fontFamily: childTheme.fonts.bodyMedium, color: childTheme.colors.inkMuted },
  hero: {
    paddingHorizontal: childTheme.spacing.xl,
    paddingBottom: childTheme.spacing.xxl,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: childTheme.spacing.lg },
  heroCopy: { flex: 1 },
  welcome: { fontFamily: childTheme.fonts.title, fontSize: 30, fontWeight: '700', color: childTheme.colors.ink },
  encourage: { fontFamily: childTheme.fonts.body, fontSize: 15, color: childTheme.colors.inkSoft, marginTop: 6, lineHeight: 22 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  levelLabel: { fontFamily: childTheme.fonts.bodyBold, fontSize: 14, color: childTheme.colors.ink },
  levelXp: { fontFamily: childTheme.fonts.bodyMedium, fontSize: 13, color: childTheme.colors.inkMuted },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: childTheme.spacing.lg,
    borderRadius: childTheme.radius.lg,
    padding: childTheme.spacing.lg,
  },
  streakTextWrap: { flex: 1 },
  streakTitle: { fontFamily: childTheme.fonts.bodyBold, fontSize: 16, color: '#9D174D' },
  streakSub: { fontFamily: childTheme.fonts.body, fontSize: 13, color: '#BE185D', marginTop: 2 },
  errorBanner: { margin: childTheme.spacing.lg, backgroundColor: '#FEE2E2', borderRadius: childTheme.radius.md, padding: 12 },
  errorText: { color: '#B91C1C', fontFamily: childTheme.fonts.bodyMedium },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: childTheme.spacing.lg, marginTop: -24 },
  buddyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: childTheme.spacing.lg,
    marginTop: childTheme.spacing.xxl,
    borderRadius: childTheme.radius.lg,
    padding: childTheme.spacing.lg,
  },
  buddyEmoji: { fontSize: 32 },
  buddyCopy: { flex: 1 },
  buddyLabel: { fontFamily: childTheme.fonts.bodyBold, fontSize: 12, color: childTheme.colors.purpleDeep, textTransform: 'uppercase', letterSpacing: 0.8 },
  buddyText: { fontFamily: childTheme.fonts.body, fontSize: 15, color: childTheme.colors.ink, marginTop: 4, lineHeight: 22 },
  section: { paddingHorizontal: childTheme.spacing.lg, marginTop: childTheme.spacing.xxl },
  sectionTitle: { fontFamily: childTheme.fonts.title, fontSize: 20, fontWeight: '700', color: childTheme.colors.ink, marginBottom: childTheme.spacing.md },
  goalFloat: { borderRadius: childTheme.radius.lg, overflow: 'hidden', ...childTheme.shadow.card },
  goalFloatInner: { padding: childTheme.spacing.lg },
  goalEmoji: { fontSize: 36, marginBottom: 8 },
  goalCopy: { marginBottom: 8 },
  goalTitle: { fontFamily: childTheme.fonts.bodyBold, fontSize: 18, color: childTheme.colors.ink },
  goalCost: { fontFamily: childTheme.fonts.body, fontSize: 14, color: childTheme.colors.inkSoft, marginTop: 2 },
  choreList: { marginTop: childTheme.spacing.md },
  routineBlock: { marginBottom: childTheme.spacing.lg },
  routineTitle: { fontFamily: childTheme.fonts.bodyBold, fontSize: 15, color: childTheme.colors.purpleDeep, marginBottom: childTheme.spacing.sm },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { backgroundColor: childTheme.colors.white, borderRadius: childTheme.radius.pill, paddingHorizontal: 14, paddingVertical: 8, ...childTheme.shadow.card },
  badgeLocked: { opacity: 0.45 },
  badgeText: { fontFamily: childTheme.fonts.bodyBold, fontSize: 13, color: childTheme.colors.ink },
  familyHub: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: childTheme.spacing.xxl, opacity: 0.7 },
  familyHubText: { fontFamily: childTheme.fonts.bodyMedium, fontSize: 12 },
  memoriesOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    backgroundColor: childTheme.colors.cream,
  },
});
