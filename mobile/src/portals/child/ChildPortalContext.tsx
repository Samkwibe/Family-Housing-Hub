import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useToast } from '@/src/contexts/ToastContext';
import { orchestrateCelebrations } from '@/src/portals/shared/celebrationOrchestrator';
import {
  isExactSeriesStreakMilestone,
  isExactStreakMilestone,
} from '@/src/portals/shared/emotionalRhythm';
import {
  computeLevel,
  resolveAvatarTheme,
  resolveColorTheme,
  type AvatarTheme,
  type ColorTheme,
} from '@/src/portals/child/theme';
import {
  completeChildChore,
  completeChildOnboarding,
  fetchChildDashboard,
  completeChildHomework,
  type ChildDashboard,
} from '@/src/services/portalService';
import { trackDashboardHydration } from '@/src/services/observabilityService';

type ChildPortalContextValue = {
  data: ChildDashboard | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  displayName: string;
  avatar: AvatarTheme;
  colorTheme: ColorTheme;
  level: ReturnType<typeof computeLevel>;
  streak: number;
  choreProgress: number;
  isTeen: boolean;
  needsProfile: boolean;
  needsWelcomeOnboarding: boolean;
  refresh: () => Promise<void>;
  completeOnboarding: (payload: { avatarEmoji: string; themeId: string; displayName: string }) => Promise<void>;
  completeChore: (id: string, source?: 'household' | 'child') => Promise<void>;
  completeHomework: (id: string) => Promise<void>;
};

const ChildPortalContext = createContext<ChildPortalContextValue | null>(null);

export function ChildPortalProvider({ children }: { children: ReactNode }) {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<ChildDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    const startedAt = isRefresh ? 0 : Date.now();
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const dash = await fetchChildDashboard();
      setData(dash);
      if (!isRefresh && startedAt > 0) {
        trackDashboardHydration(Date.now() - startedAt, { portal: 'child' });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not load your space';
      setError(message);
      if (isRefresh) throw new Error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const displayName =
    data?.profile?.displayName ||
    (userProfile?.firstName as string | undefined) ||
    'Friend';

  const avatar = useMemo(
    () => resolveAvatarTheme(data?.profile?.avatarEmoji, displayName),
    [data?.profile?.avatarEmoji, displayName],
  );
  const colorTheme = useMemo(
    () => resolveColorTheme(data?.profile?.themeId),
    [data?.profile?.themeId],
  );
  const points = data?.profile?.pointsBalance ?? 0;
  const level = useMemo(() => computeLevel(points), [points]);

  const chores = data?.chores ?? [];
  const done = chores.filter((c) => c.completed).length;
  const choreProgress = chores.length ? done / chores.length : 0;

  const isTeen =
    data?.profile?.ageTier === 'teen_13_17' ||
    data?.portalContext?.experience_type === 'teen';

  const completeOnboarding = useCallback(async (payload: {
    avatarEmoji: string;
    themeId: string;
    displayName: string;
  }) => {
    await completeChildOnboarding(payload);
    await load(true);
  }, [load]);

  const completeChore = useCallback(async (id: string, source: 'household' | 'child' = 'household') => {
    const chore = chores.find((c) => c.id === id);
    const choreSource = chore?.source ?? source;
    try {
      const result = await completeChildChore(id, choreSource);
      await load(true);

      const sequence: Parameters<typeof orchestrateCelebrations>[0] = [];

      const newBadge = result.badges?.find(
        (b) => b.earned && !(data?.badges ?? []).some((prev) => prev.id === b.id && prev.earned)
      );
      if (newBadge) {
        sequence.push({
          type: 'badge_earned',
          title: 'New badge!',
          message: `You unlocked ${newBadge.label}!`,
          emoji: newBadge.emoji,
          badgeIds: [newBadge.id],
        });
      }
      if (isExactStreakMilestone(result.streakDays)) {
        const emoji = result.streakDays >= 7 ? '💪' : '🔥';
        const title =
          result.streakDays >= 7 ? `${result.streakDays}-day powerhouse!` : 'Streak power!';
        sequence.push({
          type: 'streak_milestone',
          title,
          message: `${result.streakDays} days in a row — amazing!`,
          emoji,
        });
      }
      if (isExactSeriesStreakMilestone(result.seriesStreak)) {
        sequence.push({
          type: 'streak_milestone',
          title: 'Routine streak!',
          message: `${result.seriesStreak} times in a row on this routine!`,
          emoji: '🔁',
        });
      }

      orchestrateCelebrations(sequence);
      showToast(`+${result.pointsEarned} stars`, 'success');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not complete chore';
      showToast(message, 'error');
      throw e;
    }
  }, [chores, data?.badges, load, showToast]);

  const completeHomework = useCallback(async (id: string) => {
    try {
      await completeChildHomework(id);
      await load(true);
      showToast('Homework marked complete!', 'success');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not complete homework';
      showToast(message, 'error');
      throw e;
    }
  }, [load, showToast]);

  const value = useMemo(
    () => ({
      data,
      loading,
      refreshing,
      error,
      displayName,
      avatar,
      colorTheme,
      level,
      streak: data?.streakDays ?? 0,
      choreProgress,
      isTeen,
      needsProfile: Boolean(data?.needsProfile),
      needsWelcomeOnboarding: Boolean(data?.needsWelcome),
      refresh: () => load(true),
      completeOnboarding,
      completeChore,
      completeHomework,
    }),
    [data, loading, refreshing, error, displayName, avatar, colorTheme, level, choreProgress, isTeen, load, completeOnboarding, completeChore, completeHomework],
  );

  return (
    <ChildPortalContext.Provider value={value}>{children}</ChildPortalContext.Provider>
  );
}

export function useChildPortal() {
  const ctx = useContext(ChildPortalContext);
  if (!ctx) throw new Error('useChildPortal must be used within ChildPortalProvider');
  return ctx;
}
