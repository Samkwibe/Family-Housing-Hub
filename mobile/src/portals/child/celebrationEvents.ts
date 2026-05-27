/**
 * Celebration event bus — local UI + realtime Socket.IO bridge.
 * Haptics via CelebrationFeedback; modals via RealtimeCelebrationLayer.
 */
export type CelebrationEventType =
  | 'welcome_complete'
  | 'chore_completed'
  | 'reward_requested'
  | 'reward_approved'
  | 'streak_milestone'
  | 'badge_earned'
  | 'level_up'
  | 'family_milestone';

export type CelebrationPayload = {
  type: CelebrationEventType;
  title: string;
  message: string;
  emoji?: string;
  points?: number;
  badgeIds?: string[];
};

/** Payload from backend Socket.IO `family_celebration` event */
export type RealtimeCelebrationPayload = CelebrationPayload & {
  traceId?: string;
  childProfileId?: string;
  childName?: string;
  priority?: 'high' | 'normal';
  showParent?: boolean;
  showChild?: boolean;
  ts?: number;
};

export type FamilyActivityPayload = {
  id?: string;
  type: string;
  childProfileId?: string;
  childName?: string;
  title: string;
  message: string;
  emoji: string;
  createdAt?: string;
  ts?: number;
};

type CelebrationListener = (payload: CelebrationPayload) => void;
type ActivityListener = (payload: FamilyActivityPayload) => void;

const celebrationListeners = new Set<CelebrationListener>();
const activityListeners = new Set<ActivityListener>();

export function subscribeCelebrations(listener: CelebrationListener): () => void {
  celebrationListeners.add(listener);
  return () => celebrationListeners.delete(listener);
}

export function subscribeFamilyActivity(listener: ActivityListener): () => void {
  activityListeners.add(listener);
  return () => activityListeners.delete(listener);
}

export function emitCelebration(payload: CelebrationPayload) {
  celebrationListeners.forEach((fn) => {
    try {
      fn(payload);
    } catch {
      // ignore listener errors
    }
  });
}

export function emitFamilyActivity(payload: FamilyActivityPayload) {
  activityListeners.forEach((fn) => {
    try {
      fn(payload);
    } catch {
      // ignore listener errors
    }
  });
}

/** Bridge realtime socket payloads into the local celebration bus */
export function bridgeRealtimeCelebration(payload: RealtimeCelebrationPayload) {
  emitCelebration({
    type: payload.type,
    title: payload.title,
    message: payload.message,
    emoji: payload.emoji,
    points: payload.points,
  });
}

export function bridgeRealtimeActivity(payload: FamilyActivityPayload) {
  emitFamilyActivity(payload);
}
