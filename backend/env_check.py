"""Production environment checks — used by /api/health (no secret values exposed)."""
from __future__ import annotations

import os
import re
from urllib.parse import unquote

from redis_service import is_redis_available

_UNENCODED_PASSWORD_CHARS = re.compile(r'[@!#$&]')


def _mongodb_uri_encoding_ok() -> tuple[bool, str | None]:
    uri = (os.getenv('MONGODB_URI') or '').strip()
    if not uri:
        return False, 'MONGODB_URI is not set'

    if not uri.startswith(('mongodb://', 'mongodb+srv://')):
        return False, 'MONGODB_URI must start with mongodb:// or mongodb+srv://'

    try:
        rest = uri.split('://', 1)[1]
        authority = rest.split('/')[0].split('?')[0]
        if '@' not in authority:
            return True, None
        creds = authority.rsplit('@', 1)[0]
        if ':' not in creds:
            return True, None
        password = creds.split(':', 1)[1]
        decoded = unquote(password)
        if _UNENCODED_PASSWORD_CHARS.search(decoded) and password == decoded:
            return False, (
                'Password contains unencoded special characters (@, !, etc.). '
                'Use URL encoding in MONGODB_URI (e.g. @ → %40, ! → %21).'
            )
    except Exception as exc:
        return False, f'Could not parse MONGODB_URI: {exc}'

    return True, None


def build_services_config_report() -> dict:
    """Boolean/config status for each integration — safe to expose on /api/health."""
    mongo_encoding_ok, mongo_encoding_issue = _mongodb_uri_encoding_ok()

    from database import ping_db

    mongo_connected = False
    if mongo_encoding_ok:
        try:
            mongo_connected = ping_db()
        except Exception:
            mongo_connected = False

    smtp_ok = bool(os.getenv('SMTP_USER') and os.getenv('SMTP_PASSWORD'))
    s3_ok = bool(
        os.getenv('S3_BUCKET_NAME')
        and os.getenv('S3_ACCESS_KEY_ID')
        and os.getenv('S3_SECRET_ACCESS_KEY')
    )
    fcm_ok = bool(os.getenv('FCM_SERVER_KEY') or os.getenv('FIREBASE_SERVER_KEY'))
    redis_ok = is_redis_available()

    ai_keys = {
        'openai': bool(os.getenv('OPENAI_API_KEY')),
        'gemini': bool(os.getenv('GEMINI_API_KEY')),
        'nvidia': bool(os.getenv('NVIDIA_API_KEY')),
    }
    maps_keys = {
        'google_maps': bool(os.getenv('GOOGLE_MAPS_API_KEY')),
        'mapbox': bool(os.getenv('MAPBOX_ACCESS_TOKEN')),
    }

    property_keys = {
        'estated': bool(os.getenv('ESTATED_API_KEY')),
        'rapidapi_realtor': bool(os.getenv('RAPIDAPI_KEY') or os.getenv('REALTOR_API_KEY')),
        'attom': bool(os.getenv('ATTOM_API_KEY')),
    }

    return {
        'mongodb': {
            'uriEncodingOk': mongo_encoding_ok,
            'connected': mongo_connected,
            'issue': mongo_encoding_issue,
        },
        'redis': {'configured': bool(os.getenv('REDIS_URL')), 'connected': redis_ok},
        'celery': {
            'brokerConfigured': bool(os.getenv('REDIS_URL')),
            'note': 'Requires family-housing-hub-worker service on Render',
        },
        'email': {'configured': smtp_ok},
        'sms': {
            'configured': bool(
                os.getenv('TWILIO_ACCOUNT_SID')
                and os.getenv('TWILIO_AUTH_TOKEN')
                and os.getenv('TWILIO_PHONE_NUMBER')
            )
        },
        'storage': {'configured': s3_ok},
        'push': {
            'configured': fcm_ok,
            'note': 'Set FCM_SERVER_KEY (Firebase Cloud Messaging legacy server key)',
        },
        'ai': ai_keys,
        'maps': maps_keys,
        'propertySearch': property_keys,
        'encryption': {'fieldKeyConfigured': bool(os.getenv('FIELD_ENCRYPTION_KEY'))},
    }
