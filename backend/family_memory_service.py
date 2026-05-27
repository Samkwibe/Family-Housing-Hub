"""Curated family memory timeline — meaningful moments only, not activity logs."""
from __future__ import annotations

import hashlib
import re
from datetime import datetime, timedelta, timezone
from typing import Any

# Celebration types worth preserving (NOT chore_completed, NOT reward_requested noise)
PRESERVED_CELEBRATION_TYPES = frozenset({
    'welcome_complete',
    'streak_milestone',
    'badge_earned',
    'family_milestone',
    'reward_approved',
})

MEMORY_KIND_BY_TYPE = {
    'welcome_complete': 'first',
    'first_reward_goal': 'first',
    'first_reward_redeemed': 'first',
    'badge_earned': 'breakthrough',
    'streak_milestone': 'milestone',
    'family_milestone': 'breakthrough',
    'reward_approved': 'milestone',
}

# Density guardrails — protect emotional rarity at scale
MAX_MEMORIES_PER_HOUSEHOLD_30D = 12
CATEGORY_COOLDOWN_HOURS = 48
RESURFACE_MIN_AGE_DAYS = 30
MAX_RESURFACED_PER_FETCH = 3

# Firsts always allowed (subject to monthly cap only)
FIRST_MEMORY_TYPES = frozenset({
    'welcome_complete',
    'first_reward_goal',
    'first_reward_redeemed',
})


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _slug(text: str) -> str:
    clean = re.sub(r'[^a-z0-9]+', '-', (text or '').lower()).strip('-')
    return clean[:80] or 'moment'


def _memory_kind(event_type: str) -> str:
    return MEMORY_KIND_BY_TYPE.get(event_type, 'milestone')


def _build_memory_key(
    household_id: str,
    event_type: str,
    *,
    child_profile_id: str | None = None,
    title: str | None = None,
    extra: str | None = None,
) -> str:
    parts = [household_id, event_type]
    if child_profile_id:
        parts.append(child_profile_id)
    if extra:
        parts.append(extra)
    elif title:
        parts.append(_slug(title))
    digest = hashlib.sha1(':'.join(parts).encode()).hexdigest()[:16]
    return f'{event_type}:{digest}'


def ensure_memory_indexes(db) -> None:
    col = db.family_memories
    try:
        col.create_index([('householdId', 1), ('occurredAt', -1)])
        col.create_index([('childProfileId', 1), ('occurredAt', -1)])
        col.create_index('memoryKey', unique=True)
    except Exception:
        pass


def should_preserve_celebration(event_type: str) -> bool:
    return event_type in PRESERVED_CELEBRATION_TYPES


def _passes_density_guardrails(
    db,
    *,
    household_id: str,
    event_type: str,
    child_profile_id: str | None,
    source_type: str,
) -> bool:
    """Lightweight limits — backfill bypasses; firsts bypass category cooldown."""
    if source_type == 'backfill':
        return True

    since_month = _utcnow() - timedelta(days=30)
    monthly_count = db.family_memories.count_documents({
        'householdId': household_id,
        'occurredAt': {'$gte': since_month},
    })
    if monthly_count >= MAX_MEMORIES_PER_HOUSEHOLD_30D:
        return False

    if event_type in FIRST_MEMORY_TYPES:
        return True

    since_cat = _utcnow() - timedelta(hours=CATEGORY_COOLDOWN_HOURS)
    cat_query: dict[str, Any] = {
        'householdId': household_id,
        'type': event_type,
        'occurredAt': {'$gte': since_cat},
    }
    if child_profile_id:
        cat_query['childProfileId'] = child_profile_id
    if db.family_memories.count_documents(cat_query) > 0:
        return False

    return True


def record_family_memory(
    db,
    *,
    household_id: str,
    event_type: str,
    title: str,
    message: str,
    emoji: str = '✨',
    child_profile_id: str | None = None,
    child_name: str | None = None,
    points: int | None = None,
    memory_key: str | None = None,
    trace_id: str | None = None,
    source_type: str = 'celebration',
    source_id: str | None = None,
    metadata: dict | None = None,
    occurred_at: datetime | None = None,
) -> dict | None:
    """Idempotent — returns doc if inserted, None if duplicate or not curated."""
    if not household_id or not title:
        return None

    key = memory_key or _build_memory_key(
        household_id,
        event_type,
        child_profile_id=child_profile_id,
        title=title,
    )

    if db.family_memories.find_one({'memoryKey': key}):
        return None

    if not _passes_density_guardrails(
        db,
        household_id=household_id,
        event_type=event_type,
        child_profile_id=child_profile_id,
        source_type=source_type,
    ):
        return None

    now = _utcnow()
    doc = {
        'householdId': household_id,
        'childProfileId': child_profile_id,
        'childName': child_name,
        'type': event_type,
        'kind': _memory_kind(event_type),
        'title': title,
        'message': message,
        'emoji': emoji,
        'points': points,
        'memoryKey': key,
        'traceId': trace_id,
        'sourceType': source_type,
        'sourceId': source_id,
        'metadata': metadata or {},
        'occurredAt': occurred_at or now,
        'createdAt': now,
    }
    try:
        result = db.family_memories.insert_one(doc)
        doc['_id'] = result.inserted_id
        return doc
    except Exception:
        return None


