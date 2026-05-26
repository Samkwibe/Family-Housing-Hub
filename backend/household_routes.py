"""User-scoped household data — inventory, chores, expenses (MongoDB)."""
import time
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from flask import Blueprint, jsonify, request

from auth_routes import get_current_user_doc
from dashboard_cache_service import get_cached_dashboard, set_cached_dashboard
from database import get_db
from encryption_service import (
    DOCUMENT_FILE_KEY_FIELDS,
    EMERGENCY_FIELDS,
    decrypt_fields,
    decrypt_value,
    encrypt_fields,
    encrypt_value,
)
from household_service import (
    accept_household_invite,
    build_members_for_household,
    create_household,
    create_household_invite,
    ensure_user_household,
    get_invite_preview,
    list_user_households,
    switch_active_household,
)
from spending_anomaly_service import (
    anomalies_to_alerts,
    detect_spending_anomalies,
    record_new_anomaly_notifications,
)
from notification_ranking_service import partition_digest, rank_alerts
from financial_routes import build_financial_dashboard_bundle
from automation_engine import ensure_builtin_rules, serialize_rule
from automation_routes import get_document_expiry_alerts
from maintenance_prediction_service import predict_maintenance
from permission_graph_service import get_member_role, require_permission
from document_expiry_risk_service import rank_documents_by_risk
from household_write_hooks import after_household_write
from job_queue import enqueue
from tasks import detect_spending_anomaly_task, generate_ai_tips_task, get_cached_ai_tips

household_bp = Blueprint('household', __name__, url_prefix='/api/household')


def _notify_household(household_id: str, entity: str, payload: dict | None = None) -> None:
    after_household_write(household_id, entity, payload)


def _utcnow():
    return datetime.now(timezone.utc)


def _user_id(user) -> str:
    return str(user['_id'])


def _require_user():
    user = get_current_user_doc()
    if not user:
        return None, (jsonify({'error': 'Authentication required'}), 401)
    return user, None


def _hid(user) -> str:
    return ensure_user_household(user)


def _scope(user) -> dict:
    return {'householdId': _hid(user)}


def _deny_unless_permission(user, data_type: str):
    ok, msg = require_permission(_user_id(user), _hid(user), data_type)
    if not ok:
        return jsonify({'error': msg or 'Access denied'}), 403
    return None


def _coerce_utc_datetime(value):
    """Parse date strings and ensure timezone-aware UTC for comparisons."""
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


def _serialize_inventory(doc) -> dict:
    expires_at = doc.get('expiresAt')
    return {
        'id': str(doc['_id']),
        'name': doc.get('name', ''),
        'location': doc.get('location', 'fridge'),
        'quantity': doc.get('quantity', ''),
        'expiresAt': expires_at.isoformat() if hasattr(expires_at, 'isoformat') else expires_at,
        'expiresInDays': _days_until(expires_at),
    }


def _serialize_chore(doc) -> dict:
    return {
        'id': str(doc['_id']),
        'title': doc.get('title', ''),
        'assignee': doc.get('assignee', ''),
        'dueDate': doc.get('dueDate', ''),
        'completed': bool(doc.get('completed')),
        'priority': doc.get('priority', 'medium'),
    }


def _serialize_expense(doc, anomaly_map: dict | None = None) -> dict:
    eid = str(doc['_id'])
    out = {
        'id': eid,
        'title': doc.get('title', ''),
        'category': doc.get('category', 'other'),
        'amount': float(doc.get('amount', 0)),
        'dueDate': doc.get('dueDate', ''),
        'paid': bool(doc.get('paid')),
        'splits': doc.get('splits', []),
        'expectedLargePurchase': bool(doc.get('expectedLargePurchase')),
    }
    if anomaly_map and eid in anomaly_map:
        out['spendingAnomaly'] = anomaly_map[eid]
    return out


def _serialize_maintenance(doc) -> dict:
    return {
        'id': str(doc['_id']),
        'title': doc.get('title', ''),
        'description': doc.get('description', ''),
        'location': doc.get('location', ''),
        'status': doc.get('status', 'open'),
        'priority': doc.get('priority', 'medium'),
        'rating': doc.get('rating'),
        'createdAt': doc.get('createdAt').isoformat() if doc.get('createdAt') else '',
    }


def _serialize_package(doc) -> dict:
    return {
        'id': str(doc['_id']),
        'title': doc.get('title', ''),
        'carrier': doc.get('carrier', ''),
        'trackingNumber': doc.get('trackingNumber', ''),
        'status': doc.get('status', 'expected'),
        'eta': doc.get('eta', ''),
        'notes': doc.get('notes', ''),
    }


def _serialize_document(doc) -> dict:
    doc = decrypt_fields(doc, DOCUMENT_FILE_KEY_FIELDS) if doc else doc
    expires_at = doc.get('expiresAt') if doc else None
    out = {
        'id': str(doc['_id']),
        'title': doc.get('title', ''),
        'category': doc.get('category', 'other'),
        'fileType': doc.get('fileType', ''),
        'notes': doc.get('notes', ''),
        'expiresAt': expires_at.isoformat() if hasattr(expires_at, 'isoformat') else expires_at or '',
        'createdAt': doc.get('createdAt').isoformat() if doc.get('createdAt') else '',
        'fileKey': doc.get('fileKey', ''),
        'fileName': doc.get('fileName', ''),
        'mimeType': doc.get('mimeType', ''),
        'hasFile': bool(doc.get('fileKey')),
    }
    file_key = doc.get('fileKey')
    if file_key:
        try:
            from storage_service import create_presigned_download, storage_configured
            if storage_configured():
                out['downloadUrl'] = create_presigned_download(
                    file_key,
                    filename=doc.get('fileName') or doc.get('title'),
                )
        except Exception:
            pass
    return out


def _serialize_device(doc) -> dict:
    return {
        'id': str(doc['_id']),
        'name': doc.get('name', ''),
        'deviceType': doc.get('deviceType', 'other'),
        'location': doc.get('location', ''),
        'status': doc.get('status', 'offline'),
        'state': doc.get('state', ''),
        'brand': doc.get('brand', ''),
    }


def _serialize_goal(doc) -> dict:
    target = float(doc.get('targetAmount', 0))
    saved = float(doc.get('savedAmount', 0))
    pct = int(min(100, round((saved / target) * 100))) if target > 0 else 0
    return {
        'id': str(doc['_id']),
        'title': doc.get('title', ''),
        'icon': doc.get('icon', 'flag'),
        'targetAmount': target,
        'savedAmount': saved,
        'targetDate': doc.get('targetDate', ''),
        'progressPct': pct,
    }


