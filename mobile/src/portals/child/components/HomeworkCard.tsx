import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { childTheme } from '@/src/portals/child/theme';
import { motion } from '@/src/portals/shared/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  title: string;
  subject?: string;
  dueDate?: string;
  completed: boolean;
  onComplete?: () => void;
};

// Dynamic helper to resolve custom icons and colors for school subjects
function getSubjectConfig(subject?: string) {
  const norm = (subject || '').trim().toLowerCase();
  if (!norm) {
    return { emoji: '📝', bg: '#F3F4F6', color: '#4B5563', label: 'Homework' };
  }

  if (norm.includes('math') || norm.includes('calc') || norm.includes('algebra')) {
    return { emoji: '📐', bg: '#E0F2FE', color: '#0369A1', label: subject };
  }
  if (norm.includes('science') || norm.includes('bio') || norm.includes('chem') || norm.includes('phys')) {
    return { emoji: '🧪', bg: '#DCFCE7', color: '#15803D', label: subject };
  }
  if (norm.includes('read') || norm.includes('english') || norm.includes('writing') || norm.includes('vocab')) {
    return { emoji: '📚', bg: '#FFEDD5', color: '#C2410C', label: subject };
  }
  if (norm.includes('hist') || norm.includes('social') || norm.includes('geog')) {
    return { emoji: '📜', bg: '#FEF9C3', color: '#A16207', label: subject };
  }
  if (norm.includes('art') || norm.includes('draw') || norm.includes('paint')) {
    return { emoji: '🎨', bg: '#FCE7F3', color: '#BE185D', label: subject };
  }
  if (norm.includes('music') || norm.includes('band') || norm.includes('piano')) {
    return { emoji: '🎵', bg: '#E0E7FF', color: '#4338CA', label: subject };
  }

  // Fallback for general subjects
  return { emoji: '📝', bg: '#F5F3FF', color: '#6D28D9', label: subject };
}

export function HomeworkCard({
  title,
  subject,
  dueDate,
  completed,
  onComplete,
}: Props) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const conf = getSubjectConfig(subject);

  return (
    <AnimatedPressable
      style={[styles.card, completed && styles.done, animStyle]}
      onPressIn={() => {
        scale.value = withSpring(motion.scale.press, motion.reanimated.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.reanimated.press);
      }}
      onPress={() => {
        if (!completed) onComplete?.();
      }}
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
        <View style={styles.metaRow}>
          {dueDate ? <Text style={styles.meta}>Due {dueDate}</Text> : null}
          {dueDate && subject ? <Text style={styles.dot}>·</Text> : null}
          <View style={[styles.badge, { backgroundColor: conf.bg }]}>
            <Text style={[styles.badgeText, { color: conf.color }]}>
              {conf.emoji} {conf.label}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.status}>
        <Ionicons
          name={completed ? 'ribbon' : 'book-outline'}
          size={24}
          color={completed ? childTheme.colors.purpleDeep : '#94A3B8'}
        />
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
  done: {
    opacity: 0.72,
    backgroundColor: '#F0FDF4',
  },
  check: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: childTheme.colors.mintDeep,
    borderColor: childTheme.colors.mintDeep,
  },
  checkEmpty: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  body: {
    flex: 1,
  },
  title: {
    fontFamily: childTheme.fonts.bodyBold,
    fontSize: 16,
    color: childTheme.colors.ink,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: childTheme.colors.inkMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  meta: {
    fontFamily: childTheme.fonts.body,
    fontSize: 13,
    color: childTheme.colors.inkMuted,
  },
  dot: {
    fontSize: 13,
    color: childTheme.colors.inkMuted,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: childTheme.radius.pill,
  },
  badgeText: {
    fontFamily: childTheme.fonts.bodyMedium,
    fontSize: 11,
    fontWeight: '600',
  },
  status: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
});
