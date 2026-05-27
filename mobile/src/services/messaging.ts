import api from './api';
import { connectRealtime } from './realtimeService';

export type ChatMessage = {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: string;
};

export type MessageGroup = {
  id: string;
  name: string;
  memberIds: string[];
  lastMessageAt?: string | null;
  lastMessagePreview?: string;
};

export async function listUserGroups(_userId: string): Promise<MessageGroup[]> {
  const res = await api.request<{ groups: MessageGroup[] }>('/api/messages/groups', {
    method: 'GET',
  });
  return res.groups || [];
}

export async function createGroup(name: string, memberIds: string[] = []): Promise<MessageGroup> {
  const res = await api.request<{ group: MessageGroup }>('/api/messages/groups', {
    method: 'POST',
    body: JSON.stringify({ name, memberIds }),
  });
  return res.group;
}

export async function getGroupMessages(groupId: string, since?: string): Promise<ChatMessage[]> {
  const qs = since ? `?since=${encodeURIComponent(since)}` : '';
  const res = await api.request<{ messages: ChatMessage[] }>(
    `/api/messages/groups/${groupId}/messages${qs}`,
    { method: 'GET' }
  );
  return res.messages || [];
}

export async function sendGroupMessage(payload: {
  groupId: string;
  senderId: string;
  senderName?: string;
  message: string;
}): Promise<ChatMessage> {
  const res = await api.request<{ message: ChatMessage }>(
    `/api/messages/groups/${payload.groupId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({
        message: payload.message,
        senderName: payload.senderName,
      }),
    }
  );
  return res.message;
}

/** Real-time group chat via WebSocket (fallback: initial fetch only). */
export function listenToGroupChat(
  groupId: string,
  onUpdate: (messages: ChatMessage[]) => void
): () => void {
  let cancelled = false;
  let messages: ChatMessage[] = [];
  let cleanupRealtime: (() => void) | undefined;

  const mergeMessage = (msg: ChatMessage) => {
    if (msg.groupId !== groupId) return;
    const exists = messages.some((m) => m.id === msg.id);
    if (!exists) {
      messages = [...messages, msg].sort(
        (a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')
      );
      onUpdate(messages);
    }
  };

  const bootstrap = async () => {
    try {
      messages = await getGroupMessages(groupId);
      if (!cancelled) onUpdate(messages);
    } catch {
      // keep empty on bootstrap failure
    }
  };

  bootstrap();

  connectRealtime({
    onMessage: (msg) => {
      if (!cancelled) mergeMessage(msg);
    },
    onReconnect: () => {
      if (!cancelled) bootstrap();
    },
  }).then((cleanup) => {
    if (cancelled) cleanup();
    else cleanupRealtime = cleanup;
  });

  return () => {
    cancelled = true;
    cleanupRealtime?.();
  };
}
