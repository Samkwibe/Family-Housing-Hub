"""Request logging to MongoDB request_logs collection."""
from __future__ import annotations

import threading
import time
from datetime import datetime, timezone

from flask import Flask, g, request

from auth_routes import get_current_user_doc
from database import get_db
from rate_limit_service import _client_ip


def _log_request_async(entry: dict) -> None:
    try:
        get_db().request_logs.insert_one(entry)
    except Exception as exc:
        print(f'request_log insert failed: {exc}')


def register_request_logging(app: Flask) -> None:
    @app.before_request
    def _start_timer():
        g._request_start = time.perf_counter()

    @app.after_request
    def _log_request(response):
        if request.path.startswith('/socket.io'):
            return response
        start = getattr(g, '_request_start', None)
        duration_ms = round((time.perf_counter() - start) * 1000, 2) if start else None
        user = get_current_user_doc()
        entry = {
            'timestamp': datetime.now(timezone.utc),
            'method': request.method,
            'path': request.path,
            'endpoint': request.endpoint,
            'userId': str(user['_id']) if user else None,
            'ip': _client_ip(request),
            'statusCode': response.status_code,
            'durationMs': duration_ms,
        }
        threading.Thread(target=_log_request_async, args=(entry,), daemon=True).start()
        if duration_ms is not None:
            response.headers['X-Response-Time-Ms'] = str(duration_ms)
        return response