def _serialize_utility(doc) -> dict:
    return {
        'id': str(doc['_id']),
        'utilityType': doc.get('utilityType', 'electric'),
        'amount': float(doc.get('amount', 0)),
        'period': doc.get('period', ''),
        'usageKwh': doc.get('usageKwh'),
    }


def _serialize_checklist_item(doc) -> dict:
    out = {
        'id': str(doc['_id']),
        'room': doc.get('room', ''),
        'task': doc.get('task', ''),
        'completed': bool(doc.get('completed')),
        'checklistType': doc.get('checklistType', 'move-in'),
        'notes': doc.get('notes', ''),
        'condition': doc.get('condition', 'good'),
        'status': doc.get('status', ''),
        'verified': doc.get('verified'),
        'itemType': doc.get('itemType', ''),
        'ageYears': doc.get('ageYears'),
        'photoKey': doc.get('photoKey', ''),
        'hasPhoto': bool(doc.get('photoKey')),
    }
    if doc.get('photoKey'):
        try:
            from storage_service import create_presigned_download, storage_configured
            if storage_configured():
                out['photoUrl'] = create_presigned_download(doc['photoKey'])
        except Exception:
            pass
    return out


def _serialize_health_reminder(doc) -> dict:
    return {
        'id': str(doc['_id']),
        'title': doc.get('title', ''),
        'assignee': doc.get('assignee', ''),
        'dueDate': doc.get('dueDate', ''),
        'reminderType': doc.get('reminderType', 'checkup'),
    }


def _serialize_emergency_profile(doc) -> dict:
    doc = decrypt_fields(doc, EMERGENCY_FIELDS) if doc else doc
    if not doc:
        return {
            'contactName': '',
            'contactPhone': '',
            'addressNotes': '',
            'medicalNotes': '',
        }
    return {
        'contactName': doc.get('contactName', ''),
        'contactPhone': doc.get('contactPhone', ''),
        'addressNotes': doc.get('addressNotes', ''),
        'medicalNotes': doc.get('medicalNotes', ''),
    }


def _serialize_community_post(doc) -> dict:
    return {
        'id': str(doc['_id']),
        'authorName': doc.get('authorName', 'Neighbor'),
        'body': doc.get('body', ''),
        'category': doc.get('category', 'general'),
        'createdAt': doc.get('createdAt').isoformat() if doc.get('createdAt') else '',
    }


def _build_utility_summary(utilities) -> dict:
    by_type = {'electric': [], 'water': [], 'gas': []}
    for u in utilities:
        t = u.get('utilityType', 'electric')
        if t in by_type:
            by_type[t].append(float(u.get('amount', 0)))
    totals = {k: (sum(v) / len(v) if v else 0) for k, v in by_type.items()}
    electric = [float(u.get('amount', 0)) for u in utilities if u.get('utilityType') == 'electric']
    spike = 0
    if len(electric) >= 2 and electric[-2] > 0:
        spike = int(round(((electric[-1] - electric[-2]) / electric[-2]) * 100))
    return {
        'electricAvg': round(totals['electric'], 2),
        'waterAvg': round(totals['water'], 2),
        'gasAvg': round(totals['gas'], 2),
        'energySpikePct': spike,
        'readings': [_serialize_utility(u) for u in utilities[:12]],
    }


MOVE_IN_TEMPLATE = [
    ('Living Room', 'Walls — note condition'),
    ('Living Room', 'Flooring — note condition'),
    ('Living Room', 'Windows — check seals'),
    ('Kitchen', 'Appliances — test all'),
    ('Kitchen', 'Cabinets — inspect'),
    ('Kitchen', 'Counters — scratch check'),
    ('Bedroom', 'Walls — note condition'),
    ('Bedroom', 'Closet — inspect'),
    ('Bathroom', 'Plumbing — run water'),
    ('Bathroom', 'Fixtures — check for damage'),
]


def _credit_grade(score) -> str:
    if score is None:
        return '—'
    if score >= 800:
        return 'Excellent'
    if score >= 740:
        return 'Very Good'
    if score >= 670:
        return 'Good'
    if score >= 580:
        return 'Fair'
    return 'Poor'


def _build_credit_summary(expenses, settings) -> dict:
    rent = [e for e in expenses if e.get('category') == 'rent']
    on_time = sum(1 for e in rent if e.get('paid'))
    missed = sum(1 for e in rent if not e.get('paid'))
    total = len(rent)

    if total == 0:
        score = None
        ytd_change = 0
    else:
        pct = on_time / total
        score = int(min(850, max(300, 620 + on_time * 8 + int(pct * 80) - missed * 20)))
        ytd_change = on_time * 3

    monthly = []
    for e in rent[:12]:
        due = e.get('dueDate') or ''
        label = due[:3] if due else '—'
        if due and len(due) >= 3:
            month_map = {
                'jan': 'J', 'feb': 'F', 'mar': 'M', 'apr': 'A', 'may': 'M', 'jun': 'J',
                'jul': 'J', 'aug': 'A', 'sep': 'S', 'oct': 'O', 'nov': 'N', 'dec': 'D',
            }
            label = month_map.get(due[:3].lower(), due[0].upper())
        monthly.append({
            'label': label,
            'paid': bool(e.get('paid')),
            'title': e.get('title', 'Rent'),
        })

    cfg = settings or {}
    return {
        'estimatedScore': score,
        'grade': _credit_grade(score),
        'onTimeCount': on_time,
        'missedCount': missed,
        'monthsReported': total,
        'ytdChange': ytd_change,
        'monthlyPayments': monthly,
        'bureaus': {
            'experian': bool(cfg.get('experian', True)),
            'transunion': bool(cfg.get('transunion', False)),
            'equifax': bool(cfg.get('equifax', False)),
        },
    }


def _build_members(user) -> list:
    return build_members_for_household(_hid(user))


