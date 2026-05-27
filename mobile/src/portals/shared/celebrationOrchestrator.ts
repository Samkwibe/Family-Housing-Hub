import {
  emitCelebration,
  type CelebrationEventType,
  type CelebrationPayload,
} from '@/src/portals/child/celebrationEvents';
import { motion } from '@/src/portals/shared/motion';

function gapAfter(type: CelebrationEventType): number {
  switch (type) {
    case 'chore_completed':
    case 'reward_requested':
      return motion.pacing.toastLead;
    case 'badge_earned':
    case 'level_up':
      return motion.pacing.betweenCelebrations;
    case 'streak_milestone':
      return motion.pacing.betweenCelebrations;
    case 'reward_approved':
    case 'family_milestone':
    case 'welcome_complete':
      return motion.pacing.betweenCelebrations + 200;
    default:
      return motion.pacing.betweenCelebrations;
  }
}

/** Sequence celebrations with calm pacing — not everything at once. */
export function orchestrateCelebrations(events: CelebrationPayload[]) {
  if (!events.length) return;
  let offset = 0;
  for (const event of events) {
    const delay = offset;
    if (delay <= 0) {
      emitCelebration(event);
    } else {
      setTimeout(() => emitCelebration(event), delay);
    }
    offset += gapAfter(event.type);
  }
}
