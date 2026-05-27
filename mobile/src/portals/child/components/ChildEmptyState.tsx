import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { childTheme } from '@/src/portals/child/theme';

type Props = {
  emoji: string;
  title: string;
  message: string;
  hint?: string;
  variant?: 'default' | 'warm' | 'playful' | 'celebrate';
};

const VARIANTS = {
  default: { bubble: childTheme.colors.sky, bg: undefined as string | undefined },
  warm: { bubble: '#FEF3C7', bg: '#FFFBEB' },
  playful: { bubble: '#DDD6FE', bg: '#F5F3FF' },
  celebrate: { bubble: '#BBF7D0', bg: '#ECFDF5' },
};

export function ChildEmptyState({ emoji, title, message, hint, variant = 'default' }: Props) {
  const v = VARIANTS[variant];
  const inner = (
    <View style={[styles.wrap, v.bg ? { backgroundColor: v.bg, borderRadius: childTheme.radius.lg, marginHorizontal: 4 } : null]}>
      <View style={[styles.emojiBubble, { backgroundColor: v.bubble }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );

  if (variant === 'celebrate') {
    return (
      <LinearGradient colors={['#ECFDF5', '#D1FAE5']} style={styles.gradientWrap}>
        {inner}
      </LinearGradient>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  gradientWrap: { borderRadius: childTheme.radius.lg, overflow: 'hidden' },
  wrap: {
    alignItems: 'center',
    paddingVertical: childTheme.spacing.xxl,
    paddingHorizontal: childTheme.spacing.xl,
  },
  emojiBubble: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: childTheme.spacing.lg,
    ...childTheme.shadow.card,
  },
  emoji: { fontSize: 48 },
  title: {
    fontFamily: childTheme.fonts.title,
    fontSize: 22,
    fontWeight: '700',
    color: childTheme.colors.ink,
    textAlign: 'center',
  },
  message: {
    fontFamily: childTheme.fonts.body,
    fontSize: 16,
    color: childTheme.colors.inkSoft,
    textAlign: 'center',
    marginTop: childTheme.spacing.sm,
    lineHeight: 24,
  },
  hint: {
    fontFamily: childTheme.fonts.bodyMedium,
    fontSize: 14,
    color: childTheme.colors.purpleDeep,
    marginTop: childTheme.spacing.md,
    textAlign: 'center',
  },
});
