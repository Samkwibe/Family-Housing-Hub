"""Login anomaly detection using isolation forest on session features."""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone

try:
    import numpy as np
    from sklearn.ensemble import IsolationForest
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False


def _utcnow():
    return datetime.now(timezone.utc)


def device_hash(user_agent: str, device_id: str = '') -> str:
    raw = f"{user_agent or 'unknown'}|{device_id or ''}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def build_login_features(
    *,
    device_hash_val: str,
    city: str,
    country: str,
    hour: int,
    weekday: int,
    history: list[dict],
) -> dict:
    known_devices = {h.get('deviceHash') for h in history}
    known_cities = {h.get('city') for h in history if h.get('city')}
    return {
        'deviceHash': device_hash_val,
        'city': city or 'unknown',
        'country': country or 'unknown',
        'hour': hour,
        'weekday': weekday,
        'isNewDevice': device_hash_val not in known_devices,
        'isNewCity': bool(city and city not in known_cities),
    }


def _feature_vector(feat: dict) -> list[float]:
    return [
        1.0 if feat.get('isNewDevice') else 0.0,
        1.0 if feat.get('isNewCity') else 0.0,
        float(feat.get('hour', 12)) / 24.0,
        float(feat.get('weekday', 0)) / 7.0,
    ]


def assess_login_risk(user_id: str, feat: dict, history: list[dict]) -> dict:
    """Return riskLevel low|medium|high, score, message, block."""
    if len(history) < 5:
        if feat.get('isNewDevice') and feat.get('isNewCity'):
            return {
                'riskLevel': 'medium',
                'score': 0.6,
                'block': False,
                'message': f"New login detected from {feat.get('city', 'unknown location')} on a new device",
            }
        return {'riskLevel': 'low', 'score': 0.1, 'block': False, 'message': None}

    matrix = [_feature_vector({
        'isNewDevice': h.get('deviceHash') != feat.get('deviceHash'),
        'isNewCity': h.get('city') != feat.get('city'),
        'hour': h.get('hour', 12),
        'weekday': h.get('weekday', 0),
    }) for h in history[-50:]]

    current = _feature_vector(feat)
    anomaly_score = 0.0

    if HAS_SKLEARN and len(matrix) >= 5:
        clf = IsolationForest(contamination=0.15, random_state=42)
        clf.fit(np.array(matrix))
        pred = clf.predict([current])[0]
        raw = clf.decision_function([current])[0]
        anomaly_score = float(-raw)
        is_anomaly = pred == -1
    else:
        is_anomaly = feat.get('isNewDevice') and feat.get('isNewCity')

    hour = feat.get('hour', 12)
    unusual_hour = hour < 5 or hour > 23

    if is_anomaly and feat.get('isNewDevice') and feat.get('isNewCity') and unusual_hour:
        return {
            'riskLevel': 'high',
            'score': round(max(anomaly_score, 0.85), 3),
            'block': True,
            'message': 'Suspicious login attempt blocked. Was this you?',
        }

    if feat.get('isNewDevice') and feat.get('isNewCity') and unusual_hour:
        return {
            'riskLevel': 'high',
            'score': round(max(anomaly_score, 0.9), 3),
            'block': True,
            'message': 'Suspicious login attempt blocked. Was this you?',
        }

    if feat.get('isNewDevice') or feat.get('isNewCity'):
        loc = feat.get('city') or feat.get('country') or 'unknown location'
        device_note = 'a new device' if feat.get('isNewDevice') else 'a known device'
        return {
            'riskLevel': 'medium',
            'score': round(max(anomaly_score, 0.5), 3),
            'block': False,
            'message': f"New login detected from {loc} on {device_note}",
        }

    return {'riskLevel': 'low', 'score': round(anomaly_score, 3), 'block': False, 'message': None}


def record_login_attempt(db, user_id: str, feat: dict, risk: dict, ip: str = '') -> None:
    db.login_history.insert_one({
        'userId': user_id,
        'deviceHash': feat.get('deviceHash'),
        'city': feat.get('city'),
        'country': feat.get('country'),
        'hour': feat.get('hour'),
        'weekday': feat.get('weekday'),
        'ip': ip,
        'riskLevel': risk.get('riskLevel'),
        'riskScore': risk.get('score'),
        'blocked': bool(risk.get('block')),
        'createdAt': _utcnow(),
    })
    if risk.get('message') and risk.get('riskLevel') in ('medium', 'high'):
        db.login_security_alerts.insert_one({
            'userId': user_id,
            'message': risk['message'],
            'riskLevel': risk['riskLevel'],
            'createdAt': _utcnow(),
            'read': False,
        })
