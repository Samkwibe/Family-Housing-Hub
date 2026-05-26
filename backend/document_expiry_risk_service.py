"""Document expiry risk scoring for dashboard priority queue."""
from __future__ import annotations

from datetime import datetime, timezone

SEVERITY_WEIGHTS = {
    'insurance': 10,
    'renters insurance': 10,
    "renter's insurance": 10,
    'health insurance': 10,
    'lease': 9,
    'lease agreement': 9,
    'vehicle insurance': 8,
    'auto insurance': 8,
    'passport': 6,
    'id': 6,
    'drivers license': 6,
    'utility': 4,
    'utility agreement': 4,
    'other': 3,
}


def _utcnow():
    return datetime.now(timezone.utc)


def _days_until(expires_at) -> int:
    if not expires_at:
        return 9999
    if isinstance(expires_at, str):
        try:
            dt = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        except ValueError:
            return 9999
    else:
        dt = expires_at
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return max(0, (dt - _utcnow()).days)


def _severity_for_doc(doc: dict) -> float:
    cat = (doc.get('category') or 'other').lower()
    title = (doc.get('title') or '').lower()
    for key, weight in SEVERITY_WEIGHTS.items():
        if key in cat or key in title:
            return float(weight)
    return 3.0


def score_document(doc: dict) -> dict:
    days = _days_until(doc.get('expiresAt'))
    severity = _severity_for_doc(doc)
    if not doc.get('expiresAt') or days > 365:
        return {
            'id': str(doc.get('_id', doc.get('id', ''))),
            'title': doc.get('title', 'Document'),
            'category': doc.get('category', 'other'),
            'daysUntilExpiry': days,
            'severityWeight': severity,
            'riskScore': 0.0,
            'urgency': 'none',
            'cardLevel': None,
        }
    risk = (severity * 1000) / max(days, 1)
    if risk > 100:
        card = 'red'
        urgency = 'critical'
    elif risk >= 50:
        card = 'orange'
        urgency = 'high'
    else:
        card = None
        urgency = 'normal'
    return {
        'id': str(doc.get('_id', doc.get('id', ''))),
        'title': doc.get('title', 'Document'),
        'category': doc.get('category', 'other'),
        'daysUntilExpiry': days,
        'severityWeight': severity,
        'riskScore': round(risk, 1),
        'urgency': urgency,
        'cardLevel': card,
        'message': f"{doc.get('title', 'Document')} expires in {days} day(s) — risk score {risk:.0f}",
    }


def rank_documents_by_risk(documents: list) -> list[dict]:
    scored = [score_document(d) for d in documents if d.get('expiresAt')]
    scored.sort(key=lambda x: -x['riskScore'])
    return scored