def _build_alerts(
    inventory,
    chores,
    expenses,
    maintenance=None,
    packages=None,
    documents=None,
    spending_anomalies=None,
):
    alerts = []
    maintenance = maintenance or []
    packages = packages or []
    documents = documents or []
    spending_anomalies = spending_anomalies or []
    alerts.extend(anomalies_to_alerts(spending_anomalies))
    for item in inventory:
        days = _days_until(item.get('expiresAt'))
        if days <= 3:
            alerts.append({
                'id': f"food-{item['_id']}",
                'type': 'food',
                'title': f"{item.get('name')} expires {'today' if days == 0 else f'in {days} day(s)'}",
                'body': f"Location: {item.get('location', 'fridge')} · {item.get('quantity', '')}".strip(),
                'urgency': 'high' if days <= 1 else 'medium',
                'actionSlug': 'smart-fridge',
                'aiPrompt': f"What can I cook using {item.get('name')} before it expires?",
            })

    for chore in chores:
        if not chore.get('completed'):
            alerts.append({
                'id': f"chore-{chore['_id']}",
                'type': 'chore',
                'title': chore.get('title', 'Chore pending'),
                'body': f"Assigned to {chore.get('assignee') or 'household'}" + (
                    f" · due {chore.get('dueDate')}" if chore.get('dueDate') else ''
                ),
                'urgency': 'medium',
                'actionSlug': 'chores',
            })

    for exp in expenses:
        if not exp.get('paid'):
            unpaid_splits = [s for s in exp.get('splits', []) if not s.get('paid')]
            who = ', '.join(s.get('name', '') for s in unpaid_splits[:2]) or 'You'
            alerts.append({
                'id': f"expense-{exp['_id']}",
                'type': 'finance',
                'title': f"{exp.get('title')} unpaid",
                'body': f"${float(exp.get('amount', 0)):.0f} · {who}",
                'urgency': 'medium',
                'actionSlug': 'rent-split' if exp.get('category') == 'rent' else 'subscriptions',
                'aiPrompt': f"Help me follow up on unpaid {exp.get('title')}.",
            })

    for req in maintenance:
        if req.get('status') not in ('completed',):
            alerts.append({
                'id': f"maint-{req['_id']}",
                'type': 'maintenance',
                'title': req.get('title', 'Maintenance request'),
                'body': f"{req.get('location') or 'Home'} · {req.get('status', 'open').replace('_', ' ')}",
                'urgency': 'high' if req.get('priority') == 'urgent' else 'medium',
                'actionSlug': 'maintenance',
            })

    for pkg in packages:
        if pkg.get('status') == 'missing':
            alerts.append({
                'id': f"pkg-{pkg['_id']}",
                'type': 'package',
                'title': f"Missing: {pkg.get('title')}",
                'body': pkg.get('carrier') or 'Delivery',
                'urgency': 'high',
                'actionSlug': 'package-tracker',
            })
        elif pkg.get('status') == 'expected':
            alerts.append({
                'id': f"pkg-{pkg['_id']}",
                'type': 'package',
                'title': f"Arriving: {pkg.get('title')}",
                'body': pkg.get('eta') or pkg.get('carrier') or 'On the way',
                'urgency': 'low',
                'actionSlug': 'package-tracker',
            })

    for doc in documents:
        days = _days_until(doc.get('expiresAt'))
        if doc.get('expiresAt') and days <= 30:
            alerts.append({
                'id': f"doc-{doc['_id']}",
                'type': 'finance',
                'title': f"{doc.get('title')} expiring soon",
                'body': f"Expires in {days} day(s)" if days else 'Expires today',
                'urgency': 'medium' if days > 7 else 'high',
                'actionSlug': 'document-vault',
            })

    return alerts[:16]


def _build_snapshot(inventory, chores, expenses, packages=None, utilities=None):
    packages = packages or []
    utilities = utilities or []
    expiring = sum(1 for i in inventory if _days_until(i.get('expiresAt')) <= 3)
    pending_chores = sum(1 for c in chores if not c.get('completed'))
    unpaid_expenses = sum(1 for e in expenses if not e.get('paid'))
    unpaid_splits = sum(
        1 for e in expenses for s in e.get('splits', []) if not s.get('paid')
    )
    total_due = sum(float(e.get('amount', 0)) for e in expenses if not e.get('paid'))
    packages_expected = sum(1 for p in packages if p.get('status') == 'expected')
    util_summary = _build_utility_summary(utilities)

    health = 100
    health -= min(30, expiring * 8)
    health -= min(25, pending_chores * 5)
    health -= min(25, unpaid_expenses * 10)
    health -= min(10, packages_expected * 2)
    health = max(10, health)

    return {
        'healthScore': health,
        'expiringFood': expiring,
        'billsDue': unpaid_expenses,
        'unpaidRoommates': unpaid_splits,
        'pendingTasks': pending_chores,
        'packagesExpected': packages_expected,
        'energySpikePct': util_summary['energySpikePct'],
        'savingsGoalPct': 0,
        'totalDueAmount': round(total_due, 2),
    }


def _build_recommendations(inventory, chores, expenses, user) -> list:
    recs = []
    expiring = [i for i in inventory if _days_until(i.get('expiresAt')) <= 5]
    if expiring:
        names = ', '.join(i.get('name', '') for i in expiring[:3])
        recs.append(f"Use {names} soon to reduce food waste.")
    if any(not c.get('completed') for c in chores):
        recs.append('Complete pending chores to improve your household health score.')
    if any(not e.get('paid') for e in expenses):
        recs.append('Review unpaid bills in Rent & Bills.')
    address = user.get('address') or user.get('homeAddress')
    if address and not inventory:
        recs.append('Add items to Smart Fridge to track groceries and expiry dates.')
    if not recs:
        recs.append('Your household is up to date — explore Maps for nearby services.')
    return recs[:4]


