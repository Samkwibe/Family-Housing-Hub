import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/env';
import { getToken } from './tokenStorage';
import type { ChatMessage } from './messaging';

export type HouseholdUpdateEvent = {
  entity: string;
  payload?: Record<string, unknown>;
  ts?: number;
};

export type RealtimeHandlers = {
  onMessage?: (message: ChatMessage) => void;
  onHouseholdUpdated?: (event: HouseholdUpdateEvent) => void;
  onNotification?: (notification: Record<string, unknown>) => void;
  onReconnect?: () => void;
};

let socket: Socket | null = null;

export async function connectRealtime(handlers: RealtimeHandlers): Promise<() => void> {
  const token = await getToken();
  if (!token) return () => {};

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
    if (data?.message) handlers.onMessage?.(data.message);
  });

  socket.on('household_updated', (data: HouseholdUpdateEvent) => {
    handlers.onHouseholdUpdated?.(data);
  });

  socket.on('notification', (data: Record<string, unknown>) => {
    handlers.onNotification?.(data);
  });

  socket.io.on('reconnect', () => {
    handlers.onReconnect?.();
  });

  return () => {
    socket?.removeAllListeners();
    socket?.disconnect();
    socket = null;
  };
}

export function isRealtimeConnected(): boolean {
  return Boolean(socket?.connected);
}
