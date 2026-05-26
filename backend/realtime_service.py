"""Flask-SocketIO real-time events — JWT auth, household rooms."""
from __future__ import annotations

import os
from typing import Any

from bson import ObjectId
from flask import request
from flask_socketio import SocketIO, disconnect, emit, join_room

from auth_routes import JWT_ALGORITHM, JWT_SECRET, _decode_token
from database import get_db
from household_service import ensure_user_household

socketio = SocketIO(
    cors_allowed_origins='*',
    async_mode='threading',
    logger=False,
    engineio_logger=False,
)

_connected_users: dict[str, str] = {}


def household_room(household_id: str) -> str:
    return f'household:{household_id}'


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
    join_room(household_room(household_id))
    join_room(user_room(user_id))
    _connected_users[request.sid] = user_id
    emit('connected', {'userId': user_id, 'householdId': household_id})
    return True


@socketio.on('disconnect')
def on_disconnect():
    _connected_users.pop(request.sid, None)


def emit_household_event(household_id: str, event: str, data: dict[str, Any]) -> None:
    if not household_id:
        return
    socketio.emit(event, data, room=household_room(household_id), namespace='/')


def emit_user_notification(user_id: str, event: str, data: dict[str, Any]) -> None:
    if not user_id:
        return
    socketio.emit(event, data, room=user_room(user_id), namespace='/')


def emit_new_message(household_id: str, message: dict) -> None:
    emit_household_event(household_id, 'new_message', {'message': message})


def emit_household_data_changed(household_id: str, entity: str, payload: dict | None = None) -> None:
    emit_household_event(
        household_id,
        'household_updated',
        {'entity': entity, 'payload': payload or {}, 'ts': __import__('time').time()},
    )


def emit_notification(user_id: str, notification: dict) -> None:
    emit_user_notification(user_id, 'notification', notification)
