"""Auto-replenishment shopping list via moving-average consumption rates."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone


def _utcnow():
    return datetime.now(timezone.utc)


def _coerce_dt(value):
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


def _normalize_name(name: str) -> str:
    return (name or '').strip().lower()


def compute_consumption_rates(inventory_history: list) -> dict[str, dict]:
    """Group inventory adds by item name; interval between adds = consumption cycle."""
    by_name: dict[str, list] = defaultdict(list)
    for item in inventory_history:
        name = _normalize_name(item.get('name', ''))
        if not name:
            continue
        dt = _coerce_dt(item.get('createdAt') or item.get('addedAt'))
        if dt:
            by_name[name].append(dt)

    rates = {}
    display_names = {}
    for item in inventory_history:
        n = _normalize_name(item.get('name', ''))
        if n:
            display_names[n] = item.get('name', n)

    for name, dates in by_name.items():
        dates.sort()
        if len(dates) < 2:
            continue
        gaps = [(dates[i] - dates[i - 1]).days for i in range(1, len(dates))]
        avg_days = sum(gaps) / len(gaps)
        rates[name] = {
            'displayName': display_names.get(name, name.title()),
            'avgCycleDays': round(avg_days, 1),
            'sampleCount': len(gaps),
            'lastAddedAt': dates[-1].isoformat(),
            'daysSinceLastAdd': (_utcnow() - dates[-1]).days,
        }
    return rates


def check_replenishment(inventory: list, rates: dict[str, dict], *, threshold_days: float = 3.0) -> list[dict]:
    """Flag staples projected to run out within threshold_days."""
    current_by_name: dict[str, dict] = {}
    for item in inventory:
        name = _normalize_name(item.get('name', ''))
        if name:
            current_by_name[name] = item

    suggestions = []
    for name, rate in rates.items():
        cycle = rate['avgCycleDays']
        since = rate['daysSinceLastAdd']
        if since < cycle - threshold_days:
            continue
        display = rate.get('displayName') or name.title()
        if name in current_by_name:
            display = current_by_name[name].get('name', display)
        days_until_out = max(0, round(cycle - since, 1))
        if days_until_out <= threshold_days:
            suggestions.append({
                'name': display,
                'avgCycleDays': cycle,
                'daysSinceLastAdd': since,
                'daysUntilRunOut': days_until_out,
                'message': (
                    f"You usually run out of {display} every {cycle:.0f} days. "
                    f"Added to your shopping list."
                ),
            })
    return suggestions


def run_replenishment_for_household(db, household_id: str) -> list[dict]:
    scope = {'householdId': household_id}
    history = list(db.inventory.find(scope).sort('createdAt', 1))
    current = list(db.inventory.find(scope))
    rates = compute_consumption_rates(history)
    suggestions = check_replenishment(current, rates)

    fired = []
    for s in suggestions:
        name = s['name']
        existing = db.shopping_list.find_one({
            'householdId': household_id,
            'name': {'$regex': f'^{name}$', '$options': 'i'},
            'completed': {'$ne': True},
        })
        if existing:
            continue
        db.shopping_list.insert_one({
            'householdId': household_id,
            'name': name,
            'source': 'replenishment',
            'autoAdded': True,
            'completed': False,
            'createdAt': _utcnow(),
            'replenishmentMeta': {
                'avgCycleDays': s['avgCycleDays'],
                'daysSinceLastAdd': s['daysSinceLastAdd'],
            },
        })
        print(f"[replenishment] {s['message']}")
        fired.append(s)
    return fired
