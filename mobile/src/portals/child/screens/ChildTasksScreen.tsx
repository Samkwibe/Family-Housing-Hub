import { ScrollView, Text, StyleSheet, RefreshControl } from 'react-native';
import { useChildPortal } from '@/src/portals/child/ChildPortalContext';
import { ChoreCard } from '@/src/portals/child/components/ChoreCard';
import { HomeworkCard } from '@/src/portals/child/components/HomeworkCard';
import { ChildEmptyState } from '@/src/portals/child/components/ChildEmptyState';
import { ChildProgressBar } from '@/src/portals/child/components/ChildProgressBar';
import { childTheme } from '@/src/portals/child/theme';

export function ChildTasksScreen() {
  const { data, refreshing, refresh, completeChore, choreProgress, completeHomework } = useChildPortal();
  const chores = data?.chores ?? [];
  const homework = data?.homework ?? [];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={childTheme.colors.purpleDeep} />}
    >
      <Text style={styles.title}>My tasks</Text>
      <Text style={styles.sub}>Tap a chore when you're done to earn points.</Text>

      <Text style={styles.blockTitle}>Chores</Text>
      <ChildProgressBar progress={choreProgress} label="Progress today" />
      {chores.length ? (
        chores.map((c) => (
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
        ))
      ) : (
        <ChildEmptyState
          variant="playful"
          emoji="🚀"
          title="No missions yet"
          message="Your parent can assign chores here. When they do, tap to complete and earn stars!"
        />
      )}

      <Text style={[styles.blockTitle, { marginTop: 28 }]}>Homework</Text>
      {homework.length ? (
        homework.map((h) => (
          <HomeworkCard
            key={h.id}
            title={h.title}
            subject={h.subject}
            dueDate={h.dueDate}
            completed={h.completed}
            onComplete={() => completeHomework(h.id)}
          />
        ))
      ) : (
        <ChildEmptyState variant="warm" emoji="📚" title="All clear for now!" message="School tasks from your parent will appear here when they're ready." />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: childTheme.colors.cream },
  content: { padding: childTheme.spacing.xl, paddingBottom: 120 },
  title: { fontFamily: childTheme.fonts.title, fontSize: 28, fontWeight: '700', color: childTheme.colors.ink },
  sub: { fontFamily: childTheme.fonts.body, fontSize: 15, color: childTheme.colors.inkMuted, marginTop: 4, marginBottom: 20 },
  blockTitle: { fontFamily: childTheme.fonts.bodyBold, fontSize: 18, color: childTheme.colors.ink, marginBottom: 10 },
  hwLine: { fontFamily: childTheme.fonts.body, fontSize: 16, color: childTheme.colors.ink, marginTop: 8, lineHeight: 22 },
});
