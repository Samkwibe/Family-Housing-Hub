import { API_BASE_URL } from '@/src/config/env';

export type ClientMetricName =
  | 'celebration_render'
  | 'dashboard_hydration'
  | 'socket_reconnect'
  | 'celebration_delivered'
  | 'animation_queue_depth';

export type ClientMetric = {
  name: ClientMetricName | string;
  durationMs?: number;
  meta?: Record<string, unknown>;
};

const FLUSH_INTERVAL_MS = 8000;
const MAX_BATCH = 12;

let queue: ClientMetric[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectStartedAt: number | null = null;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushClientMetrics();
  }, FLUSH_INTERVAL_MS);
}

export function recordClientMetric(metric: ClientMetric) {
  queue.push(metric);
  if (queue.length >= MAX_BATCH) {
    void flushClientMetrics();
    return;
  }
  scheduleFlush();
}

export async function flushClientMetrics(): Promise<void> {
  if (!queue.length) return;
  const batch = queue.splice(0, MAX_BATCH);
  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  try {
    await fetch(`${baseUrl}/api/internal/observability/client-metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metrics: batch }),
    });
  } catch {
    queue.unshift(...batch);
    if (queue.length > MAX_BATCH * 3) {
      queue = queue.slice(-MAX_BATCH * 2);
    }
  }
}

export function trackDashboardHydration(durationMs: number, meta?: Record<string, unknown>) {
  recordClientMetric({ name: 'dashboard_hydration', durationMs, meta });
}

export function trackCelebrationRender(
  durationMs: number,
  meta?: { traceId?: string; type?: string; stage?: string }
) {
  recordClientMetric({ name: 'celebration_render', durationMs, meta });
}

export function trackCelebrationDelivered(meta?: { traceId?: string; type?: string }) {
  recordClientMetric({ name: 'celebration_delivered', durationMs: 0, meta });
}

export function trackAnimationQueueDepth(depth: number, meta?: Record<string, unknown>) {
  recordClientMetric({ name: 'animation_queue_depth', durationMs: depth, meta });
}

export function markSocketDisconnected() {
  reconnectStartedAt = Date.now();
}

export function trackSocketReconnect(meta?: Record<string, unknown>) {
  if (reconnectStartedAt == null) return;
  const durationMs = Date.now() - reconnectStartedAt;
  reconnectStartedAt = null;
  recordClientMetric({ name: 'socket_reconnect', durationMs, meta });
}
