"""Dashboard response cache — portal-scoped keys with legacy household support."""
from __future__ import annotations

import json
import time
from typing import Any

from redis_service import cache_delete, cache_get, cache_set

DASHBOARD_TTL_SECONDS = 60
_LEGACY_PREFIX = 'dashboard:'
_PORTAL_PREFIX = 'dashboard:'


def dashboard_cache_key(household_id: str) -> str:
    """Legacy renter cache key — kept for backward compatibility."""
    return f'{_LEGACY_PREFIX}{household_id}'


def portal_dashboard_cache_key(portal: str, scope_id: str) -> str:
    """Portal-scoped cache key: dashboard:renter:{householdId}, etc."""
    return f'{_PORTAL_PREFIX}{portal}:{scope_id}'


def get_cached_dashboard(household_id: str) -> tuple[dict | None, dict | None]:
    """Legacy getter — checks portal renter key then legacy key."""
    payload, meta = get_cached_portal_dashboard('renter', household_id)
    if payload:
        return payload, meta
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
    """Legacy setter — writes both portal renter key and legacy key."""
    set_cached_portal_dashboard('renter', household_id, payload)


def get_cached_portal_dashboard(portal: str, scope_id: str) -> tuple[dict | None, dict | None]:
    if not scope_id:
        return None, {'cacheHit': False}
    key = portal_dashboard_cache_key(portal, scope_id)
    raw = cache_get(key)
    if not raw:
        return None, {'cacheHit': False}
    try:
        payload = json.loads(raw)
        return payload, {'cacheHit': True, 'cachedAt': payload.get('_cachedAt')}
    except json.JSONDecodeError:
        cache_delete(key)
        return None, {'cacheHit': False}


def set_cached_portal_dashboard(portal: str, scope_id: str, payload: dict) -> None:
    if not scope_id:
        return
    enriched = {**payload, '_cachedAt': time.time()}
    cache_set(
        portal_dashboard_cache_key(portal, scope_id),
        json.dumps(enriched, default=str),
        DASHBOARD_TTL_SECONDS,
    )
    if portal == 'renter':
        cache_set(
            dashboard_cache_key(scope_id),
            json.dumps(enriched, default=str),
            DASHBOARD_TTL_SECONDS,
        )


def invalidate_dashboard_cache(household_id: str) -> None:
    if household_id:
        cache_delete(dashboard_cache_key(household_id))
        cache_delete(portal_dashboard_cache_key('renter', household_id))


def invalidate_portal_dashboard_cache(portal: str, scope_id: str) -> None:
    if scope_id:
        cache_delete(portal_dashboard_cache_key(portal, scope_id))
    if portal == 'renter' and scope_id:
        cache_delete(dashboard_cache_key(scope_id))
