import { useEffect } from 'react';
import { subscribeCelebrations } from '@/src/portals/child/celebrationEvents';
import { hapticForCelebration } from '@/src/portals/shared/haptics';

/** Subscribes once — haptic feedback for all celebration events without call-site changes. */
export function CelebrationFeedback() {
  useEffect(() => {
    return subscribeCelebrations((payload) => {
      void hapticForCelebration(payload.type);
    });
  }, []);
  return null;
}
