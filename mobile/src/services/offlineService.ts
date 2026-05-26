import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import type { EmergencyProfile } from './householdService';

const OFFLINE_PREFIX = 'fhh_offline_';
const QUEUE_KEY = `${OFFLINE_PREFIX}write_queue`;

export type OfflineDashboardCache = {
  snapshot: unknown;
  alerts: unknown[];
  chores: unknown[];
  shoppingList: unknown[];
  emergencyProfile: EmergencyProfile;
  cachedAt: number;
};

export type OfflineWriteAction =
  | { type: 'chore_complete'; choreId: string; completed: boolean }
  | { type: 'shopping_add'; name: string };

type QueueEntry = OfflineWriteAction & { id: string; createdAt: number };

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

export function subscribeNetworkStatus(onChange: (online: boolean) => void): () => void {
  return NetInfo.addEventListener((state) => {
    onChange(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
}

export async function cacheDashboardOffline(data: OfflineDashboardCache): Promise<void> {
  await AsyncStorage.setItem(`${OFFLINE_PREFIX}dashboard`, JSON.stringify(data));
}

export async function loadDashboardOffline(): Promise<OfflineDashboardCache | null> {
  try {
    const raw = await AsyncStorage.getItem(`${OFFLINE_PREFIX}dashboard`);
    return raw ? (JSON.parse(raw) as OfflineDashboardCache) : null;
  } catch {
    return null;
  }
}

export async function cacheEmergencyProfile(profile: EmergencyProfile): Promise<void> {
  await AsyncStorage.setItem(`${OFFLINE_PREFIX}emergency`, JSON.stringify(profile));
}

export async function loadEmergencyProfileOffline(): Promise<EmergencyProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(`${OFFLINE_PREFIX}emergency`);
    return raw ? (JSON.parse(raw) as EmergencyProfile) : null;
  } catch {
    return null;
  }
}

async function readQueue(): Promise<QueueEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueueEntry[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(entries: QueueEntry[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
}

export async function enqueueOfflineWrite(action: OfflineWriteAction): Promise<void> {
  const queue = await readQueue();
  queue.push({
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  });
  await writeQueue(queue);
}

export async function flushOfflineQueue(
  handlers: {
    completeChore: (choreId: string, completed: boolean) => Promise<void>;
    addShoppingItem: (name: string) => Promise<void>;
  }
): Promise<number> {
  const queue = await readQueue();
  if (!queue.length) return 0;

  const remaining: QueueEntry[] = [];
  let synced = 0;
  for (const entry of queue) {
    try {
      if (entry.type === 'chore_complete') {
        await handlers.completeChore(entry.choreId, entry.completed);
      } else if (entry.type === 'shopping_add') {
        await handlers.addShoppingItem(entry.name);
      }
      synced += 1;
    } catch {
      remaining.push(entry);
    }
  }
  await writeQueue(remaining);
  return synced;
}
