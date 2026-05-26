"""Score and rank household alerts by urgency × recency × engagement (Thompson sampling)."""
from __future__ import annotations

import math
import random
from datetime import datetime, timezone

URGENCY_WEIGHT = {'high': 1.0, 'medium': 0.6, 'low': 0.3}
TYPE_URGENCY = {
    'spending': 0.95,
    'food': 0.9,
    'maintenance': 0.85,
    'finance': 0.8,
    'package': 0.7,
    'chore': 0.5,
    'energy': 0.55,
    'ai': 0.4,
}


def _utcnow():
    return datetime.now(timezone.utc)


def _recency_score(alert: dict, now: datetime | None = None) -> float:
    """Higher score for fresher alerts; decays over ~7 days."""
    now = now or _utcnow()
    created = alert.get('createdAt')
    if isinstance(created, datetime):
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        age_hours = max(0.0, (now - created).total_seconds() / 3600)
    else:
        age_hours = float(alert.get('ageHours', 12))
    return math.exp(-age_hours / 72.0)


def _engagement_prior(db, household_id: str, alert_type: str) -> tuple[float, float]:
    """Beta(α, β) prior from past taps/dismissals for Thompson sampling."""
    stats = db.notification_engagement.find_one({'householdId': household_id, 'type': alert_type}) or {}
    taps = int(stats.get('taps', 1))
    dismissals = int(stats.get('dismissals', 1))
    impressions = int(stats.get('impressions', taps + dismissals + 2))
    alpha = taps + 1
    beta = max(1, impressions - taps + 1)
    return alpha, beta


def _thompson_sample(alpha: float, beta: float) -> float:
    # Beta mean when random unavailable; approximate Thompson with noise
    mean = alpha / (alpha + beta)
    noise = random.gauss(0, 0.08)
    return max(0.05, min(0.99, mean + noise))


def score_alert(alert: dict, db, household_id: str) -> float:
    urgency = URGENCY_WEIGHT.get(alert.get('urgency', 'medium'), 0.5)
    type_boost = TYPE_URGENCY.get(alert.get('type', 'ai'), 0.5)
    recency = _recency_score(alert)
    alpha, beta = _engagement_prior(db, household_id, alert.get('type', 'ai'))
    engagement = _thompson_sample(alpha, beta)
    spending_boost = 1.15 if alert.get('type') == 'spending' else 1.0
    return urgency * type_boost * recency * engagement * spending_boost


def rank_alerts(alerts: list[dict], db, household_id: str) -> list[dict]:
    """Return alerts sorted by composite score (urgent + engaging first)."""
    scored = []
    for alert in alerts:
        score = score_alert(alert, db, household_id)
        enriched = {**alert, 'rankScore': round(score, 4)}
        scored.append((score, enriched))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [a for _, a in scored]


def partition_digest(alerts: list[dict], *, digest_threshold: float = 0.35) -> dict:
    """Split low-value alerts into a daily digest bucket."""
    immediate = []
    digest = []
    for alert in alerts:
        score = alert.get('rankScore', 0.5)
        if alert.get('urgency') == 'high' or score >= digest_threshold:
            immediate.append(alert)
        else:
            digest.append(alert)
    return {'immediate': immediate, 'digest': digest}


def record_engagement(db, household_id: str, alert_type: str, action: str) -> None:
    field = 'taps' if action == 'tap' else 'dismissals' if action == 'dismiss' else 'impressions'
    db.notification_engagement.update_one(
        {'householdId': household_id, 'type': alert_type},
        {'$inc': {field: 1}, '$setOnInsert': {'householdId': household_id, 'type': alert_type}},
        upsert=True,
    )
