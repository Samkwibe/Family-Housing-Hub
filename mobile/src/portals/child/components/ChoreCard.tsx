import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { childTheme } from '@/src/portals/child/theme';
import { motion } from '@/src/portals/shared/motion';
import { routineGroupEmoji } from '@/src/portals/parent/recurrenceOptions';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  title: string;
  dueDate?: string;
  points: number;
  completed: boolean;
  onComplete?: () => void;
  isRecurring?: boolean;
  recurrenceLabel?: string;
  routineGroup?: string | null;
  seriesStreak?: number;
};

export function ChoreCard({
  title,
  dueDate,
  points,
  completed,
  onComplete,
  isRecurring,
  recurrenceLabel,
  routineGroup,
  seriesStreak,
}: Props) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[styles.card, completed && styles.done, isRecurring && styles.recurring, animStyle]}
      onPressIn={() => { scale.value = withSpring(motion.scale.press, motion.reanimated.press); }}
      onPressOut={() => { scale.value = withSpring(1, motion.reanimated.press); }}
      onPress={() => { if (!completed) onComplete?.(); }}
      disabled={completed}
    >
      <View style={[styles.check, completed && styles.checkDone]}>
        {completed ? (
          <Ionicons name="checkmark" size={18} color={childTheme.colors.white} />
        ) : (
          <View style={styles.checkEmpty} />
        )}
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, completed && styles.titleDone]}>{title}</Text>
        {dueDate ? <Text style={styles.meta}>Due {dueDate}</Text> : null}
        {isRecurring ? (
          <View style={styles.recurringRow}>
            <Text style={styles.recurringBadge}>
              {routineGroupEmoji(routineGroup)} {recurrenceLabel || 'Recurring'}
            </Text>
            {(seriesStreak ?? 0) > 0 ? (
              <Text style={styles.seriesStreak}>{seriesStreak}🔥</Text>
            ) : null}
          </View>
        ) : null}
      </View>
      <View style={styles.points}>
        <Text style={styles.pointsVal}>+{points}</Text>
        <Text style={styles.pointsLabel}>stars</Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: childTheme.colors.white,
    borderRadius: childTheme.radius.md,
    padding: childTheme.spacing.lg,
    marginBottom: childTheme.spacing.md,
    gap: childTheme.spacing.md,
    ...childTheme.shadow.card,
  },
  recurring: { borderWidth: 1, borderColor: '#DDD6FE' },
  done: { opacity: 0.72, backgroundColor: '#F0FDF4' },
  check: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: childTheme.colors.mintDeep, borderColor: childTheme.colors.mintDeep },
  checkEmpty: { width: 14, height: 14, borderRadius: 4, backgroundColor: '#F1F5F9' },
  body: { flex: 1 },
  title: {
    fontFamily: childTheme.fonts.bodyBold,
    fontSize: 16,
    color: childTheme.colors.ink,
  },
  titleDone: { textDecorationLine: 'line-through', color: childTheme.colors.inkMuted },
  meta: {
    fontFamily: childTheme.fonts.body,
    fontSize: 13,
    color: childTheme.colors.inkMuted,
    marginTop: 2,
  },
  recurringRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  recurringBadge: {
    fontFamily: childTheme.fonts.bodyMedium,
    fontSize: 12,
    color: childTheme.colors.purpleDeep,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: childTheme.radius.pill,
  },
  seriesStreak: { fontFamily: childTheme.fonts.bodyBold, fontSize: 12, color: '#EA580C' },
  points: { alignItems: 'center', minWidth: 44 },
  pointsVal: {
    fontFamily: childTheme.fonts.bodyBold,
    fontSize: 16,
    fontWeight: '700',
    color: childTheme.colors.sunDeep,
  },
  pointsLabel: { fontSize: 10, color: childTheme.colors.inkMuted, fontWeight: '700' },
});
