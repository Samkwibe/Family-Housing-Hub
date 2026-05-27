import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { childTheme } from '@/src/portals/child/theme';
import { motion } from '@/src/portals/shared/motion';

type Props = {
  progress: number;
  size?: number;
  ringColors?: readonly [string, string];
  children?: React.ReactNode;
};

/** Gradient ring — calm spring response tied to level progress */
export function ChildProgressRing({
  progress,
  size = 96,
  ringColors = [childTheme.colors.purple, childTheme.colors.blue],
  children,
}: Props) {
  const pct = Math.max(0, Math.min(1, progress));
  const inner = size - 14;
  const fill = useSharedValue(pct);
  const scale = useSharedValue(1);

  useEffect(() => {
    fill.value = withSpring(pct, motion.reanimated.ring);
    scale.value = withSpring(1.018, motion.reanimated.ring);
    const settle = setTimeout(() => {
      scale.value = withSpring(1, motion.reanimated.ring);
    }, motion.duration.normal);
    return () => clearTimeout(settle);
  }, [pct, fill, scale]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 0.82 + fill.value * 0.18,
  }));

  const trackStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + fill.value * 0.55,
    transform: [{ scale: 0.92 + fill.value * 0.08 }],
  }));

  return (
    <Animated.View style={[styles.wrap, { width: size, height: size }, ringStyle]}>
      <Animated.View
        style={[
          styles.progressTrack,
          { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 },
          trackStyle,
        ]}
      />
      <LinearGradient
        colors={[...ringColors]}
        style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <View style={[styles.inner, { width: inner, height: inner, borderRadius: inner / 2 }]}>
          {children ?? (
            <Text style={styles.pct}>{Math.round(pct * 100)}%</Text>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  progressTrack: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: childTheme.colors.lavender,
  },
  ring: { alignItems: 'center', justifyContent: 'center', padding: 4 },
  inner: {
    backgroundColor: childTheme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pct: {
    fontFamily: childTheme.fonts.bodyBold,
    fontSize: 16,
    color: childTheme.colors.purpleDeep,
  },
});
