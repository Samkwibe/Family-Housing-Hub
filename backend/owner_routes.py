"""Owner portal routes — property domain (Mongo-native)."""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from flask import Blueprint, jsonify, request

from audit_service import log_audit
from capability_service import require_capability
from database import get_db
from portal_context_service import require_portal_context

owner_bp = Blueprint('owner', __name__, url_prefix='/api/owner')


def _utcnow():
    return datetime.now(timezone.utc)


def _serialize_property(doc: dict) -> dict:
    return {
        'id': str(doc['_id']),
        'name': doc.get('name', ''),
        'address': doc.get('address') or {},
        'unitCount': int(doc.get('unitCount') or 1),
        'vacantUnits': int(doc.get('vacantUnits') or 0),
        'occupancyStatus': doc.get('occupancyStatus', 'unknown'),
        'notes': doc.get('notes', ''),
        'createdAt': doc.get('createdAt').isoformat() if doc.get('createdAt') else None,
        'updatedAt': doc.get('updatedAt').isoformat() if doc.get('updatedAt') else None,
    }


def _require_owner_capability(ctx, cap: str = 'can_manage_properties'):
    ok, msg = require_capability(ctx.capabilities, cap)
    if not ok and ctx.experience_type != 'owner':
        return jsonify({'error': msg or 'Owner access required'}), 403
    return None


@owner_bp.route('/properties', methods=['GET'])
def list_properties():
    ctx, err = require_portal_context()
    if err:
        return err
    cap_err = _require_owner_capability(ctx)
    if cap_err:
        return cap_err

    db = get_db()
    props = list(db.properties.find({
        'ownerId': ctx.user_id,
        'status': {'$ne': 'archived'},
    }).sort('createdAt', -1))
    return jsonify({
        'properties': [_serialize_property(p) for p in props],
        'portalContext': ctx.to_dict(),
    })


@owner_bp.route('/properties', methods=['POST'])
def create_property():
    ctx, err = require_portal_context()
    if err:
        return err
    cap_err = _require_owner_capability(ctx)
    if cap_err:
        return cap_err

    data = request.json or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Property name is required'}), 400

    address = data.get('address') or {}
    unit_count = max(1, int(data.get('unitCount') or 1))
    vacant = max(0, min(unit_count, int(data.get('vacantUnits') or 0)))
    now = _utcnow()
    doc = {
        'ownerId': ctx.user_id,
        'name': name,
        'address': {
            'street': (address.get('street') or '').strip(),
            'city': (address.get('city') or '').strip(),
            'state': (address.get('state') or '').strip(),
            'zipCode': (address.get('zipCode') or '').strip(),
            'country': (address.get('country') or 'USA').strip(),
        },
        'unitCount': unit_count,
        'vacantUnits': vacant,
        'occupancyStatus': 'vacant' if vacant >= unit_count else ('partial' if vacant else 'occupied'),
        'notes': (data.get('notes') or '').strip(),
        'status': 'active',
        'createdAt': now,
        'updatedAt': now,
    }
    db = get_db()
    result = db.properties.insert_one(doc)
    doc['_id'] = result.inserted_id
    log_audit(
        'owner.property.create',
        user_id=ctx.user_id,
        portal_context=ctx,
        resource_type='property',
        resource_id=str(result.inserted_id),
    )
    return jsonify({'property': _serialize_property(doc), 'portalContext': ctx.to_dict()}), 201


@owner_bp.route('/properties/<property_id>', methods=['GET', 'PATCH', 'DELETE'])
def property_detail(property_id: str):
    ctx, err = require_portal_context()
    if err:
        return err
    cap_err = _require_owner_capability(ctx)
    if cap_err:
        return cap_err

    try:
        oid = ObjectId(property_id)
    except Exception:
        return jsonify({'error': 'Invalid property id'}), 400

    db = get_db()
    doc = db.properties.find_one({
        '_id': oid,
        'ownerId': ctx.user_id,
        'status': {'$ne': 'archived'},
    })
    if not doc:
        return jsonify({'error': 'Property not found'}), 404

    if request.method == 'GET':
        return jsonify({'property': _serialize_property(doc), 'portalContext': ctx.to_dict()})

    if request.method == 'DELETE':
        db.properties.update_one({'_id': oid}, {'$set': {'status': 'archived', 'updatedAt': _utcnow()}})
        log_audit('owner.property.archive', user_id=ctx.user_id, portal_context=ctx, resource_type='property', resource_id=property_id)
        return jsonify({'success': True})

    data = request.json or {}
    updates = {'updatedAt': _utcnow()}
    if 'name' in data:
        updates['name'] = (data.get('name') or '').strip()
    if 'address' in data and isinstance(data['address'], dict):
        updates['address'] = data['address']
    if 'unitCount' in data:
        updates['unitCount'] = max(1, int(data['unitCount'] or 1))
    if 'vacantUnits' in data:
        unit_count = int(updates.get('unitCount') or doc.get('unitCount') or 1)
        updates['vacantUnits'] = max(0, min(unit_count, int(data['vacantUnits'] or 0)))
    if 'notes' in data:
        updates['notes'] = (data.get('notes') or '').strip()
    if 'unitCount' in updates or 'vacantUnits' in updates:
        uc = int(updates.get('unitCount') or doc.get('unitCount') or 1)
        vu = int(updates.get('vacantUnits') or doc.get('vacantUnits') or 0)
        updates['occupancyStatus'] = 'vacant' if vu >= uc else ('partial' if vu else 'occupied')

    db.properties.update_one({'_id': oid}, {'$set': updates})
    refreshed = db.properties.find_one({'_id': oid})
    log_audit('owner.property.update', user_id=ctx.user_id, portal_context=ctx, resource_type='property', resource_id=property_id)
    return jsonify({'property': _serialize_property(refreshed), 'portalContext': ctx.to_dict()})
