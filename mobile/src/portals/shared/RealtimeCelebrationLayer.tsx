import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  bridgeRealtimeActivity,
  bridgeRealtimeCelebration,
  subscribeCelebrations,
  type CelebrationPayload,
  type RealtimeCelebrationPayload,
} from '@/src/portals/child/celebrationEvents';
import { RewardCelebration } from '@/src/portals/child/components/RewardCelebration';
import { CelebrationFeedback } from '@/src/portals/shared/CelebrationFeedback';
import {
  canShowParentAmbientToast,
  extractStreakDaysFromCelebration,
  shouldParentToastForCelebration,
} from '@/src/portals/shared/emotionalRhythm';
import { motion } from '@/src/portals/shared/motion';
import {
  trackAnimationQueueDepth,
  trackCelebrationDelivered,
  trackCelebrationRender,
} from '@/src/services/observabilityService';
import { emitCelebrationAck, subscribeRealtime } from '@/src/services/realtimeService';

type Props = {
  portal: 'child' | 'parent';
  onRefresh?: () => void;
  /** Receives ambient-paced parent toasts for meaningful moments only */
  onParentToast?: (message: string) => void;
};

const CHILD_REMOTE_MODAL_TYPES = new Set(['reward_approved', 'family_milestone', 'welcome_complete']);
const CHILD_LOCAL_MODAL_TYPES = new Set(['streak_milestone', 'badge_earned', 'level_up', 'welcome_complete']);

function ackCelebration(
  event: RealtimeCelebrationPayload,
  stage: 'delivered' | 'rendered' | 'animation_completed',
  durationMs?: number
) {
  emitCelebrationAck({
    traceId: event.traceId,
    type: event.type,
    stage,
    durationMs,
  });
}

export function RealtimeCelebrationLayer({ portal, onRefresh, onParentToast }: Props) {
  const { userProfile } = useAuth();
  const [modal, setModal] = useState<CelebrationPayload | null>(null);
  const modalTraceRef = useRef<{ traceId?: string; type: string; openedAt: number } | null>(null);
  const queueRef = useRef<CelebrationPayload[]>([]);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showingRef = useRef(false);

  const showNextFromQueue = useCallback(() => {
    gapTimerRef.current = null;
    const next = queueRef.current.shift();
    trackAnimationQueueDepth(queueRef.current.length, { portal });
    if (next) {
      showingRef.current = true;
      setModal(next);
    } else {
      showingRef.current = false;
    }
  }, [portal]);

  const enqueueModal = useCallback(
    (payload: CelebrationPayload) => {
      if (showingRef.current || gapTimerRef.current || queueRef.current.length > 0) {
        queueRef.current.push(payload);
        trackAnimationQueueDepth(queueRef.current.length, { portal, type: payload.type });
        return;
      }
      showingRef.current = true;
      setModal(payload);
    },
    [portal]
  );

  const closeModal = useCallback(() => {
    const ref = modalTraceRef.current;
    if (ref) {
      const durationMs = Date.now() - ref.openedAt;
      trackCelebrationRender(durationMs, {
        traceId: ref.traceId,
        type: ref.type,
        stage: 'animation_completed',
      });
      ackCelebration(
        { type: ref.type, traceId: ref.traceId } as RealtimeCelebrationPayload,
        'animation_completed',
        durationMs
      );
    }
    setModal(null);
    showingRef.current = false;
    if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
    gapTimerRef.current = setTimeout(showNextFromQueue, motion.pacing.afterDismiss);
  }, [showNextFromQueue]);

  useEffect(() => {
    if (!modal) return;
    const openedAt = Date.now();
    modalTraceRef.current = {
      traceId: (modal as RealtimeCelebrationPayload).traceId,
      type: modal.type,
      openedAt,
    };
    trackCelebrationRender(0, {
      traceId: modalTraceRef.current.traceId,
      type: modal.type,
      stage: 'rendered',
    });
    ackCelebration(
      { type: modal.type, traceId: modalTraceRef.current.traceId } as RealtimeCelebrationPayload,
      'rendered',
      0
    );
    return () => {
      modalTraceRef.current = null;
    };
  }, [modal]);

  useEffect(() => {
    if (!userProfile) return;

    const handleRemoteCelebration = (event: RealtimeCelebrationPayload) => {
      trackCelebrationDelivered({ traceId: event.traceId, type: event.type });
      ackCelebration(event, 'delivered');

      if (portal === 'child') {
        if (event.showChild === false) return;
        if (!CHILD_REMOTE_MODAL_TYPES.has(event.type)) {
          bridgeRealtimeCelebration(event);
          return;
        }
        bridgeRealtimeCelebration(event);
        enqueueModal(event);
        onRefresh?.();
        return;
      }

      if (event.showParent === false) return;
      bridgeRealtimeCelebration(event);
      const streakDays = extractStreakDaysFromCelebration(event);
      if (
        shouldParentToastForCelebration(event.type, {
          priority: event.priority,
          streakDays,
        }) &&
        canShowParentAmbientToast()
      ) {
        onParentToast?.(`${event.emoji || '✨'} ${event.title}`);
      }
      onRefresh?.();
    };

    const unsubLocal = subscribeCelebrations((payload) => {
      if (portal !== 'child') return;
      if (payload.type === 'chore_completed' || payload.type === 'reward_requested') return;
      if (CHILD_LOCAL_MODAL_TYPES.has(payload.type)) {
        enqueueModal(payload);
      }
    });

    const unsubSocket = subscribeRealtime({
      onFamilyCelebration: handleRemoteCelebration,
      onFamilyActivity: (activity) => {
        bridgeRealtimeActivity(activity);
        if (portal === 'parent') onRefresh?.();
      },
    });

    return () => {
      unsubLocal();
      void unsubSocket.then((fn) => fn());
      if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
    };
  }, [userProfile, portal, onRefresh, onParentToast, enqueueModal]);

  return (
    <>
      <CelebrationFeedback />
      {portal === 'child' && modal ? (
        <RewardCelebration
          visible={Boolean(modal)}
          emoji={modal.emoji || '🎉'}
          title={modal.title}
          message={modal.message}
          celebrationType={modal.type}
          onClose={closeModal}
        />
      ) : null}
    </>
  );
}
