/**
 * Shared motion language — calm delight, physically coherent across portals.
 */
export const motion = {
  duration: {
    instant: 120,
    fast: 200,
    normal: 320,
    slow: 480,
    gentle: 640,
    loop: 900,
  },
  /** RN Animated spring configs */
  spring: {
    celebration: { friction: 7, tension: 80, useNativeDriver: true as const },
    celebrationPremium: { friction: 8, tension: 65, useNativeDriver: true as const },
    modalExit: { friction: 9, tension: 120, useNativeDriver: true as const },
  },
  /** Reanimated withSpring configs */
  reanimated: {
    press: { damping: 18, stiffness: 280 },
    tabPress: { damping: 16, stiffness: 320 },
    progress: { damping: 20, stiffness: 90 },
    ring: { damping: 22, stiffness: 78 },
  },
  scale: {
    press: 0.97,
    tabPress: 0.92,
    celebrationEnter: 0.88,
    celebrationEnterPremium: 0.82,
    modalExit: 0.94,
  },
  opacity: {
    overlay: 0.38,
    overlayPremium: 0.42,
    overlaySubtle: 0.28,
  },
  pacing: {
    /** Gap between sequential celebration modals */
    betweenCelebrations: 900,
    /** Gap after modal closes before next */
    afterDismiss: 600,
    /** Toast display before next modal can appear */
    toastLead: 400,
  },
  toast: {
    fadeIn: 240,
    fadeOut: 280,
    visibleMs: 2600,
  },
  /** Parent portal — softer, ambient, non-intrusive */
  toastAmbient: {
    fadeIn: 380,
    fadeOut: 340,
    visibleMs: 2200,
    translateIn: 4,
  },
} as const;

export type CelebrationIntensity = 'subtle' | 'medium' | 'strong' | 'premium';

export function intensityForCelebration(type: string): CelebrationIntensity {
  switch (type) {
    case 'chore_completed':
    case 'reward_requested':
      return 'subtle';
    case 'badge_earned':
    case 'level_up':
    case 'streak_milestone':
      return 'medium';
    case 'reward_approved':
      return 'strong';
    case 'family_milestone':
    case 'welcome_complete':
      return 'premium';
    default:
      return 'medium';
  }
}
