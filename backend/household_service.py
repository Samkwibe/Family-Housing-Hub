"""Multi-user household membership, invites, and data scoping."""
import os
import smtplib
import uuid
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from bson import ObjectId

from database import get_db

MEMBER_COLORS = ['#A78BFA', '#60A5FA', '#34D399', '#FBBF24', '#F87171', '#FB7185']

HOUSEHOLD_DATA_COLLECTIONS = (
    'inventory',
    'chores',
    'expenses',
    'maintenance',
    'packages',
    'documents',
    'smart_devices',
    'financial_goals',
    'utilities',
    'checklist_items',
    'health_reminders',
    'emergency_profiles',
    'credit_settings',
)

INVITE_EXPIRES_DAYS = int(os.getenv('HOUSEHOLD_INVITE_EXPIRES_DAYS', '7'))
INVITE_LINK_BASE = (
    os.getenv('INVITE_LINK_BASE')
    or os.getenv('EXPO_PUBLIC_INVITE_LINK_BASE')
    or 'familyhousinghub://invite'
).rstrip('/')

VALID_INVITE_TYPES = frozenset({'child', 'spouse', 'roommate', 'tenant'})
INVITE_TYPE_TO_RELATIONSHIP = {
    'child': 'child',
    'spouse': 'spouse',
    'roommate': 'roommate',
    'tenant': 'tenant',
}

SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
SMTP_USER = os.getenv('SMTP_USER')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')
EMAIL_FROM = os.getenv('EMAIL_FROM', SMTP_USER or 'noreply@family-housing-hub.com')


def _utcnow():
    return datetime.now(timezone.utc)


def _coerce_utc_datetime(value):
    if not value:
        return None
    if isinstance(value, str):
        value = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if isinstance(value, datetime) and value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value


def _user_id(user) -> str:
    return str(user['_id'])


def _household_name_for_user(user) -> str:
    first = (user.get('firstName') or '').strip()
    addr = user.get('address') or {}
    city = (addr.get('city') or '').strip()
    if city:
        return f'{city} Home'
    if first:
        return f"{first}'s Home"
    return 'My Home'


def migrate_user_data_to_household(user_id: str, household_id: str) -> None:
    """Attach legacy user-scoped records to a household."""
    db = get_db()
    for coll_name in HOUSEHOLD_DATA_COLLECTIONS:
        db[coll_name].update_many(
            {'userId': user_id, 'householdId': {'$exists': False}},
            {'$set': {'householdId': household_id}},
        )


def _create_household_for_user(user, *, role: str = 'owner') -> str:
    db = get_db()
    uid = _user_id(user)
    now = _utcnow()
    household_doc = {
        'name': _household_name_for_user(user),
        'createdBy': uid,
        'address': user.get('address') or {},
        'createdAt': now,
        'updatedAt': now,
    }
    result = db.households.insert_one(household_doc)
    household_id = str(result.inserted_id)

    db.household_members.insert_one({
        'householdId': household_id,
        'userId': uid,
        'role': role,
        'status': 'active',
        'joinedAt': now,
    })

    migrate_user_data_to_household(uid, household_id)

    owned = list(user.get('ownedHouseholdIds') or [])
    if role == 'owner' and household_id not in owned:
        owned.append(household_id)

    db.users.update_one(
        {'_id': user['_id']},
        {
            '$set': {
                'activeHouseholdId': household_id,
                'ownedHouseholdIds': owned,
                'updatedAt': now.isoformat(),
            }
        },
    )
    sync_household_message_group(household_id)
    return household_id


def get_active_membership(user) -> dict | None:
    db = get_db()
    active_id = user.get('activeHouseholdId')
    uid = _user_id(user)
    if active_id:
        membership = db.household_members.find_one({
            'householdId': active_id,
            'userId': uid,
            'status': 'active',
        })
        if membership:
            return membership
    return db.household_members.find_one({'userId': uid, 'status': 'active'})


