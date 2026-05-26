"""Optimal monthly savings allocation — urgency-weighted by deadline proximity."""
from __future__ import annotations

from datetime import datetime, timezone

# Higher exponent = stronger preference for nearer deadlines
URGENCY_EXPONENT = 0.48


def _utcnow():
    return datetime.now(timezone.utc)


def _months_until(target_date: str) -> float:
    if not target_date:
        return 36.0
    now = _utcnow()
    dt = None
    raw = target_date.strip()
    try:
        if raw.isdigit() and len(raw) == 4:
            dt = datetime(int(raw), 1, 1, tzinfo=timezone.utc)
        elif len(raw) <= 8:
            dt = datetime.strptime(raw, '%b %Y').replace(tzinfo=timezone.utc)
        else:
            dt = datetime.fromisoformat(raw.replace('Z', '+00:00'))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return 24.0
    days = max(1, (dt - now).days)
    return days / 30.0


def _urgency_weight(months: float) -> float:
    months = max(0.25, months)
    return 1.0 / (months ** URGENCY_EXPONENT)


def _allocate_by_urgency(weights: list[float], remaining: list[float], surplus: float) -> list[float]:
    total_w = sum(weights) or 1.0
    n = len(weights)
    allocs = [round(min(rem, surplus * w / total_w), 2) for w, rem in zip(weights, remaining)]
    leftover = round(surplus - sum(allocs), 2)
    order = sorted(range(n), key=lambda i: weights[i], reverse=True)
    for i in order:
        if leftover <= 0.01:
            break
        room = round(remaining[i] - allocs[i], 2)
        if room > 0:
            add = round(min(room, leftover), 2)
            allocs[i] = round(allocs[i] + add, 2)
            leftover = round(leftover - add, 2)
    return allocs


def optimize_savings_allocation(goals: list, monthly_surplus: float) -> dict:
    if not goals:
        return {
            'allocations': [],
            'monthlySurplus': monthly_surplus,
            'message': 'Add savings goals to get a personalized allocation plan.',
        }

    if monthly_surplus <= 0:
        return {
            'allocations': [],
            'monthlySurplus': monthly_surplus,
            'message': 'No monthly surplus detected. Reduce expenses or increase income to fund savings goals.',
        }

    remaining = []
    weights = []
    for g in goals:
        target = float(g.get('targetAmount', 0))
        saved = float(g.get('savedAmount', 0))
        rem = max(0.0, target - saved)
        remaining.append(rem)
        months = _months_until(g.get('targetDate', ''))
        weights.append(_urgency_weight(months))

    allocs = _allocate_by_urgency(weights, remaining, monthly_surplus)

    allocations = []
    parts = []
    primary_idx = max(range(len(weights)), key=lambda i: weights[i]) if weights else 0

    for i, (g, amt, rem) in enumerate(zip(goals, allocs, remaining)):
        months_to_goal = rem / amt if amt > 0 else None
        allocations.append({
            'goalId': str(g.get('_id', g.get('id', ''))),
            'title': g.get('title', 'Goal'),
            'monthlyAllocation': amt,
            'remaining': round(rem, 2),
            'monthsToGoal': round(months_to_goal, 1) if months_to_goal else None,
            'targetDate': g.get('targetDate', ''),
            'urgencyWeight': round(weights[i], 4),
        })
        if amt > 0:
            due = g.get('targetDate', 'long term')
            parts.append(f"${amt:.0f} toward your {g.get('title')} (due {due})")

    message = (
        f"Based on your ${monthly_surplus:.0f} monthly surplus: "
        + ', '.join(parts)
        + '.'
    )
    if allocations and allocations[primary_idx].get('monthsToGoal'):
        primary = allocations[primary_idx]
        message += (
            f" At this rate you'll hit your {primary['title']} goal in "
            f"{primary['monthsToGoal']} months."
        )

    return {
        'allocations': allocations,
        'monthlySurplus': round(monthly_surplus, 2),
        'message': message,
        'followRecommended': True,
    }