@household_bp.route('/dashboard', methods=['GET'])
def household_dashboard():
    user, err = _require_user()
    if err:
        return err
    start = time.perf_counter()
    hid = _hid(user)
    cached, _meta = get_cached_dashboard(hid)
    if cached:
        payload = {k: v for k, v in cached.items() if not k.startswith('_')}
        resp = jsonify(payload)
        resp.headers['X-Cache'] = 'HIT'
        resp.headers['X-Response-Time-Ms'] = str(round((time.perf_counter() - start) * 1000, 2))
        return resp

    uid = _user_id(user)
    db = get_db()
    inventory = list(db.inventory.find(_scope(user)).sort('expiresAt', 1))
    chores = list(db.chores.find(_scope(user)).sort('dueDate', 1))
    expenses = list(db.expenses.find(_scope(user)).sort('dueDate', 1))
    maintenance = list(db.maintenance.find(_scope(user)).sort('createdAt', -1))
    packages = list(db.packages.find(_scope(user)).sort('createdAt', -1))
    documents = list(db.documents.find(_scope(user)).sort('createdAt', -1))
    smart_devices = list(db.smart_devices.find(_scope(user)).sort('createdAt', -1))
    credit_settings = db.credit_settings.find_one(_scope(user)) or {}
    financial_goals = list(db.financial_goals.find(_scope(user)).sort('createdAt', -1))
    utilities = list(db.utilities.find(_scope(user)).sort('createdAt', -1))
    checklist_items = list(db.checklist_items.find({**_scope(user), 'checklistType': 'move-in'}).sort('room', 1))
    health_reminders = list(db.health_reminders.find(_scope(user)).sort('dueDate', 1))
    emergency_profile = db.emergency_profiles.find_one(_scope(user))
    community_posts = list(db.community_posts.find({'userId': uid}).sort('createdAt', -1).limit(20))
    utility_summary = _build_utility_summary(utilities)
    spending_anomalies = detect_spending_anomalies(expenses)
    anomaly_map = {a['expenseId']: a for a in spending_anomalies}
    raw_alerts = _build_alerts(
        inventory, chores, expenses, maintenance, packages, documents, spending_anomalies,
    )
    ranked_alerts = rank_alerts(raw_alerts, db, _hid(user))
    parts = partition_digest(ranked_alerts)
    alerts_out = parts['immediate']
    if parts['digest']:
        alerts_out.append({
            'id': 'daily-digest',
            'type': 'ai',
            'title': f"{len(parts['digest'])} updates in your daily digest",
            'body': '; '.join(a.get('title', '') for a in parts['digest'][:4]),
            'urgency': 'low',
            'actionSlug': 'notifications',
            'digestItems': parts['digest'],
        })

    financial = build_financial_dashboard_bundle(db, user, expenses, financial_goals)
    hid = _hid(user)
    ensure_builtin_rules(db, hid)
    automation_rules = [serialize_rule(r) for r in db.automation_rules.find({'householdId': hid})]
    shopping_list = list(db.shopping_list.find({'householdId': hid, 'completed': {'$ne': True}}).limit(20))
    doc_expiry_alerts = get_document_expiry_alerts(db, hid)
    appliances = list(db.appliances.find(_scope(user)))
    if not appliances:
        appliances = list(db.smart_devices.find(_scope(user)))
    maintenance_predictions = predict_maintenance(appliances)
    doc_risk_ranked = rank_documents_by_risk(documents)
    top_doc_risk = doc_risk_ranked[0] if doc_risk_ranked else None
    geofence_events = list(db.geofence_events.find({'householdId': hid}).sort('createdAt', -1).limit(5))
    member_role = get_member_role(uid, hid)
    can_financial = require_permission(uid, hid, 'financial')[0]
    can_expenses = require_permission(uid, hid, 'expenses')[0]
    can_documents = require_permission(uid, hid, 'documents')[0]
    health_gap_summary = build_health_dashboard_summary(db, hid, uid)
    purchase_readiness = build_purchase_readiness_summary(db, user, expenses, financial_goals) if can_financial else None

    ai_tips = get_cached_ai_tips(hid)
    if not ai_tips:
        enqueue(generate_ai_tips_task, hid, uid)
        ai_tips = _build_recommendations(inventory, chores, expenses, user)

    payload = {
        'snapshot': _build_snapshot(inventory, chores, expenses, packages, utilities),
        'alerts': alerts_out,
        'notificationDigest': parts['digest'],
        'spendingAnomalies': spending_anomalies if can_expenses else [],
        'members': _build_members(user),
        'foodItems': [_serialize_inventory(i) for i in inventory],
        'chores': [_serialize_chore(c) for c in chores],
        'maintenance': [_serialize_maintenance(m) for m in maintenance],
        'packages': [_serialize_package(p) for p in packages],
        'smartDevices': [_serialize_device(d) for d in smart_devices],
        'checklistItems': [_serialize_checklist_item(c) for c in checklist_items],
        'healthReminders': [_serialize_health_reminder(h) for h in health_reminders],
        'emergencyProfile': _serialize_emergency_profile(emergency_profile),
        'communityPosts': [_serialize_community_post(p) for p in community_posts],
        'aiRecommendations': ai_tips,
        'automationRules': automation_rules,
        'shoppingList': [{
            'id': str(s['_id']),
            'name': s.get('name', ''),
            'source': s.get('source', 'manual'),
            'autoAdded': bool(s.get('autoAdded')),
        } for s in shopping_list],
        'documentExpiryAlerts': [{
            'documentId': a.get('documentId', ''),
            'title': a.get('title', ''),
            'daysUntilExpiry': a.get('daysUntilExpiry'),
            'message': a.get('message', ''),
            'urgency': a.get('urgency', 'medium'),
        } for a in doc_expiry_alerts],
        'documentExpiryRiskRankings': doc_risk_ranked if can_documents else [],
        'topDocumentRisk': top_doc_risk if can_documents and top_doc_risk else None,
        'geofenceEvents': [{
            'message': e.get('message'),
            'eventType': e.get('eventType'),
            'timestamp': e.get('createdAt').isoformat() if e.get('createdAt') else '',
        } for e in geofence_events] if member_role in ('owner', 'renter') else [],
        'maintenancePredictions': maintenance_predictions,
        'memberRole': member_role,
        'healthGapSummary': health_gap_summary,
        'purchaseReadiness': purchase_readiness,
    }
    if can_financial:
        payload.update(financial)
        payload['creditSummary'] = _build_credit_summary(expenses, credit_settings)
        payload['financialGoals'] = [_serialize_goal(g) for g in financial_goals]
        payload['utilitySummary'] = utility_summary
    if can_expenses:
        payload['expenses'] = [_serialize_expense(e, anomaly_map) for e in expenses]
    if can_documents:
        payload['documents'] = [_serialize_document(d) for d in documents]

    set_cached_dashboard(hid, payload)
    resp = jsonify(payload)
    resp.headers['X-Cache'] = 'MISS'
    resp.headers['X-Response-Time-Ms'] = str(round((time.perf_counter() - start) * 1000, 2))
    return resp


@household_bp.route('/inventory', methods=['GET', 'POST'])
def inventory_list_create():
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()

    if request.method == 'GET':
        items = list(db.inventory.find(_scope(user)).sort('expiresAt', 1))
        return jsonify({'items': [_serialize_inventory(i) for i in items]})

    data = request.json or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Name is required'}), 400

    expires_at = data.get('expiresAt')
    if data.get('expiresInDays') is not None:
        expires_at = _utcnow() + timedelta(days=int(data['expiresInDays']))

    doc = {
        'userId': uid,
        'householdId': _hid(user),
        'name': name,
        'location': data.get('location', 'fridge'),
        'quantity': data.get('quantity', ''),
        'expiresAt': expires_at,
        'createdAt': _utcnow(),
    }
    result = db.inventory.insert_one(doc)
    doc['_id'] = result.inserted_id
    item = _serialize_inventory(doc)
    _notify_household(_hid(user), 'inventory', {'action': 'create', 'item': item})
    return jsonify({'item': item}), 201


