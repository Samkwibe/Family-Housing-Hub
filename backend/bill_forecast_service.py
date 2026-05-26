"""90-day cash flow forecast with Holt-Winters smoothing for variable bills."""
from __future__ import annotations

import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone

FIXED_CATEGORIES = frozenset({'rent', 'subscription', 'internet', 'insurance'})
VARIABLE_CATEGORIES = frozenset({'utility', 'groceries', 'other'})


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


def _bill_key(exp) -> str:
    title = re.sub(r'\s+', ' ', (exp.get('title') or 'bill').strip().lower())
    cat = (exp.get('category') or 'other').lower()
    return f'{cat}::{title}'


def _months_span(expenses) -> int:
    dates = [_parse_date(e.get('dueDate') or e.get('createdAt')) for e in expenses]
    dates = [d for d in dates if d]
    if len(dates) < 2:
        return 0
    span = (max(dates) - min(dates)).days
    return max(1, span // 30)


def holt_winters_forecast(series: list[float], steps: int = 3, season: int = 12) -> list[float]:
    """Triple exponential smoothing (additive). Falls back to Holt linear for short series."""
    if not series:
        return [0.0] * steps
    if len(series) < season * 2:
        return _holt_linear(series, steps)

    alpha, beta, gamma = 0.3, 0.1, 0.2
    m = season
    n = len(series)
    seasonals = [series[i] / (series[0] or 1) for i in range(m)] if series[0] else [1.0] * m
    level = series[0]
    trend = series[1] - series[0] if n > 1 else 0.0

    for i in range(1, n):
        si = i % m
        last_level = level
        level = alpha * (series[i] / (seasonals[si] or 1)) + (1 - alpha) * (level + trend)
        trend = beta * (level - last_level) + (1 - beta) * trend
        seasonals[si] = gamma * (series[i] / (level or 1)) + (1 - gamma) * seasonals[si]

    forecasts = []
    for h in range(1, steps + 1):
        si = (n + h - 1) % m
        forecasts.append(max(0.0, (level + h * trend) * seasonals[si]))
    return forecasts


def _holt_linear(series: list[float], steps: int) -> list[float]:
    if len(series) == 1:
        return [series[0]] * steps
    alpha, beta = 0.4, 0.2
    level, trend = series[0], series[1] - series[0]
    for y in series[1:]:
        last = level
        level = alpha * y + (1 - alpha) * (level + trend)
        trend = beta * (level - last) + (1 - beta) * trend
    return [max(0.0, level + h * trend) for h in range(1, steps + 1)]


def _project_amount(history: list[float], category: str, months_of_data: int) -> float:
    if not history:
        return 0.0
    if months_of_data < 2 or len(history) < 2:
        return history[-1]
    if category in FIXED_CATEGORIES:
        return history[-1]
    projected = holt_winters_forecast(history, steps=1, season=min(12, max(3, len(history))))[0]
    return round(projected, 2)


def _generate_recurring_dates(last_date: datetime, now: datetime, horizon_end: datetime, interval_days: int = 30) -> list[datetime]:
    dates = []
    cursor = last_date
    while cursor < now:
        cursor = cursor + timedelta(days=interval_days)
    while cursor <= horizon_end:
        dates.append(cursor)
        cursor = cursor + timedelta(days=interval_days)
    return dates


def build_bill_forecast(
    expenses: list,
    *,
    profile: dict | None = None,
    horizon_days: int = 90,
) -> dict:
    profile = profile or {}
    now = _utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    horizon_end = now + timedelta(days=horizon_days)

    if not expenses and not profile.get('monthlyGrossIncome'):
        return {
            'setupRequired': True,
            'message': 'Add your recurring bills and income to see your 90-day cash flow forecast.',
            'weeks': [],
            'events': [],
            'summary': '',
            'forecastSummary': None,
        }

    months_of_data = _months_span([e for e in expenses if (e.get('category') or '').lower() != 'income'])
    grouped: dict[str, list] = defaultdict(list)
    income_events: list = []

    for exp in expenses:
        cat = (exp.get('category') or 'other').lower()
        if cat == 'income':
            income_events.append(exp)
            continue
        dt = _parse_date(exp.get('dueDate') or exp.get('createdAt'))
        if not dt:
            continue
        grouped[_bill_key(exp)].append({
            'amount': float(exp.get('amount', 0)),
            'date': dt,
            'title': exp.get('title', 'Bill'),
            'category': cat,
            'expectedLargePurchase': bool(exp.get('expectedLargePurchase')),
        })

    timeline_events = []
    for key, items in grouped.items():
        items.sort(key=lambda x: x['date'])
        amounts = [i['amount'] for i in items if not i['expectedLargePurchase']]
        if not amounts:
            amounts = [i['amount'] for i in items]
        cat = items[-1]['category']
        title = items[-1]['title']
        projected = _project_amount(amounts, cat, months_of_data)
        last_date = items[-1]['date']
        future_dates = _generate_recurring_dates(last_date, now, horizon_end)
        if last_date >= now - timedelta(days=7) and last_date <= horizon_end and last_date not in future_dates:
            future_dates = [last_date] + future_dates

        for dt in future_dates:
            if dt < now or dt > horizon_end:
                continue
            timeline_events.append({
                'name': title,
                'amount': -projected,
                'projectedAmount': projected,
                'dueDate': dt.date().isoformat(),
                'category': cat,
                'recurring': not items[-1]['expectedLargePurchase'],
                'nonRecurring': bool(items[-1]['expectedLargePurchase']),
                'smoothingUsed': months_of_data >= 2 and cat not in FIXED_CATEGORIES,
            })

    monthly_income = float(profile.get('monthlyGrossIncome', 0))
    if income_events:
        inc_amounts = [float(e.get('amount', 0)) for e in income_events]
        if months_of_data >= 2 and len(inc_amounts) >= 2:
            monthly_income = _project_amount(inc_amounts, 'other', months_of_data)
        elif inc_amounts:
            monthly_income = inc_amounts[-1]

    weekly_income = monthly_income / 4.33 if monthly_income else 0.0
    starting_balance = float(profile.get('currentBalance', 0))
    if starting_balance == 0 and monthly_income:
        spent = sum(float(e.get('amount', 0)) for e in expenses if not e.get('paid') and (e.get('category') or '').lower() != 'income')
        starting_balance = max(0.0, monthly_income - spent)

    weeks = []
    running = starting_balance
    tight_weeks = []
    week_start = now - timedelta(days=now.weekday())

    for w in range(13):
        ws = week_start + timedelta(weeks=w)
        we = ws + timedelta(days=6)
        if ws > horizon_end:
            break

        week_bills = [e for e in timeline_events if ws.date() <= datetime.fromisoformat(e['dueDate']).date() <= we.date()]
        bill_total = sum(abs(e['projectedAmount']) for e in week_bills)
        income = weekly_income
        net = round(income - bill_total, 2)
        running = round(running + net, 2)

        week_doc = {
            'weekStart': ws.date().isoformat(),
            'weekEnd': we.date().isoformat(),
            'income': round(income, 2),
            'bills': round(bill_total, 2),
            'netCashFlow': net,
            'runningBalance': running,
            'events': week_bills,
            'isTight': net < 0,
            'tightLabel': f'Tight week: ${net:.0f} projected' if net < 0 else None,
        }
        weeks.append(week_doc)
        if net < 0:
            tight_weeks.append(ws.strftime('%B %-d') if hasattr(ws, 'strftime') else ws.date().isoformat())

    tight_labels = []
    for w in weeks:
        if w['isTight']:
            d = datetime.fromisoformat(w['weekStart'])
            tight_labels.append(d.strftime('%B %d'))

    if len(tight_labels) >= 2:
        summary = f"You have {len(tight_labels)} tight weeks in the next 90 days — {tight_labels[0]} and {tight_labels[1]}"
    elif len(tight_labels) == 1:
        summary = f"You have 1 tight week in the next 90 days — {tight_labels[0]}"
    else:
        summary = 'No tight weeks projected in the next 90 days.'

    next_critical = next((w for w in weeks if w['isTight']), None)
    forecast_summary = None
    if next_critical:
        forecast_summary = {
            'nextCriticalDate': next_critical['weekStart'],
            'nextCriticalNet': next_critical['netCashFlow'],
            'tightWeekCount': len(tight_labels),
            'summary': summary,
        }

    return {
        'setupRequired': False,
        'startingBalance': round(starting_balance, 2),
        'monthlyIncome': round(monthly_income, 2),
        'smoothingMode': 'holt_winters' if months_of_data >= 2 else 'flat',
        'monthsOfHistory': months_of_data,
        'weeks': weeks,
        'events': timeline_events,
        'tightWeeks': tight_labels,
        'summary': summary,
        'forecastSummary': forecast_summary,
    }
