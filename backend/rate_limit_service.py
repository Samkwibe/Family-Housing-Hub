"""Token-bucket rate limiting with Redis (in-memory fallback)."""
from __future__ import annotations

import os
import time
from typing import Callable

from flask import Request, jsonify

from redis_service import cache_get, cache_incr, cache_set, is_redis_available

GLOBAL_LIMIT = int(os.getenv('RATE_LIMIT_GLOBAL', '200'))
GLOBAL_WINDOW = 60

AUTH_LIMITS: dict[str, dict] = {
    '/api/auth/login': {'limit': 5, 'window': 900, 'lockout': 900, 'message': 'Too many login attempts. Try again in 15 minutes.'},
    '/api/auth/forgot-password': {'limit': 3, 'window': 3600, 'lockout': 3600, 'message': 'Too many password reset attempts. Try again later.'},
    '/api/auth/register': {'limit': 10, 'window': 3600, 'lockout': 3600, 'message': 'Too many registration attempts. Try again later.'},
}

_memory_counters: dict[str, tuple[int, float]] = {}


def _client_ip(req: Request) -> str:
    forwarded = (req.headers.get('X-Forwarded-For') or '').split(',')[0].strip()
    return forwarded or (req.remote_addr or 'unknown')


def _rate_key(prefix: str, ip: str) -> str:
    return f'ratelimit:{prefix}:{ip}'


def _check_limit(key: str, limit: int, window: int) -> tuple[bool, int, int]:
    count = cache_incr(key, window)
    remaining = max(0, limit - count)
    retry_after = window if count > limit else 0
    return count <= limit, remaining, retry_after


def _check_lockout(key: str) -> tuple[bool, int]:
    raw = cache_get(key)
    if not raw:
        return False, 0
    try:
        until = float(raw)
    except ValueError:
        return False, 0
    now = time.time()
    if now < until:
        return True, int(until - now)
    return False, 0


def _set_lockout(key: str, seconds: int) -> None:
    cache_set(key, str(time.time() + seconds), seconds)


def check_global_rate_limit(req: Request) -> tuple[bool, dict]:
    ip = _client_ip(req)
    key = _rate_key('global', ip)
    ok, remaining, retry_after = _check_limit(key, GLOBAL_LIMIT, GLOBAL_WINDOW)
    return ok, {'remaining': remaining, 'retryAfter': retry_after, 'limit': GLOBAL_LIMIT}


def check_auth_rate_limit(req: Request, path: str, *, increment: bool = False) -> tuple[bool, dict | None]:
    cfg = AUTH_LIMITS.get(path)
    if not cfg:
        return True, None

    ip = _client_ip(req)
    lock_key = _rate_key(f'lock:{path}', ip)
    locked, retry_after = _check_lockout(lock_key)
    if locked:
        return False, {
            'error': cfg['message'],
            'retryAfter': retry_after,
            'locked': True,
        }

    if not increment:
        return True, None

    count_key = _rate_key(f'auth:{path}', ip)
    ok, remaining, retry_after = _check_limit(count_key, cfg['limit'], cfg['window'])
    count = int(cache_get(count_key) or 0)

    if count >= cfg['limit']:
        _set_lockout(lock_key, cfg['lockout'])
        return False, {
            'error': cfg['message'],
            'retryAfter': cfg['lockout'],
            'locked': True,
        }

    if not ok:
        return False, {
            'error': cfg['message'],
            'retryAfter': retry_after,
            'locked': False,
        }

    return True, {'remaining': remaining}


def rate_limit_response(info: dict, status: int = 429):
    resp = jsonify({'error': info.get('error', 'Too many requests')})
    retry = info.get('retryAfter', 60)
    resp.status_code = status
    resp.headers['Retry-After'] = str(retry)
    return resp
