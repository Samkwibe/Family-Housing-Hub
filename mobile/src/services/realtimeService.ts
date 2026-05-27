import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/env';
import { getToken } from './tokenStorage';
import { markSocketDisconnected, trackSocketReconnect } from './observabilityService';
import type { ChatMessage } from './messaging';
import type { RealtimeCelebrationPayload } from '@/src/portals/child/celebrationEvents';

export type HouseholdUpdateEvent = {
  entity: string;
  payload?: Record<string, unknown>;
  ts?: number;
};

export type FamilyActivityEvent = {
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

export type RealtimeHandlers = {
  onMessage?: (message: ChatMessage) => void;
  onHouseholdUpdated?: (event: HouseholdUpdateEvent) => void;
  onNotification?: (notification: Record<string, unknown>) => void;
  onFamilyCelebration?: (event: RealtimeCelebrationPayload) => void;
  onFamilyActivity?: (event: FamilyActivityEvent) => void;
  onReconnect?: () => void;
};

let socket: Socket | null = null;
let connectPromise: Promise<void> | null = null;
const subscribers = new Set<RealtimeHandlers>();

function dispatch<K extends keyof RealtimeHandlers>(key: K, arg: Parameters<NonNullable<RealtimeHandlers[K]>>[0]) {
  subscribers.forEach((handlers) => {
    const fn = handlers[key] as ((value: typeof arg) => void) | undefined;
    if (fn) {
      try {
        fn(arg);
      } catch {
        // ignore subscriber errors
      }
    }
  });
}

async function ensureSocketConnected(): Promise<void> {
  if (socket?.connected) return;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const token = await getToken();
    if (!token) return;

    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }

    socket = io(API_BASE_URL.replace(/\/$/, ''), {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('new_message', (data: { message?: ChatMessage }) => {
      if (data?.message) dispatch('onMessage', data.message);
    });

    socket.on('household_updated', (data: HouseholdUpdateEvent) => {
      dispatch('onHouseholdUpdated', data);
    });

    socket.on('notification', (data: Record<string, unknown>) => {
      dispatch('onNotification', data);
    });

    socket.on('family_celebration', (data: RealtimeCelebrationPayload) => {
      dispatch('onFamilyCelebration', data);
    });

    socket.on('family_activity', (data: FamilyActivityEvent) => {
      dispatch('onFamilyActivity', data);
    });

    socket.io.on('reconnect', () => {
      trackSocketReconnect();
      dispatch('onReconnect', undefined as never);
    });

    socket.on('disconnect', () => {
      markSocketDisconnected();
    });
  })().finally(() => {
    connectPromise = null;
  });

  return connectPromise;
}

/** Subscribe to realtime events — shared socket, multiple listeners. */
export async function subscribeRealtime(handlers: RealtimeHandlers): Promise<() => void> {
  subscribers.add(handlers);
  await ensureSocketConnected();
  return () => {
    subscribers.delete(handlers);
  };
}

/** @deprecated prefer subscribeRealtime */
export async function connectRealtime(handlers: RealtimeHandlers): Promise<() => void> {
  return subscribeRealtime(handlers);
}

export function isRealtimeConnected(): boolean {
  return Boolean(socket?.connected);
}

export type CelebrationAckStage = 'delivered' | 'rendered' | 'animation_completed';

export function emitCelebrationAck(payload: {
  traceId?: string;
  type: string;
  stage: CelebrationAckStage;
  durationMs?: number;
}) {
  if (!socket?.connected) return;
  socket.emit('celebration_ack', payload);
}