def ensure_user_household(user) -> str:
    """Return active household id; create solo household + backfill on first use."""
    membership = get_active_membership(user)
    if membership:
        hid = membership['householdId']
        db = get_db()
        if user.get('activeHouseholdId') != hid:
            db.users.update_one(
                {'_id': user['_id']},
                {'$set': {'activeHouseholdId': hid, 'updatedAt': _utcnow().isoformat()}},
            )
        migrate_user_data_to_household(_user_id(user), hid)
        return hid
    return _create_household_for_user(user, role='owner')


def household_scope(user) -> dict:
    return {'householdId': ensure_user_household(user)}


def get_household_member_user_ids(household_id: str) -> list[str]:
    db = get_db()
    members = db.household_members.find({'householdId': household_id, 'status': 'active'})
    return [m['userId'] for m in members]


def user_can_access_household(user, household_id: str) -> bool:
    db = get_db()
    return bool(db.household_members.find_one({
        'householdId': household_id,
        'userId': _user_id(user),
        'status': 'active',
    }))


def build_members_for_household(household_id: str) -> list:
    db = get_db()
    members = list(db.household_members.find({'householdId': household_id, 'status': 'active'}))
    out = []
    for idx, member in enumerate(members):
        user = db.users.find_one({'_id': ObjectId(member['userId'])})
        if not user:
            continue
        name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() or user.get('email', 'Member')
        initials = ''.join(p[0].upper() for p in name.split()[:2]) or 'M'
        role = member.get('role') or user.get('userType') or 'renter'
        if role not in ('owner', 'renter', 'family'):
            role = 'renter'
        out.append({
            'id': str(user['_id']),
            'name': name,
            'role': role,
            'initials': initials,
            'color': MEMBER_COLORS[idx % len(MEMBER_COLORS)],
            'rentShare': member.get('rentShare'),
            'rentPaid': member.get('rentPaid', True),
        })
    return out


def list_user_households(user) -> list:
    db = get_db()
    uid = _user_id(user)
    memberships = list(db.household_members.find({'userId': uid, 'status': 'active'}))
    households = []
    for m in memberships:
        hid = m['householdId']
        try:
            hh = db.households.find_one({'_id': ObjectId(hid)})
        except Exception:
            hh = None
        if not hh:
            continue
        households.append({
            'id': hid,
            'name': hh.get('name', 'Home'),
            'role': m.get('role', 'renter'),
            'isActive': user.get('activeHouseholdId') == hid,
            'memberCount': db.household_members.count_documents({'householdId': hid, 'status': 'active'}),
        })
    return households


def create_household(user, name: str | None = None) -> str:
    """Owners can create additional properties."""
    db = get_db()
    uid = _user_id(user)
    user_type = user.get('userType') or user.get('role') or 'renter'
    if user_type != 'owner':
        raise PermissionError('Only property owners can create additional households')

    now = _utcnow()
    household_doc = {
        'name': (name or '').strip() or _household_name_for_user(user),
        'createdBy': uid,
        'address': user.get('address') or {},
        'createdAt': now,
        'updatedAt': now,
    }
    result = db.households.insert_one(household_doc)
    household_id = str(result.inserted_id)

    db.household_members.insert_one({
        'householdId': household_id,
        'userId': uid,
        'role': 'owner',
        'status': 'active',
        'joinedAt': now,
    })

    owned = list(user.get('ownedHouseholdIds') or [])
    if household_id not in owned:
        owned.append(household_id)

    db.users.update_one(
        {'_id': user['_id']},
        {
            '$set': {
                'activeHouseholdId': household_id,
                'ownedHouseholdIds': owned,
                'updatedAt': now.isoformat(),
            }
        },
    )
    sync_household_message_group(household_id)
    return household_id


