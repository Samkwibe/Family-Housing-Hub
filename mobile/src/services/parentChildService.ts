import api from './api';
import type { ChildRedemption } from '@/src/services/portalService';

export type ParentChildSummary = {
  id: string;
  displayName: string;
  userId?: string | null;
  ageTier?: string;
  ageLabel?: string;
  pointsBalance: number;
  walletBalance: number;
  streakDays: number;
  pendingChores: number;
  completedChores: number;
  pendingHomework: number;
  badgesEarned: number;
  badgesTotal: number;
  childInviteStatus?: string;
  isManaged?: boolean;
  status?: string;
};

export type PendingChildInvite = {
  token: string;
  email: string;
  displayName?: string;
  childInviteStatus: string;
  expiresAt?: string;
};

export type ChildActivityItem = {
  id: string;
  type: string;
  childProfileId?: string;
  childName: string;
  title: string;
  message: string;
  emoji: string;
  status?: string;
  createdAt?: string;
};

export type FamilyInsight = {
  id: string;
  type: string;
  emoji: string;
  title: string;
  message: string;
  priority?: number;
  childProfileId?: string;
  childName?: string;
};

export type FamilySummaryCard = {
  id: string;
  emoji: string;
  label: string;
  value: string;
  hint?: string;
};

export type FamilyIntelligence = {
  consistencyScore: number;
  consistencyLabel: string;
  insights: FamilyInsight[];
  summaryCards: FamilySummaryCard[];
  trends?: {
    weeklyCompletions: number;
    prevWeeklyCompletions: number;
    completionTrendPct: number;
    rewardRedemptions: number;
    rewardTrendPct: number;
    activeChildren: number;
    maxStreak: number;
  };
  aiRecommendations: string[];
  headline?: string | null;
};

export type ParentChildrenDashboard = {
  summary: {
    childCount: number;
    managedCount: number;
    pendingInvites: number;
    pendingRedemptions: number;
    openSosAlerts: number;
    totalPendingChores: number;
    familyConsistencyScore?: number;
    familyConsistencyLabel?: string;
  };
  children: ParentChildSummary[];
  pendingInvites: PendingChildInvite[];
  pendingRedemptions: ChildRedemption[];
  activity: ChildActivityItem[];
  familyIntelligence?: FamilyIntelligence;
  aiRecommendations: string[];
};

export type ChildRoutine = {
  seriesId: string;
  title: string;
  childProfileId?: string;
  recurrenceLabel: string;
  recurrenceRule?: Record<string, unknown>;
  routineGroup?: string | null;
  routineLabel?: string | null;
  paused: boolean;
  seriesStreak: number;
  points: number;
  openInstances: number;
};

export type ChildDetail = {
  profile: ParentChildSummary;
  chores: Array<{
    id: string;
    source: string;
    title: string;
    dueDate: string;
    completed: boolean;
    points: number;
    isRecurring?: boolean;
    recurrenceLabel?: string;
    seriesId?: string;
    seriesStreak?: number;
    routineGroup?: string | null;
    routineLabel?: string | null;
  }>;
  routines?: ChildRoutine[];
  homework: Array<{
    id: string;
    title: string;
    subject?: string;
    dueDate: string;
    completed: boolean;
  }>;
  rewards: Array<{ id: string; title: string; cost: number; emoji: string; description?: string; redemptionStatus?: string | null }>;
  redemptions?: ChildRedemption[];
  pendingRedemptions?: ChildRedemption[];
  badges: Array<{ id: string; label: string; emoji: string; earned: boolean }>;
  activity: ChildActivityItem[];
  childInsights?: FamilyInsight[];
  aiRecommendations?: string[];
};

export async function fetchParentChildrenDashboard(): Promise<ParentChildrenDashboard> {
  return api.request('/api/child/parent/dashboard', { method: 'GET' });
}

export async function fetchParentFamilyInsights(): Promise<FamilyIntelligence> {
  return api.request('/api/child/parent/insights', { method: 'GET' });
}

export async function fetchChildDetail(profileId: string): Promise<ChildDetail> {
  return api.request(`/api/child/profiles/${profileId}`, { method: 'GET' });
}

export async function createChildProfile(payload: {
  displayName: string;
  dateOfBirth?: string;
}) {
  return api.request<{ profile: ParentChildSummary }>('/api/child/profiles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function assignChildChore(payload: {
  childProfileId: string;
  title: string;
  points?: number;
  dueDate?: string;
  recurring?: string;
  recurrenceRule?: string | Record<string, unknown>;
  routineGroup?: 'morning' | 'evening' | 'after_school' | '';
  routineLabel?: string;
  timezone?: string;
}) {
  return api.request('/api/child/chores', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchChildRoutines(childProfileId?: string) {
  const query = childProfileId ? `?childProfileId=${encodeURIComponent(childProfileId)}` : '';
  return api.request<{ routines: ChildRoutine[] }>(`/api/child/routines${query}`);
}

export async function pauseChildRoutine(seriesId: string, paused = true) {
  return api.request<{ routine: ChildRoutine }>(`/api/child/routines/${seriesId}/pause`, {
    method: 'POST',
    body: JSON.stringify({ paused }),
  });
}

export async function duplicateChildRoutine(seriesId: string, childProfileId: string) {
  return api.request(`/api/child/routines/${seriesId}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ childProfileId }),
  });
}

export async function createChildReward(payload: {
  title: string;
  cost: number;
  emoji?: string;
  description?: string;
}) {
  return api.request('/api/child/rewards', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function assignChildHomework(payload: {
  childProfileId: string;
  title: string;
  subject?: string;
  dueDate?: string;
}) {
  return api.request('/api/child/homework', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function grantChildBonusPoints(profileId: string, points: number, reason?: string) {
  return api.request(`/api/child/profiles/${profileId}/bonus-points`, {
    method: 'POST',
    body: JSON.stringify({ points, reason }),
  });
}

export async function fetchChildActivity(limit = 25) {
  return api.request<{ activity: ChildActivityItem[] }>(`/api/child/activity?limit=${limit}`);
}

export async function fetchPendingChildInvites() {
  return api.request<{ invites: PendingChildInvite[] }>('/api/child/invites');
}

export async function approveChildRedemption(redemptionId: string) {
  return api.request<{ redemption: ChildRedemption }>(`/api/child/redemptions/${redemptionId}/approve`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function declineChildRedemption(redemptionId: string) {
  return api.request<{ redemption: ChildRedemption }>(`/api/child/redemptions/${redemptionId}/decline`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function adjustChildWallet(profileId: string, amount: number, description?: string) {
  return api.request<{ ok: boolean; walletBalance: number }>(`/api/child/profiles/${profileId}/wallet/adjust`, {
    method: 'POST',
    body: JSON.stringify({ amount, description }),
  });
}

export async function setChildSavingsGoal(profileId: string, title: string, targetAmount: number) {
  return api.request<{ ok: boolean; savingsGoal: Record<string, unknown> }>(`/api/child/profiles/${profileId}/savings-goal`, {
    method: 'POST',
    body: JSON.stringify({ title, targetAmount }),
  });
}
