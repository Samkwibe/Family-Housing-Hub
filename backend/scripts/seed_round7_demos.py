#!/usr/bin/env python3
"""Round 7 infrastructure demos — WebSocket, cache, rate limit, encryption."""
from __future__ import annotations

import os
import sys
import time

import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE = os.getenv('DEMO_API_URL', 'http://127.0.0.1:8000')
EMAIL = os.getenv('DEMO_EMAIL', 'demo@familyhub.test')
PASSWORD = os.getenv('DEMO_PASSWORD', 'demo1234')


def login() -> str:
    r = requests.post(f'{BASE}/api/auth/login', json={'identifier': EMAIL, 'password': PASSWORD}, timeout=15)
    r.raise_for_status()
    return r.json()['token']


def demo_dashboard_cache(token: str):
    headers = {'Authorization': f'Bearer {token}'}
    print('\n=== #25 Dashboard cache ===')
    t0 = time.perf_counter()
    r1 = requests.get(f'{BASE}/api/household/dashboard', headers=headers, timeout=30)
    ms1 = (time.perf_counter() - t0) * 1000
    cache1 = r1.headers.get('X-Cache', '?')
    print(f'  First load:  {ms1:.0f}ms  X-Cache={cache1}')

    t0 = time.perf_counter()
    r2 = requests.get(f'{BASE}/api/household/dashboard', headers=headers, timeout=30)
    ms2 = (time.perf_counter() - t0) * 1000
    cache2 = r2.headers.get('X-Cache', '?')
    print(f'  Cached load: {ms2:.0f}ms  X-Cache={cache2}')

    inv = requests.post(
        f'{BASE}/api/household/inventory',
        headers=headers,
        json={'name': 'Cache invalidation test', 'location': 'fridge', 'expiresInDays': 3},
        timeout=15,
    )
    inv.raise_for_status()
    t0 = time.perf_counter()
    r3 = requests.get(f'{BASE}/api/household/dashboard', headers=headers, timeout=30)
    ms3 = (time.perf_counter() - t0) * 1000
    print(f'  After fridge add: {ms3:.0f}ms  X-Cache={r3.headers.get("X-Cache", "?")} (should be MISS)')


def demo_rate_limit():
    print('\n=== #27 Rate limit (login brute-force) ===')
    for i in range(1, 7):
        r = requests.post(
            f'{BASE}/api/auth/login',
            json={'identifier': 'wrong@example.com', 'password': 'badpassword'},
            timeout=10,
        )
        retry = r.headers.get('Retry-After', '-')
        print(f'  Attempt {i}: {r.status_code} — {r.json().get("error", "")} Retry-After={retry}')


def demo_forgot_password_speed():
    print('\n=== #26 Celery email (forgot-password speed) ===')
    t0 = time.perf_counter()
    r = requests.post(f'{BASE}/api/auth/forgot-password', json={'email': EMAIL}, timeout=10)
    ms = (time.perf_counter() - t0) * 1000
    print(f'  POST /forgot-password: {r.status_code} in {ms:.0f}ms (target <100ms)')
    print(f'  Response: {r.json()}')


def demo_encryption(token: str):
    print('\n=== #29 Encryption at rest ===')
    headers = {'Authorization': f'Bearer {token}'}
    r = requests.post(
        f'{BASE}/api/household/health/records',
        headers=headers,
        json={'title': 'Annual checkup', 'type': 'appointment', 'notes': 'Blood pressure normal'},
        timeout=15,
    )
    if r.status_code == 404:
        print('  Health route unavailable — skip')
        return
    if r.status_code >= 400:
        print(f'  Health record create: {r.status_code} {r.text[:200]}')
        return
    record_id = r.json().get('record', {}).get('id')
    print(f'  Created health record {record_id} via API (plaintext in response)')

    from bson import ObjectId
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
    from database import get_db
    from encryption_service import is_encrypted

    if record_id:
        raw = get_db().health_records.find_one({'_id': ObjectId(record_id)})
        notes = raw.get('notes', '') if raw else ''
        print(f'  Raw MongoDB notes encrypted: {is_encrypted(notes)}')


def main():
    print(f'Round 7 demos → {BASE}')
    try:
        token = login()
        print('Logged in OK')
    except Exception as exc:
        print(f'Login failed ({exc}) — run seed or set DEMO_EMAIL/DEMO_PASSWORD')
        token = None

    if token:
        demo_dashboard_cache(token)
        demo_forgot_password_speed()
        demo_encryption(token)
    demo_rate_limit()
    print('\nDone. Start Celery worker: cd backend && celery -A celery_app worker --loglevel=info')
    print('WebSocket: connect with JWT token via Socket.IO auth handshake')


if __name__ == '__main__':
    main()
