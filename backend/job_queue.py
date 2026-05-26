"""Enqueue Celery tasks with synchronous fallback when Redis/Celery unavailable."""
from __future__ import annotations

from typing import Any


def enqueue(task, *args, **kwargs) -> Any:
    try:
        from redis_service import is_redis_available

        if is_redis_available():
            return task.delay(*args, **kwargs)
    except Exception as exc:
        print(f'[job_queue] async enqueue failed, running sync: {exc}')
    return task(*args, **kwargs)
