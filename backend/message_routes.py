"""MongoDB messaging routes for family group chats."""
from datetime import datetime, timezone

from bson import ObjectId
from flask import Blueprint, jsonify, request

from auth_routes import get_current_user_doc
from database import get_db, ping_db
from household_service import ensure_user_household, sync_household_message_group

messages_bp = Blueprint('messages', __name__, url_prefix='/api/messages')

DEFAULT_GROUP_NAME = 'Family Chat'


def _utcnow_iso():
    return datetime.now(timezone.utc).isoformat()


def _user_id_str(user_doc) -> str:
    return str(user_doc['_id'])


def _serialize_message(doc: dict) -> dict:
    return {
        'id': str(doc['_id']),
        'groupId': doc['groupId'],
        'senderId': doc['senderId'],
        'senderName': doc.get('senderName', 'Member'),
        'message': doc['message'],
        'createdAt': doc.get('createdAt'),
    }


def _serialize_group(doc: dict) -> dict:
    return {
        'id': str(doc['_id']),
        'name': doc.get('name', 'Chat'),
        'memberIds': doc.get('memberIds', []),
        'lastMessageAt': doc.get('lastMessageAt'),
        'lastMessagePreview': doc.get('lastMessagePreview', ''),
    }


def _ensure_default_group(user_id: str):
    """Create a default family chat for new users."""
    db = get_db()
    existing = db.message_groups.find_one({'memberIds': user_id, 'isDefault': True})
    if existing:
        return existing

    now = _utcnow_iso()
    group_doc = {
        'name': DEFAULT_GROUP_NAME,
        'memberIds': [user_id],
        'isDefault': True,
        'createdBy': user_id,
        'createdAt': now,
        'updatedAt': now,
        'lastMessageAt': None,
        'lastMessagePreview': '',
    }
    result = db.message_groups.insert_one(group_doc)
    group_id = str(result.inserted_id)
    welcome = {
        'groupId': group_id,
        'senderId': 'system',
        'senderName': 'Family Housing Hub',
        'message': (
            f'Welcome to {DEFAULT_GROUP_NAME}! '
            'Share housing updates, reminders, and notes with your household.'
        ),
        'createdAt': now,
    }
    db.messages.insert_one(welcome)
    db.message_groups.update_one(
        {'_id': result.inserted_id},
        {
            '$set': {
                'lastMessageAt': now,
                'lastMessagePreview': welcome['message'][:120],
                'updatedAt': now,
            }
        },
    )
    group_doc['_id'] = result.inserted_id
    return group_doc


def _user_in_group(group_doc: dict, user_id: str) -> bool:
    return user_id in (group_doc.get('memberIds') or [])


@messages_bp.route('/groups', methods=['GET'])
def list_groups():
    if not ping_db():
        return jsonify({'error': 'Database unavailable'}), 503

    user = get_current_user_doc()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    user_id = _user_id_str(user)
    ensure_user_household(user)
    refreshed = get_db().users.find_one({'_id': user['_id']}) or user
    active_household_id = refreshed.get('activeHouseholdId')
    if active_household_id:
        sync_household_message_group(active_household_id)
    else:
        _ensure_default_group(user_id)

    db = get_db()
    groups = list(
        db.message_groups.find({'memberIds': user_id}).sort('lastMessageAt', -1)
    )
    return jsonify({'groups': [_serialize_group(g) for g in groups]})


@messages_bp.route('/groups', methods=['POST'])
def create_group():
    if not ping_db():
        return jsonify({'error': 'Database unavailable'}), 503

    user = get_current_user_doc()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Group name is required'}), 400

    user_id = _user_id_str(user)
    member_ids = list({user_id, *(str(m) for m in (data.get('memberIds') or []))})
    now = _utcnow_iso()

    group_doc = {
        'name': name[:80],
        'memberIds': member_ids,
        'isDefault': False,
        'createdBy': user_id,
        'createdAt': now,
        'updatedAt': now,
        'lastMessageAt': None,
        'lastMessagePreview': '',
    }
    result = get_db().message_groups.insert_one(group_doc)
    group_doc['_id'] = result.inserted_id
    return jsonify({'group': _serialize_group(group_doc)}), 201


@messages_bp.route('/groups/<group_id>/messages', methods=['GET'])
def get_messages(group_id):
    if not ping_db():
        return jsonify({'error': 'Database unavailable'}), 503

    user = get_current_user_doc()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        oid = ObjectId(group_id)
    except Exception:
        return jsonify({'error': 'Invalid group id'}), 400

    db = get_db()
    group = db.message_groups.find_one({'_id': oid})
    if not group:
        return jsonify({'error': 'Group not found'}), 404

    user_id = _user_id_str(user)
    if not _user_in_group(group, user_id):
        return jsonify({'error': 'Forbidden'}), 403

    since = request.args.get('since')
    query = {'groupId': group_id}
    if since:
        query['createdAt'] = {'$gt': since}

    limit = min(int(request.args.get('limit', 100)), 200)
    messages = list(
        db.messages.find(query).sort('createdAt', 1).limit(limit)
    )
    return jsonify({'messages': [_serialize_message(m) for m in messages]})


@messages_bp.route('/groups/<group_id>/messages', methods=['POST'])
def send_message(group_id):
    if not ping_db():
        return jsonify({'error': 'Database unavailable'}), 503

    user = get_current_user_doc()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json or {}
    text = (data.get('message') or '').strip()
    if not text:
        return jsonify({'error': 'Message is required'}), 400

    try:
        oid = ObjectId(group_id)
    except Exception:
        return jsonify({'error': 'Invalid group id'}), 400

    db = get_db()
    group = db.message_groups.find_one({'_id': oid})
    if not group:
        return jsonify({'error': 'Group not found'}), 404

    user_id = _user_id_str(user)
    if not _user_in_group(group, user_id):
        return jsonify({'error': 'Forbidden'}), 403

    sender_name = (
        data.get('senderName')
        or f"{user.get('firstName', '')} {user.get('lastName', '')}".strip()
        or user.get('email', 'Member')
    )
    now = _utcnow_iso()
    msg_doc = {
        'groupId': group_id,
        'senderId': user_id,
        'senderName': sender_name[:80],
        'message': text[:4000],
        'createdAt': now,
    }
    result = db.messages.insert_one(msg_doc)
    msg_doc['_id'] = result.inserted_id

    db.message_groups.update_one(
        {'_id': oid},
        {
            '$set': {
                'lastMessageAt': now,
                'lastMessagePreview': text[:120],
                'updatedAt': now,
            }
        },
    )

    serialized = _serialize_message(msg_doc)
    household_id = group.get('householdId')
    if household_id:
        from realtime_service import emit_new_message
        from household_write_hooks import after_household_write

        emit_new_message(household_id, serialized)
        after_household_write(household_id, 'message', serialized)

    return jsonify({'message': serialized}), 201
