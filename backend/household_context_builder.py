"""Build retrieval-augmented household context for AI prompts."""
from datetime import datetime, timedelta, timezone

from database import get_db
from household_service import ensure_user_household


def _utcnow():
    return datetime.now(timezone.utc)


def _coerce_utc_datetime(value):
    if not value:
        return None
    if isinstance(value, str):
        value = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if isinstance(value, datetime) and value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value


def _days_until(expires_at) -> int:
    expires_at = _coerce_utc_datetime(expires_at)
    if not expires_at:
        return 999
    delta = expires_at - _utcnow()
    return max(0, delta.days)


def _parse_date(value):
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


def _days_since(created_at) -> int:
    dt = _parse_date(created_at)
    if not dt:
        return 0
    return max(0, (_utcnow() - dt).days)


def _days_until_due(due_date) -> int | None:
    dt = _parse_date(due_date)
    if not dt:
        return None
    return (_utcnow() - dt).days * -1  # negative if overdue


def _month_window():
    now = _utcnow()
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end


def _is_in_month(value, start, end) -> bool:
    dt = _parse_date(value)
    return bool(dt and start <= dt < end)


def build_rag_household_context(user) -> dict:
    """Pull live household data from MongoDB for AI RAG injection."""
    household_id = ensure_user_household(user)
    db = get_db()
    scope = {'householdId': household_id}

    inventory = list(db.inventory.find(scope).sort('expiresAt', 1))
    maintenance = list(db.maintenance.find(scope).sort('createdAt', -1))
    expenses = list(db.expenses.find(scope).sort('dueDate', 1))
    documents = list(db.documents.find(scope).sort('expiresAt', 1))
    goals = list(db.financial_goals.find(scope))
    utilities = list(db.utilities.find(scope).sort('createdAt', -1))

    expiring_food = []
    for item in inventory:
        days = _days_until(item.get('expiresAt'))
        if days <= 7:
            expiring_food.append({
                'name': item.get('name', 'Item'),
                'daysRemaining': days,
                'location': item.get('location', 'fridge'),
            })

    open_maintenance = []
    for req in maintenance:
        status = (req.get('status') or 'open').lower()
        if status in ('completed', 'resolved', 'closed'):
            continue
        open_maintenance.append({
            'title': req.get('title', 'Request'),
            'category': req.get('location') or req.get('category') or 'general',
            'priority': req.get('priority', 'medium'),
            'daysOpen': _days_since(req.get('createdAt')),
            'status': status,
        })

    month_start, month_end = _month_window()
    month_expenses = [e for e in expenses if _is_in_month(e.get('dueDate') or e.get('createdAt'), month_start, month_end)]
    spent_this_month = sum(float(e.get('amount', 0)) for e in month_expenses if e.get('paid'))
    unpaid_this_month = sum(float(e.get('amount', 0)) for e in month_expenses if not e.get('paid'))

    rent_items = [
        e for e in expenses
        if (e.get('category') or '').lower() == 'rent' or 'rent' in (e.get('title') or '').lower()
    ]
    rent_due = None
    for rent in rent_items:
        if not rent.get('paid'):
            days = _days_until_due(rent.get('dueDate'))
            rent_due = {
                'title': rent.get('title', 'Rent'),
                'amount': float(rent.get('amount', 0)),
                'dueDate': rent.get('dueDate', ''),
                'daysUntilDue': days,
                'paid': False,
            }
            break
    if not rent_due and rent_items:
        r = rent_items[0]
        rent_due = {
            'title': r.get('title', 'Rent'),
            'amount': float(r.get('amount', 0)),
            'dueDate': r.get('dueDate', ''),
            'daysUntilDue': _days_until_due(r.get('dueDate')),
            'paid': bool(r.get('paid')),
        }

    upcoming_bills = []
    for exp in expenses:
        if exp.get('paid'):
            continue
        days = _days_until_due(exp.get('dueDate'))
        if days is None or days > 14:
            continue
        upcoming_bills.append({
            'title': exp.get('title', 'Bill'),
            'amount': float(exp.get('amount', 0)),
            'dueDate': exp.get('dueDate', ''),
            'daysUntilDue': days,
            'category': exp.get('category', 'other'),
        })
    upcoming_bills.sort(key=lambda b: b.get('daysUntilDue') if b.get('daysUntilDue') is not None else 99)

    expiring_docs = []
    for doc in documents:
        days = _days_until(doc.get('expiresAt'))
        if doc.get('expiresAt') and days <= 30:
            expiring_docs.append({
                'title': doc.get('title', 'Document'),
                'category': doc.get('category', 'other'),
                'daysUntilExpiry': days,
            })

    # Health score (same formula as dashboard)
    expiring_count = sum(1 for i in inventory if _days_until(i.get('expiresAt')) <= 3)
    pending_chores = db.chores.count_documents({**scope, 'completed': {'$ne': True}})
    unpaid_count = sum(1 for e in expenses if not e.get('paid'))
    packages_expected = db.packages.count_documents({**scope, 'status': 'expected'})
    health = 100
    health -= min(30, expiring_count * 8)
    health -= min(25, pending_chores * 5)
    health -= min(25, unpaid_count * 10)
    health -= min(10, packages_expected * 2)
    health = max(10, health)

    goal_summaries = []
    for g in goals[:5]:
        target = float(g.get('targetAmount', 0) or 0)
        saved = float(g.get('savedAmount', 0) or 0)
        pct = int(round((saved / target) * 100)) if target > 0 else 0
        goal_summaries.append({
            'title': g.get('title', 'Goal'),
            'saved': saved,
            'target': target,
            'progressPct': pct,
        })

    budget_note = (
        f"Spent ${spent_this_month:.0f} this month on paid bills; "
        f"${unpaid_this_month:.0f} still unpaid."
    )
    if goal_summaries:
        budget_note += f" Active savings goals: {len(goal_summaries)}."

    data = {
        'householdId': household_id,
        'healthScore': health,
        'expiringFoodNext7Days': expiring_food,
        'openMaintenance': open_maintenance,
        'rent': rent_due,
        'budget': {
            'spentThisMonth': round(spent_this_month, 2),
            'unpaidThisMonth': round(unpaid_this_month, 2),
            'note': budget_note,
            'savingsGoals': goal_summaries,
        },
        'upcomingBillsNext14Days': upcoming_bills,
        'expiringDocumentsNext30Days': expiring_docs,
        'utilityReadingsCount': len(utilities),
    }
    data['formatted'] = format_rag_for_prompt(data)
    return data