def switch_active_household(user, household_id: str) -> None:
    if not user_can_access_household(user, household_id):
        raise PermissionError('You are not a member of this household')
    get_db().users.update_one(
        {'_id': user['_id']},
        {'$set': {'activeHouseholdId': household_id, 'updatedAt': _utcnow().isoformat()}},
    )


def sync_household_message_group(household_id: str) -> None:
    """Keep the household family chat in sync with member list."""
    db = get_db()
    member_ids = get_household_member_user_ids(household_id)
    if not member_ids:
        return

    group = db.message_groups.find_one({'householdId': household_id, 'isDefault': True})
    now = _utcnow().isoformat()
    if group:
        db.message_groups.update_one(
            {'_id': group['_id']},
            {'$set': {'memberIds': member_ids, 'updatedAt': now}},
        )
        return

    group_doc = {
        'name': 'Family Chat',
        'householdId': household_id,
        'memberIds': member_ids,
        'isDefault': True,
        'createdBy': member_ids[0],
        'createdAt': now,
        'updatedAt': now,
        'lastMessageAt': None,
        'lastMessagePreview': '',
    }
    result = db.message_groups.insert_one(group_doc)
    welcome = {
        'groupId': str(result.inserted_id),
        'senderId': 'system',
        'senderName': 'Family Housing Hub',
        'message': (
            'Welcome to Family Chat! '
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
            }
        },
    )


def _send_email(to_email: str, subject: str, html_body: str) -> None:
    try:
        from job_queue import enqueue
        from tasks import send_household_invite_email_task

        enqueue(send_household_invite_email_task, to_email, subject, html_body)
        return
    except Exception as exc:
        print(f'[invite] Celery enqueue failed, sending sync: {exc}')
    if not SMTP_USER or not SMTP_PASSWORD:
        print(f'[dev] Invite email to {to_email}: {subject}')
        return
    sender = EMAIL_FROM if EMAIL_FROM else SMTP_USER
    if sender == 'noreply@family-housing-hub.com' and SMTP_USER != 'apikey':
        sender = SMTP_USER
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = sender
    msg['To'] = to_email
    msg.attach(MIMEText(html_body, 'html'))
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
    server.starttls()
    server.login(SMTP_USER, SMTP_PASSWORD)
    server.sendmail(sender, [to_email], msg.as_string())
    server.quit()


