"""Dashboard response cache (60s TTL) with invalidation on household writes."""
from __future__ import annotations

import json
import time
from typing import Any

from redis_service import cache_delete, cache_get, cache_set

DASHBOARD_TTL_SECONDS = 60
_PREFIX = 'dashboard:'


def dashboard_cache_key(household_id: str) -> str:
    return f'{_PREFIX}{household_id}'


def get_cached_dashboard(household_id: str) -> tuple[dict | None, dict | None]:
    """Return (payload, meta) where meta includes cacheHit and timing hints."""
    key = dashboard_cache_key(household_id)
    raw = cache_get(key)
    if not raw:
        return None, {'cacheHit': False}
    try:
        payload = json.loads(raw)
        return payload, {'cacheHit': True, 'cachedAt': payload.get('_cachedAt')}
    except json.JSONDecodeError:
        cache_delete(key)
        return None, {'cacheHit': False}


def set_cached_dashboard(household_id: str, payload: dict) -> None:
    enriched = {**payload, '_cachedAt': time.time()}
    cache_set(
        dashboard_cache_key(household_id),
        json.dumps(enriched, default=str),
        DASHBOARD_TTL_SECONDS,
    )


def invalidate_dashboard_cache(household_id: str) -> None:
    if household_id:
        cache_delete(dashboard_cache_key(household_id))
