/**
 * Emotional rhythm guardrails — protect significance, avoid fatigue.
 * Mobile + parent UX should stay aligned with backend milestone sets.
 */

/** Match backend celebration_realtime_service.STREAK_MILESTONES */
export const STREAK_MILESTONES = new Set([3, 7, 14, 30]);

/** Match backend celebration_realtime_service.SERIES_STREAK_MILESTONES */
export const SERIES_STREAK_MILESTONES = new Set([3, 5, 7, 10]);

/** Parent ambient toasts only for meaningful household moments */
export const PARENT_TOAST_CELEBRATION_TYPES = new Set([
  'family_milestone',
  'reward_approved',
]);

/** Streak milestones worth a parent ambient nudge (not every 3-day ping) */
export const PARENT_STREAK_TOAST_MILESTONES = new Set([7, 14, 30]);

export function isExactStreakMilestone(streakDays: number): boolean {
  return STREAK_MILESTONES.has(streakDays);
}

export function isExactSeriesStreakMilestone(seriesStreak: number | null | undefined): boolean {
  return seriesStreak != null && SERIES_STREAK_MILESTONES.has(seriesStreak);
}

export function shouldParentToastForCelebration(
  type: string,
  options?: { priority?: string; streakDays?: number }
): boolean {
  if (PARENT_TOAST_CELEBRATION_TYPES.has(type)) return true;
  if (type === 'streak_milestone' && options?.priority === 'high') {
    const streak = options.streakDays;
    if (streak != null && PARENT_STREAK_TOAST_MILESTONES.has(streak)) return true;
  }
  return false;
}

/** Minimum gap between parent ambient toasts (ms) */
export const PARENT_TOAST_COOLDOWN_MS = 4500;

let lastParentToastAt = 0;

export function extractStreakDaysFromCelebration(event: {
  title?: string;
  message?: string;
}): number | undefined {
  const match = (event.title ?? event.message ?? '').match(/(\d+)-day/);
  if (!match) return undefined;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) ? n : undefined;
}

export function canShowParentAmbientToast(): boolean {
  const now = Date.now();
  if (now - lastParentToastAt < PARENT_TOAST_COOLDOWN_MS) return false;
  lastParentToastAt = now;
  return true;
}

/** Haptic cooldown — prevents stacked feedback during chore sequences */
export const HAPTIC_COOLDOWN_MS = 420;

/** Skip haptic on chore_completed when a toast follows immediately */
export const SKIP_HAPTIC_FOR_TYPES = new Set(['chore_completed']);
