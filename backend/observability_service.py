"""Observability for emotional infrastructure — structured tracing, metrics, budgets."""
from __future__ import annotations

import os
import threading
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from typing import Any

# Performance budgets (ms) — protect perceived emotional responsiveness
PERFORMANCE_BUDGETS_MS = {
    'celebration_emit': 150,
    'celebration_delivery': 500,
    'celebration_render': 800,
    'socket_reconnect': 3000,
    'dashboard_hydration': 2000,
    'ai_insight_generation': 4000,
    'celery_recurring_chores': 30000,
}

SEVERITY_LEVELS = (
    'info',
    'degraded',
    'duplicate_prevented',
    'delayed_milestone',
    'ai_fallback',
    'stale_dashboard',
    'emotional_critical',
)

_lock = threading.Lock()
_timeline: deque[dict] = deque(maxlen=500)
_counters: dict[str, int] = {}
_timings: dict[str, list[float]] = {}
_dedupe_keys: dict[str, float] = {}
_socket_stats = {
    'connects': 0,
    'disconnects': 0,
    'join_failures': 0,
    'active_connections': 0,
    'events_emitted': 0,
    'events_by_room': {},
}


def generate_trace_id() -> str:
    return uuid.uuid4().hex[:16]


def portal_snapshot(
    *,
    household_id: str | None = None,
    property_id: str | None = None,
    child_profile_id: str | None = None,
    user_id: str | None = None,
    portal: str | None = None,
    capabilities: list[str] | None = None,
) -> dict[str, Any]:
    return {
        k: v for k, v in {
            'householdId': household_id,
            'propertyId': property_id,
            'childProfileId': child_profile_id,
            'userId': user_id,
            'portal': portal,
            'capabilities': capabilities,
        }.items() if v is not None
    }


def increment_counter(name: str, amount: int = 1, labels: dict | None = None) -> None:
    key = name if not labels else f"{name}:{','.join(f'{k}={v}' for k, v in sorted(labels.items()))}"
    with _lock:
        _counters[key] = _counters.get(key, 0) + amount


def record_timing(category: str, duration_ms: float, meta: dict | None = None) -> bool:
    """Record timing; returns True if within budget."""
    budget = PERFORMANCE_BUDGETS_MS.get(category)
    within = budget is None or duration_ms <= budget
    with _lock:
        bucket = _timings.setdefault(category, [])
        bucket.append(duration_ms)
        if len(bucket) > 200:
            _timings[category] = bucket[-200:]
    trace_event(
        'performance',
        'timing_recorded',
        {
            'category': category,
            'durationMs': round(duration_ms, 2),
            'withinBudget': within,
            'budgetMs': budget,
            **(meta or {}),
        },
        severity='degraded' if not within else 'info',
    )
    if not within:
        increment_counter('budget_exceeded', labels={'category': category})
    return within


def should_dedupe(dedupe_key: str, window_seconds: float = 3.0) -> bool:
    """Return True if event should be suppressed (duplicate within window)."""
    now = time.time()
    with _lock:
        last = _dedupe_keys.get(dedupe_key)
        if last and (now - last) < window_seconds:
            increment_counter('celebration_dedupe_prevented')
            trace_event(
                'celebration',
                'dedupe_prevented',
                {'dedupeKey': dedupe_key, 'windowSeconds': window_seconds},
                severity='duplicate_prevented',
            )
            return True
        _dedupe_keys[dedupe_key] = now
        if len(_dedupe_keys) > 1000:
            cutoff = now - 60
            for k in list(_dedupe_keys.keys()):
                if _dedupe_keys[k] < cutoff:
                    _dedupe_keys.pop(k, None)
    return False


def trace_event(
    domain: str,
    stage: str,
    payload: dict | None = None,
    *,
    severity: str = 'info',
    trace_id: str | None = None,
    portal_context: dict | None = None,
) -> str:
    tid = trace_id or generate_trace_id()
    entry = {
        'traceId': tid,
        'domain': domain,
        'stage': stage,
        'severity': severity if severity in SEVERITY_LEVELS else 'info',
        'ts': time.time(),
        'iso': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'payload': payload or {},
        'portalContext': portal_context or {},
    }
    with _lock:
        _timeline.append(entry)
    if severity in ('emotional_critical', 'degraded', 'delayed_milestone', 'ai_fallback'):
        increment_counter(f'severity_{severity}', labels={'domain': domain, 'stage': stage})
    if os.getenv('OBSERVABILITY_VERBOSE', '').lower() in ('1', 'true', 'yes'):
        print(f'[obs] {domain}.{stage} trace={tid} severity={severity} {payload or {}}')
    return tid


def trace_celebration(
    stage: str,
    *,
    event_type: str,
    trace_id: str | None = None,
    household_id: str | None = None,
    child_profile_id: str | None = None,
    child_user_id: str | None = None,
    priority: str | None = None,
    duration_ms: float | None = None,
    severity: str = 'info',
    extra: dict | None = None,
) -> str:
    payload = {
        'eventType': event_type,
        'priority': priority,
        'durationMs': duration_ms,
        **(extra or {}),
    }
    increment_counter('celebration_events', labels={'stage': stage, 'type': event_type})
    return trace_event(
        'celebration',
        stage,
        payload,
        severity=severity,
        trace_id=trace_id,
        portal_context=portal_snapshot(
            household_id=household_id,
            child_profile_id=child_profile_id,
            user_id=child_user_id,
        ),
    )


