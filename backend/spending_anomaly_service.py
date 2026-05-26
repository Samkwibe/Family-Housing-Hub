"""Z-score spending anomaly detection on rolling 90-day category baselines."""
from __future__ import annotations

import statistics
from datetime import datetime, timedelta, timezone

CATEGORY_LABELS = {
    'utility': 'utility bill',
    'electric': 'electricity bill',
    'internet': 'internet bill',
    'subscription': 'subscription',
    'rent': 'rent',
    'insurance': 'insurance bill',
    'gas': 'gas bill',
    'water': 'water bill',
    'other': 'expense',
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


def _expense_date(exp) -> datetime | None:
    return _parse_date(exp.get('dueDate')) or _parse_date(exp.get('createdAt'))


def _category(exp) -> str:
    return (exp.get('category') or 'other').strip().lower()


def _bill_label(category: str, title: str) -> str:
    t = (title or '').lower()
    if category == 'utility' or category == 'electric':
        if 'electric' in t:
            return 'electricity bill'
        if 'water' in t:
            return 'water bill'
        if 'gas' in t:
            return 'gas bill'
    if category in CATEGORY_LABELS:
        return CATEGORY_LABELS[category]
    return (title or category or 'expense').strip() or 'expense'


def _months_represented(expenses, *, category: str, window_start: datetime, exclude_ids: set[str] | None = None) -> int:
    months: set[tuple[int, int]] = set()
    exclude_ids = exclude_ids or set()
    for exp in expenses:
        if str(exp.get('_id')) in exclude_ids:
            continue
        if exp.get('expectedLargePurchase'):
            continue
        if _category(exp) != category:
            continue
        dt = _expense_date(exp)
        if not dt or dt < window_start:
            continue
        months.add((dt.year, dt.month))
    return len(months)


def _baseline_amounts(
    expenses,
    *,
    category: str,
    window_start: datetime,
    exclude_ids: set[str] | None = None,
) -> list[float]:
    exclude_ids = exclude_ids or set()
    amounts: list[float] = []
    for exp in expenses:
        if str(exp.get('_id')) in exclude_ids:
            continue
        if exp.get('expectedLargePurchase'):
            continue
        if _category(exp) != category:
            continue
        dt = _expense_date(exp)
        if not dt or dt < window_start:
            continue
        amounts.append(float(exp.get('amount', 0)))
    return amounts


def _rent_month_change(expenses, current_exp) -> bool:
    """Rent: only flag when amount changes month-over-month."""
    rents = []
    for exp in expenses:
        if _category(exp) != 'rent' or exp.get('expectedLargePurchase'):
            continue
        dt = _expense_date(exp)
        if not dt:
            continue
        rents.append((dt.year, dt.month, float(exp.get('amount', 0)), str(exp.get('_id'))))
    if not rents:
        return False
    rents.sort(key=lambda r: (r[0], r[1]))
    by_month: dict[tuple[int, int], float] = {}
    for y, m, amt, _ in rents:
        by_month[(y, m)] = amt
    months = sorted(by_month.keys())
    if len(months) < 2:
        return False
    curr_dt = _expense_date(current_exp)
    if not curr_dt:
        return False
    curr_key = (curr_dt.year, curr_dt.month)
    if curr_key not in by_month:
        return False
    idx = months.index(curr_key)
    if idx == 0:
        return False
    prev_amt = by_month[months[idx - 1]]
    curr_amt = by_month[curr_key]
    return curr_amt > prev_amt * 1.01


def _build_message(label: str, amount: float, avg: float, pct: float, months: int) -> str:
    period = f'{months}-month average' if months != 1 else 'average'
    return (
        f"Your {label} this month (${amount:.0f}) is {pct:.0f}% above your {period} "
        f"(${avg:.0f}). That's unusual — worth checking if something was left on."
    )


def _analyze_expense(exp, expenses, *, window_start: datetime) -> dict | None:
    category = _category(exp)
    exclude = {str(exp.get('_id'))}
    months = _months_represented(expenses, category=category, window_start=window_start, exclude_ids=exclude)
    if months < 3:
        return None

    if category == 'rent' and not _rent_month_change(expenses, exp):
        return None

    baseline = _baseline_amounts(expenses, category=category, window_start=window_start, exclude_ids=exclude)
    if len(baseline) < 2:
        return None

    amount = float(exp.get('amount', 0))
    avg = statistics.mean(baseline)
    if avg <= 0:
        return None

    pct_above = ((amount - avg) / avg) * 100
    if pct_above < 30:
        return None

    stdev = statistics.pstdev(baseline) if len(baseline) > 1 else 0.0
    z_score = (amount - avg) / stdev if stdev > 0 else (2.5 if amount > avg else 0.0)

    if z_score < 1.5:
        return None

    severity = 'alert' if z_score >= 2.0 else 'warning'
    label = _bill_label(category, exp.get('title', ''))
    message = _build_message(label, amount, avg, pct_above, months)

    return {
        'expenseId': str(exp.get('_id')),
        'category': category,
        'title': exp.get('title', ''),
        'amount': round(amount, 2),
        'avgAmount': round(avg, 2),
        'pctAboveAvg': round(pct_above, 1),
        'zScore': round(z_score, 2),
        'severity': severity,
        'message': message,
        'monthsOfHistory': months,
    }


def detect_spending_anomalies(expenses, *, focus_expense_id: str | None = None) -> list[dict]:
    """Return active spending anomalies for a household's expense list."""
    now = _utcnow()
    window_start = now - timedelta(days=90)
    current_month = (now.year, now.month)
    anomalies: list[dict] = []
    seen: set[str] = set()

    candidates = []
    for exp in expenses:
        if exp.get('expectedLargePurchase'):
            continue
        dt = _expense_date(exp)
        if not dt or dt < window_start:
            continue
        if focus_expense_id and str(exp.get('_id')) != focus_expense_id:
            if (dt.year, dt.month) != current_month:
                continue
        elif (dt.year, dt.month) != current_month:
            continue
        candidates.append(exp)

    if focus_expense_id:
        focused = [e for e in expenses if str(e.get('_id')) == focus_expense_id]
        candidates = focused or candidates

    for exp in candidates:
        eid = str(exp.get('_id'))
        if eid in seen:
            continue
        result = _analyze_expense(exp, expenses, window_start=window_start)
        if result:
            result['id'] = f"spending-{eid}"
            anomalies.append(result)
            seen.add(eid)

    anomalies.sort(key=lambda a: (-a['zScore'], -a['pctAboveAvg']))
    return anomalies


def anomalies_to_alerts(anomalies: list[dict]) -> list[dict]:
    alerts = []
    for a in anomalies:
        urgency = 'high' if a['severity'] == 'alert' else 'medium'
        alerts.append({
            'id': a['id'],
            'type': 'spending',
            'title': f"Unusual {a['category']} spending",
            'body': a['message'],
            'urgency': urgency,
            'actionSlug': 'budget',
            'aiPrompt': f"My {a['title']} seems high this month. What should I check?",
            'spendingAnomaly': a,
        })
    return alerts


def record_new_anomaly_notifications(db, household_id: str, anomalies: list[dict]) -> list[dict]:
    """Persist first-seen anomalies and emit push-style events once per expense."""
    new_events = []
    for a in anomalies:
        expense_id = a['expenseId']
        existing = db.spending_anomaly_notifications.find_one({
            'householdId': household_id,
            'expenseId': expense_id,
        })
        if existing:
            continue
        doc = {
            'householdId': household_id,
            'expenseId': expense_id,
            'category': a['category'],
            'message': a['message'],
            'severity': a['severity'],
            'zScore': a['zScore'],
            'pctAboveAvg': a['pctAboveAvg'],
            'amount': a['amount'],
            'avgAmount': a['avgAmount'],
            'createdAt': _utcnow(),
            'pushSent': False,
        }
        db.spending_anomaly_notifications.insert_one(doc)
        new_events.append(a)
        print(f"[push] Spending anomaly ({a['severity']}): {a['message']}")
        db.spending_anomaly_notifications.update_one(
            {'householdId': household_id, 'expenseId': expense_id},
            {'$set': {'pushSent': True}},
        )
    return new_events