@household_bp.route('/inventory/<item_id>', methods=['PATCH', 'DELETE'])
def inventory_update_delete(item_id):
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()
    try:
        oid = ObjectId(item_id)
    except Exception:
        return jsonify({'error': 'Invalid item id'}), 400

    if request.method == 'DELETE':
        db.inventory.delete_one({**{'_id': oid}, **_scope(user)})
        _notify_household(_hid(user), 'inventory', {'action': 'delete', 'itemId': item_id})
        return jsonify({'ok': True})

    data = request.json or {}
    updates = {k: data[k] for k in ('name', 'location', 'quantity', 'expiresAt') if k in data}
    if 'expiresInDays' in data:
        updates['expiresAt'] = _utcnow() + timedelta(days=int(data['expiresInDays']))
    if updates:
        db.inventory.update_one({**{'_id': oid}, **_scope(user)}, {'$set': updates})
    doc = db.inventory.find_one({**{'_id': oid}, **_scope(user)})
    if not doc:
        return jsonify({'error': 'Not found'}), 404
    item = _serialize_inventory(doc)
    _notify_household(_hid(user), 'inventory', {'action': 'update', 'item': item})
    return jsonify({'item': item})


@household_bp.route('/chores', methods=['GET', 'POST'])
def chores_list_create():
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()

    if request.method == 'GET':
        items = list(db.chores.find(_scope(user)))
        return jsonify({'chores': [_serialize_chore(c) for c in items]})

    data = request.json or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'Title is required'}), 400

    doc = {
        'userId': uid,
        'householdId': _hid(user),
        'title': title,
        'assignee': data.get('assignee', ''),
        'dueDate': data.get('dueDate', ''),
        'completed': bool(data.get('completed')),
        'priority': data.get('priority', 'medium'),
        'createdAt': _utcnow(),
    }
    result = db.chores.insert_one(doc)
    doc['_id'] = result.inserted_id
    chore = _serialize_chore(doc)
    _notify_household(_hid(user), 'chores', {'action': 'create', 'chore': chore})
    return jsonify({'chore': chore}), 201


@household_bp.route('/chores/<chore_id>', methods=['PATCH', 'DELETE'])
def chore_update_delete(chore_id):
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()
    try:
        oid = ObjectId(chore_id)
    except Exception:
        return jsonify({'error': 'Invalid chore id'}), 400

    if request.method == 'DELETE':
        db.chores.delete_one({**{'_id': oid}, **_scope(user)})
        _notify_household(_hid(user), 'chores', {'action': 'delete', 'choreId': chore_id})
        return jsonify({'ok': True})

    data = request.json or {}
    updates = {k: data[k] for k in ('title', 'assignee', 'dueDate', 'completed', 'priority') if k in data}
    if updates:
        db.chores.update_one({**{'_id': oid}, **_scope(user)}, {'$set': updates})
    doc = db.chores.find_one({**{'_id': oid}, **_scope(user)})
    if not doc:
        return jsonify({'error': 'Not found'}), 404
    chore = _serialize_chore(doc)
    _notify_household(_hid(user), 'chores', {'action': 'update', 'chore': chore})
    return jsonify({'chore': chore})


@household_bp.route('/expenses', methods=['GET', 'POST'])
def expenses_list_create():
    user, err = _require_user()
    if err:
        return err
    denied = _deny_unless_permission(user, 'expenses')
    if denied:
        return denied
    uid = _user_id(user)
    db = get_db()

    if request.method == 'GET':
        items = list(db.expenses.find(_scope(user)))
        anomalies = detect_spending_anomalies(items)
        anomaly_map = {a['expenseId']: a for a in anomalies}
        return jsonify({'expenses': [_serialize_expense(e, anomaly_map) for e in items]})

    data = request.json or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'Title is required'}), 400

    doc = {
        'userId': uid,
        'householdId': _hid(user),
        'title': title,
        'category': data.get('category', 'other'),
        'amount': float(data.get('amount', 0)),
        'dueDate': data.get('dueDate', ''),
        'paid': bool(data.get('paid')),
        'splits': data.get('splits', []),
        'expectedLargePurchase': bool(data.get('expectedLargePurchase')),
        'createdAt': _utcnow(),
    }
    result = db.expenses.insert_one(doc)
    doc['_id'] = result.inserted_id
    hid = _hid(user)
    enqueue(detect_spending_anomaly_task, hid, str(doc['_id']))
    expense = _serialize_expense(doc, {})
    _notify_household(hid, 'expenses', {'action': 'create', 'expense': expense})
    return jsonify({'expense': expense}), 201


@household_bp.route('/expenses/<expense_id>', methods=['PATCH', 'DELETE'])
def expense_update_delete(expense_id):
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()
    try:
        oid = ObjectId(expense_id)
    except Exception:
        return jsonify({'error': 'Invalid expense id'}), 400

    if request.method == 'DELETE':
        db.expenses.delete_one({**{'_id': oid}, **_scope(user)})
        _notify_household(_hid(user), 'expenses', {'action': 'delete', 'expenseId': expense_id})
        return jsonify({'ok': True})

    data = request.json or {}
    updates = {
        k: data[k]
        for k in ('title', 'category', 'amount', 'dueDate', 'paid', 'splits', 'expectedLargePurchase')
        if k in data
    }
    if updates:
        db.expenses.update_one({**{'_id': oid}, **_scope(user)}, {'$set': updates})
    doc = db.expenses.find_one({**{'_id': oid}, **_scope(user)})
    if not doc:
        return jsonify({'error': 'Not found'}), 404
    hid = _hid(user)
    enqueue(detect_spending_anomaly_task, hid, str(doc['_id']))
    expense = _serialize_expense(doc, {})
    _notify_household(hid, 'expenses', {'action': 'update', 'expense': expense})
    return jsonify({'expense': expense})


@household_bp.route('/maintenance', methods=['GET', 'POST'])
def maintenance_list_create():
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()

    if request.method == 'GET':
        items = list(db.maintenance.find(_scope(user)).sort('createdAt', -1))
        return jsonify({'maintenance': [_serialize_maintenance(m) for m in items]})

    data = request.json or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'Title is required'}), 400

    doc = {
        'userId': uid,
        'householdId': _hid(user),
        'title': title,
        'description': data.get('description', ''),
        'location': data.get('location', ''),
        'status': data.get('status', 'open'),
        'priority': data.get('priority', 'medium'),
        'rating': data.get('rating'),
        'createdAt': _utcnow(),
    }
    result = db.maintenance.insert_one(doc)
    doc['_id'] = result.inserted_id
    return jsonify({'maintenance': _serialize_maintenance(doc)}), 201


