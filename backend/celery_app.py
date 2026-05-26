"""Celery application — broker/result backend via Redis."""
from __future__ import annotations

import os

from celery import Celery
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = (os.getenv('REDIS_URL') or 'redis://localhost:6379/0').strip()
if REDIS_URL.startswith('rediss://') and 'ssl_cert_reqs' not in REDIS_URL:
    REDIS_URL = f"{REDIS_URL}{'&' if '?' in REDIS_URL else '?'}ssl_cert_reqs=CERT_NONE"

_USE_TLS = REDIS_URL.startswith('rediss://')
_SSL_OPTS = {'ssl_cert_reqs': None} if _USE_TLS else None

celery_app = Celery(
    'family_housing_hub',
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=['tasks'],
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    broker_connection_retry_on_startup=True,
    task_default_queue='default',
    broker_use_ssl=_SSL_OPTS,
    redis_backend_use_ssl=_SSL_OPTS,
)
