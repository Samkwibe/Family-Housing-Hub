import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CelebrationEventType } from '@/src/portals/child/celebrationEvents';
import { childTheme } from '@/src/portals/child/theme';
import {
  intensityForCelebration,
  motion,
  type CelebrationIntensity,
} from '@/src/portals/shared/motion';

type Props = {
  visible: boolean;
  emoji: string;
  title: string;
  message: string;
  celebrationType?: CelebrationEventType;
  onClose: () => void;
};

const CTA: Record<CelebrationIntensity, string> = {
  subtle: 'Nice!',
  medium: 'Great!',
  strong: 'Wonderful!',
  premium: 'Amazing!',
};

/** Calm celebration overlay — intentional motion, restrained delight. */
export function RewardCelebration({
  visible,
  emoji,
  title,
  message,
  celebrationType,
  onClose,
}: Props) {
  const intensity = celebrationType ? intensityForCelebration(celebrationType) : 'medium';
  const scale = useRef(new Animated.Value(motion.scale.celebrationEnter)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const emojiScale = useRef(new Animated.Value(0.85)).current;
  const [mounted, setMounted] = useState(false);

  const enterScale =
    intensity === 'premium' ? motion.scale.celebrationEnterPremium : motion.scale.celebrationEnter;
  const springConfig =
    intensity === 'premium' || intensity === 'strong'
      ? motion.spring.celebrationPremium
      : motion.spring.celebration;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      scale.setValue(enterScale);
      opacity.setValue(0);
      overlayOpacity.setValue(0);
      emojiScale.setValue(0.85);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: motion.duration.normal,
          useNativeDriver: true,
        }),
        Animated.spring(scale, { ...springConfig, toValue: 1 }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: motion.duration.fast,
          useNativeDriver: true,
        }),
        Animated.spring(emojiScale, {
          ...motion.spring.celebration,
          toValue: 1,
          delay: intensity === 'premium' ? 80 : 40,
        }),
      ]).start();
      return;
    }

    if (!mounted) return;

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: motion.duration.fast,
        useNativeDriver: true,
      }),
      Animated.spring(scale, { ...motion.spring.modalExit, toValue: motion.scale.modalExit }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: motion.duration.fast,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, mounted, scale, opacity, overlayOpacity, emojiScale, enterScale, springConfig, intensity]);

  if (!mounted) return null;

  const showConfetti = intensity === 'premium';
  const showSparkle = intensity === 'strong' || intensity === 'medium';

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={styles.overlayPress} onPress={onClose}>
          <Animated.View
            style={[styles.card, { opacity, transform: [{ scale }] }]}
            onStartShouldSetResponder={() => true}
          >
            {showConfetti ? <Text style={styles.confetti}>✨</Text> : null}
            {showSparkle && !showConfetti ? <Text style={styles.sparkle}>✨</Text> : null}
            <Animated.Text style={[styles.emoji, { transform: [{ scale: emojiScale }] }]}>
              {emoji}
            </Animated.Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            <Pressable style={[styles.btn, intensity === 'premium' && styles.btnPremium]} onPress={onClose}>
              <Text style={styles.btnText}>{CTA[intensity]}</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(88, 28, 135, 0.4)',
  },
  overlayPress: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: childTheme.colors.white,
    borderRadius: childTheme.radius.xl,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    ...childTheme.shadow.card,
  },
  confetti: { fontSize: 20, marginBottom: 6, opacity: 0.85 },
  sparkle: { fontSize: 16, marginBottom: 4, opacity: 0.7 },
  emoji: { fontSize: 52, marginBottom: 12 },
  title: {
    fontFamily: childTheme.fonts.title,
    fontSize: 22,
    fontWeight: '700',
    color: childTheme.colors.ink,
    textAlign: 'center',
  },
  message: {
    fontFamily: childTheme.fonts.body,
    fontSize: 15,
    color: childTheme.colors.inkSoft,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  btn: {
    marginTop: 20,
    backgroundColor: childTheme.colors.purpleDeep,
    borderRadius: childTheme.radius.pill,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  btnPremium: {
    paddingHorizontal: 32,
  },
  btnText: {
    fontFamily: childTheme.fonts.bodyBold,
    color: childTheme.colors.white,
    fontSize: 16,
  },
});
