"""Detect recurring subscriptions with no recent household usage signal."""
from __future__ import annotations

import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone

CATEGORY_USAGE_MAP = {
    'subscription': ['inventory', 'chores'],
    'streaming': ['inventory'],
    'internet': ['utilities'],
    'utility': ['utilities'],
    'groceries': ['inventory'],
}


def _utcnow():
    return datetime.now(timezone.utc)


def _parse_date(value) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        try:
            dt = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _normalize_title(title: str) -> str:
    return re.sub(r'\s+', ' ', (title or '').strip().lower())


def _is_recurring_group(items: list) -> bool:
    if len(items) < 3:
        return False
    items.sort(key=lambda x: x['date'])
    gaps = [(items[i]['date'] - items[i - 1]['date']).days for i in range(1, len(items))]
    monthly = sum(1 for g in gaps if 25 <= g <= 35)
    return monthly >= len(gaps) - 1


def _has_usage_signal(title: str, category: str, db, household_id: str, since: datetime) -> bool:
    title_l = _normalize_title(title)
    if 'stream' in title_l or 'netflix' in title_l or 'hulu' in title_l or category == 'subscription':
        inv = db.inventory.find_one({
            'householdId': household_id,
            'updatedAt': {'$gte': since},
        }) if False else None
        posts = list(db.inventory.find({'householdId': household_id}).limit(50))
        for item in posts:
            created = _parse_date(item.get('createdAt') or item.get('expiresAt'))
            if created and created >= since:
                return True
        return False

    if category in ('internet', 'utility'):
        util = db.utilities.find_one({'householdId': household_id, 'createdAt': {'$gte': since}})
        return bool(util)

    inv_recent = db.inventory.find_one({'householdId': household_id})
    if inv_recent:
        for item in db.inventory.find({'householdId': household_id}).limit(30):
            created = _parse_date(item.get('createdAt'))
            if created and created >= since:
                return True
    return False


def detect_subscription_waste(expenses: list, db, household_id: str) -> list[dict]:
    cutoff = _utcnow() - timedelta(days=30)
    grouped: dict[str, list] = defaultdict(list)

    for exp in expenses:
        cat = (exp.get('category') or 'other').lower()
        if cat not in ('subscription', 'internet', 'other') and 'sub' not in (exp.get('title') or '').lower():
            continue
        dt = _parse_date(exp.get('dueDate') or exp.get('createdAt'))
        if not dt:
            continue
        key = _normalize_title(exp.get('title', ''))
        grouped[key].append({
            'amount': float(exp.get('amount', 0)),
            'date': dt,
            'title': exp.get('title', 'Subscription'),
            'category': cat,
        })

    flags = []
    for key, items in grouped.items():
        if not _is_recurring_group(items):
            continue
        title = items[-1]['title']
        category = items[-1]['category']
        avg_amount = sum(i['amount'] for i in items) / len(items)
        months = len(items)
        if _has_usage_signal(title, category, db, household_id, cutoff):
            continue
        flags.append({
            'id': f'waste-{key.replace(" ", "-")}',
            'title': title,
            'monthlyAmount': round(avg_amount, 2),
            'monthsPaid': months,
            'message': (
                f"You've paid ${avg_amount:.2f}/mo for {title} {months} months in a row "
                f"but haven't used it recently. Consider cancelling."
            ),
            'category': category,
        })
    return flags
