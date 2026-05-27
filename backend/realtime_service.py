"""Flask-SocketIO real-time events — JWT auth, household rooms."""
from __future__ import annotations

import time
from typing import Any

from bson import ObjectId
from flask import request
from flask_socketio import SocketIO, disconnect, emit, join_room

from auth_routes import _decode_token
from database import get_db
from household_service import ensure_user_household

socketio = SocketIO(
    cors_allowed_origins='*',
    async_mode='threading',
    logger=False,
    engineio_logger=False,
)

_connected_users: dict[str, str] = {}
_connected_meta: dict[str, dict] = {}


def household_room(household_id: str) -> str:
    return f'household:{household_id}'


def child_room(child_profile_id: str) -> str:
    return f'child:{child_profile_id}'


def user_room(user_id: str) -> str:
    return f'user:{user_id}'


def _token_from_connect(auth: dict | None) -> str | None:
    if auth and auth.get('token'):
        return str(auth['token']).strip()
    return (request.args.get('token') or '').strip() or None


def _user_from_token(token: str):
    payload = _decode_token(token)
    if not payload or not payload.get('sub'):
        return None
    try:
        oid = ObjectId(payload['sub'])
    except Exception:
        return None
    return get_db().users.find_one({'_id': oid})


@socketio.on('connect')
def on_connect(auth=None):
    token = _token_from_connect(auth)
    if not token:
        disconnect()
        return False

    user = _user_from_token(token)
    if not user:
        disconnect()
        return False

    user_id = str(user['_id'])
    household_id = ensure_user_household(user)
    joined = [household_room(household_id), user_room(user_id)]
    try:
        join_room(household_room(household_id))
        join_room(user_room(user_id))
    except Exception:
        try:
            from observability_service import increment_counter, trace_event
            increment_counter('socket_join_failures')
            trace_event('socket', 'join_failed', {'userId': user_id}, severity='degraded')
        except Exception:
            pass
        disconnect()
        return False

    child_profile_id = None
    user_type = (user.get('userType') or '').lower()
    active_portal = (user.get('activePortal') or user.get('active_portal') or '').lower()
    if user_type == 'family' or active_portal == 'child':
        child_profile = get_db().child_profiles.find_one({
            'userId': user_id,
            'status': {'$ne': 'archived'},
        })
        if child_profile:
            child_profile_id = str(child_profile['_id'])
            join_room(child_room(child_profile_id))
            joined.append(child_room(child_profile_id))

    _connected_users[request.sid] = user_id
    _connected_meta[request.sid] = {
        'userId': user_id,
        'householdId': household_id,
        'childProfileId': child_profile_id,
        'portal': active_portal or user_type,
    }
    try:
        from observability_service import record_socket_connect
        record_socket_connect(user_id, household_id, joined)
    except Exception:
        pass
    emit('connected', {'userId': user_id, 'householdId': household_id})
    return True


@socketio.on('disconnect')
def on_disconnect():
    meta = _connected_meta.pop(request.sid, None)
    user_id = _connected_users.pop(request.sid, None)
    try:
        from observability_service import record_socket_disconnect
        record_socket_disconnect(user_id or (meta or {}).get('userId'))
    except Exception:
        pass


@socketio.on('celebration_ack')
def on_celebration_ack(data=None):
    payload = data or {}
    meta = _connected_meta.get(request.sid, {})
    try:
        from observability_service import record_timing, trace_celebration
        stage = payload.get('stage', 'rendered')
        trace_celebration(
            stage,
            event_type=payload.get('type', 'unknown'),
            trace_id=payload.get('traceId'),
            household_id=meta.get('householdId'),
            child_profile_id=meta.get('childProfileId'),
            duration_ms=payload.get('durationMs'),
        )
        if payload.get('durationMs') and stage == 'rendered':
            record_timing('celebration_render', float(payload['durationMs']), {'traceId': payload.get('traceId')})
    except Exception:
        pass


def emit_household_event(household_id: str, event: str, data: dict[str, Any]) -> None:
    if not household_id:
        return
    start = time.perf_counter()
    socketio.emit(event, data, room=household_room(household_id), namespace='/')
    _record_emit(event, [household_room(household_id)], start)


def emit_user_notification(user_id: str, event: str, data: dict[str, Any]) -> None:
    if not user_id:
        return
    start = time.perf_counter()
    socketio.emit(event, data, room=user_room(user_id), namespace='/')
    _record_emit(event, [user_room(user_id)], start)


def _record_emit(event: str, rooms: list[str], start: float) -> None:
    try:
        from observability_service import record_socket_emit
        record_socket_emit(event, rooms, (time.perf_counter() - start) * 1000)
    except Exception:
        pass


def emit_new_message(household_id: str, message: dict) -> None:
    emit_household_event(household_id, 'new_message', {'message': message})


def emit_household_data_changed(household_id: str, entity: str, payload: dict | None = None) -> None:
    emit_household_event(
        household_id,
        'household_updated',
        {'entity': entity, 'payload': payload or {}, 'ts': time.time()},
    )


def emit_notification(user_id: str, notification: dict) -> None:
    emit_user_notification(user_id, 'notification', notification)


def emit_celebration_event(
    household_id: str | None,
    payload: dict,
    *,
    child_user_id: str | None = None,
    child_profile_id: str | None = None,
    child_only: bool = False,
    trace_id: str | None = None,
) -> None:
    """Emit celebration to household + optional child profile room + child user."""
    if trace_id and 'traceId' not in payload:
        payload = {**payload, 'traceId': trace_id}
    if household_id and not child_only:
        emit_household_event(household_id, 'family_celebration', payload)
    if child_profile_id:
        start = time.perf_counter()
        socketio.emit('family_celebration', payload, room=child_room(child_profile_id), namespace='/')
        _record_emit('family_celebration', [child_room(child_profile_id)], start)
    if child_user_id:
        emit_user_notification(child_user_id, 'family_celebration', payload)
