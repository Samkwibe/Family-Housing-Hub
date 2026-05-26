"""Upstash Redis client with graceful fallback when unavailable."""
from __future__ import annotations

import json
import os
import threading
import time
from typing import Any

from dotenv import load_dotenv

load_dotenv()

_redis_client = None
_redis_available: bool | None = None
_lock = threading.Lock()
_memory_store: dict[str, tuple[float, str]] = {}


def _redis_url() -> str | None:
    url = (os.getenv('REDIS_URL') or '').strip()
    return url or None


def _redis_connect_kwargs(url: str) -> dict:
    kwargs: dict = {'decode_responses': True, 'socket_connect_timeout': 5}
    if url.startswith('rediss://'):
        kwargs['ssl_cert_reqs'] = None
    return kwargs


def is_redis_available() -> bool:
    global _redis_available
    if _redis_available is not None:
        return _redis_available
    url = _redis_url()
    if not url:
        _redis_available = False
        return False
    try:
        import redis

        client = redis.from_url(url, **_redis_connect_kwargs(url))
        client.ping()
        global _redis_client
        _redis_client = client
        _redis_available = True
    except Exception:
        _redis_available = False
    return _redis_available


def get_redis():
    if not is_redis_available():
        return None
    return _redis_client


def cache_get(key: str) -> str | None:
    client = get_redis()
    if client:
        try:
            return client.get(key)
        except Exception:
            pass
    entry = _memory_store.get(key)
    if not entry:
        return None
    expires_at, value = entry
    if expires_at and time.time() > expires_at:
        _memory_store.pop(key, None)
        return None
    return value


def cache_get_json(key: str) -> Any | None:
    raw = cache_get(key)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def cache_set(key: str, value: str, ttl_seconds: int | None = None) -> bool:
    client = get_redis()
    if client:
        try:
            if ttl_seconds:
                client.setex(key, ttl_seconds, value)
            else:
                client.set(key, value)
            return True
        except Exception:
            pass
    expires_at = (time.time() + ttl_seconds) if ttl_seconds else 0
    _memory_store[key] = (expires_at, value)
    return True


def cache_set_json(key: str, value: Any, ttl_seconds: int | None = None) -> bool:
    return cache_set(key, json.dumps(value, default=str), ttl_seconds)


def cache_delete(key: str) -> None:
    client = get_redis()
    if client:
        try:
            client.delete(key)
        except Exception:
            pass
    _memory_store.pop(key, None)


def cache_incr(key: str, ttl_seconds: int | None = None) -> int:
    client = get_redis()
    if client:
        try:
            pipe = client.pipeline()
            pipe.incr(key)
            if ttl_seconds:
                pipe.expire(key, ttl_seconds, nx=True)
            results = pipe.execute()
            return int(results[0])
        except Exception:
            pass
    raw = cache_get(key)
    count = int(raw or 0) + 1
    cache_set(key, str(count), ttl_seconds)
    return count
