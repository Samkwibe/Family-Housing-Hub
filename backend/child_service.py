"""Child portal domain logic — profiles, chores, rewards, messages (Mongo-native)."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from bson import ObjectId

from dashboard_cache_service import invalidate_portal_dashboard_cache
from database import get_db
from portal_context_service import PortalContext, compute_age_tier

BADGE_RULES = (
    ('welcome', 'Welcome!', '🎉', lambda p, _: bool(p.get('childOnboardingComplete'))),
    ('family_member', 'Family member', '💜', lambda p, _: bool(p.get('childOnboardingComplete'))),
    ('first_chore', 'First chore', '🌟', lambda p, _: p.get('totalChoresCompleted', 0) >= 1),
    ('helper', 'Helper', '✨', lambda p, _: p.get('totalChoresCompleted', 0) >= 5),
    ('star', 'Star', '🏆', lambda p, _: int(p.get('pointsBalance') or 0) >= 50),
    ('streak_3', '3-day streak', '🔥', lambda p, _: int(p.get('streakDays') or 0) >= 3),
    ('streak_7', '7-day streak', '💪', lambda p, _: int(p.get('streakDays') or 0) >= 7),
    ('routine_starter', 'Routine starter', '🔁', lambda p, db: _has_routine_completions(db, p, 3)),
)


def _utcnow():
    return datetime.now(timezone.utc)


def _today() -> date:
    return _utcnow().date()


def _parse_date(value) -> date | None:
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


def _household_owner_id(db, household_id: str) -> str | None:
    owner_member = db.household_members.find_one({
        'householdId': household_id,
        'role': 'owner',
        'status': 'active',
    })
    if owner_member:
        return owner_member.get('userId')
    any_member = db.household_members.find_one({
        'householdId': household_id,
        'status': 'active',
        'role': {'$in': ['owner', 'renter']},
    })
    return any_member.get('userId') if any_member else None


def _normalize_child_profile(db, doc: dict) -> dict:
    """Backfill age tier on legacy profiles."""
    if doc and not doc.get('ageTier'):
        tier = compute_age_tier(doc.get('dateOfBirth'))
        db.child_profiles.update_one(
            {'_id': doc['_id']},
            {'$set': {'ageTier': tier, 'updatedAt': _utcnow()}},
        )
        doc['ageTier'] = tier
    return doc


def link_child_profile_from_invite(db, user: dict, invite: dict, parent_user_id: str, household_id: str) -> dict:
    """Create or update child profile when a child invite is accepted."""
    uid = str(user['_id'])
    display_name = (invite.get('displayName') or user.get('firstName') or 'Friend').strip()
    dob = invite.get('dateOfBirth')
    age_tier = compute_age_tier(dob)
    now = _utcnow()

    existing = db.child_profiles.find_one({'userId': uid, 'status': {'$ne': 'archived'}})
    profile_fields = {
        'householdId': household_id,
        'parentUserId': parent_user_id or _household_owner_id(db, household_id) or uid,
        'userId': uid,
        'displayName': display_name,
        'dateOfBirth': dob,
        'ageTier': age_tier,
        'relationshipType': 'child',
        'childInviteStatus': 'accepted',
        'updatedAt': now,
    }

    if existing:
        db.child_profiles.update_one({'_id': existing['_id']}, {'$set': profile_fields})
        existing.update(profile_fields)
        profile = existing
    else:
        profile_fields.update({
            'pointsBalance': 0,
            'walletBalance': 0.0,
            'streakDays': 0,
            'lastChoreCompletedDate': None,
            'totalChoresCompleted': 0,
            'badges': [],
            'status': 'active',
            'createdAt': now,
        })
        result = db.child_profiles.insert_one(profile_fields)
        profile_fields['_id'] = result.inserted_id
        profile = profile_fields

    invalidate_portal_dashboard_cache('child', uid)
    return profile


def find_child_profile(db, ctx: PortalContext) -> dict | None:
    if ctx.child_profile_id:
        try:
            doc = db.child_profiles.find_one({'_id': ObjectId(ctx.child_profile_id), 'status': {'$ne': 'archived'}})
            if doc:
                return _normalize_child_profile(db, doc)
        except Exception:
            pass
    doc = db.child_profiles.find_one({'userId': ctx.user_id, 'status': {'$ne': 'archived'}})
    return _normalize_child_profile(db, doc) if doc else None


def ensure_child_profile(db, user: dict, ctx: PortalContext) -> dict | None:
    """Create child profile for logged-in family/child user if missing."""
    existing = find_child_profile(db, ctx)
    if existing:
        return existing

    household_id = ctx.household_id
    if not household_id:
        return None

    member = db.household_members.find_one({
        'householdId': household_id,
        'userId': ctx.user_id,
        'status': 'active',
    })
    if not member and ctx.experience_type not in ('child', 'teen', 'managed'):
        role = (user.get('userType') or '').lower()
        if role != 'family':
            return None

    display_name = (
        (member or {}).get('displayName')
        or user.get('firstName')
        or 'Friend'
    ).strip()
    dob = (member or {}).get('dateOfBirth')
    now = _utcnow()
    doc = {
        'householdId': household_id,
        'parentUserId': _household_owner_id(db, household_id) or ctx.user_id,
        'userId': ctx.user_id,
        'displayName': display_name,
        'dateOfBirth': dob,
        'ageTier': compute_age_tier(dob),
        'pointsBalance': 0,
        'walletBalance': 0.0,
        'streakDays': 0,
        'lastChoreCompletedDate': None,
        'totalChoresCompleted': 0,
        'badges': [],
        'status': 'active',
        'createdAt': now,
        'updatedAt': now,
    }
    result = db.child_profiles.insert_one(doc)
    doc['_id'] = result.inserted_id
    return doc


def _has_routine_completions(db, profile: dict, minimum: int) -> bool:
    pid = str(profile.get('_id', ''))
    if not pid:
        return False
    templates = list(db.chores.find({'childProfileId': pid, 'isTemplate': True}))
    total = sum(len(t.get('completionHistory') or []) for t in templates)
    return total >= minimum


def _chore_query(db, profile: dict, ctx: PortalContext) -> dict:
    household_id = profile.get('householdId') or ctx.household_id
    uid = ctx.user_id
    display = profile.get('displayName') or ''
    profile_id = str(profile['_id'])
    return {
        'householdId': household_id,
        '$or': [
            {'assigneeUserId': uid},
            {'childProfileId': profile_id},
            {'assignee': display},
            {'assignee': {'$regex': f'^{display}$', '$options': 'i'}},
        ],
    }


def fetch_child_chores(db, profile: dict, ctx: PortalContext) -> list[dict]:
    from recurring_chore_service import serialize_chore_for_client

    household_id = profile.get('householdId') or ctx.household_id
    tz_name = 'UTC'
    query = {
        **_chore_query(db, profile, ctx),
        'isTemplate': {'$ne': True},
        'status': {'$nin': ['archived', 'missed']},
    }
    items = list(db.chores.find(query).sort([('nextDueAt', 1), ('dueDate', 1)]).limit(50))
    series_ids = list({c.get('seriesId') for c in items if c.get('seriesId')})
    streak_map: dict[str, int] = {}
    if series_ids:
        for t in db.chores.find({'seriesId': {'$in': series_ids}, 'isTemplate': True}, {'seriesId': 1, 'seriesStreak': 1}):
            streak_map[t.get('seriesId')] = int(t.get('seriesStreak') or 0)

    child_specific = list(db.child_chores.find({
        'householdId': household_id,
        'childProfileId': str(profile['_id']),
        'status': {'$ne': 'archived'},
    }).sort('dueDate', 1).limit(50))

    out = []
    for c in items:
        row = serialize_chore_for_client(c, tz_name)
        if c.get('seriesId'):
            row['seriesStreak'] = streak_map.get(c['seriesId'], 0)
        out.append(row)
    for c in child_specific:
        out.append({
            'id': str(c['_id']),
            'source': 'child',
            'title': c.get('title', ''),
            'dueDate': c.get('dueDate', ''),
            'completed': bool(c.get('completed')),
            'points': int(c.get('points') or 5),
        })
    return out


def fetch_child_homework(db, profile: dict) -> list[dict]:
    rows = list(db.child_homework.find({
        'childProfileId': str(profile['_id']),
        'status': {'$ne': 'archived'},
    }).sort('dueDate', 1).limit(30))
    return [{
        'id': str(h['_id']),
        'title': h.get('title', ''),
        'subject': h.get('subject', ''),
        'dueDate': h.get('dueDate', ''),
        'completed': bool(h.get('completed')),
    } for h in rows]


def fetch_child_rewards(db, household_id: str, child_profile_id: str | None = None) -> list[dict]:
    rows = list(db.child_rewards.find({
        'householdId': household_id,
        'active': True,
    }).sort('cost', 1))
    pending_by_reward: dict[str, dict] = {}
    if child_profile_id:
        pending_rows = list(db.child_reward_redemptions.find({
            'childProfileId': child_profile_id,
            'status': 'pending',
        }))
        pending_by_reward = {r.get('rewardId'): r for r in pending_rows if r.get('rewardId')}

    out = []
    for r in rows:
        rid = str(r['_id'])
        pending = pending_by_reward.get(rid)
        out.append({
            'id': rid,
            'title': r.get('title', ''),
            'cost': int(r.get('cost') or 0),
            'emoji': r.get('emoji') or '🎁',
            'description': r.get('description', ''),
            'redemptionStatus': 'pending' if pending else None,
            'redemptionId': str(pending['_id']) if pending else None,
        })
    return out


def _serialize_redemption(doc: dict) -> dict:
    return {
        'id': str(doc['_id']),
        'rewardId': doc.get('rewardId'),
        'childProfileId': doc.get('childProfileId'),
        'childName': doc.get('childName', ''),
        'rewardTitle': doc.get('rewardTitle', ''),
        'rewardEmoji': doc.get('rewardEmoji', '🎁'),
        'cost': int(doc.get('cost') or 0),
        'status': doc.get('status', 'pending'),
        'requestedAt': doc['requestedAt'].isoformat() if doc.get('requestedAt') else None,
        'resolvedAt': doc['resolvedAt'].isoformat() if doc.get('resolvedAt') else None,
    }


def fetch_child_redemptions(db, child_profile_id: str, limit: int = 20) -> list[dict]:
    rows = list(db.child_reward_redemptions.find({
        'childProfileId': child_profile_id,
    }).sort('requestedAt', -1).limit(limit))
    return [_serialize_redemption(r) for r in rows]


def fetch_pending_redemptions(db, household_id: str) -> list[dict]:
    rows = list(db.child_reward_redemptions.find({
        'householdId': household_id,
        'status': 'pending',
    }).sort('requestedAt', -1))
    return [_serialize_redemption(r) for r in rows]


def request_reward_redemption(ctx: PortalContext, reward_id: str) -> tuple[dict | None, str | None]:
    db = get_db()
    profile = find_child_profile(db, ctx)
    if not profile:
        return None, 'Child profile not found'

    try:
        rid = ObjectId(reward_id)
    except Exception:
        return None, 'Invalid reward id'

    reward = db.child_rewards.find_one({'_id': rid, 'active': True})
    if not reward:
        return None, 'Reward not found'

    household_id = profile.get('householdId') or ctx.household_id
    if reward.get('householdId') != household_id:
        return None, 'Reward not available'

    cost = int(reward.get('cost') or 0)
    points = int(profile.get('pointsBalance') or 0)
    if points < cost:
        return None, f'You need {cost} points — you have {points}'

    profile_id = str(profile['_id'])
    existing = db.child_reward_redemptions.find_one({
        'childProfileId': profile_id,
        'rewardId': reward_id,
        'status': 'pending',
    })
    if existing:
        return None, 'You already requested this reward — waiting for parent approval'

    now = _utcnow()
    doc = {
        'rewardId': reward_id,
        'childProfileId': profile_id,
        'childUserId': profile.get('userId') or ctx.user_id,
        'householdId': household_id,
        'childName': profile.get('displayName', ''),
        'rewardTitle': reward.get('title', ''),
        'rewardEmoji': reward.get('emoji') or '🎁',
        'cost': cost,
        'status': 'pending',
        'requestedAt': now,
        'resolvedAt': None,
        'resolvedBy': None,
    }
    result = db.child_reward_redemptions.insert_one(doc)
    doc['_id'] = result.inserted_id

    prior_count = db.child_reward_redemptions.count_documents({'childProfileId': profile_id})
    if prior_count == 1:
        try:
            from family_memory_service import record_first_reward_goal
            record_first_reward_goal(db, profile, doc)
        except Exception:
            pass

    scope = profile.get('userId') or profile_id
    invalidate_portal_dashboard_cache('child', scope)

    return _serialize_redemption(doc), None


def resolve_reward_redemption(ctx: PortalContext, redemption_id: str, approve: bool) -> tuple[dict | None, str | None]:
    db = get_db()
    try:
        oid = ObjectId(redemption_id)
    except Exception:
        return None, 'Invalid redemption id'

    redemption = db.child_reward_redemptions.find_one({'_id': oid})
    if not redemption:
        return None, 'Redemption not found'
    if redemption.get('status') != 'pending':
        return None, 'Redemption already resolved'

    if ctx.household_id and redemption.get('householdId') != ctx.household_id:
        return None, 'Access denied'

    now = _utcnow()
    profile = db.child_profiles.find_one({'_id': ObjectId(redemption['childProfileId'])})
    if not profile:
        return None, 'Child profile not found'

    if approve:
        cost = int(redemption.get('cost') or 0)
        points = int(profile.get('pointsBalance') or 0)
        if points < cost:
            return None, 'Child no longer has enough points'
        db.child_profiles.update_one(
            {'_id': profile['_id']},
            {'$set': {'pointsBalance': points - cost, 'updatedAt': now}},
        )
        status = 'approved'
    else:
        status = 'declined'

    db.child_reward_redemptions.update_one(
        {'_id': oid},
        {'$set': {'status': status, 'resolvedAt': now, 'resolvedBy': ctx.user_id}},
    )
    redemption = db.child_reward_redemptions.find_one({'_id': oid}) or redemption

    scope = profile.get('userId') or str(profile['_id'])
    invalidate_portal_dashboard_cache('child', scope)

    if approve:
        from celebration_realtime_service import emit_reward_approved
        emit_reward_approved(db, redemption, profile)
        approved_count = db.child_reward_redemptions.count_documents({
            'childProfileId': str(profile['_id']),
            'status': 'approved',
        })
        if approved_count == 1:
            try:
                from family_memory_service import record_first_reward_redeemed
                record_first_reward_redeemed(db, profile, redemption)
            except Exception:
                pass

    return _serialize_redemption(redemption), None


def fetch_messages_preview(db, user_id: str, household_id: str | None) -> list[dict]:
    from household_service import sync_household_message_group
    if household_id:
        sync_household_message_group(household_id)
    groups = list(db.message_groups.find({
        'memberIds': user_id,
        'scopeType': {'$nin': ['adults_only', 'adult_only']},
    }).sort('lastMessageAt', -1).limit(5))
    previews = []
    for g in groups:
        gid = str(g['_id'])
        msgs = list(db.messages.find({'groupId': gid}).sort('createdAt', -1).limit(3))
        for m in reversed(msgs):
            if m.get('senderId') == 'system':
                continue
            previews.append({
                'id': str(m['_id']),
                'groupId': gid,
                'groupName': g.get('name', 'Family Chat'),
                'from': m.get('senderName', 'Family'),
                'text': m.get('message', ''),
                'createdAt': m.get('createdAt'),
            })
    return previews[-8:]


def compute_badges(profile: dict) -> list[dict]:
    db = get_db()
    earned_ids = set(profile.get('badges') or [])
    badges = []
    for bid, label, emoji, rule in BADGE_RULES:
        if bid in earned_ids or rule(profile, db):
            badges.append({'id': bid, 'label': label, 'emoji': emoji, 'earned': True})
        else:
            badges.append({'id': bid, 'label': label, 'emoji': emoji, 'earned': False})
    return badges


def _sync_earned_badges(db, profile: dict) -> list[str]:
    earned = list(profile.get('badges') or [])
    changed = False
    for bid, _, _, rule in BADGE_RULES:
        if bid not in earned and rule(profile, db):
            earned.append(bid)
            changed = True
    if changed:
        db.child_profiles.update_one(
            {'_id': profile['_id']},
            {'$set': {'badges': earned, 'updatedAt': _utcnow()}},
        )
    return earned


def _child_ai_message(profile: dict, chores: list[dict], rewards: list[dict]) -> str:
    db = get_db()
    from family_behavior_intelligence_service import generate_child_companion_message
    return generate_child_companion_message(db, profile, chores, rewards)


def build_child_dashboard(ctx: PortalContext, user: dict) -> dict:
    db = get_db()
    profile = ensure_child_profile(db, user, ctx)
    if not profile:
        return {
            'portalContext': ctx.to_dict(),
            'profile': None,
            'needsProfile': True,
            'chores': [],
            'rewards': [],
            'homework': [],
            'badges': [],
            'walletBalance': 0,
            'streakDays': 0,
            'level': 1,
            'messagesPreview': [],
            'aiRecommendations': ['Ask a parent to set up your child profile in FamilyHub.'],
        }

    household_id = profile.get('householdId') or ctx.household_id
    chores = fetch_child_chores(db, profile, ctx)
    homework = fetch_child_homework(db, profile)
    rewards = fetch_child_rewards(db, household_id, str(profile['_id'])) if household_id else []
    redemptions = fetch_child_redemptions(db, str(profile['_id']))
    messages = fetch_messages_preview(db, ctx.user_id, household_id)
    _sync_earned_badges(db, profile)
    profile = db.child_profiles.find_one({'_id': profile['_id']}) or profile
    badges = compute_badges(profile)
    points = int(profile.get('pointsBalance') or 0)

    # Fetch recent wallet transactions
    txs = list(db.child_wallet_transactions.find({'childProfileId': str(profile['_id'])}).sort('createdAt', -1).limit(15))
    transactions = [{
        'id': str(t['_id']),
        'amount': float(t.get('amount') or 0),
        'newBalance': float(t.get('newBalance') or 0),
        'description': t.get('description', ''),
        'createdAt': t.get('createdAt'),
    } for t in txs]

    return {
        'portalContext': ctx.to_dict(),
        'needsProfile': False,
        'profile': {
            'id': str(profile['_id']),
            'displayName': profile.get('displayName', ''),
            'ageTier': profile.get('ageTier') or compute_age_tier(profile.get('dateOfBirth')),
            'pointsBalance': points,
            'avatarEmoji': profile.get('avatarEmoji'),
            'themeId': profile.get('themeId'),
            'childOnboardingComplete': bool(profile.get('childOnboardingComplete')),
        },
        'needsWelcome': not bool(profile.get('childOnboardingComplete')),
        'chores': chores,
        'rewards': rewards,
        'redemptions': redemptions,
        'homework': homework,
        'badges': badges,
        'walletBalance': float(profile.get('walletBalance') or 0),
        'savingsGoal': profile.get('savingsGoal'),
        'walletTransactions': transactions,
        'streakDays': int(profile.get('streakDays') or 0),
        'level': max(1, int(profile.get('pointsBalance') or 0) // 25 + 1),
        'messagesPreview': messages,
        'aiRecommendations': [_child_ai_message(profile, chores, rewards)],
    }


def complete_child_chore(ctx: PortalContext, chore_id: str, source: str = 'household') -> tuple[dict | None, str | None]:
    db = get_db()
    profile = find_child_profile(db, ctx)
    if not profile:
        return None, 'Child profile not found'

    try:
        oid = ObjectId(chore_id)
    except Exception:
        return None, 'Invalid chore id'

    chore = None
    if source == 'child':
        chore = db.child_chores.find_one({
            '_id': oid,
            'childProfileId': str(profile['_id']),
            'status': {'$ne': 'archived'},
        })
        if not chore:
            return None, 'Chore not found'
        if chore.get('completed'):
            return None, 'Chore already completed'
        points = int(chore.get('points') or 5)
        db.child_chores.update_one({'_id': oid}, {'$set': {'completed': True, 'completedAt': _utcnow()}})
    else:
        chore = db.chores.find_one({**{'_id': oid}, **_chore_query(db, profile, ctx)})
        if not chore:
            return None, 'Chore not found or not assigned to you'
        if chore.get('completed'):
            return None, 'Chore already completed'
        points = int(chore.get('points') or 5)
        db.chores.update_one({'_id': oid}, {'$set': {'completed': True, 'completedAt': _utcnow(), 'status': 'completed'}})

        from recurring_chore_service import on_recurring_instance_completed
        if chore.get('seriesId') and not chore.get('isTemplate'):
            on_recurring_instance_completed(db, chore, profile)

    today = _today()
    last = _parse_date(profile.get('lastChoreCompletedDate'))
    streak = int(profile.get('streakDays') or 0)
    if last == today:
        new_streak = streak
    elif last == today - timedelta(days=1):
        new_streak = streak + 1
    else:
        new_streak = 1

    new_points = int(profile.get('pointsBalance') or 0) + points
    total_done = int(profile.get('totalChoresCompleted') or 0) + 1
    db.child_profiles.update_one(
        {'_id': profile['_id']},
        {'$set': {
            'pointsBalance': new_points,
            'streakDays': new_streak,
            'lastChoreCompletedDate': today.isoformat(),
            'totalChoresCompleted': total_done,
            'updatedAt': _utcnow(),
        }},
    )

    scope_id = ctx.child_profile_id or ctx.user_id
    invalidate_portal_dashboard_cache('child', scope_id)

    updated = db.child_profiles.find_one({'_id': profile['_id']})
    _sync_earned_badges(db, updated or profile)
    updated = db.child_profiles.find_one({'_id': profile['_id']}) or profile
    previous_badges = set(profile.get('badges') or [])
    badges = compute_badges(updated)

    series_streak = None
    if chore.get('seriesId'):
        template = db.chores.find_one({'seriesId': chore.get('seriesId'), 'isTemplate': True})
        if template:
            series_streak = int(template.get('seriesStreak') or 0)

    result = {
        'pointsEarned': points,
        'pointsBalance': new_points,
        'streakDays': new_streak,
        'seriesStreak': series_streak,
        'badges': badges,
    }

    from celebration_realtime_service import emit_chore_completion_celebrations
    emit_chore_completion_celebrations(db, updated, chore, result, previous_badges)

    return result, None


def trigger_sos_alert(ctx: PortalContext, user: dict, data: dict | None = None) -> dict:
    db = get_db()
    profile = find_child_profile(db, ctx) or ensure_child_profile(db, user, ctx)
    household_id = (profile or {}).get('householdId') or ctx.household_id

    # Resolve child coordinates
    lat = None
    lng = None
    if data:
        lat = data.get('lat') or data.get('latitude')
        lng = data.get('lng') or data.get('longitude')

    if lat is None or lng is None:
        state = db.geofence_member_state.find_one({
            'householdId': household_id,
            'memberUserId': ctx.user_id,
        })
        if state:
            lat = state.get('lastLat')
            lng = state.get('lastLng')

    displayName = (profile or {}).get('displayName') or user.get('firstName', 'Child')
    doc = {
        'childProfileId': str(profile['_id']) if profile else None,
        'childUserId': ctx.user_id,
        'householdId': household_id,
        'displayName': displayName,
        'status': 'open',
        'createdAt': _utcnow(),
    }
    if lat is not None and lng is not None:
        doc['lat'] = float(lat)
        doc['lng'] = float(lng)

    result = db.child_sos_alerts.insert_one(doc)

    # Determine location description (safe zone name if inside, else coordinates)
    location_desc = "Unknown location"
    if lat is not None and lng is not None:
        location_desc = f"Coordinates: {float(lat):.5f}, {float(lng):.5f}"
        try:
            from geofence_service import haversine_meters
            zones = list(db.safe_zones.find({'householdId': household_id}))
            for zone in zones:
                dist = haversine_meters(float(lat), float(lng), float(zone['lat']), float(zone['lng']))
                if dist <= float(zone.get('radiusMeters', 200)):
                    location_desc = zone.get('name', 'Safe zone')
                    break
        except Exception as e:
            print(f"[sos] Safe zone lookup error: {e}")

    # Send push notifications to parents/owners in the household
    try:
        from household_service import get_household_member_user_ids
        from push_service import send_push_to_user
        parent_uids = get_household_member_user_ids(household_id)
        for uid in parent_uids:
            if uid != ctx.user_id:
                send_push_to_user(
                    uid,
                    title="🚨 EMERGENCY SOS ALERT",
                    body=f"{displayName} has triggered an SOS alert at {location_desc}! Help is on the way.",
                    data={'alertId': str(result.inserted_id), 'type': 'sos'}
                )
    except Exception as e:
        print(f"[sos] Push notification dispatch error: {e}")

    return {'alertId': str(result.inserted_id), 'status': 'sent'}


def complete_child_onboarding(ctx: PortalContext, data: dict) -> tuple[dict | None, str | None]:
    """Persist avatar/theme and mark welcome onboarding complete."""
    db = get_db()
    profile = find_child_profile(db, ctx)
    if not profile:
        return None, 'Child profile not found'

    avatar_emoji = (data.get('avatarEmoji') or '').strip()[:8]
    theme_id = (data.get('themeId') or 'purple').strip()[:32]
    display_name = (data.get('displayName') or profile.get('displayName') or '').strip()

    if not avatar_emoji:
        return None, 'Pick an avatar'
    if not display_name:
        return None, 'Display name is required'

    now = _utcnow()
    earned = list(profile.get('badges') or [])
    for bid in ('welcome', 'family_member'):
        if bid not in earned:
            earned.append(bid)

    streak = max(1, int(profile.get('streakDays') or 0))

    db.child_profiles.update_one(
        {'_id': profile['_id']},
        {'$set': {
            'avatarEmoji': avatar_emoji,
            'themeId': theme_id,
            'displayName': display_name,
            'childOnboardingComplete': True,
            'badges': earned,
            'streakDays': streak,
            'updatedAt': now,
        }},
    )

    scope = profile.get('userId') or str(profile['_id'])
    invalidate_portal_dashboard_cache('child', scope)

    refreshed = db.child_profiles.find_one({'_id': profile['_id']}) or profile
    from celebration_realtime_service import emit_welcome_complete
    emit_welcome_complete(refreshed)
    return {
        'profile': {
            'id': str(refreshed['_id']),
            'displayName': refreshed.get('displayName', ''),
            'avatarEmoji': refreshed.get('avatarEmoji'),
            'themeId': refreshed.get('themeId'),
            'childOnboardingComplete': True,
            'pointsBalance': int(refreshed.get('pointsBalance') or 0),
        },
        'badges': compute_badges(refreshed),
        'celebration': {
            'type': 'welcome_complete',
            'badges': ['welcome', 'family_member'],
        },
    }, None
