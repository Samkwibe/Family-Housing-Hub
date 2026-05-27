"""Recurring chore engine — templates, instance generation, streaks, rollover."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from bson import ObjectId

from dashboard_cache_service import invalidate_portal_dashboard_cache

PRESET_RULES: dict[str, dict] = {
    'daily': {'frequency': 'daily', 'interval': 1},
    'weekdays': {'frequency': 'weekdays', 'interval': 1},
    'weekly': {'frequency': 'weekly', 'interval': 1, 'daysOfWeek': [5]},
    'monthly': {'frequency': 'monthly', 'interval': 1},
}

ROUTINE_GROUPS = frozenset({'morning', 'evening', 'after_school'})


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def normalize_recurrence_rule(raw) -> dict | None:
    if not raw:
        return None
    if isinstance(raw, str):
        key = raw.strip().lower()
        if key in ('none', 'once', 'one_time', ''):
            return None
        if key in PRESET_RULES:
            return dict(PRESET_RULES[key])
        return None
    if isinstance(raw, dict) and raw.get('frequency'):
        freq = str(raw['frequency']).strip().lower()
        rule = {
            'frequency': freq,
            'interval': max(1, int(raw.get('interval') or 1)),
        }
        days = raw.get('daysOfWeek') or raw.get('repeatDays')
        if days is not None:
            rule['daysOfWeek'] = [int(d) for d in days if 0 <= int(d) <= 6]
        if raw.get('dayOfMonth') is not None:
            rule['dayOfMonth'] = max(1, min(28, int(raw['dayOfMonth'])))
        return rule
    return None


def recurrence_label(rule: dict | None) -> str:
    if not rule:
        return 'One time'
    freq = rule.get('frequency', 'daily')
    interval = int(rule.get('interval') or 1)
    if freq == 'daily':
        return 'Every day' if interval == 1 else f'Every {interval} days'
    if freq == 'weekdays':
        return 'Weekdays (Mon–Fri)'
    if freq == 'weekly':
        days = rule.get('daysOfWeek') or [5]
        names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        day_str = ', '.join(names[d] for d in days if 0 <= d <= 6)
        return f'Weekly · {day_str}' if day_str else 'Weekly'
    if freq == 'monthly':
        return 'Monthly' if interval == 1 else f'Every {interval} months'
    if freq == 'custom':
        return f'Every {interval} days'
    return 'Recurring'


def _local_day_start(dt: datetime, tz_name: str) -> datetime:
    tz = ZoneInfo(tz_name or 'UTC')
    local = dt.astimezone(tz)
    start = local.replace(hour=8, minute=0, second=0, microsecond=0)
    return start.astimezone(timezone.utc)


def compute_next_due_at(rule: dict, after: datetime | None = None, tz_name: str = 'UTC') -> datetime:
    """Timezone-aware next due datetime (stored as UTC)."""
    base = after or _utcnow()
    tz = ZoneInfo(tz_name or 'UTC')
    local = base.astimezone(tz)
    freq = rule.get('frequency', 'daily')
    interval = max(1, int(rule.get('interval') or 1))

    if freq == 'daily' or freq == 'custom':
        next_local = local + timedelta(days=interval)
        next_local = next_local.replace(hour=8, minute=0, second=0, microsecond=0)
    elif freq == 'weekdays':
        next_local = local + timedelta(days=1)
        next_local = next_local.replace(hour=8, minute=0, second=0, microsecond=0)
        while next_local.weekday() >= 5:
            next_local += timedelta(days=1)
    elif freq == 'weekly':
        days = sorted({int(d) for d in (rule.get('daysOfWeek') or [local.weekday()]) if 0 <= int(d) <= 6})
        if not days:
            days = [local.weekday()]
        next_local = local + timedelta(days=1)
        next_local = next_local.replace(hour=8, minute=0, second=0, microsecond=0)
        for _ in range(14):
            if next_local.weekday() in days:
                break
            next_local += timedelta(days=1)
    elif freq == 'monthly':
        month = local.month + interval
        year = local.year + (month - 1) // 12
        month = ((month - 1) % 12) + 1
        day = min(local.day, 28)
        next_local = local.replace(year=year, month=month, day=day, hour=8, minute=0, second=0, microsecond=0)
    else:
        next_local = local + timedelta(days=1)
        next_local = next_local.replace(hour=8, minute=0, second=0, microsecond=0)

    return next_local.astimezone(timezone.utc)


def _format_due_label(due: datetime | None, tz_name: str = 'UTC') -> str:
    if not due:
        return ''
    tz = ZoneInfo(tz_name or 'UTC')
    local = due.astimezone(tz)
    today = _utcnow().astimezone(tz).date()
    if local.date() == today:
        return 'Today'
    if local.date() == today + timedelta(days=1):
        return 'Tomorrow'
    return local.strftime('%b %d')


def serialize_chore_for_client(chore: dict, tz_name: str = 'UTC') -> dict:
    due = chore.get('nextDueAt') or chore.get('dueDate')
    due_dt = due if isinstance(due, datetime) else None
    if isinstance(due, str) and not due_dt:
        try:
            due_dt = datetime.fromisoformat(due.replace('Z', '+00:00'))
        except ValueError:
            due_dt = None

    item = {
        'id': str(chore['_id']),
        'source': 'household',
        'title': chore.get('title', ''),
        'dueDate': _format_due_label(due_dt, tz_name) if due_dt else (chore.get('dueDate') or ''),
        'completed': bool(chore.get('completed')),
        'points': int(chore.get('points') or 5),
    }
    rule = chore.get('recurrenceRule')
    if chore.get('seriesId'):
        item['seriesId'] = chore['seriesId']
        item['isRecurring'] = True
        item['recurrenceRule'] = rule
        item['recurrenceLabel'] = chore.get('recurrenceLabel') or recurrence_label(rule)
        item['routineGroup'] = chore.get('routineGroup')
        item['routineLabel'] = chore.get('routineLabel')
        item['seriesStreak'] = int(chore.get('seriesStreak') or 0)
        item['paused'] = bool(chore.get('paused'))
        if due_dt:
            item['nextDueAt'] = due_dt.isoformat()
    elif rule:
        item['isRecurring'] = True
        item['recurrenceLabel'] = recurrence_label(rule)
    return item


def _instance_base_from_template(template: dict, due_at: datetime) -> dict:
    return {
        'userId': template.get('userId'),
        'householdId': template.get('householdId'),
        'title': template.get('title', ''),
        'assignee': template.get('assignee', ''),
        'assigneeUserId': template.get('assigneeUserId'),
        'childProfileId': template.get('childProfileId'),
        'points': int(template.get('points') or 5),
        'priority': template.get('priority', 'medium'),
        'createdBy': template.get('createdBy'),
        'seriesId': template.get('seriesId'),
        'templateId': str(template['_id']),
        'recurrenceRule': template.get('recurrenceRule'),
        'recurrenceLabel': template.get('recurrenceLabel'),
        'routineGroup': template.get('routineGroup'),
        'routineLabel': template.get('routineLabel'),
        'timezone': template.get('timezone', 'UTC'),
        'isRecurring': True,
        'isTemplate': False,
        'paused': False,
        'completed': False,
        'status': 'active',
        'nextDueAt': due_at,
        'dueDate': _format_due_label(due_at, template.get('timezone', 'UTC')),
        'createdAt': _utcnow(),
    }


def create_open_instance(db, template: dict, due_at: datetime | None = None) -> dict | None:
    """Idempotent — skips if an open instance already exists for the series."""
    if template.get('paused'):
        return None
    series_id = template.get('seriesId')
    if not series_id:
        return None

    existing = db.chores.find_one({
        'seriesId': series_id,
        'isTemplate': False,
        'completed': False,
        'status': {'$ne': 'archived'},
    })
    if existing:
        return existing

    tz = template.get('timezone', 'UTC')
    rule = template.get('recurrenceRule') or PRESET_RULES['daily']
    due = due_at or template.get('nextDueAt') or compute_next_due_at(rule, _utcnow(), tz)

    doc = _instance_base_from_template(template, due)
    result = db.chores.insert_one(doc)
    doc['_id'] = result.inserted_id

    db.chores.update_one(
        {'_id': template['_id']},
        {'$set': {'lastGeneratedAt': _utcnow(), 'nextDueAt': due, 'updatedAt': _utcnow()}},
    )
    return doc


def assign_recurring_chore(db, ctx, profile: dict, data: dict) -> tuple[dict | None, str | None]:
    rule = normalize_recurrence_rule(data.get('recurrenceRule') or data.get('recurring'))
    if not rule:
        return None, 'Invalid recurrence rule'

    title = (data.get('title') or '').strip()
    if not title:
        return None, 'title is required'

    child_profile_id = str(profile['_id'])
    points = max(1, int(data.get('points') or 5))
    tz_name = (data.get('timezone') or 'UTC').strip() or 'UTC'
    routine_group = (data.get('routineGroup') or '').strip().lower() or None
    if routine_group and routine_group not in ROUTINE_GROUPS:
        routine_group = None
    routine_label = (data.get('routineLabel') or '').strip() or None
    if routine_group and not routine_label:
        routine_label = {
            'morning': 'Morning routine',
            'evening': 'Bedtime routine',
            'after_school': 'After school routine',
        }.get(routine_group, 'Routine')

    now = _utcnow()
    series_id = str(uuid.uuid4())
    next_due = compute_next_due_at(rule, now, tz_name)
    label = recurrence_label(rule)
    display = profile.get('displayName') or 'Child'

    template = {
        'userId': ctx.user_id,
        'householdId': ctx.household_id,
        'title': title,
        'assignee': display,
        'assigneeUserId': profile.get('userId'),
        'childProfileId': child_profile_id,
        'points': points,
        'priority': data.get('priority', 'medium'),
        'createdBy': ctx.user_id,
        'seriesId': series_id,
        'recurrenceRule': rule,
        'recurrenceLabel': label,
        'routineGroup': routine_group,
        'routineLabel': routine_label,
        'timezone': tz_name,
        'isRecurring': True,
        'isTemplate': True,
        'paused': False,
        'completed': False,
        'nextDueAt': next_due,
        'lastGeneratedAt': now,
        'completionHistory': [],
        'seriesStreak': 0,
        'createdAt': now,
        'updatedAt': now,
    }
    result = db.chores.insert_one(template)
    template['_id'] = result.inserted_id

    instance = create_open_instance(db, template, next_due)
    scope = profile.get('userId') or child_profile_id
    invalidate_portal_dashboard_cache('child', scope)

    return serialize_chore_for_client(instance or template, tz_name), None


def on_recurring_instance_completed(db, chore: dict, profile: dict) -> dict | None:
    """After instance completion — update series streak, schedule next instance."""
    template_id = chore.get('templateId')
    series_id = chore.get('seriesId')
    if not series_id:
        return None

    template = None
    if template_id:
        try:
            template = db.chores.find_one({'_id': ObjectId(template_id), 'isTemplate': True})
        except Exception:
            template = None
    if not template:
        template = db.chores.find_one({'seriesId': series_id, 'isTemplate': True})
    if not template or template.get('paused'):
        return None

    tz = template.get('timezone', 'UTC')
    due = chore.get('nextDueAt')
    due_date = due.astimezone(ZoneInfo(tz)).date() if isinstance(due, datetime) else _utcnow().date()
    today = _utcnow().astimezone(ZoneInfo(tz)).date()
    on_time = due_date >= today - timedelta(days=1)

    history = list(template.get('completionHistory') or [])
    history.append({
        'instanceId': str(chore['_id']),
        'completedAt': _utcnow().isoformat(),
        'points': int(chore.get('points') or 5),
        'onTime': on_time,
    })
    history = history[-60:]

    series_streak = int(template.get('seriesStreak') or 0)
    if on_time:
        series_streak += 1
    else:
        series_streak = 1

    rule = template.get('recurrenceRule') or PRESET_RULES['daily']
    next_due = compute_next_due_at(rule, _utcnow(), tz)

    db.chores.update_one(
        {'_id': template['_id']},
        {'$set': {
            'completionHistory': history,
            'seriesStreak': series_streak,
            'nextDueAt': next_due,
            'lastGeneratedAt': _utcnow(),
            'updatedAt': _utcnow(),
        }},
    )
    template['seriesStreak'] = series_streak
    template['nextDueAt'] = next_due

    return create_open_instance(db, template, next_due)


def generate_due_recurring_instances(db, now: datetime | None = None) -> int:
    """Nightly/hourly job — create instances for due templates (idempotent)."""
    now = now or _utcnow()
    templates = list(db.chores.find({
        'isTemplate': True,
        'paused': {'$ne': True},
        'nextDueAt': {'$lte': now},
        'status': {'$ne': 'archived'},
    }))
    created = 0
    for template in templates:
        before = db.chores.count_documents({
            'seriesId': template.get('seriesId'),
            'isTemplate': False,
            'completed': False,
        })
        create_open_instance(db, template, template.get('nextDueAt'))
        after = db.chores.count_documents({
            'seriesId': template.get('seriesId'),
            'isTemplate': False,
            'completed': False,
        })
        if after > before:
            created += 1
            child_id = template.get('childProfileId')
            profile = db.child_profiles.find_one({'_id': ObjectId(child_id)}) if child_id else None
            if profile:
                scope = profile.get('userId') or child_id
                invalidate_portal_dashboard_cache('child', scope)
    return created


def rollover_missed_instances(db, now: datetime | None = None) -> int:
    """Mark overdue open instances as missed and advance the series."""
    now = now or _utcnow()
    cutoff = now - timedelta(hours=20)
    missed = list(db.chores.find({
        'isTemplate': False,
        'completed': False,
        'status': 'active',
        'nextDueAt': {'$lt': cutoff},
        'seriesId': {'$exists': True},
    }))
    count = 0
    for inst in missed:
        db.chores.update_one(
            {'_id': inst['_id']},
            {'$set': {'status': 'missed', 'missedAt': now, 'updatedAt': now}},
        )
        template = db.chores.find_one({'seriesId': inst.get('seriesId'), 'isTemplate': True})
        if template:
            db.chores.update_one(
                {'_id': template['_id']},
                {'$set': {'seriesStreak': 0, 'updatedAt': now}},
            )
            rule = template.get('recurrenceRule') or PRESET_RULES['daily']
            next_due = compute_next_due_at(rule, now, template.get('timezone', 'UTC'))
            db.chores.update_one(
                {'_id': template['_id']},
                {'$set': {'nextDueAt': next_due}},
            )
            create_open_instance(db, {**template, 'nextDueAt': next_due, 'seriesStreak': 0}, next_due)
        count += 1
    return count


def recalculate_profile_streaks(db, today: date | None = None) -> int:
    """Decay profile streaks when yesterday had no completion."""
    today = today or _utcnow().date()
    yesterday = (today - timedelta(days=1)).isoformat()
    cursor = db.child_profiles.find({
        'streakDays': {'$gt': 0},
        'lastChoreCompletedDate': {'$exists': True, '$ne': None, '$lt': yesterday},
        'status': {'$ne': 'archived'},
    })
    updated = 0
    for profile in cursor:
        db.child_profiles.update_one(
            {'_id': profile['_id']},
            {'$set': {'streakDays': 0, 'updatedAt': _utcnow()}},
        )
        scope = profile.get('userId') or str(profile['_id'])
        invalidate_portal_dashboard_cache('child', scope)
        updated += 1
    return updated


def run_recurring_chore_maintenance(db=None) -> dict:
    db = db or __import__('database', fromlist=['get_db']).get_db()
    now = _utcnow()
    return {
        'generated': generate_due_recurring_instances(db, now),
        'missedRollover': rollover_missed_instances(db, now),
        'streaksReset': recalculate_profile_streaks(db, now.date()),
    }


def set_series_paused(db, ctx, series_id: str, paused: bool) -> tuple[dict | None, str | None]:
    template = db.chores.find_one({'seriesId': series_id, 'isTemplate': True})
    if not template:
        return None, 'Routine not found'
    if ctx.household_id and template.get('householdId') != ctx.household_id:
        return None, 'Routine not in your household'

    db.chores.update_one(
        {'_id': template['_id']},
        {'$set': {'paused': bool(paused), 'updatedAt': _utcnow()}},
    )
    if paused:
        db.chores.update_many(
            {'seriesId': series_id, 'isTemplate': False, 'completed': False},
            {'$set': {'status': 'archived', 'updatedAt': _utcnow()}},
        )

    child_id = template.get('childProfileId')
    if child_id:
        profile = db.child_profiles.find_one({'_id': ObjectId(child_id)})
        if profile:
            scope = profile.get('userId') or child_id
            invalidate_portal_dashboard_cache('child', scope)

    refreshed = db.chores.find_one({'_id': template['_id']})
    return {
        'seriesId': series_id,
        'paused': bool(paused),
        'title': refreshed.get('title'),
        'recurrenceLabel': refreshed.get('recurrenceLabel'),
    }, None


def duplicate_series_to_child(db, ctx, series_id: str, child_profile_id: str) -> tuple[dict | None, str | None]:
    template = db.chores.find_one({'seriesId': series_id, 'isTemplate': True})
    if not template:
        return None, 'Routine not found'
    if ctx.household_id and template.get('householdId') != ctx.household_id:
        return None, 'Routine not in your household'

    try:
        profile = db.child_profiles.find_one({'_id': ObjectId(child_profile_id), 'status': {'$ne': 'archived'}})
    except Exception:
        return None, 'Invalid child profile'
    if not profile or profile.get('householdId') != ctx.household_id:
        return None, 'Child not found'

    payload = {
        'title': template.get('title'),
        'points': template.get('points', 5),
        'recurrenceRule': template.get('recurrenceRule'),
        'routineGroup': template.get('routineGroup'),
        'routineLabel': template.get('routineLabel'),
        'timezone': template.get('timezone', 'UTC'),
    }
    return assign_recurring_chore(db, ctx, profile, payload)


def list_routines_for_household(db, household_id: str, child_profile_id: str | None = None) -> list[dict]:
    query: dict = {'isTemplate': True, 'householdId': household_id, 'status': {'$ne': 'archived'}}
    if child_profile_id:
        query['childProfileId'] = child_profile_id
    rows = list(db.chores.find(query).sort('createdAt', -1))
    out = []
    for t in rows:
        open_count = db.chores.count_documents({
            'seriesId': t.get('seriesId'),
            'isTemplate': False,
            'completed': False,
            'status': 'active',
        })
        out.append({
            'seriesId': t.get('seriesId'),
            'title': t.get('title'),
            'childProfileId': t.get('childProfileId'),
            'recurrenceLabel': t.get('recurrenceLabel') or recurrence_label(t.get('recurrenceRule')),
            'recurrenceRule': t.get('recurrenceRule'),
            'routineGroup': t.get('routineGroup'),
            'routineLabel': t.get('routineLabel'),
            'paused': bool(t.get('paused')),
            'seriesStreak': int(t.get('seriesStreak') or 0),
            'points': int(t.get('points') or 5),
            'openInstances': open_count,
        })
    return out
