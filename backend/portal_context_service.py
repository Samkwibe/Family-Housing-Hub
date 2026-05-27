"""PortalContext — single scope object for routes, AI, cache, messaging, and realtime."""
from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import date, datetime, timezone

from flask import g, request

from capability_service import resolve_capabilities
from database import get_db
from household_service import ensure_user_household

VALID_PORTALS = frozenset({'renter', 'owner', 'child', 'teen'})
VALID_EXPERIENCE_TYPES = frozenset({'renter', 'owner', 'child', 'teen', 'managed'})


@dataclass(frozen=True)
class PortalContext:
    user_id: str
    experience_type: str
    active_portal: str
    household_id: str | None
    property_id: str | None
    child_profile_id: str | None
    capabilities: frozenset[str]

    def to_dict(self) -> dict:
        return {
            **{k: v for k, v in asdict(self).items() if k != 'capabilities'},
            'capabilities': sorted(self.capabilities),
        }

    def has_capability(self, cap: str) -> bool:
        return cap in self.capabilities


def _utc_today() -> date:
    return datetime.now(timezone.utc).date()


def _parse_dob(value) -> date | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return None
    return None


def compute_age_tier(date_of_birth, today: date | None = None) -> str:
    """Age tier from DOB — updates automatically on birthday."""
    today = today or _utc_today()
    dob = _parse_dob(date_of_birth)
    if not dob:
        return 'child_9_12'
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if age < 8:
        return 'managed'
    if age < 13:
        return 'child_9_12'
    return 'teen_13_17'


def age_tier_to_experience(age_tier: str) -> str:
    if age_tier == 'managed':
        return 'managed'
    if age_tier == 'teen_13_17':
        return 'teen'
    return 'child'


def derive_experience_type(user: dict, child_profile: dict | None = None) -> str:
    explicit = user.get('experienceType')
    if explicit in VALID_EXPERIENCE_TYPES:
        return explicit

    user_type = (user.get('userType') or 'renter').lower()
    if user_type == 'owner':
        return 'owner'
    if user_type == 'family':
        dob = None
        if child_profile:
            dob = child_profile.get('dateOfBirth')
        if not dob:
            uid = str(user.get('_id', ''))
            hid = user.get('activeHouseholdId')
            if hid:
                member = get_db().household_members.find_one({
                    'householdId': hid, 'userId': uid, 'status': 'active',
                })
                if member:
                    dob = member.get('dateOfBirth')
        return age_tier_to_experience(compute_age_tier(dob))
    return 'renter'


def default_active_portal(experience_type: str) -> str:
    if experience_type == 'owner':
        return 'owner'
    if experience_type in ('child', 'teen'):
        return 'child'
    if experience_type == 'managed':
        return 'renter'
    return 'renter'


def _child_profile_for_user(user_id: str) -> dict | None:
    return get_db().child_profiles.find_one({'userId': user_id, 'status': {'$ne': 'archived'}})


def resolve_portal_context(user: dict | None = None, req=None) -> PortalContext | None:
    """Build PortalContext from authenticated user and optional request headers."""
    if user is None:
        from auth_routes import get_current_user_doc
        user = get_current_user_doc()
    if not user:
        return None

    req = req or request
    user_id = str(user['_id'])
    child_profile = _child_profile_for_user(user_id)

    experience_type = derive_experience_type(user, child_profile)
    user_type = (user.get('userType') or 'renter').lower()
    active_portal = user.get('activePortal') or default_active_portal(experience_type)

    header_portal = (req.headers.get('X-Active-Portal') or '').strip().lower()
    if header_portal in VALID_PORTALS:
        active_portal = header_portal
    elif header_portal == 'teen':
        active_portal = 'child'

    if user_type == 'family':
        active_portal = 'child'
        experience_type = derive_experience_type(user, child_profile)

    household_id = user.get('activeHouseholdId')
    if not household_id and user_type != 'family':
        household_id = ensure_user_household(user)
    property_id = user.get('activePropertyId')
    child_profile_id = str(child_profile['_id']) if child_profile else None

    invite_type = None
    if household_id:
        member = get_db().household_members.find_one({
            'householdId': household_id,
            'userId': user_id,
            'status': 'active',
        })
        if member:
            invite_type = member.get('inviteType')

    capabilities = resolve_capabilities(
        user_id,
        experience_type=experience_type,
        household_id=household_id,
        property_id=property_id,
        child_profile_id=child_profile_id,
        invite_type=invite_type,
    )

    return PortalContext(
        user_id=user_id,
        experience_type=experience_type,
        active_portal=active_portal,
        household_id=household_id,
        property_id=property_id,
        child_profile_id=child_profile_id,
        capabilities=capabilities,
    )


def get_portal_context() -> PortalContext | None:
    """Return PortalContext attached to Flask g, or resolve on demand."""
    ctx = getattr(g, 'portal_ctx', None)
    if ctx is not None:
        return ctx
    return resolve_portal_context()


def require_portal_context() -> tuple[PortalContext | None, tuple | None]:
    ctx = get_portal_context()
    if not ctx:
        from flask import jsonify
        return None, (jsonify({'error': 'Authentication required'}), 401)
    return ctx, None