def _parse_invite_dob(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            return None
    return None


def _relationship_from_invite(invite: dict) -> str:
    invite_type = (invite.get('inviteType') or '').lower()
    if invite_type in INVITE_TYPE_TO_RELATIONSHIP:
        return INVITE_TYPE_TO_RELATIONSHIP[invite_type]
    role = (invite.get('role') or 'renter').lower()
    if role == 'family':
        return 'child'
    if role == 'owner':
        return 'parent'
    return 'roommate'


def _is_child_invite(invite: dict) -> bool:
    return (invite.get('inviteType') or '').lower() == 'child'


def validate_invite_for_registration(token: str, email: str) -> dict:
    """Validate pending invite token matches registration email."""
    db = get_db()
    invite = db.household_invites.find_one({'token': token})
    if not invite:
        raise LookupError('Invite not found')
    if invite.get('status') != 'pending':
        raise LookupError('Invite is no longer valid')
    if invite.get('expiresAt') and _coerce_utc_datetime(invite['expiresAt']) < _utcnow():
        db.household_invites.update_one({'_id': invite['_id']}, {'$set': {'status': 'expired', 'childInviteStatus': 'expired'}})
        raise LookupError('Invite has expired')
    normalized = (email or '').strip().lower()
    if normalized != (invite.get('email') or '').strip().lower():
        raise PermissionError('This invite was sent to a different email address')
    return invite


def _member_payload_from_invite(invite: dict, household_id: str, uid: str, now) -> dict:
    relationship = _relationship_from_invite(invite)
    payload = {
        'householdId': household_id,
        'userId': uid,
        'role': invite.get('role', 'renter'),
        'status': 'active',
        'joinedAt': now,
        'inviteType': invite.get('inviteType'),
        'relationshipType': relationship,
    }
    if invite.get('displayName'):
        payload['displayName'] = invite.get('displayName')
    if invite.get('dateOfBirth'):
        payload['dateOfBirth'] = invite.get('dateOfBirth')
    return payload


def _finalize_child_invite_accept(db, user: dict, invite: dict, household_id: str) -> dict:
    """Promote user to child portal, link profile, enforce backend routing."""
    from portal_context_service import age_tier_to_experience, compute_age_tier
    from child_service import link_child_profile_from_invite

    dob = invite.get('dateOfBirth')
    age_tier = compute_age_tier(dob)
    experience_type = age_tier_to_experience(age_tier)
    active_portal = 'child' if experience_type in ('child', 'teen') else 'child'

    parent_user_id = invite.get('invitedBy')
    profile = link_child_profile_from_invite(
        db,
        user=user,
        invite=invite,
        parent_user_id=parent_user_id,
        household_id=household_id,
    )

    now_iso = _utcnow().isoformat()
    db.users.update_one(
        {'_id': user['_id']},
        {'$set': {
            'userType': 'family',
            'experienceType': experience_type,
            'activePortal': active_portal,
            'activeHouseholdId': household_id,
            'profileComplete': True,
            'onboardingComplete': True,
            'updatedAt': now_iso,
        }},
    )

    return {
        'activePortal': active_portal,
        'experienceType': experience_type,
        'ageTier': age_tier,
        'childProfileId': str(profile['_id']) if profile else None,
        'childInviteStatus': 'accepted',
    }


def create_household_invite(
    user,
    email: str,
    role: str = 'renter',
    *,
    invite_type: str | None = None,
    display_name: str | None = None,
    date_of_birth=None,
) -> dict:
    db = get_db()
    household_id = ensure_user_household(user)
    inviter_membership = db.household_members.find_one({
        'householdId': household_id,
        'userId': _user_id(user),
        'status': 'active',
    })
    if not inviter_membership or inviter_membership.get('role') != 'owner':
        raise PermissionError('Only household owners can send invites')

    normalized = (email or '').strip().lower()
    if not normalized or '@' not in normalized:
        raise ValueError('Valid email is required')

    if role not in ('renter', 'family', 'owner'):
        role = 'renter'

    invite_type = (invite_type or '').strip().lower() or None
    if invite_type and invite_type not in VALID_INVITE_TYPES:
        raise ValueError('inviteType must be child, spouse, roommate, or tenant')

    if invite_type == 'child':
        role = 'family'
        display_name = (display_name or '').strip()
        if not display_name:
            raise ValueError("Child's name is required")
        parsed_dob = _parse_invite_dob(date_of_birth)
        if not parsed_dob:
            raise ValueError("Child's date of birth is required (YYYY-MM-DD)")
        date_of_birth = parsed_dob
    elif invite_type == 'spouse':
        role = 'family'
    elif invite_type in ('roommate', 'tenant'):
        role = 'renter'

    existing_member = db.users.find_one({'email': normalized})
    if existing_member and db.household_members.find_one({
        'householdId': household_id,
        'userId': str(existing_member['_id']),
        'status': 'active',
    }):
        raise ValueError('This person is already in your household')

    token = uuid.uuid4().hex
    now = _utcnow()
    expires_at = now + timedelta(days=INVITE_EXPIRES_DAYS)
    invite_doc = {
        'householdId': household_id,
        'email': normalized,
        'token': token,
        'invitedBy': _user_id(user),
        'role': role,
        'inviteType': invite_type or ('roommate' if role == 'renter' else None),
        'relationshipType': INVITE_TYPE_TO_RELATIONSHIP.get(
            invite_type or '',
            _relationship_from_invite({'role': role, 'inviteType': invite_type}),
        ),
        'displayName': (display_name or '').strip() or None,
        'dateOfBirth': date_of_birth,
        'childInviteStatus': 'pending' if invite_type == 'child' else None,
        'status': 'pending',
        'createdAt': now,
        'expiresAt': expires_at,
        'acceptedAt': None,
    }
    db.household_invites.insert_one(invite_doc)

    household = db.households.find_one({'_id': ObjectId(household_id)})
    household_name = (household or {}).get('name', 'a household')
    inviter_name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() or 'Someone'
    link = f'{INVITE_LINK_BASE}/{token}'

    if invite_type == 'child':
        child_name = display_name or 'your child'
        html = f"""
        <html><body style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>You're invited to FamilyHub! 🎉</h2>
          <p>{inviter_name} invited <strong>{child_name}</strong> to join <strong>{household_name}</strong> on FamilyHub.</p>
          <p>Accept the invite to see chores, earn rewards, and chat safely with your family.</p>
          <p><a href="{link}" style="background:#7C3AED;color:#fff;padding:12px 20px;text-decoration:none;border-radius:8px;">Accept family invite</a></p>
          <p>Or open this link in the app:<br><code>{link}</code></p>
          <p style="color:#666;font-size:12px;">This invite expires in {INVITE_EXPIRES_DAYS} days.</p>
        </body></html>
        """
        subject = f'{inviter_name} invited you to FamilyHub'
    else:
        html = f"""
        <html><body style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>You're invited to join {household_name}</h2>
          <p>{inviter_name} invited you to share a home on Family Housing Hub.</p>
          <p><a href="{link}" style="background:#6366f1;color:#fff;padding:12px 20px;text-decoration:none;border-radius:8px;">Accept invite</a></p>
          <p>Or open this link in the app:<br><code>{link}</code></p>
          <p style="color:#666;font-size:12px;">This invite expires in {INVITE_EXPIRES_DAYS} days.</p>
        </body></html>
        """
        subject = f'Join {household_name} on Family Housing Hub'
    try:
        _send_email(normalized, subject, html)
    except Exception as exc:
        print(f'Invite email failed for {normalized}: {exc}')

    return {
        'id': token,
        'email': normalized,
        'role': role,
        'inviteType': invite_doc.get('inviteType'),
        'displayName': invite_doc.get('displayName'),
        'childInviteStatus': invite_doc.get('childInviteStatus'),
        'expiresAt': expires_at.isoformat(),
        'inviteLink': link,
    }


def list_household_invites(user, invite_type: str | None = None) -> list[dict]:
    db = get_db()
    household_id = ensure_user_household(user)
    membership = db.household_members.find_one({
        'householdId': household_id,
        'userId': _user_id(user),
        'status': 'active',
    })
    if not membership or membership.get('role') != 'owner':
        raise PermissionError('Only household owners can view invites')

    query = {'householdId': household_id, 'status': 'pending'}
    if invite_type:
        query['inviteType'] = invite_type
    invites = list(db.household_invites.find(query).sort('createdAt', -1))
    out = []
    for inv in invites:
        out.append({
            'token': inv.get('token'),
            'email': inv.get('email'),
            'role': inv.get('role', 'renter'),
            'inviteType': inv.get('inviteType'),
            'displayName': inv.get('displayName'),
            'childInviteStatus': inv.get('childInviteStatus') or 'pending',
            'relationshipType': inv.get('relationshipType'),
            'expiresAt': inv['expiresAt'].isoformat() if inv.get('expiresAt') else None,
            'createdAt': inv['createdAt'].isoformat() if inv.get('createdAt') else None,
        })
    return out


def get_invite_preview(token: str) -> dict:
    db = get_db()
    invite = db.household_invites.find_one({'token': token})
    if not invite:
        raise LookupError('Invite not found')
    if invite.get('status') != 'pending':
        raise LookupError('Invite is no longer valid')
    if invite.get('expiresAt') and _coerce_utc_datetime(invite['expiresAt']) < _utcnow():
        db.household_invites.update_one(
            {'_id': invite['_id']},
            {'$set': {'status': 'expired', 'childInviteStatus': 'expired'}},
        )
        raise LookupError('Invite has expired')

    household = db.households.find_one({'_id': ObjectId(invite['householdId'])})
    inviter = db.users.find_one({'_id': ObjectId(invite['invitedBy'])})
    inviter_name = (
        f"{(inviter or {}).get('firstName', '')} {(inviter or {}).get('lastName', '')}".strip()
        or 'A household member'
    )
    return {
        'token': token,
        'householdName': (household or {}).get('name', 'Home'),
        'inviterName': inviter_name,
        'email': invite.get('email'),
        'role': invite.get('role', 'renter'),
        'inviteType': invite.get('inviteType'),
        'displayName': invite.get('displayName'),
        'relationshipType': invite.get('relationshipType') or _relationship_from_invite(invite),
        'childInviteStatus': invite.get('childInviteStatus') or ('pending' if _is_child_invite(invite) else None),
        'expiresAt': invite['expiresAt'].isoformat() if invite.get('expiresAt') else None,
    }


def accept_household_invite(user, token: str) -> dict:
    db = get_db()
    invite = db.household_invites.find_one({'token': token})
    if not invite:
        raise LookupError('Invite not found')
    if invite.get('status') != 'pending':
        raise LookupError('Invite is no longer valid')
    if invite.get('expiresAt') and _coerce_utc_datetime(invite['expiresAt']) < _utcnow():
        db.household_invites.update_one(
            {'_id': invite['_id']},
            {'$set': {'status': 'expired', 'childInviteStatus': 'expired'}},
        )
        raise LookupError('Invite has expired')

    user_email = (user.get('email') or '').strip().lower()
    if user_email != invite.get('email'):
        raise PermissionError('This invite was sent to a different email address')

    household_id = invite['householdId']
    uid = _user_id(user)
    now = _utcnow()
    is_child = _is_child_invite(invite)
    member_fields = _member_payload_from_invite(invite, household_id, uid, now)

    existing = db.household_members.find_one({
        'householdId': household_id,
        'userId': uid,
    })
    if existing and existing.get('status') == 'active':
        db.household_members.update_one(
            {'_id': existing['_id']},
            {'$set': {k: v for k, v in member_fields.items() if k not in ('householdId', 'userId')}},
        )
        db.household_invites.update_one(
            {'_id': invite['_id']},
            {'$set': {'status': 'accepted', 'acceptedAt': now, 'childInviteStatus': 'accepted' if is_child else invite.get('childInviteStatus')}},
        )
    else:
        if existing:
            db.household_members.update_one(
                {'_id': existing['_id']},
                {'$set': member_fields},
            )
        else:
            db.household_members.insert_one(member_fields)

        db.household_invites.update_one(
            {'_id': invite['_id']},
            {'$set': {'status': 'accepted', 'acceptedAt': now, 'childInviteStatus': 'accepted' if is_child else invite.get('childInviteStatus')}},
        )

    user_updates = {'activeHouseholdId': household_id, 'updatedAt': now.isoformat()}
    db.users.update_one({'_id': user['_id']}, {'$set': user_updates})
    sync_household_message_group(household_id)

    child_result = {}
    if is_child:
        child_result = _finalize_child_invite_accept(db, user, invite, household_id)

    household = db.households.find_one({'_id': ObjectId(household_id)})
    refreshed_user = db.users.find_one({'_id': user['_id']})

    result = {
        'householdId': household_id,
        'householdName': (household or {}).get('name', 'Home'),
        'role': invite.get('role', 'renter'),
        'inviteType': invite.get('inviteType'),
        'relationshipType': member_fields.get('relationshipType'),
        'user': {
            'userType': refreshed_user.get('userType'),
            'experienceType': refreshed_user.get('experienceType'),
            'activePortal': refreshed_user.get('activePortal'),
        },
    }
    result.update(child_result)
    return result
