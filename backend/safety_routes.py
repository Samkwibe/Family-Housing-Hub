"""Round 4 safety routes — geofencing, permissions, location sharing."""
from datetime import datetime, timezone

from bson import ObjectId
from flask import Blueprint, jsonify, request

from auth_routes import get_current_user_doc
from database import get_db
from geofence_service import can_view_member_location, process_location_ping
from household_service import ensure_user_household
from permission_graph_service import (
    DATA_TYPES,
    get_member_role,
    grant_permission,
    list_member_permissions,
    require_permission,
)

safety_bp = Blueprint('safety', __name__, url_prefix='/api/household')


def _utcnow():
    return datetime.now(timezone.utc)


def _require_user():
    user = get_current_user_doc()
    if not user:
        return None, (jsonify({'error': 'Authentication required'}), 401)
    return user, None


def _user_id(user) -> str:
    return str(user['_id'])


def _hid(user) -> str:
    return ensure_user_household(user)


def _serialize_zone(doc) -> dict:
    return {
        'id': str(doc['_id']),
        'name': doc.get('name', ''),
        'type': doc.get('type', 'home'),
        'lat': doc.get('lat'),
        'lng': doc.get('lng'),
        'radiusMeters': doc.get('radiusMeters', 200),
        'memberUserId': doc.get('memberUserId'),
    }


@safety_bp.route('/safe-zones', methods=['GET', 'POST'])
def safe_zones():
    user, err = _require_user()
    if err:
        return err
    hid = _hid(user)
    db = get_db()

    if request.method == 'GET':
        zones = list(db.safe_zones.find({'householdId': hid}))
        return jsonify({'safeZones': [_serialize_zone(z) for z in zones]})

    data = request.json or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Zone name is required'}), 400
    try:
        lat = float(data['lat'])
        lng = float(data['lng'])
    except (KeyError, TypeError, ValueError):
        return jsonify({'error': 'lat and lng are required'}), 400

    doc = {
        'householdId': hid,
        'name': name,
        'type': data.get('type', 'home'),
        'lat': lat,
        'lng': lng,
        'radiusMeters': int(data.get('radiusMeters', 200)),
        'memberUserId': data.get('memberUserId'),
        'createdAt': _utcnow(),
    }
    result = db.safe_zones.insert_one(doc)
    doc['_id'] = result.inserted_id
    return jsonify({'safeZone': _serialize_zone(doc)}), 201


@safety_bp.route('/location-sharing', methods=['GET', 'PATCH'])
def location_sharing():
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    hid = _hid(user)
    db = get_db()

    if request.method == 'GET':
        pref = db.member_location_prefs.find_one({'householdId': hid, 'userId': uid}) or {}
        return jsonify({
            'locationSharingEnabled': bool(pref.get('locationSharingEnabled', False)),
        })

    data = request.json or {}
    enabled = bool(data.get('locationSharingEnabled', False))
    db.member_location_prefs.update_one(
        {'householdId': hid, 'userId': uid},
        {'$set': {
            'householdId': hid,
            'userId': uid,
            'locationSharingEnabled': enabled,
            'updatedAt': _utcnow(),
        }},
        upsert=True,
    )
    return jsonify({'locationSharingEnabled': enabled})


@safety_bp.route('/location/ping', methods=['POST'])
def location_ping():
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    hid = _hid(user)
    db = get_db()
    data = request.json or {}

    target_uid = (data.get('memberUserId') or uid).strip()
    viewer_role = get_member_role(uid, hid)
    pref = db.member_location_prefs.find_one({'householdId': hid, 'userId': target_uid}) or {}

    if target_uid != uid:
        if viewer_role != 'owner':
            return jsonify({'error': 'Only the owner can report location for other members'}), 403
    elif not pref.get('locationSharingEnabled') and not data.get('demo'):
        return jsonify({'error': 'Location sharing is disabled for this member'}), 403

    try:
        lat = float(data['lat'])
        lng = float(data['lng'])
    except (KeyError, TypeError, ValueError):
        return jsonify({'error': 'lat and lng are required'}), 400

    member = db.household_members.find_one({'householdId': hid, 'userId': target_uid, 'status': 'active'})
    if not member:
        member_user = db.users.find_one({'_id': ObjectId(target_uid)})
        member_name = f"{member_user.get('firstName', 'Member')}" if member_user else 'Member'
        member_role = 'renter'
    else:
        member_name = member.get('displayName') or member.get('firstName') or 'Member'
        member_role = member.get('role', 'renter')

    if target_uid != uid and not can_view_member_location(uid, target_uid, viewer_role, member_role):
        return jsonify({'error': 'Cannot update location for this member'}), 403

    zones = list(db.safe_zones.find({'householdId': hid}))
    if not zones:
        return jsonify({'events': [], 'message': 'No safe zones configured'})

    events = process_location_ping(
        db,
        household_id=hid,
        member_user_id=target_uid,
        member_name=member_name,
        lat=lat,
        lng=lng,
        zones=zones,
        viewer_role=viewer_role,
    )
    return jsonify({'events': events})


@safety_bp.route('/geofence-events', methods=['GET'])
def geofence_events():
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    hid = _hid(user)
    role = get_member_role(uid, hid)
    if role not in ('owner', 'renter'):
        return jsonify({'error': 'Access denied'}), 403

    db = get_db()
    events = list(db.geofence_events.find({'householdId': hid}).sort('createdAt', -1).limit(50))
    return jsonify({'events': [{
        'id': str(e['_id']),
        'eventType': e.get('eventType'),
        'zoneName': e.get('zoneName'),
        'memberUserId': e.get('memberUserId'),
        'message': e.get('message'),
        'timestamp': e.get('createdAt').isoformat() if e.get('createdAt') else '',
    } for e in events]})


@safety_bp.route('/permissions', methods=['GET'])
def permissions_list():
    user, err = _require_user()
    if err:
        return err
    hid = _hid(user)
    db = get_db()
    members = list(db.household_members.find({'householdId': hid, 'status': 'active'}))
    out = []
    for m in members:
        uid = m.get('userId')
        if not uid:
            continue
        out.append({
            'userId': uid,
            'displayName': m.get('displayName') or m.get('firstName') or uid,
            'role': m.get('role', 'renter'),
            **list_member_permissions(hid, uid),
        })
    return jsonify({'members': out, 'dataTypes': sorted(DATA_TYPES)})


@safety_bp.route('/permissions/grant', methods=['POST'])
def permissions_grant():
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    hid = _hid(user)
    if get_member_role(uid, hid) != 'owner':
        return jsonify({'error': 'Only the household owner can manage permissions'}), 403

    data = request.json or {}
    target = (data.get('targetUserId') or '').strip()
    data_type = (data.get('dataType') or '').strip()
    allow = bool(data.get('allow', True))
    if not target or data_type not in DATA_TYPES:
        return jsonify({'error': 'targetUserId and valid dataType required'}), 400

    result = grant_permission(hid, target, data_type, uid, allow=allow)
    return jsonify({'grant': result})
