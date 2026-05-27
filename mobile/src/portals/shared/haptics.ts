import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import type { CelebrationEventType } from '@/src/portals/child/celebrationEvents';
import { HAPTIC_COOLDOWN_MS, SKIP_HAPTIC_FOR_TYPES } from '@/src/portals/shared/emotionalRhythm';
import { intensityForCelebration } from '@/src/portals/shared/motion';

let lastHapticAt = 0;

async function safeHaptic(fn: () => Promise<void>, skip = false) {
  if (skip) return;
  if (Platform.OS === 'web') return;
  const now = Date.now();
  if (now - lastHapticAt < HAPTIC_COOLDOWN_MS) return;
  lastHapticAt = now;
  try {
    await fn();
  } catch {
    // Haptics unavailable on some devices/simulators
  }
}

/** Structured haptic hierarchy — elegant, restrained, intentional. */
export async function hapticForCelebration(type: CelebrationEventType) {
  const skip = SKIP_HAPTIC_FOR_TYPES.has(type);
  const intensity = intensityForCelebration(type);
  switch (intensity) {
    case 'subtle':
      return safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), skip);
    case 'medium':
      return safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    case 'strong':
      return safeHaptic(async () => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      });
    case 'premium':
      return safeHaptic(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await new Promise((r) => setTimeout(r, 120));
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      });
    default:
      return safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  }
}

export async function hapticForToast(kind: 'success' | 'error' | 'info') {
  if (kind === 'error') {
    return safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  }
  if (kind === 'info') {
    return safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  }
  return safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export async function hapticForPress() {
  return safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}