def trace_ai(
    path: str,
    *,
    duration_ms: float,
    success: bool,
    provider: str | None = None,
    fallback: bool = False,
    household_id: str | None = None,
    reason: str | None = None,
) -> None:
    increment_counter('ai_requests', labels={'path': path, 'provider': provider or 'unknown'})
    if fallback:
        increment_counter('ai_fallback', labels={'path': path})
    record_timing('ai_insight_generation', duration_ms, {'path': path, 'provider': provider})
    trace_event(
        'ai',
        'generation_complete' if success else 'generation_failed',
        {
            'path': path,
            'provider': provider,
            'fallback': fallback,
            'durationMs': round(duration_ms, 2),
            'reason': reason,
        },
        severity='ai_fallback' if fallback else ('degraded' if not success else 'info'),
        portal_context=portal_snapshot(household_id=household_id),
    )


def trace_celery_task(task_name: str, *, duration_ms: float, success: bool, result: dict | None = None) -> None:
    increment_counter('celery_tasks', labels={'task': task_name, 'success': str(success)})
    budget_key = 'celery_recurring_chores' if 'recurring' in task_name else None
    if budget_key:
        record_timing(budget_key, duration_ms, {'task': task_name})
    trace_event(
        'celery',
        'task_complete' if success else 'task_failed',
        {'task': task_name, 'durationMs': round(duration_ms, 2), 'result': result or {}},
        severity='degraded' if not success else 'info',
    )


def record_socket_connect(user_id: str, household_id: str, joined_rooms: list[str]) -> None:
    with _lock:
        _socket_stats['connects'] += 1
        _socket_stats['active_connections'] += 1
    trace_event(
        'socket',
        'client_connected',
        {'userId': user_id, 'rooms': joined_rooms},
        portal_context=portal_snapshot(household_id=household_id, user_id=user_id),
    )


def record_socket_disconnect(user_id: str | None) -> None:
    with _lock:
        _socket_stats['disconnects'] += 1
        _socket_stats['active_connections'] = max(0, _socket_stats['active_connections'] - 1)


def record_socket_emit(event: str, rooms: list[str], duration_ms: float) -> None:
    with _lock:
        _socket_stats['events_emitted'] += 1
        for room in rooms:
            _socket_stats['events_by_room'][room] = _socket_stats['events_by_room'].get(room, 0) + 1
    record_timing('celebration_delivery', duration_ms, {'event': event, 'rooms': rooms})


def record_client_metric(metric: dict) -> None:
    """Ingest mobile-render / hydration metrics."""
    name = metric.get('name', 'unknown')
    duration = float(metric.get('durationMs') or 0)
    increment_counter('client_metrics', labels={'name': name})
    if duration > 0:
        category = {
            'celebration_render': 'celebration_render',
            'dashboard_hydration': 'dashboard_hydration',
            'socket_reconnect': 'socket_reconnect',
        }.get(name, name)
        if category in PERFORMANCE_BUDGETS_MS:
            record_timing(category, duration, metric.get('meta') or {})


def get_timeline(limit: int = 100, domain: str | None = None, severity: str | None = None) -> list[dict]:
    with _lock:
        items = list(_timeline)
    if domain:
        items = [i for i in items if i.get('domain') == domain]
    if severity:
        items = [i for i in items if i.get('severity') == severity]
    return list(reversed(items[-limit:]))


def get_snapshot() -> dict:
    with _lock:
        counters = dict(_counters)
        socket_stats = dict(_socket_stats)
        socket_stats['events_by_room'] = dict(_socket_stats['events_by_room'])
        timings_snapshot = {
            k: {
                'count': len(v),
                'p50': _percentile(v, 50),
                'p95': _percentile(v, 95),
                'max': max(v) if v else 0,
                'budgetMs': PERFORMANCE_BUDGETS_MS.get(k),
            }
            for k, v in _timings.items()
        }
        recent = list(_timeline)[-20:]

    return {
        'counters': counters,
        'socket': socket_stats,
        'timings': timings_snapshot,
        'budgets': PERFORMANCE_BUDGETS_MS,
        'recentEvents': recent,
        'timelineSize': len(_timeline),
    }


def _percentile(values: list[float], pct: int) -> float:
    if not values:
        return 0.0
    sorted_v = sorted(values)
    idx = int(len(sorted_v) * pct / 100)
    idx = min(idx, len(sorted_v) - 1)
    return round(sorted_v[idx], 2)


def observability_enabled() -> bool:
    return os.getenv('OBSERVABILITY_ENABLED', 'true').lower() in ('1', 'true', 'yes')


def verify_internal_access(provided_key: str | None) -> bool:
    expected = (os.getenv('OBSERVABILITY_INTERNAL_KEY') or '').strip()
    if os.getenv('FLASK_ENV', 'development') == 'development' and not expected:
        return True
    return bool(expected and provided_key == expected)
