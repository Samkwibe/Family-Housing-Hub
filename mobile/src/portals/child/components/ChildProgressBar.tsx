import { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { childTheme } from '@/src/portals/child/theme';
import { motion } from '@/src/portals/shared/motion';

type Props = {
  progress: number;
  label: string;
  height?: number;
};

export function ChildProgressBar({ progress, label, height = 12 }: Props) {
  const pct = Math.max(0, Math.min(1, progress));
  const animated = useSharedValue(pct);
  const trackWidth = useSharedValue(0);
  const [displayPct, setDisplayPct] = useState(Math.round(pct * 100));

  useEffect(() => {
    animated.value = withSpring(pct, motion.reanimated.progress);
    const id = setTimeout(() => setDisplayPct(Math.round(pct * 100)), motion.duration.normal);
    return () => clearTimeout(id);
  }, [pct, animated]);

  const fillStyle = useAnimatedStyle(() => ({
    width: trackWidth.value * animated.value,
  }));

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackWidth.value = e.nativeEvent.layout.width;
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.pct}>{displayPct}%</Text>
      </View>
      <View style={[styles.track, { height }]} onLayout={onTrackLayout}>
        <Animated.View style={[styles.fill, { height }, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: {
    fontFamily: childTheme.fonts.bodyBold,
    fontSize: 14,
    color: childTheme.colors.ink,
  },
  pct: {
    fontFamily: childTheme.fonts.bodyBold,
    fontSize: 13,
    color: childTheme.colors.purpleDeep,
  },
  track: {
    backgroundColor: '#E2E8F0',
    borderRadius: childTheme.radius.pill,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: childTheme.colors.purple,
    borderRadius: childTheme.radius.pill,
  },
});