def record_from_celebration_payload(
    db,
    household_id: str | None,
    payload: dict[str, Any],
    *,
    trace_id: str | None = None,
) -> dict | None:
    """Persist curated celebration as a family memory."""
    if not household_id:
        return None
    event_type = payload.get('type') or ''
    if not should_preserve_celebration(event_type):
        return None

    child_profile_id = payload.get('childProfileId')
    title = payload.get('title') or 'Family moment'

    # Reward approval emits twice (child + parent) — preserve one memory
    if event_type == 'reward_approved' and not payload.get('showChild'):
        return None

    memory_key = _build_memory_key(
        household_id,
        event_type,
        child_profile_id=child_profile_id,
        title=title,
    )

    return record_family_memory(
        db,
        household_id=household_id,
        event_type=event_type,
        title=title,
        message=payload.get('message') or '',
        emoji=payload.get('emoji') or '✨',
        child_profile_id=child_profile_id,
        child_name=payload.get('childName'),
        points=payload.get('points'),
        memory_key=memory_key,
        trace_id=trace_id or payload.get('traceId'),
        source_type='celebration',
        metadata={'priority': payload.get('priority')},
    )


def record_first_reward_goal(db, profile: dict, redemption: dict) -> dict | None:
    household_id = profile.get('householdId')
    if not household_id:
        return None
    pid = str(profile['_id'])
    name = profile.get('displayName') or 'Child'
    title = redemption.get('rewardTitle') or 'a reward'
    emoji = redemption.get('rewardEmoji') or '🎯'
    return record_family_memory(
        db,
        household_id=household_id,
        event_type='first_reward_goal',
        title=f'{name} set their first reward goal',
        message=f'Working toward "{title}" — a meaningful first step.',
        emoji=emoji,
        child_profile_id=pid,
        child_name=name,
        memory_key=_build_memory_key(household_id, 'first_reward_goal', child_profile_id=pid),
        source_type='redemption',
        source_id=str(redemption.get('_id', '')),
    )


def record_first_reward_redeemed(db, profile: dict, redemption: dict) -> dict | None:
    household_id = profile.get('householdId')
    if not household_id:
        return None
    pid = str(profile['_id'])
    name = profile.get('displayName') or 'Child'
    title = redemption.get('rewardTitle') or 'Reward'
    emoji = redemption.get('rewardEmoji') or '🎁'
    return record_family_memory(
        db,
        household_id=household_id,
        event_type='first_reward_redeemed',
        title=f'{name} redeemed their first reward',
        message=f'"{title}" — a special family moment worth remembering.',
        emoji=emoji,
        child_profile_id=pid,
        child_name=name,
        memory_key=_build_memory_key(household_id, 'first_reward_redeemed', child_profile_id=pid),
        source_type='redemption',
        source_id=str(redemption.get('_id', '')),
    )


def _serialize_memory(doc: dict) -> dict:
    occurred = doc.get('occurredAt')
    created = doc.get('createdAt')
    return {
        'id': str(doc['_id']),
        'householdId': doc.get('householdId'),
        'childProfileId': doc.get('childProfileId'),
        'childName': doc.get('childName'),
        'type': doc.get('type'),
        'kind': doc.get('kind'),
        'title': doc.get('title'),
        'message': doc.get('message'),
        'emoji': doc.get('emoji') or '✨',
        'points': doc.get('points'),
        'occurredAt': occurred.isoformat() if hasattr(occurred, 'isoformat') else occurred,
        'createdAt': created.isoformat() if hasattr(created, 'isoformat') else created,
    }


def fetch_family_memories(
    db,
    household_id: str,
    *,
    child_profile_id: str | None = None,
    limit: int = 20,
    before: str | None = None,
) -> list[dict]:
    ensure_memory_indexes(db)
    query: dict[str, Any] = {'householdId': household_id}
    if child_profile_id:
        query['$or'] = [
            {'childProfileId': child_profile_id},
            {'childProfileId': None},
            {'childProfileId': {'$exists': False}},
        ]
    if before:
        try:
            cursor_dt = datetime.fromisoformat(before.replace('Z', '+00:00'))
            query['occurredAt'] = {'$lt': cursor_dt}
        except ValueError:
            pass

    rows = list(
        db.family_memories.find(query)
        .sort('occurredAt', -1)
        .limit(max(1, min(limit, 50)))
    )
    return [_serialize_memory(r) for r in rows]


def fetch_resurfaced_memories(
    db,
    household_id: str,
    *,
    child_profile_id: str | None = None,
    limit: int = 3,
) -> list[dict]:
    """Anniversary memories — same calendar day in a prior year/month, at least 30 days ago."""
    ensure_memory_indexes(db)
    now = _utcnow()
    min_age = now - timedelta(days=RESURFACE_MIN_AGE_DAYS)

    query: dict[str, Any] = {
        'householdId': household_id,
        'occurredAt': {'$lte': min_age},
    }
    if child_profile_id:
        query['$or'] = [
            {'childProfileId': child_profile_id},
            {'childProfileId': None},
            {'childProfileId': {'$exists': False}},
        ]

    candidates = list(db.family_memories.find(query).sort('occurredAt', -1).limit(200))
    today = now.date()
    resurfaced: list[dict] = []

    for doc in candidates:
        occurred = doc.get('occurredAt')
        if not hasattr(occurred, 'date'):
            continue
        od = occurred.date()
        if od.month == today.month and od.day == today.day:
            item = _serialize_memory(doc)
            item['resurfaceReason'] = 'anniversary'
            item['yearsAgo'] = today.year - od.year
            resurfaced.append(item)
        if len(resurfaced) >= limit:
            break

    return resurfaced[:MAX_RESURFACED_PER_FETCH]


def group_memories_by_month(memories: list[dict]) -> list[dict]:
    """Group serialized memories for timeline UI."""
    groups: dict[str, list[dict]] = {}
    for m in memories:
        occurred = m.get('occurredAt') or ''
        try:
            dt = datetime.fromisoformat(occurred.replace('Z', '+00:00'))
            label = dt.strftime('%B %Y')
        except ValueError:
            label = 'Earlier'
        groups.setdefault(label, []).append(m)
    return [{'month': k, 'memories': v} for k, v in groups.items()]
