import api from './api';
import type { PortalContextPayload } from '@/src/portals/resolvePortal';

export type OwnerProperty = {
  id: string;
  name: string;
  address: Record<string, string>;
  unitCount: number;
  vacantUnits: number;
  occupancyStatus: string;
  notes?: string;
};

export type OwnerDashboard = {
  portalContext?: PortalContextPayload;
  summary: {
    propertyCount: number;
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    occupancyRate: number;
    openMaintenanceRequests: number;
  };
  properties: OwnerProperty[];
  alerts: unknown[];
  aiRecommendations: string[];
};

export type ChildChore = {
  id: string;
  source: 'household' | 'child';
  title: string;
  dueDate: string;
  completed: boolean;
  points: number;
  isRecurring?: boolean;
  recurrenceLabel?: string;
  recurrenceRule?: Record<string, unknown>;
  seriesId?: string;
  seriesStreak?: number;
  routineGroup?: 'morning' | 'evening' | 'after_school' | null;
  routineLabel?: string | null;
  nextDueAt?: string;
  paused?: boolean;
};

export type ChildReward = {
  id: string;
  title: string;
  cost: number;
  emoji: string;
  description?: string;
  redemptionStatus?: 'pending' | null;
  redemptionId?: string | null;
};

export type ChildRedemption = {
  id: string;
  rewardId?: string;
  childProfileId?: string;
  childName?: string;
  rewardTitle: string;
  rewardEmoji: string;
  cost: number;
  status: 'pending' | 'approved' | 'declined';
  requestedAt?: string;
  resolvedAt?: string;
};

export type ChildHomework = {
  id: string;
  title: string;
  subject?: string;
  dueDate: string;
  completed: boolean;
};

export type ChildBadge = {
  id: string;
  label: string;
  emoji: string;
  earned: boolean;
};

export type ChildMessagePreview = {
  id: string;
  groupId?: string;
  groupName?: string;
  from: string;
  text: string;
  createdAt?: string;
};

export type ChildDashboard = {
  portalContext?: PortalContextPayload;
  needsProfile?: boolean;
  needsWelcome?: boolean;
  profile: {
    id: string | null;
    displayName: string;
    ageTier?: string;
    pointsBalance: number;
    avatarEmoji?: string | null;
    themeId?: string | null;
    childOnboardingComplete?: boolean;
  } | null;
  chores: ChildChore[];
  rewards: ChildReward[];
  redemptions?: ChildRedemption[];
  homework: ChildHomework[];
  badges: ChildBadge[];
  walletBalance: number;
  savingsGoal?: {
    title: string;
    targetAmount: number;
    savedAmount: number;
  } | null;
  walletTransactions?: Array<{
    id: string;
    amount: number;
    newBalance: number;
    description: string;
    createdAt?: string;
  }>;
  streakDays: number;
  level: number;
  messagesPreview: ChildMessagePreview[];
  aiRecommendations: string[];
};

export async function fetchPortalContext(): Promise<{ portalContext: PortalContextPayload | null }> {
  return api.request('/api/auth/portal/context', { method: 'GET' });
}

export async function switchPortal(payload: {
  activePortal: 'renter' | 'owner' | 'child' | 'teen';
  activePropertyId?: string | null;
  activeHouseholdId?: string;
}) {
  return api.request<{ user: Record<string, unknown>; portalContext: PortalContextPayload | null }>(
    '/api/auth/portal/switch',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function fetchOwnerDashboard(): Promise<OwnerDashboard> {
  return api.request<OwnerDashboard>('/api/dashboard/owner', { method: 'GET' });
}

export async function fetchChildDashboard(): Promise<ChildDashboard> {
  return api.request<ChildDashboard>('/api/dashboard/child', { method: 'GET' });
}

export async function completeChildOnboarding(payload: {
  avatarEmoji: string;
  themeId: string;
  displayName: string;
}) {
  return api.request<{
    profile: NonNullable<ChildDashboard['profile']>;
    badges: ChildBadge[];
    celebration: { type: string; badges: string[] };
  }>('/api/child/onboarding/complete', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function completeChildChore(choreId: string, source: 'household' | 'child' = 'household') {
  return api.request<{
    pointsEarned: number;
    pointsBalance: number;
    streakDays: number;
    seriesStreak?: number | null;
    badges: ChildBadge[];
  }>(`/api/child/chores/${choreId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ source }),
  });
}

export async function sendChildSos(coords?: { lat: number; lng: number }) {
  return api.request<{ alertId: string; status: string }>('/api/child/sos', {
    method: 'POST',
    body: JSON.stringify(coords || {}),
  });
}

export async function redeemChildReward(rewardId: string) {
  return api.request<{ redemption: ChildRedemption }>(`/api/child/rewards/${rewardId}/redeem`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function fetchChildRedemptions(scope?: 'parent') {
  const query = scope === 'parent' ? '?scope=parent' : '';
  return api.request<{ redemptions: ChildRedemption[] }>(`/api/child/redemptions${query}`);
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

export async function completeChildHomework(homeworkId: string) {
  return api.request<{ ok: boolean; homeworkId: string }>(`/api/child/homework/${homeworkId}/complete`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function fetchOwnerProperties(): Promise<{ properties: OwnerProperty[] }> {
  return api.request('/api/owner/properties', { method: 'GET' });
}

export async function createOwnerProperty(payload: {
  name: string;
  address?: Record<string, string>;
  unitCount?: number;
  vacantUnits?: number;
  notes?: string;
}) {
  return api.request<{ property: OwnerProperty }>('/api/owner/properties', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchChildProfiles(): Promise<{ profiles: Record<string, unknown>[] }> {
  return api.request('/api/child/profiles', { method: 'GET' });
}