def format_rag_for_prompt(ctx: dict) -> str:
    """Human-readable block injected into the AI system/user prompt."""
    lines = ['=== LIVE HOUSEHOLD DATA (use these specifics in your answer) ===']

    lines.append(f"Household health score: {ctx.get('healthScore', '—')}/100")

    food = ctx.get('expiringFoodNext7Days') or []
    if food:
        items = ', '.join(
            f"{f['name']} ({f['daysRemaining']} day{'s' if f['daysRemaining'] != 1 else ''} left — not expired yet)"
            if f['daysRemaining'] > 0
            else f"{f['name']} (expires today)"
            for f in food
        )
        lines.append(f"Fridge expiring within 7 days: {items}")
    else:
        lines.append('Fridge expiring within 7 days: none tracked')

    maint = ctx.get('openMaintenance') or []
    if maint:
        parts = [
            f"{m['title']} ({m.get('category', 'general')}, open {m['daysOpen']} day(s), {m.get('priority', 'medium')} priority)"
            for m in maint
        ]
        lines.append(f"Open maintenance: {'; '.join(parts)}")
    else:
        lines.append('Open maintenance: none')

    rent = ctx.get('rent')
    if rent:
        due = rent.get('daysUntilDue')
        due_str = f"due in {due} day(s)" if due is not None and due >= 0 else 'overdue or no date'
        paid = 'paid' if rent.get('paid') else 'unpaid'
        lines.append(
            f"Rent: ${rent.get('amount', 0):.0f} ({paid}, {due_str}, due date {rent.get('dueDate') or 'not set'})"
        )
    else:
        lines.append('Rent: not tracked in bills')

    budget = ctx.get('budget') or {}
    lines.append(f"Budget this month: {budget.get('note', 'no expense data')}")
    for g in budget.get('savingsGoals') or []:
        lines.append(
            f"  Savings goal \"{g['title']}\": ${g['saved']:.0f} / ${g['target']:.0f} ({g['progressPct']}%)"
        )

    bills = ctx.get('upcomingBillsNext14Days') or []
    if bills:
        bill_parts = [
            f"{b['title']} ${b['amount']:.0f} (in {b['daysUntilDue']}d)"
            for b in bills[:6]
        ]
        lines.append(f"Bills due in next 14 days: {'; '.join(bill_parts)}")
    else:
        lines.append('Bills due in next 14 days: none')

    docs = ctx.get('expiringDocumentsNext30Days') or []
    if docs:
        doc_parts = [f"{d['title']} ({d['daysUntilExpiry']}d)" for d in docs]
        lines.append(f"Documents expiring within 30 days: {'; '.join(doc_parts)}")
    else:
        lines.append('Documents expiring within 30 days: none')

    lines.append(
        '=== END HOUSEHOLD DATA — Reference specific items above; do not give generic advice when data exists ==='
    )
    return '\n'.join(lines)
