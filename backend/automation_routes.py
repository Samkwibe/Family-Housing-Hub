"""Automation, shopping list, meal plan, replenishment, maintenance prediction routes."""
from flask import Blueprint, jsonify, request

from auth_routes import get_current_user_doc
from automation_engine import ensure_builtin_rules, run_rules_for_household, serialize_rule
from database import get_db
from household_service import ensure_user_household
from maintenance_prediction_service import predict_maintenance
from replenishment_service import run_replenishment_for_household

automation_bp = Blueprint('automation', __name__, url_prefix='/api/household')


def _require_user():
    user = get_current_user_doc()
    if not user:
        return None, (jsonify({'error': 'Authentication required'}), 401)
    return user, None


def _hid(user) -> str:
    return ensure_user_household(user)


def _scope(user) -> dict:
    return {'householdId': _hid(user)}


@automation_bp.route('/automation/rules', methods=['GET'])
def list_automation_rules():
    user, err = _require_user()
    if err:
        return err
    db = get_db()
    hid = _hid(user)
    ensure_builtin_rules(db, hid)
    rules = list(db.automation_rules.find({'householdId': hid}).sort('createdAt', 1))
    return jsonify({'rules': [serialize_rule(r) for r in rules]})


@automation_bp.route('/automation/rules/<rule_id>', methods=['PATCH'])
def toggle_automation_rule(rule_id):
    user, err = _require_user()
    if err:
        return err
    db = get_db()
    from bson import ObjectId
    try:
        oid = ObjectId(rule_id)
    except Exception:
        return jsonify({'error': 'Invalid rule id'}), 400
    data = request.json or {}
    updates = {}
    if 'enabled' in data:
        updates['enabled'] = bool(data['enabled'])
    if updates:
        db.automation_rules.update_one({**{'_id': oid}, **_scope(user)}, {'$set': updates})
    doc = db.automation_rules.find_one({**{'_id': oid}, **_scope(user)})
    if not doc:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'rule': serialize_rule(doc)})


@automation_bp.route('/automation/run', methods=['POST'])
def run_automation_now():
    user, err = _require_user()
    if err:
        return err
    db = get_db()
    hid = _hid(user)
    force = bool((request.json or {}).get('force'))
    fired = run_rules_for_household(db, hid, force=force)
    replenishment = run_replenishment_for_household(db, hid)
    return jsonify({
        'fired': fired,
        'replenishment': replenishment,
        'count': len(fired) + len(replenishment),
    })


@automation_bp.route('/shopping-list', methods=['GET', 'POST'])
def shopping_list():
    user, err = _require_user()
    if err:
        return err
    db = get_db()
    hid = _hid(user)
    if request.method == 'GET':
        items = list(db.shopping_list.find({'householdId': hid, 'completed': {'$ne': True}}).sort('createdAt', -1))
        return jsonify({'items': [{
            'id': str(i['_id']),
            'name': i.get('name', ''),
            'source': i.get('source', 'manual'),
            'autoAdded': bool(i.get('autoAdded')),
            'createdAt': i.get('createdAt').isoformat() if i.get('createdAt') else '',
        } for i in items]})
    data = request.json or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    from datetime import datetime, timezone
    doc = {
        'householdId': hid,
        'name': name,
        'source': 'manual',
        'autoAdded': False,
        'completed': False,
        'createdAt': datetime.now(timezone.utc),
    }
    result = db.shopping_list.insert_one(doc)
    doc['_id'] = result.inserted_id
    item = {'id': str(doc['_id']), 'name': name}
    from household_write_hooks import after_household_write

    after_household_write(hid, 'shopping_list', {'action': 'create', 'item': item})
    return jsonify({'item': item}), 201


@automation_bp.route('/maintenance-predictions', methods=['GET'])
def maintenance_predictions():
    user, err = _require_user()
    if err:
        return err
    db = get_db()
    appliances = list(db.appliances.find(_scope(user)))
    if not appliances:
        appliances = list(db.smart_devices.find(_scope(user)))
    return jsonify({'predictions': predict_maintenance(appliances)})


@automation_bp.route('/appliances', methods=['GET', 'POST'])
def appliances_list_create():
    user, err = _require_user()
    if err:
        return err
    db = get_db()
    uid = str(user['_id'])
    if request.method == 'GET':
        items = list(db.appliances.find(_scope(user)))
        return jsonify({'appliances': [{
            'id': str(a['_id']),
            'name': a.get('name', ''),
            'deviceType': a.get('deviceType', ''),
            'lastServiceDate': a.get('lastServiceDate', ''),
            'serviceIntervalDays': a.get('serviceIntervalDays'),
        } for a in items]})
    data = request.json or {}
    from datetime import datetime, timezone
    doc = {
        'userId': uid,
        'householdId': _hid(user),
        'name': (data.get('name') or '').strip() or 'Appliance',
        'deviceType': data.get('deviceType', 'other'),
        'lastServiceDate': data.get('lastServiceDate', ''),
        'serviceIntervalDays': data.get('serviceIntervalDays'),
        'createdAt': datetime.now(timezone.utc),
    }
    result = db.appliances.insert_one(doc)
    return jsonify({'appliance': {'id': str(result.inserted_id), **{k: doc[k] for k in doc if k != 'userId'}}}), 201


def get_document_expiry_alerts(db, household_id: str) -> list:
    return list(db.document_expiry_alerts.find({'householdId': household_id}))