@household_bp.route('/maintenance/<req_id>', methods=['PATCH', 'DELETE'])
def maintenance_update_delete(req_id):
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()
    try:
        oid = ObjectId(req_id)
    except Exception:
        return jsonify({'error': 'Invalid maintenance id'}), 400

    if request.method == 'DELETE':
        db.maintenance.delete_one({**{'_id': oid}, **_scope(user)})
        return jsonify({'ok': True})

    data = request.json or {}
    updates = {
        k: data[k]
        for k in ('title', 'description', 'location', 'status', 'priority', 'rating')
        if k in data
    }
    if updates:
        db.maintenance.update_one({**{'_id': oid}, **_scope(user)}, {'$set': updates})
    doc = db.maintenance.find_one({**{'_id': oid}, **_scope(user)})
    if not doc:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'maintenance': _serialize_maintenance(doc)})


@household_bp.route('/packages', methods=['GET', 'POST'])
def packages_list_create():
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()

    if request.method == 'GET':
        items = list(db.packages.find(_scope(user)).sort('createdAt', -1))
        return jsonify({'packages': [_serialize_package(p) for p in items]})

    data = request.json or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'Title is required'}), 400

    doc = {
        'userId': uid,
        'householdId': _hid(user),
        'title': title,
        'carrier': data.get('carrier', ''),
        'trackingNumber': data.get('trackingNumber', ''),
        'status': data.get('status', 'expected'),
        'eta': data.get('eta', ''),
        'notes': data.get('notes', ''),
        'createdAt': _utcnow(),
    }
    result = db.packages.insert_one(doc)
    doc['_id'] = result.inserted_id
    return jsonify({'package': _serialize_package(doc)}), 201


@household_bp.route('/packages/<pkg_id>', methods=['PATCH', 'DELETE'])
def package_update_delete(pkg_id):
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()
    try:
        oid = ObjectId(pkg_id)
    except Exception:
        return jsonify({'error': 'Invalid package id'}), 400

    if request.method == 'DELETE':
        db.packages.delete_one({**{'_id': oid}, **_scope(user)})
        return jsonify({'ok': True})

    data = request.json or {}
    updates = {
        k: data[k]
        for k in ('title', 'carrier', 'trackingNumber', 'status', 'eta', 'notes')
        if k in data
    }
    if updates:
        db.packages.update_one({**{'_id': oid}, **_scope(user)}, {'$set': updates})
    doc = db.packages.find_one({**{'_id': oid}, **_scope(user)})
    if not doc:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'package': _serialize_package(doc)})


@household_bp.route('/documents', methods=['GET', 'POST'])
def documents_list_create():
    user, err = _require_user()
    if err:
        return err
    denied = _deny_unless_permission(user, 'documents')
    if denied:
        return denied
    uid = _user_id(user)
    db = get_db()

    if request.method == 'GET':
        items = list(db.documents.find(_scope(user)).sort('createdAt', -1))
        return jsonify({'documents': [_serialize_document(d) for d in items]})

    data = request.json or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'Title is required'}), 400

    expires_at = data.get('expiresAt')
    if data.get('expiresInDays') is not None:
        expires_at = _utcnow() + timedelta(days=int(data['expiresInDays']))

    file_key = (data.get('fileKey') or '').strip()
    if file_key:
        from storage_service import user_can_access_file_key
        if not user_can_access_file_key(file_key, _hid(user)):
            return jsonify({'error': 'Invalid file key for this household'}), 400

    doc = {
        'userId': uid,
        'householdId': _hid(user),
        'title': title,
        'category': data.get('category', 'other'),
        'fileType': data.get('fileType', ''),
        'notes': data.get('notes', ''),
        'expiresAt': expires_at,
        'fileKey': encrypt_value(file_key) if file_key else None,
        'fileName': (data.get('fileName') or '').strip() or None,
        'mimeType': (data.get('mimeType') or '').strip() or None,
        'createdAt': _utcnow(),
    }
    result = db.documents.insert_one(doc)
    doc['_id'] = result.inserted_id
    document = _serialize_document(doc)
    _notify_household(_hid(user), 'documents', {'action': 'create', 'document': document})
    return jsonify({'document': document}), 201


@household_bp.route('/documents/<doc_id>', methods=['PATCH', 'DELETE'])
def document_update_delete(doc_id):
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()
    try:
        oid = ObjectId(doc_id)
    except Exception:
        return jsonify({'error': 'Invalid document id'}), 400

    if request.method == 'DELETE':
        db.documents.delete_one({**{'_id': oid}, **_scope(user)})
        return jsonify({'ok': True})

    data = request.json or {}
    updates = {
        k: data[k]
        for k in ('title', 'category', 'fileType', 'notes', 'expiresAt', 'fileName', 'mimeType')
        if k in data
    }
    if 'fileKey' in data:
        file_key = (data.get('fileKey') or '').strip()
        if file_key:
            from storage_service import user_can_access_file_key
            if not user_can_access_file_key(file_key, _hid(user)):
                return jsonify({'error': 'Invalid file key for this household'}), 400
        updates['fileKey'] = file_key or None
    if 'expiresInDays' in data:
        updates['expiresAt'] = _utcnow() + timedelta(days=int(data['expiresInDays']))
    if updates:
        db.documents.update_one({**{'_id': oid}, **_scope(user)}, {'$set': updates})
    doc = db.documents.find_one({**{'_id': oid}, **_scope(user)})
    if not doc:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'document': _serialize_document(doc)})


@household_bp.route('/smart-devices', methods=['GET', 'POST'])
def smart_devices_list_create():
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()

    if request.method == 'GET':
        items = list(db.smart_devices.find(_scope(user)).sort('createdAt', -1))
        return jsonify({'devices': [_serialize_device(d) for d in items]})

    data = request.json or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Name is required'}), 400

    doc = {
        'userId': uid,
        'householdId': _hid(user),
        'name': name,
        'deviceType': data.get('deviceType', 'other'),
        'location': data.get('location', ''),
        'status': data.get('status', 'online'),
        'state': data.get('state', ''),
        'brand': data.get('brand', ''),
        'createdAt': _utcnow(),
    }
    result = db.smart_devices.insert_one(doc)
    doc['_id'] = result.inserted_id
    return jsonify({'device': _serialize_device(doc)}), 201


