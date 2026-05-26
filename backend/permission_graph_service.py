"""Household permission graph — RBAC with parent overrides."""
from __future__ import annotations

from bson import ObjectId

from database import get_db

DATA_TYPES = frozenset({
    'expenses', 'documents', 'financial', 'health', 'location',
    'inventory', 'chores', 'shopping', 'maintenance', 'messages', 'budget',
})

DEFAULT_ROLE_PERMISSIONS = {
    'owner': {dt: True for dt in DATA_TYPES},
    'renter': {
        'expenses': True, 'documents': False, 'financial': True, 'health': False,
        'location': True, 'inventory': True, 'chores': True, 'shopping': True,
        'maintenance': True, 'messages': True, 'budget': True,
    },
    'family': {
        'expenses': False, 'documents': False, 'financial': False, 'health': False,
        'location': False, 'inventory': False, 'chores': True, 'shopping': False,
        'maintenance': False, 'messages': True, 'budget': False,
    },
}


def get_member_role(user_id: str, household_id: str) -> str:
    db = get_db()
    member = db.household_members.find_one({
        'householdId': household_id,
        'userId': user_id,
        'status': 'active',
    })
    if not member:
        return 'renter'
    role = member.get('role') or 'renter'
    if role not in DEFAULT_ROLE_PERMISSIONS:
        return 'renter'
    return role


def get_permission(user_id: str, household_id: str, data_type: str) -> bool:
    if data_type not in DATA_TYPES:
        return True
    db = get_db()
    override = db.household_permission_grants.find_one({
        'householdId': household_id,
        'targetUserId': user_id,
        'dataType': data_type,
    })
    if override:
        return override.get('permission') == 'allow'
    role = get_member_role(user_id, household_id)
    return bool(DEFAULT_ROLE_PERMISSIONS.get(role, {}).get(data_type, False))


def require_permission(user_id: str, household_id: str, data_type: str) -> tuple[bool, str | None]:
    if get_permission(user_id, household_id, data_type):
        return True, None
    return False, f'Access denied: your role cannot access {data_type}'


def grant_permission(household_id: str, target_user_id: str, data_type: str, granted_by: str, allow: bool = True) -> dict:
    from datetime import datetime, timezone
    db = get_db()
    db.household_permission_grants.update_one(
        {'householdId': household_id, 'targetUserId': target_user_id, 'dataType': data_type},
        {'$set': {
            'householdId': household_id,
            'targetUserId': target_user_id,
            'dataType': data_type,
            'permission': 'allow' if allow else 'deny',
            'grantedBy': granted_by,
            'grantedAt': datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return {'targetUserId': target_user_id, 'dataType': data_type, 'permission': 'allow' if allow else 'deny'}


def list_member_permissions(household_id: str, target_user_id: str) -> dict:
    role = get_member_role(target_user_id, household_id)
    base = {dt: DEFAULT_ROLE_PERMISSIONS.get(role, {}).get(dt, False) for dt in DATA_TYPES}
    db = get_db()
    for ov in db.household_permission_grants.find({'householdId': household_id, 'targetUserId': target_user_id}):
        base[ov['dataType']] = ov.get('permission') == 'allow'
    return {'role': role, 'permissions': base}
