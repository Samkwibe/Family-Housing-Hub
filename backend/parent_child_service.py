"""Parent-facing child management — dashboard, detail, chores, activity (Mongo-native)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from bson import ObjectId

from capability_service import require_capability
from dashboard_cache_service import invalidate_portal_dashboard_cache
from database import get_db
from portal_context_service import PortalContext, compute_age_tier

AGE_TIER_LABELS = {
    'managed': 'Under 8 · managed',
    'child_9_12': 'Kid · 9–12',
    'teen_13_17': 'Teen · 13–17',
}


def _utcnow():
    return datetime.now(timezone.utc)


def _require_parent(ctx: PortalContext) -> tuple[bool, str | None]:
    ok, err = require_capability(ctx.capabilities, 'can_manage_child_profile')
    if ok or ctx.experience_type in ('renter', 'owner'):
        return True, None
    return False, err or 'Parent access required'


def _profile_summary(db, profile: dict) -> dict:
    from child_service import fetch_child_chores, fetch_child_homework, compute_badges

    pid = str(profile['_id'])
    household_id = profile.get('householdId')
    ctx_stub = PortalContext(
        user_id=profile.get('userId') or '',
        experience_type='child',
        active_portal='child',
        household_id=household_id,
        property_id=None,
        child_profile_id=pid,
        capabilities=frozenset(),
    )
    chores = fetch_child_chores(db, profile, ctx_stub)
    pending = [c for c in chores if not c.get('completed')]
    done_today = sum(1 for c in chores if c.get('completed'))
    homework = fetch_child_homework(db, profile)
    badges = compute_badges(profile)
    earned_badges = sum(1 for b in badges if b.get('earned'))

    dob = profile.get('dateOfBirth')
    dob_iso = dob.isoformat()[:10] if hasattr(dob, 'isoformat') else (str(dob)[:10] if dob else None)
    age_tier = profile.get('ageTier') or compute_age_tier(dob)

    return {
        'id': pid,
        'displayName': profile.get('displayName', ''),
        'userId': profile.get('userId'),
        'householdId': household_id,
        'parentUserId': profile.get('parentUserId'),
        'dateOfBirth': dob_iso,
        'ageTier': age_tier,
        'ageLabel': AGE_TIER_LABELS.get(age_tier, 'Family member'),
        'pointsBalance': int(profile.get('pointsBalance') or 0),
        'walletBalance': float(profile.get('walletBalance') or 0),
        'streakDays': int(profile.get('streakDays') or 0),
        'pendingChores': len(pending),
        'completedChores': done_today,
        'pendingHomework': sum(1 for h in homework if not h.get('completed')),
        'badgesEarned': earned_badges,
        'badgesTotal': len(badges),
        'childInviteStatus': profile.get('childInviteStatus') or ('managed' if not profile.get('userId') else 'accepted'),
        'isManaged': not bool(profile.get('userId')),
        'status': profile.get('status', 'active'),
        'relationshipType': profile.get('relationshipType') or 'child',
    }


def _list_household_profiles(db, ctx: PortalContext) -> list[dict]:
    query = {'status': {'$ne': 'archived'}}
    if ctx.household_id:
        query['householdId'] = ctx.household_id
    else:
        query['parentUserId'] = ctx.user_id
    return list(db.child_profiles.find(query).sort('displayName', 1))


def fetch_pending_child_invites(db, household_id: str) -> list[dict]:
    rows = list(db.household_invites.find({
        'householdId': household_id,
        'inviteType': 'child',
        'status': 'pending',
    }).sort('createdAt', -1))
    out = []
    for inv in rows:
        out.append({
            'token': inv.get('token'),
            'email': inv.get('email'),
            'displayName': inv.get('displayName'),
            'childInviteStatus': inv.get('childInviteStatus') or 'pending',
            'relationshipType': inv.get('relationshipType') or 'child',
            'expiresAt': inv['expiresAt'].isoformat() if inv.get('expiresAt') else None,
            'createdAt': inv['createdAt'].isoformat() if inv.get('createdAt') else None,
        })
    return out


def fetch_household_child_activity(db, household_id: str, child_ids: list[str], limit: int = 25) -> list[dict]:
    """Synthesize recent family activity from chores, SOS, homework."""
    activities: list[dict] = []
    name_map = {}
    for pid in child_ids:
        try:
            doc = db.child_profiles.find_one({'_id': ObjectId(pid)})
            if doc:
                name_map[pid] = doc.get('displayName', 'Child')
        except Exception:
            pass

    sos_rows = list(db.child_sos_alerts.find({
        'householdId': household_id,
    }).sort('createdAt', -1).limit(10))
    for row in sos_rows:
        pid = row.get('childProfileId') or ''
        activities.append({
            'id': f"sos-{row['_id']}",
            'type': 'sos',
            'childProfileId': pid,
            'childName': row.get('displayName') or name_map.get(pid, 'Child'),
            'title': 'Help requested',
            'message': f"{row.get('displayName', 'Child')} tapped the help button",
            'emoji': '🛡️',
            'status': row.get('status', 'open'),
            'createdAt': row['createdAt'].isoformat() if row.get('createdAt') else None,
        })

    chore_query = {
        'householdId': household_id,
        'completed': True,
        'childProfileId': {'$in': child_ids},
    }
    completed = list(db.chores.find(chore_query).sort('completedAt', -1).limit(15))
    for c in completed:
        pid = c.get('childProfileId') or ''
        activities.append({
            'id': f"chore-{c['_id']}",
            'type': 'chore_completed',
            'childProfileId': pid,
            'childName': name_map.get(pid, c.get('assignee', 'Child')),
            'title': c.get('title', 'Chore'),
            'message': f"Completed · +{int(c.get('points') or 5)} pts",
            'emoji': '✅',
            'createdAt': c.get('completedAt').isoformat() if c.get('completedAt') else None,
        })

    hw_rows = list(db.child_homework.find({
        'householdId': household_id,
        'childProfileId': {'$in': child_ids},
    }).sort('createdAt', -1).limit(10))
    for h in hw_rows:
        pid = h.get('childProfileId') or ''
        activities.append({
            'id': f"hw-{h['_id']}",
            'type': 'homework',
            'childProfileId': pid,
            'childName': name_map.get(pid, 'Child'),
            'title': h.get('title', 'Homework'),
            'message': h.get('subject') or 'School task assigned',
            'emoji': '📚',
            'createdAt': h['createdAt'].isoformat() if h.get('createdAt') else None,
        })

    from child_service import fetch_pending_redemptions
    redemption_rows = fetch_pending_redemptions(db, household_id)
    for r in redemption_rows:
        activities.append({
            'id': f"redeem-{r['id']}",
            'type': 'reward_request',
            'childProfileId': r.get('childProfileId'),
            'childName': r.get('childName', 'Child'),
            'title': f"Wants {r.get('rewardTitle', 'reward')}",
            'message': f"{r.get('cost', 0)} pts · awaiting approval",
            'emoji': r.get('rewardEmoji', '🎁'),
            'status': r.get('status'),
            'createdAt': r.get('requestedAt'),
        })

    approved = list(db.child_reward_redemptions.find({
        'householdId': household_id,
        'status': 'approved',
    }).sort('resolvedAt', -1).limit(8))
    for r in approved:
        pid = r.get('childProfileId') or ''
        activities.append({
            'id': f"redeemed-{r['_id']}",
            'type': 'reward_redeemed',
            'childProfileId': pid,
            'childName': r.get('childName') or name_map.get(pid, 'Child'),
            'title': r.get('rewardTitle', 'Reward'),
            'message': f"Redeemed for {int(r.get('cost') or 0)} pts",
            'emoji': r.get('rewardEmoji', '🎁'),
            'createdAt': r['resolvedAt'].isoformat() if r.get('resolvedAt') else None,
        })

    for pid, name in name_map.items():
        doc = db.child_profiles.find_one({'_id': ObjectId(pid)})
        if doc and int(doc.get('streakDays') or 0) >= 3:
            activities.append({
                'id': f"streak-{pid}",
                'type': 'streak',
                'childProfileId': pid,
                'childName': name,
                'title': f"{int(doc['streakDays'])}-day streak!",
                'message': 'Keep the momentum going',
                'emoji': '🔥',
                'createdAt': doc.get('updatedAt').isoformat() if doc.get('updatedAt') else None,
            })

    activities.sort(key=lambda a: a.get('createdAt') or '', reverse=True)
    return activities[:limit]


def build_parent_children_dashboard(ctx: PortalContext) -> dict:
    db = get_db()
    profiles = _list_household_profiles(db, ctx)
    children = [_profile_summary(db, p) for p in profiles]
    child_ids = [c['id'] for c in children]
    household_id = ctx.household_id or (profiles[0].get('householdId') if profiles else None)

    pending_invites = fetch_pending_child_invites(db, household_id) if household_id else []
    from child_service import fetch_pending_redemptions
    pending_redemptions = fetch_pending_redemptions(db, household_id) if household_id else []
    activity = fetch_household_child_activity(db, household_id, child_ids) if household_id and child_ids else []

    open_sos = sum(1 for a in activity if a.get('type') == 'sos' and a.get('status') == 'open')
    total_pending = sum(c['pendingChores'] for c in children)

    from family_behavior_intelligence_service import build_parent_family_intelligence
    intelligence = build_parent_family_intelligence(db, household_id, profiles, pending_redemptions)

    return {
        'portalContext': ctx.to_dict(),
        'summary': {
            'childCount': len(children),
            'managedCount': sum(1 for c in children if c.get('isManaged')),
            'pendingInvites': len(pending_invites),
            'pendingRedemptions': len(pending_redemptions),
            'openSosAlerts': open_sos,
            'totalPendingChores': total_pending,
            'familyConsistencyScore': intelligence.get('consistencyScore', 0),
            'familyConsistencyLabel': intelligence.get('consistencyLabel', ''),
        },
        'children': children,
        'pendingInvites': pending_invites,
        'pendingRedemptions': pending_redemptions,
        'activity': activity,
        'familyIntelligence': intelligence,
        'aiRecommendations': intelligence.get('aiRecommendations') or _parent_ai_recommendations(
            children, pending_invites, pending_redemptions, total_pending
        ),
    }


def _parent_ai_recommendations(children: list, invites: list, pending_redemptions: list, pending_chores: int) -> list[str]:
    tips = []
    if pending_redemptions:
        tips.append(f"{len(pending_redemptions)} reward request(s) waiting for your approval.")
    if not children and not invites:
        tips.append('Invite your first child or create a managed profile for kids under 8.')
    if invites:
        tips.append(f"You have {len(invites)} pending invite(s) — remind your child to accept the link.")
    if pending_chores == 0 and children:
        tips.append('Assign a chore to help your kids build streaks and earn rewards.')
    for c in children:
        if c.get('streakDays', 0) >= 3:
            tips.append(f"{c['displayName']} is on a {c['streakDays']}-day streak — consider a bonus reward!")
            break
    if not tips:
        tips.append('Your family hub is active. Check each child for tasks and progress.')
    return tips[:3]


def get_child_detail_for_parent(ctx: PortalContext, profile_id: str) -> dict | None:
    db = get_db()
    try:
        profile = db.child_profiles.find_one({'_id': ObjectId(profile_id), 'status': {'$ne': 'archived'}})
    except Exception:
        return None
    if not profile:
        return None
    if ctx.household_id and profile.get('householdId') != ctx.household_id:
        if profile.get('parentUserId') != ctx.user_id:
            return None

    from child_service import fetch_child_chores, fetch_child_homework, fetch_child_rewards, fetch_child_redemptions, fetch_pending_redemptions, compute_badges

    summary = _profile_summary(db, profile)
    ctx_child = PortalContext(
        user_id=profile.get('userId') or ctx.user_id,
        experience_type='child',
        active_portal='child',
        household_id=profile.get('householdId'),
        property_id=None,
        child_profile_id=profile_id,
        capabilities=frozenset(),
    )
    chores = fetch_child_chores(db, profile, ctx_child)
    homework = fetch_child_homework(db, profile)
    rewards = fetch_child_rewards(db, profile.get('householdId') or '', profile_id)
    badges = compute_badges(profile)
    redemptions = fetch_child_redemptions(db, profile_id)
    pending_redemptions = [r for r in fetch_pending_redemptions(db, profile.get('householdId') or '') if r.get('childProfileId') == profile_id]

    activity = fetch_household_child_activity(
        db,
        profile.get('householdId') or '',
        [profile_id],
        limit=15,
    )

    from family_behavior_intelligence_service import build_parent_family_intelligence
    household_profiles = _list_household_profiles(db, ctx)
    intelligence = build_parent_family_intelligence(
        db,
        profile.get('householdId') or ctx.household_id,
        household_profiles,
        fetch_pending_redemptions(db, profile.get('householdId') or '') if profile.get('householdId') else [],
    )
    child_insights = [
        i for i in intelligence.get('insights', [])
        if not i.get('childProfileId') or i.get('childProfileId') == profile_id
    ][:4]

    return {
        'profile': summary,
        'chores': chores,
        'routines': _fetch_routines(db, ctx, profile_id),
        'homework': homework,
        'rewards': rewards,
        'redemptions': redemptions,
        'pendingRedemptions': pending_redemptions,
        'badges': badges,
        'activity': activity,
        'childInsights': child_insights,
        'aiRecommendations': [i['message'] for i in child_insights[:2]] or intelligence.get('aiRecommendations', [])[:2],
    }


def _fetch_routines(db, ctx: PortalContext, profile_id: str) -> list[dict]:
    from recurring_chore_service import list_routines_for_household
    household_id = ctx.household_id
    if not household_id:
        return []
    return list_routines_for_household(db, household_id, profile_id)


def assign_chore_to_child(ctx: PortalContext, data: dict) -> tuple[dict | None, str | None]:
    db = get_db()
    child_profile_id = (data.get('childProfileId') or '').strip()
    title = (data.get('title') or '').strip()
    if not child_profile_id or not title:
        return None, 'childProfileId and title are required'
    if not ctx.household_id:
        return None, 'Active household required'

    try:
        profile = db.child_profiles.find_one({'_id': ObjectId(child_profile_id), 'status': {'$ne': 'archived'}})
    except Exception:
        return None, 'Invalid child profile'
    if not profile or profile.get('householdId') != ctx.household_id:
        return None, 'Child not found in your household'

    points = max(1, int(data.get('points') or 5))
    due_date = (data.get('dueDate') or '').strip()
    recurring = (data.get('recurring') or '').strip()
    display = profile.get('displayName') or 'Child'
    now = _utcnow()

    from recurring_chore_service import assign_recurring_chore, normalize_recurrence_rule
    rule = normalize_recurrence_rule(data.get('recurrenceRule') or recurring)
    if rule:
        return assign_recurring_chore(db, ctx, profile, data)

    doc = {
        'userId': ctx.user_id,
        'householdId': ctx.household_id,
        'title': title,
        'assignee': display,
        'assigneeUserId': profile.get('userId'),
        'childProfileId': child_profile_id,
        'points': points,
        'dueDate': due_date,
        'recurring': recurring or None,
        'completed': False,
        'priority': data.get('priority', 'medium'),
        'createdBy': ctx.user_id,
        'createdAt': now,
    }
    result = db.chores.insert_one(doc)
    doc['_id'] = result.inserted_id

    scope = profile.get('userId') or child_profile_id
    invalidate_portal_dashboard_cache('child', scope)

    return {
        'id': str(result.inserted_id),
        'source': 'household',
        'title': title,
        'dueDate': due_date,
        'completed': False,
        'points': points,
        'childProfileId': child_profile_id,
    }, None


def grant_bonus_points(ctx: PortalContext, profile_id: str, points: int, reason: str = '') -> tuple[dict | None, str | None]:
    db = get_db()
    try:
        profile = db.child_profiles.find_one({'_id': ObjectId(profile_id), 'status': {'$ne': 'archived'}})
    except Exception:
        return None, 'Invalid child profile'
    if not profile or (ctx.household_id and profile.get('householdId') != ctx.household_id):
        return None, 'Child not found'

    bonus = max(1, min(500, int(points)))
    new_balance = int(profile.get('pointsBalance') or 0) + bonus
    db.child_profiles.update_one(
        {'_id': profile['_id']},
        {'$set': {'pointsBalance': new_balance, 'updatedAt': _utcnow()}},
    )
    scope = profile.get('userId') or profile_id
    invalidate_portal_dashboard_cache('child', scope)
    return {'pointsBalance': new_balance, 'bonus': bonus, 'reason': reason}, None


def update_child_profile_settings(ctx: PortalContext, profile_id: str, data: dict) -> tuple[dict | None, str | None]:
    db = get_db()
    try:
        profile = db.child_profiles.find_one({'_id': ObjectId(profile_id), 'status': {'$ne': 'archived'}})
    except Exception:
        return None, 'Invalid child profile'
    if not profile or (ctx.household_id and profile.get('householdId') != ctx.household_id):
        return None, 'Child not found'

    updates = {'updatedAt': _utcnow()}
    if 'displayName' in data and (data.get('displayName') or '').strip():
        updates['displayName'] = data['displayName'].strip()
    if 'walletBalance' in data:
        updates['walletBalance'] = max(0.0, float(data['walletBalance']))
    if data.get('archive'):
        updates['status'] = 'archived'

    db.child_profiles.update_one({'_id': profile['_id']}, {'$set': updates})
    refreshed = db.child_profiles.find_one({'_id': profile['_id']})
    return _profile_summary(db, refreshed), None