@household_bp.route('/smart-devices/<device_id>', methods=['PATCH', 'DELETE'])
def smart_device_update_delete(device_id):
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()
    try:
        oid = ObjectId(device_id)
    except Exception:
        return jsonify({'error': 'Invalid device id'}), 400

    if request.method == 'DELETE':
        db.smart_devices.delete_one({**{'_id': oid}, **_scope(user)})
        return jsonify({'ok': True})

    data = request.json or {}
    updates = {
        k: data[k]
        for k in ('name', 'deviceType', 'location', 'status', 'state', 'brand')
        if k in data
    }
    if updates:
        db.smart_devices.update_one({**{'_id': oid}, **_scope(user)}, {'$set': updates})
    doc = db.smart_devices.find_one({**{'_id': oid}, **_scope(user)})
    if not doc:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'device': _serialize_device(doc)})


@household_bp.route('/credit-settings', methods=['GET', 'PATCH'])
def credit_settings():
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()

    if request.method == 'GET':
        cfg = db.credit_settings.find_one(_scope(user)) or {}
        return jsonify({
            'bureaus': {
                'experian': bool(cfg.get('experian', True)),
                'transunion': bool(cfg.get('transunion', False)),
                'equifax': bool(cfg.get('equifax', False)),
            }
        })

    data = request.json or {}
    bureaus = data.get('bureaus') or data
    updates = {}
    for key in ('experian', 'transunion', 'equifax'):
        if key in bureaus:
            updates[key] = bool(bureaus[key])
    if updates:
        db.credit_settings.update_one(
            _scope(user),
            {'$set': {**updates, 'userId': uid, 'householdId': _hid(user), 'updatedAt': _utcnow()}},
            upsert=True,
        )
    cfg = db.credit_settings.find_one(_scope(user)) or {}
    return jsonify({
        'bureaus': {
            'experian': bool(cfg.get('experian', True)),
            'transunion': bool(cfg.get('transunion', False)),
            'equifax': bool(cfg.get('equifax', False)),
        }
    })


@household_bp.route('/financial-goals', methods=['GET', 'POST'])
def financial_goals_list_create():
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()
    if request.method == 'GET':
        items = list(db.financial_goals.find(_scope(user)).sort('createdAt', -1))
        return jsonify({'goals': [_serialize_goal(g) for g in items]})
    data = request.json or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'Title is required'}), 400
    doc = {
        'userId': uid,
        'householdId': _hid(user),
        'title': title,
        'icon': data.get('icon', 'flag'),
        'targetAmount': float(data.get('targetAmount', 0)),
        'savedAmount': float(data.get('savedAmount', 0)),
        'targetDate': data.get('targetDate', ''),
        'createdAt': _utcnow(),
    }
    result = db.financial_goals.insert_one(doc)
    doc['_id'] = result.inserted_id
    return jsonify({'goal': _serialize_goal(doc)}), 201


@household_bp.route('/financial-goals/<goal_id>', methods=['PATCH', 'DELETE'])
def financial_goal_update_delete(goal_id):
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()
    try:
        oid = ObjectId(goal_id)
    except Exception:
        return jsonify({'error': 'Invalid goal id'}), 400
    if request.method == 'DELETE':
        db.financial_goals.delete_one({**{'_id': oid}, **_scope(user)})
        return jsonify({'ok': True})
    data = request.json or {}
    updates = {k: data[k] for k in ('title', 'icon', 'targetAmount', 'savedAmount', 'targetDate') if k in data}
    if 'targetAmount' in updates:
        updates['targetAmount'] = float(updates['targetAmount'])
    if 'savedAmount' in updates:
        updates['savedAmount'] = float(updates['savedAmount'])
    if updates:
        db.financial_goals.update_one({**{'_id': oid}, **_scope(user)}, {'$set': updates})
    doc = db.financial_goals.find_one({**{'_id': oid}, **_scope(user)})
    if not doc:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'goal': _serialize_goal(doc)})


@household_bp.route('/utilities', methods=['GET', 'POST'])
def utilities_list_create():
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()
    if request.method == 'GET':
        items = list(db.utilities.find(_scope(user)).sort('createdAt', -1))
        return jsonify({'utilities': [_serialize_utility(u) for u in items]})
    data = request.json or {}
    amount = float(data.get('amount', 0))
    if amount <= 0:
        return jsonify({'error': 'Amount is required'}), 400
    doc = {
        'userId': uid,
        'householdId': _hid(user),
        'utilityType': data.get('utilityType', 'electric'),
        'amount': amount,
        'period': data.get('period', ''),
        'usageKwh': data.get('usageKwh'),
        'createdAt': _utcnow(),
    }
    result = db.utilities.insert_one(doc)
    doc['_id'] = result.inserted_id
    return jsonify({'utility': _serialize_utility(doc)}), 201


@household_bp.route('/checklist', methods=['GET', 'POST'])
def checklist_list_create():
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()
    checklist_type = request.args.get('type', 'move-in')
    if request.method == 'GET':
        items = list(db.checklist_items.find({**_scope(user), 'checklistType': checklist_type}).sort('room', 1))
        return jsonify({'items': [_serialize_checklist_item(i) for i in items]})
    data = request.json or {}
    if data.get('seed'):
        existing = db.checklist_items.count_documents({**_scope(user), 'checklistType': checklist_type})
        if existing == 0:
            for room, task in MOVE_IN_TEMPLATE:
                db.checklist_items.insert_one({
                    'userId': uid,
                    'householdId': _hid(user),
                    'room': room,
                    'task': task,
                    'completed': False,
                    'checklistType': checklist_type,
                    'notes': '',
                    'createdAt': _utcnow(),
                })
        items = list(db.checklist_items.find({**_scope(user), 'checklistType': checklist_type}).sort('room', 1))
        return jsonify({'items': [_serialize_checklist_item(i) for i in items]})
    task = (data.get('task') or '').strip()
    room = (data.get('room') or '').strip()
    if not task or not room:
        return jsonify({'error': 'Room and task are required'}), 400
    doc = {
        'userId': uid,
        'householdId': _hid(user),
        'room': room,
        'task': task,
        'completed': bool(data.get('completed')),
        'checklistType': data.get('checklistType', checklist_type),
        'notes': data.get('notes', ''),
        'createdAt': _utcnow(),
    }
    result = db.checklist_items.insert_one(doc)
    doc['_id'] = result.inserted_id
    return jsonify({'item': _serialize_checklist_item(doc)}), 201


