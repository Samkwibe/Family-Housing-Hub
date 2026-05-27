"""Push notifications via Firebase Cloud Messaging (Expo + native device tokens)."""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any

from database import get_db


def _fcm_server_key() -> str | None:
    return (os.getenv('FCM_SERVER_KEY') or os.getenv('FIREBASE_SERVER_KEY') or '').strip() or None


def register_push_token(user_id: str, token: str, platform: str = 'unknown') -> None:
    if not user_id or not token:
        return
    db = get_db()
    db.push_tokens.update_one(
        {'userId': user_id, 'token': token},
        {
            '$set': {
                'userId': user_id,
                'token': token,
                'platform': platform,
                'updatedAt': datetime.now(timezone.utc).isoformat(),
            },
            '$setOnInsert': {'createdAt': datetime.now(timezone.utc).isoformat()},
        },
        upsert=True,
    )


def get_user_push_tokens(user_id: str) -> list[str]:
    db = get_db()
    docs = list(db.push_tokens.find({'userId': user_id}, {'token': 1}))
    return [d['token'] for d in docs if d.get('token')]


def send_push_to_tokens(tokens: list[str], title: str, body: str, data: dict | None = None) -> dict:
    if not tokens:
        return {'ok': True, 'sent': 0, 'skipped': 'no tokens'}

    # Segment tokens into Expo push tokens and native FCM tokens
    expo_tokens = [t for t in tokens if t.startswith('ExponentPushToken') or t.startswith('ExpoPushToken')]
    fcm_tokens = [t for t in tokens if t not in expo_tokens]

    results = {
        'ok': True,
        'sent': 0,
        'failure': 0,
        'expo_results': None,
        'fcm_results': None,
    }

    # 1. Deliver to Expo tokens via Expo's push gateway
    if expo_tokens:
        expo_payload = []
        for t in expo_tokens:
            msg = {
                'to': t,
                'title': title,
                'body': body,
                'sound': 'default',
            }
            if data:
                msg['data'] = {k: str(v) for k, v in data.items()}
            expo_payload.append(msg)

        req = urllib.request.Request(
            'https://exp.host/--/api/v2/push/send',
            data=json.dumps(expo_payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
            },
            method='POST',
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                expo_result = json.loads(resp.read().decode('utf-8'))
                # Expo response format: {"data": [{"status": "ok", "id": "..."}]}
                data_list = expo_result.get('data') or []
                success_count = sum(1 for item in data_list if item.get('status') == 'ok')
                fail_count = len(data_list) - success_count
                print(f'[push] Expo sent title={title!r} success={success_count} failure={fail_count}')
                results['sent'] += success_count
                results['failure'] += fail_count
                results['expo_results'] = expo_result
        except Exception as exc:
            print(f'[push] Expo gateway error: {exc}')
            results['ok'] = False
            results['error_expo'] = str(exc)

    # 2. Deliver to native FCM tokens via FCM gateway
    if fcm_tokens:
        key = _fcm_server_key()
        if not key:
            print(f'[push] FCM delivery skipped (no FCM_SERVER_KEY) for fcm_tokens: {len(fcm_tokens)}')
            results['skipped_fcm'] = len(fcm_tokens)
        else:
            fcm_payload: dict[str, Any] = {
                'registration_ids': fcm_tokens[:500],
                'notification': {'title': title, 'body': body, 'sound': 'default'},
                'priority': 'high',
            }
            if data:
                fcm_payload['data'] = {k: str(v) for k, v in data.items()}

            req = urllib.request.Request(
                'https://fcm.googleapis.com/fcm/send',
                data=json.dumps(fcm_payload).encode('utf-8'),
                headers={
                    'Authorization': f'key={key}',
                    'Content-Type': 'application/json',
                },
                method='POST',
            )
            try:
                with urllib.request.urlopen(req, timeout=15) as resp:
                    fcm_result = json.loads(resp.read().decode('utf-8'))
                    success = int(fcm_result.get('success', 0))
                    failure = int(fcm_result.get('failure', 0))
                    print(f'[push] FCM sent title={title!r} success={success} failure={failure}')
                    results['sent'] += success
                    results['failure'] += failure
                    results['fcm_results'] = fcm_result
            except urllib.error.HTTPError as exc:
                err_body = exc.read().decode('utf-8', errors='replace')
                print(f'[push] FCM HTTP {exc.code}: {err_body[:200]}')
                results['ok'] = False
                results['error_fcm'] = f'FCM HTTP {exc.code}'
            except Exception as exc:
                print(f'[push] FCM error: {exc}')
                results['ok'] = False
                results['error_fcm'] = str(exc)


def send_push_to_user(user_id: str, title: str, body: str, data: dict | None = None) -> dict:
    tokens = get_user_push_tokens(user_id)
    return send_push_to_tokens(tokens, title, body, data)
