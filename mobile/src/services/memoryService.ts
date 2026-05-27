import api from './api';

export type FamilyMemory = {
  id: string;
  householdId?: string;
  childProfileId?: string | null;
  childName?: string | null;
  type: string;
  kind?: 'first' | 'milestone' | 'breakthrough' | 'anniversary';
  title: string;
  message: string;
  emoji: string;
  points?: number | null;
  occurredAt?: string;
  createdAt?: string;
  resurfaceReason?: string;
  yearsAgo?: number;
};

export type FamilyMemoryGroup = {
  month: string;
  memories: FamilyMemory[];
};

export type FamilyMemoriesResponse = {
  memories: FamilyMemory[];
  groups: FamilyMemoryGroup[];
  resurfaced: FamilyMemory[];
};

export async function fetchFamilyMemories(options?: {
  limit?: number;
  before?: string;
  childProfileId?: string;
  resurface?: boolean;
}) {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.before) params.set('before', options.before);
  if (options?.childProfileId) params.set('childProfileId', options.childProfileId);
  if (options?.resurface === false) params.set('resurface', 'false');
  const query = params.toString();
  return api.request<FamilyMemoriesResponse>(`/api/child/memories${query ? `?${query}` : ''}`);
}

export async function fetchResurfacedMemories(limit = 3) {
  return api.request<{ resurfaced: FamilyMemory[] }>(`/api/child/memories/resurface?limit=${limit}`);
}
