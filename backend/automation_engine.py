"""Event-condition-action automation rules engine."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

BUILTIN_RULE_SPECS = [
    {
        'ruleKey': 'fridge_expiry_shopping',
        'name': 'Fridge expiry → shopping list',
        'trigger': {'type': 'fridge_expiry', 'daysUntilExpiry': 2},
        'condition': {'type': 'not_on_shopping_list'},
        'action': {'type': 'add_shopping_and_notify'},
    },
    {
        'ruleKey': 'stale_maintenance_landlord',
        'name': 'Stale maintenance → landlord reminder',
        'trigger': {'type': 'maintenance_open_days', 'daysOpen': 7},
        'condition': {'type': 'status_open_or_pending'},
        'action': {'type': 'notify_owner_maintenance'},
    },
    {
        'ruleKey': 'rent_due_3_days',
        'name': 'Rent due in 3 days',
        'trigger': {'type': 'rent_due_days', 'daysUntilDue': 3},
        'condition': {'type': 'rent_unpaid'},
        'action': {'type': 'notify_rent_due'},
    },
    {
        'ruleKey': 'document_expiry_30_days',
        'name': 'Document expiring within 30 days',
        'trigger': {'type': 'document_expiry', 'daysUntilExpiry': 30},
        'condition': {'type': 'not_fired_this_month'},
        'action': {'type': 'dashboard_and_notify_document'},
    },
]


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


def _days_until(value) -> int:
    dt = _coerce_dt(value)
    if not dt:
        return 999
    return max(0, (dt - _utcnow()).days)


def _days_since(value) -> int:
    dt = _coerce_dt(value)
    if not dt:
        return 0
    return max(0, (_utcnow() - dt).days)


def ensure_builtin_rules(db, household_id: str) -> None:
    now = _utcnow()
    for spec in BUILTIN_RULE_SPECS:
        db.automation_rules.update_one(
            {'householdId': household_id, 'ruleKey': spec['ruleKey']},
            {'$setOnInsert': {
                'householdId': household_id,
                'ruleKey': spec['ruleKey'],
                'name': spec['name'],
                'trigger': spec['trigger'],
                'condition': spec['condition'],
                'action': spec['action'],
                'enabled': True,
                'builtin': True,
                'createdAt': now,
            }},
            upsert=True,
        )


def _already_fired(db, household_id: str, rule_key: str, entity_key: str, period_key: str = '') -> bool:
    q = {
        'householdId': household_id,
        'ruleKey': rule_key,
        'entityKey': entity_key,
    }
    if period_key:
        q['periodKey'] = period_key
    return db.automation_firings.find_one(q) is not None


def _record_firing(db, household_id: str, rule_key: str, entity_key: str, message: str, period_key: str = '') -> None:
    now = _utcnow()
    db.automation_firings.insert_one({
        'householdId': household_id,
        'ruleKey': rule_key,
        'entityKey': entity_key,
        'periodKey': period_key,
        'message': message,
        'firedAt': now,
    })
    db.automation_rules.update_one(
        {'householdId': household_id, 'ruleKey': rule_key},
        {'$set': {'lastFired': now}},
    )
    db.automation_events.insert_one({
        'householdId': household_id,
        'ruleKey': rule_key,
        'entityKey': entity_key,
        'message': message,
        'createdAt': now,
    })
    print(f"[automation] {message}")


def _on_shopping_list(db, household_id: str, name: str) -> bool:
    return bool(db.shopping_list.find_one({
        'householdId': household_id,
        'name': {'$regex': f'^{name}$', '$options': 'i'},
        'completed': {'$ne': True},
    }))


def _add_shopping(db, household_id: str, name: str, *, source: str = 'automation', inventory_item_id: str | None = None) -> None:
    db.shopping_list.update_one(
        {'householdId': household_id, 'name': name, 'completed': {'$ne': True}},
        {'$setOnInsert': {
            'householdId': household_id,
            'name': name,
            'source': source,
            'inventoryItemId': inventory_item_id,
            'autoAdded': True,
            'completed': False,
            'createdAt': _utcnow(),
        }},
        upsert=True,
    )


def run_rules_for_household(db, household_id: str, *, force: bool = False) -> list[dict]:
    ensure_builtin_rules(db, household_id)
    scope = {'householdId': household_id}
    rules = list(db.automation_rules.find({**scope, 'enabled': True}))
    fired = []

    inventory = list(db.inventory.find(scope))
    maintenance = list(db.maintenance.find(scope))
    expenses = list(db.expenses.find(scope))
    documents = list(db.documents.find(scope))

    for rule in rules:
        key = rule.get('ruleKey', '')

        if key == 'fridge_expiry_shopping':
            for item in inventory:
                days = _days_until(item.get('expiresAt'))
                if days > 2:
                    continue
                name = item.get('name', 'Item')
                entity = str(item['_id'])
                if not force and _already_fired(db, household_id, key, entity):
                    continue
                if _on_shopping_list(db, household_id, name):
                    continue
                day_label = 'today' if days == 0 else f'in {days} day(s)'
                message = f"{name} expires {day_label} — added to your shopping list"
                _add_shopping(db, household_id, name, inventory_item_id=entity)
                _record_firing(db, household_id, key, entity, message)
                if days <= 1:
                    try:
                        from household_service import get_household_member_user_ids
                        from push_service import send_push_to_user
                        for uid in get_household_member_user_ids(household_id):
                            send_push_to_user(uid, "Fridge Alert 🍉", message)
                    except Exception as e:
                        print(f"[push] Error sending fridge push: {e}")
                fired.append({'ruleKey': key, 'message': message})

        elif key == 'stale_maintenance_landlord':
            for req in maintenance:
                status = (req.get('status') or 'open').lower()
                if status in ('completed', 'resolved', 'closed'):
                    continue
                days_open = _days_since(req.get('createdAt'))
                if days_open < 7:
                    continue
                entity = str(req['_id'])
                if not force and _already_fired(db, household_id, key, entity):
                    continue
                category = req.get('location') or req.get('category') or req.get('title', 'maintenance')
                message = (
                    f"Your {category} maintenance request has been open for {days_open} days. "
                    f"Consider following up with your landlord."
                )
                _record_firing(db, household_id, key, entity, message)
                fired.append({'ruleKey': key, 'message': message})

        elif key == 'rent_due_3_days':
            for exp in expenses:
                cat = (exp.get('category') or '').lower()
                title = (exp.get('title') or '').lower()
                if cat != 'rent' and 'rent' not in title:
                    continue
                if exp.get('paid'):
                    continue
                days = _days_until(exp.get('dueDate'))
                if days < 2 or days > 3:
                    continue
                entity = str(exp['_id'])
                period = exp.get('dueDate', '')[:7]
                fire_key = f"{entity}:{period}"
                if not force and _already_fired(db, household_id, key, fire_key):
                    continue
                amount = float(exp.get('amount', 0))
                due = exp.get('dueDate', '')
                message = f"Rent of ${amount:.0f} is due in {days} days on {due}. Tap to pay."
                _record_firing(db, household_id, key, fire_key, message)
                try:
                    from household_service import get_household_member_user_ids
                    from push_service import send_push_to_user
                    for uid in get_household_member_user_ids(household_id):
                        send_push_to_user(uid, "Rent Reminder 🏠", message)
                except Exception as e:
                    print(f"[push] Error sending rent push: {e}")
                fired.append({'ruleKey': key, 'message': message})

        elif key == 'document_expiry_30_days':
            for doc in documents:
                if not doc.get('expiresAt'):
                    continue
                days = _days_until(doc.get('expiresAt'))
                if days > 30:
                    continue
                entity = str(doc['_id'])
                period_key = _utcnow().strftime('%Y-%m')
                if not force and _already_fired(db, household_id, key, entity, period_key):
                    continue
                title = doc.get('title', 'Document')
                message = f"Your {title} expires in {days} days. Tap to renew."
                db.document_expiry_alerts.update_one(
                    {'householdId': household_id, 'documentId': entity},
                    {'$set': {
                        'title': title,
                        'daysUntilExpiry': days,
                        'urgency': 'high' if days <= 7 else 'medium',
                        'message': message,
                        'updatedAt': _utcnow(),
                    }},
                    upsert=True,
                )
                _record_firing(db, household_id, key, entity, message, period_key)
                fired.append({'ruleKey': key, 'message': message})

    return fired


def run_all_households(db) -> int:
    count = 0
    for hh in db.households.find({}, {'_id': 1}):
        fired = run_rules_for_household(db, str(hh['_id']))
        count += len(fired)
    return count


def serialize_rule(doc) -> dict:
    return {
        'id': str(doc['_id']),
        'ruleKey': doc.get('ruleKey', ''),
        'name': doc.get('name', ''),
        'trigger': doc.get('trigger', {}),
        'condition': doc.get('condition', {}),
        'action': doc.get('action', {}),
        'enabled': bool(doc.get('enabled', True)),
        'builtin': bool(doc.get('builtin', False)),
        'lastFired': doc.get('lastFired').isoformat() if doc.get('lastFired') else None,
        'createdAt': doc.get('createdAt').isoformat() if doc.get('createdAt') else None,
    }