@household_bp.route('/checklist/<item_id>', methods=['PATCH'])
def checklist_update(item_id):
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()
    try:
        oid = ObjectId(item_id)
    except Exception:
        return jsonify({'error': 'Invalid checklist id'}), 400
    data = request.json or {}
    updates = {k: data[k] for k in ('completed', 'notes', 'task', 'room') if k in data}
    if 'photoKey' in data:
        photo_key = (data.get('photoKey') or '').strip()
        if photo_key:
            from storage_service import user_can_access_file_key
            if not user_can_access_file_key(photo_key, _hid(user)):
                return jsonify({'error': 'Invalid photo key for this household'}), 400
        updates['photoKey'] = photo_key or None
    if updates:
        db.checklist_items.update_one({**{'_id': oid}, **_scope(user)}, {'$set': updates})
    doc = db.checklist_items.find_one({**{'_id': oid}, **_scope(user)})
    if not doc:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'item': _serialize_checklist_item(doc)})


@household_bp.route('/health-reminders', methods=['GET', 'POST'])
def health_reminders_list_create():
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()
    if request.method == 'GET':
        items = list(db.health_reminders.find(_scope(user)).sort('dueDate', 1))
        return jsonify({'reminders': [_serialize_health_reminder(h) for h in items]})
    data = request.json or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'Title is required'}), 400
    doc = {
        'userId': uid,
        'householdId': _hid(user),
        'title': title,
        'assignee': data.get('assignee', ''),
        'dueDate': data.get('dueDate', ''),
        'reminderType': data.get('reminderType', 'checkup'),
        'createdAt': _utcnow(),
    }
    result = db.health_reminders.insert_one(doc)
    doc['_id'] = result.inserted_id
    return jsonify({'reminder': _serialize_health_reminder(doc)}), 201


@household_bp.route('/health-reminders/<reminder_id>', methods=['PATCH', 'DELETE'])
def health_reminder_update_delete(reminder_id):
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()
    try:
        oid = ObjectId(reminder_id)
    except Exception:
        return jsonify({'error': 'Invalid reminder id'}), 400
    if request.method == 'DELETE':
        db.health_reminders.delete_one({**{'_id': oid}, **_scope(user)})
        return jsonify({'ok': True})
    data = request.json or {}
    updates = {k: data[k] for k in ('title', 'assignee', 'dueDate', 'reminderType') if k in data}
    if updates:
        db.health_reminders.update_one({**{'_id': oid}, **_scope(user)}, {'$set': updates})
    doc = db.health_reminders.find_one({**{'_id': oid}, **_scope(user)})
    if not doc:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'reminder': _serialize_health_reminder(doc)})


@household_bp.route('/emergency-profile', methods=['GET', 'PATCH'])
def emergency_profile():
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()
    if request.method == 'GET':
        doc = db.emergency_profiles.find_one(_scope(user))
        return jsonify({'profile': _serialize_emergency_profile(doc)})
    data = request.json or {}
    updates = {k: data[k] for k in ('contactName', 'contactPhone', 'addressNotes', 'medicalNotes') if k in data}
    if updates:
        encrypted = encrypt_fields(updates, EMERGENCY_FIELDS)
        db.emergency_profiles.update_one(
            _scope(user),
            {'$set': {**encrypted, 'userId': uid, 'householdId': _hid(user), 'updatedAt': _utcnow()}},
            upsert=True,
        )
    doc = db.emergency_profiles.find_one(_scope(user))
    profile = _serialize_emergency_profile(doc)
    _notify_household(_hid(user), 'emergency_profile', {'profile': profile})
    return jsonify({'profile': profile})


@household_bp.route('/community-posts', methods=['GET', 'POST'])
def community_posts_list_create():
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    db = get_db()
    if request.method == 'GET':
        items = list(db.community_posts.find({'userId': uid}).sort('createdAt', -1))
        return jsonify({'posts': [_serialize_community_post(p) for p in items]})
    data = request.json or {}
    body = (data.get('body') or '').strip()
    if not body:
        return jsonify({'error': 'Post body is required'}), 400
    name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() or 'You'
    doc = {
        'userId': uid,
        'householdId': _hid(user),
        'authorName': name,
        'body': body,
        'category': data.get('category', 'general'),
        'createdAt': _utcnow(),
    }
    result = db.community_posts.insert_one(doc)
    doc['_id'] = result.inserted_id
    return jsonify({'post': _serialize_community_post(doc)}), 201


@household_bp.route('/households', methods=['GET'])
def list_households():
    user, err = _require_user()
    if err:
        return err
    ensure_user_household(user)
    refreshed = get_db().users.find_one({'_id': user['_id']})
    return jsonify({
        'activeHouseholdId': refreshed.get('activeHouseholdId'),
        'households': list_user_households(refreshed or user),
    })


@household_bp.route('/households', methods=['POST'])
def create_household_route():
    user, err = _require_user()
    if err:
        return err
    data = request.json or {}
    try:
        household_id = create_household(user, data.get('name'))
    except PermissionError as exc:
        return jsonify({'error': str(exc)}), 403
    refreshed = get_db().users.find_one({'_id': user['_id']})
    return jsonify({
        'householdId': household_id,
        'activeHouseholdId': refreshed.get('activeHouseholdId'),
        'households': list_user_households(refreshed or user),
    }), 201


@household_bp.route('/households/switch', methods=['POST'])
def switch_household_route():
    user, err = _require_user()
    if err:
        return err
    household_id = (request.json or {}).get('householdId', '').strip()
    if not household_id:
        return jsonify({'error': 'householdId is required'}), 400
    try:
        switch_active_household(user, household_id)
    except PermissionError as exc:
        return jsonify({'error': str(exc)}), 403
    refreshed = get_db().users.find_one({'_id': user['_id']})
    return jsonify({
        'activeHouseholdId': refreshed.get('activeHouseholdId'),
        'households': list_user_households(refreshed or user),
    })


@household_bp.route('/invites', methods=['POST'])
def send_household_invite():
    user, err = _require_user()
    if err:
        return err
    data = request.json or {}
    email = (data.get('email') or '').strip()
    role = (data.get('role') or 'renter').strip()
    try:
        invite = create_household_invite(user, email, role)
    except PermissionError as exc:
        return jsonify({'error': str(exc)}), 403
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    return jsonify({'invite': invite}), 201


@household_bp.route('/invites/<token>', methods=['GET'])
def preview_household_invite(token):
    try:
        preview = get_invite_preview(token)
    except LookupError as exc:
        return jsonify({'error': str(exc)}), 404
    return jsonify({'invite': preview})


@household_bp.route('/invites/<token>/accept', methods=['POST'])
def accept_invite_route(token):
    user, err = _require_user()
    if err:
        return err
    try:
        result = accept_household_invite(user, token)
    except LookupError as exc:
        return jsonify({'error': str(exc)}), 404
    except PermissionError as exc:
        return jsonify({'error': str(exc)}), 403
    return jsonify(result)
