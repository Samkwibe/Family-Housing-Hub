"""Capability-based permissions — extends role defaults with invite presets and grants."""
from __future__ import annotations

from database import get_db
from permission_graph_service import DATA_TYPES, get_member_role

# All platform capabilities (expand over time).
ALL_CAPABILITIES = frozenset({
    'can_view_financials',
    'can_manage_expenses',
    'can_view_documents',
    'can_manage_documents',
    'can_view_health',
    'can_manage_health',
    'can_view_location',
    'can_manage_location',
    'can_assign_chores',
    'can_view_chores',
    'can_send_messages',
    'can_view_adult_threads',
    'can_manage_properties',
    'can_manage_leases',
    'can_collect_rent',
    'can_invite_tenants',
    'can_view_property_analytics',
    'can_manage_child_profile',
    'can_view_child_wallet',
    'can_assign_child_rewards',
    'can_view_own_rewards',
    'can_view_family_messages',
})

ROLE_CAPABILITY_DEFAULTS: dict[str, frozenset[str]] = {
    'owner': ALL_CAPABILITIES,
    'renter': frozenset({
        'can_view_financials', 'can_manage_expenses', 'can_view_chores',
        'can_assign_chores', 'can_send_messages', 'can_view_adult_threads',
        'can_view_location', 'can_manage_location', 'can_manage_child_profile',
        'can_assign_child_rewards',
    }),
    'family': frozenset({
        'can_view_chores', 'can_view_own_rewards', 'can_view_family_messages',
        'can_send_messages',
    }),
}

INVITE_TYPE_CAPABILITIES: dict[str, frozenset[str]] = {
    'spouse': frozenset({
        'can_view_financials', 'can_manage_expenses', 'can_view_documents',
        'can_manage_documents', 'can_view_health', 'can_view_chores',
        'can_assign_chores', 'can_send_messages', 'can_view_adult_threads',
        'can_view_location', 'can_manage_location',
    }),
    'roommate': frozenset({
        'can_manage_expenses', 'can_view_chores', 'can_assign_chores',
        'can_send_messages', 'can_view_adult_threads',
    }),
    'child': frozenset({
        'can_view_chores', 'can_view_own_rewards', 'can_view_family_messages',
        'can_send_messages',
    }),
    'tenant': frozenset({
        'can_manage_expenses', 'can_view_chores', 'can_send_messages',
    }),
}

EXPERIENCE_CAPABILITY_DEFAULTS: dict[str, frozenset[str]] = {
    'renter': ROLE_CAPABILITY_DEFAULTS['renter'],
    'owner': frozenset({
        'can_manage_properties', 'can_manage_leases', 'can_collect_rent',
        'can_invite_tenants', 'can_view_property_analytics', 'can_send_messages',
        'can_view_adult_threads', 'can_manage_child_profile', 'can_assign_child_rewards',
    }),
    'child': frozenset({
        'can_view_chores', 'can_view_own_rewards', 'can_view_family_messages',
        'can_send_messages',
    }),
    'teen': frozenset({
        'can_view_chores', 'can_view_own_rewards', 'can_view_family_messages',
        'can_send_messages', 'can_assign_chores',
    }),
    'managed': frozenset(),
}

# Maps permission graph data types to capabilities for household RBAC sync.
DATA_TYPE_TO_CAPABILITIES: dict[str, frozenset[str]] = {
    'expenses': frozenset({'can_manage_expenses', 'can_view_financials'}),
    'documents': frozenset({'can_view_documents', 'can_manage_documents'}),
    'financial': frozenset({'can_view_financials'}),
    'health': frozenset({'can_view_health', 'can_manage_health'}),
    'location': frozenset({'can_view_location', 'can_manage_location'}),
    'chores': frozenset({'can_view_chores', 'can_assign_chores'}),
    'messages': frozenset({'can_send_messages', 'can_view_family_messages'}),
    'budget': frozenset({'can_view_financials'}),
    'inventory': frozenset({'can_view_chores'}),
    'shopping': frozenset({'can_view_chores'}),
    'maintenance': frozenset({'can_send_messages'}),
}


def _capability_grants_collection():
    return get_db().capability_grants


def resolve_capabilities(
    user_id: str,
    *,
    experience_type: str,
    household_id: str | None,
    property_id: str | None,
    child_profile_id: str | None,
    invite_type: str | None = None,
) -> frozenset[str]:
    """Resolve effective capabilities for a user in the current portal context."""
    caps: set[str] = set()

    if invite_type and invite_type in INVITE_TYPE_CAPABILITIES:
        caps.update(INVITE_TYPE_CAPABILITIES[invite_type])
    elif experience_type in EXPERIENCE_CAPABILITY_DEFAULTS:
        caps.update(EXPERIENCE_CAPABILITY_DEFAULTS[experience_type])
    elif household_id:
        role = get_member_role(user_id, household_id)
        caps.update(ROLE_CAPABILITY_DEFAULTS.get(role, ROLE_CAPABILITY_DEFAULTS['renter']))

    if household_id:
        db = get_db()
        member = db.household_members.find_one({
            'householdId': household_id,
            'userId': user_id,
            'status': 'active',
        })
        if member and member.get('inviteType') in INVITE_TYPE_CAPABILITIES:
            caps.update(INVITE_TYPE_CAPABILITIES[member['inviteType']])

        for dt in DATA_TYPES:
            from permission_graph_service import get_permission
            if get_permission(user_id, household_id, dt):
                caps.update(DATA_TYPE_TO_CAPABILITIES.get(dt, frozenset()))

    for grant in _capability_grants_collection().find({'userId': user_id}):
        cap = grant.get('capability')
        if not cap or cap not in ALL_CAPABILITIES:
            continue
        if grant.get('permission') == 'deny':
            caps.discard(cap)
        else:
            caps.add(cap)

    if property_id and experience_type == 'owner':
        caps.update({
            'can_manage_properties', 'can_manage_leases', 'can_collect_rent',
            'can_invite_tenants', 'can_view_property_analytics',
        })

    if child_profile_id and experience_type in ('child', 'teen'):
        caps.update({'can_view_chores', 'can_view_own_rewards', 'can_view_family_messages'})

    return frozenset(caps & ALL_CAPABILITIES)


def require_capability(capabilities: frozenset[str], required: str) -> tuple[bool, str | None]:
    if required in capabilities:
        return True, None
    return False, f'Missing capability: {required}'
