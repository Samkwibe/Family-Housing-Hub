"""Child portal routes — child domain (Mongo-native, privacy-safe)."""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from flask import Blueprint, jsonify, request

from audit_service import log_audit
from capability_service import require_capability
from database import get_db
from portal_context_service import (
    compute_age_tier,
    require_portal_context,
)

child_bp = Blueprint('child', __name__, url_prefix='/api/child')


def _utcnow():
    return datetime.now(timezone.utc)


def _serialize_profile(doc: dict) -> dict:
    dob = doc.get('dateOfBirth')
    dob_iso = dob.isoformat() if hasattr(dob, 'isoformat') else dob
    return {
        'id': str(doc['_id']),
        'householdId': doc.get('householdId'),
        'userId': doc.get('userId'),
        'parentUserId': doc.get('parentUserId'),
        'displayName': doc.get('displayName', ''),
        'dateOfBirth': dob_iso,
        'ageTier': doc.get('ageTier') or compute_age_tier(dob),
        'pointsBalance': int(doc.get('pointsBalance') or 0),
        'walletBalance': float(doc.get('walletBalance') or 0),
        'streakDays': int(doc.get('streakDays') or 0),
        'childInviteStatus': doc.get('childInviteStatus'),
        'isManaged': not bool(doc.get('userId')),
        'relationshipType': doc.get('relationshipType') or 'child',
        'status': doc.get('status', 'active'),
        'createdAt': doc.get('createdAt').isoformat() if doc.get('createdAt') else None,
    }


def _parse_dob(value):
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


@child_bp.route('/profile', methods=['GET'])
def get_profile():
    ctx, err = require_portal_context()
    if err:
        return err

    db = get_db()
    profile = None
    if ctx.child_profile_id:
        try:
            profile = db.child_profiles.find_one({'_id': ObjectId(ctx.child_profile_id)})
        except Exception:
            profile = None
    if not profile:
        profile = db.child_profiles.find_one({'userId': ctx.user_id, 'status': {'$ne': 'archived'}})

    if not profile:
        return jsonify({'profile': None, 'portalContext': ctx.to_dict()})

    if ctx.user_id == profile.get('userId'):
        log_audit('child.profile.view', user_id=ctx.user_id, portal_context=ctx, resource_type='child_profile', resource_id=str(profile['_id']))
    elif ctx.user_id == profile.get('parentUserId'):
        log_audit('child.profile.parent_view', user_id=ctx.user_id, portal_context=ctx, resource_type='child_profile', resource_id=str(profile['_id']))
    else:
        ok, cap_err = require_capability(ctx.capabilities, 'can_manage_child_profile')
        if not ok:
            return jsonify({'error': 'Access denied'}), 403

    return jsonify({'profile': _serialize_profile(profile), 'portalContext': ctx.to_dict()})


@child_bp.route('/profiles', methods=['GET'])
def list_profiles():
    """Parent lists managed child profiles in their household."""
    ctx, err = require_portal_context()
    if err:
        return err
    ok, cap_err = require_capability(ctx.capabilities, 'can_manage_child_profile')
    if not ok and ctx.experience_type not in ('renter', 'owner'):
        return jsonify({'error': cap_err or 'Parent access required'}), 403

    db = get_db()
    query = {'status': {'$ne': 'archived'}}
    if ctx.household_id:
        query['householdId'] = ctx.household_id
    else:
        query['parentUserId'] = ctx.user_id

    profiles = list(db.child_profiles.find(query).sort('createdAt', -1))
    return jsonify({
        'profiles': [_serialize_profile(p) for p in profiles],
        'portalContext': ctx.to_dict(),
    })


@child_bp.route('/profiles', methods=['POST'])
def create_profile():
    """Parent creates a child profile (managed or login-ready)."""
    ctx, err = require_portal_context()
    if err:
        return err
    ok, cap_err = require_capability(ctx.capabilities, 'can_manage_child_profile')
    if not ok and ctx.experience_type not in ('renter', 'owner'):
        return jsonify({'error': cap_err or 'Parent access required'}), 403

    data = request.json or {}
    display_name = (data.get('displayName') or data.get('firstName') or '').strip()
    if not display_name:
        return jsonify({'error': 'displayName is required'}), 400
    if not ctx.household_id:
        return jsonify({'error': 'Active household required'}), 400

    dob = _parse_dob(data.get('dateOfBirth'))
    age_tier = compute_age_tier(dob)
    now = _utcnow()
    doc = {
        'householdId': ctx.household_id,
        'parentUserId': ctx.user_id,
        'userId': data.get('userId'),
        'displayName': display_name,
        'dateOfBirth': dob,
        'ageTier': age_tier,
        'relationshipType': 'child',
        'childInviteStatus': 'managed' if age_tier == 'managed' and not data.get('userId') else 'accepted',
        'pointsBalance': 0,
        'walletBalance': 0.0,
        'status': 'active',
        'createdAt': now,
        'updatedAt': now,
    }
    db = get_db()
    result = db.child_profiles.insert_one(doc)
    doc['_id'] = result.inserted_id
    log_audit(
        'child.profile.create',
        user_id=ctx.user_id,
        portal_context=ctx,
        resource_type='child_profile',
        resource_id=str(result.inserted_id),
        metadata={'ageTier': age_tier},
    )
    return jsonify({'profile': _serialize_profile(doc), 'portalContext': ctx.to_dict()}), 201


@child_bp.route('/chores/<chore_id>/complete', methods=['POST'])
def complete_chore(chore_id: str):
    ctx, err = require_portal_context()
    if err:
        return err
    data = request.json or {}
    source = (data.get('source') or 'household').strip()
    from child_service import complete_child_chore
    result, error = complete_child_chore(ctx, chore_id, source=source)
    if error:
        return jsonify({'error': error}), 400
    log_audit('child.chore.complete', user_id=ctx.user_id, portal_context=ctx, resource_type='chore', resource_id=chore_id)
    return jsonify(result)


@child_bp.route('/sos', methods=['POST'])
def child_sos():
    ctx, err = require_portal_context()
    if err:
        return err
    from auth_routes import get_current_user_doc
    from child_service import trigger_sos_alert
    user = get_current_user_doc()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json or {}
    payload = trigger_sos_alert(ctx, user, data)
    log_audit('child.sos', user_id=ctx.user_id, portal_context=ctx, resource_type='sos', resource_id=payload.get('alertId'))
    return jsonify(payload), 201


@child_bp.route('/rewards', methods=['GET'])
def list_rewards():
    ctx, err = require_portal_context()
    if err:
        return err
    from child_service import find_child_profile, fetch_child_rewards
    db = get_db()
    profile = find_child_profile(db, ctx)
    household_id = (profile or {}).get('householdId') or ctx.household_id
    if not household_id:
        return jsonify({'rewards': []})
    return jsonify({'rewards': fetch_child_rewards(db, household_id)})


@child_bp.route('/rewards', methods=['POST'])
def create_reward():
    """Parent creates a reward for the household."""
    ctx, err = require_portal_context()
    if err:
        return err
    ok, cap_err = require_capability(ctx.capabilities, 'can_assign_child_rewards')
    if not ok and ctx.experience_type not in ('renter', 'owner'):
        return jsonify({'error': cap_err or 'Parent access required'}), 403
    if not ctx.household_id:
        return jsonify({'error': 'Active household required'}), 400
    data = request.json or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'title is required'}), 400
    doc = {
        'householdId': ctx.household_id,
        'title': title,
        'cost': max(1, int(data.get('cost') or 10)),
        'emoji': (data.get('emoji') or '🎁').strip()[:4],
        'description': (data.get('description') or '').strip(),
        'active': True,
        'createdBy': ctx.user_id,
        'createdAt': _utcnow(),
    }
    db = get_db()
    result = db.child_rewards.insert_one(doc)
    return jsonify({'reward': {**doc, 'id': str(result.inserted_id)}}), 201


@child_bp.route('/rewards/<reward_id>/redeem', methods=['POST'])
def redeem_reward(reward_id: str):
    """Child requests to redeem a reward — pending parent approval."""
    ctx, err = require_portal_context()
    if err:
        return err
    from child_service import request_reward_redemption
    result, error = request_reward_redemption(ctx, reward_id)
    if error:
        return jsonify({'error': error}), 400
    log_audit('child.reward.redeem_request', user_id=ctx.user_id, portal_context=ctx, resource_type='redemption', resource_id=result.get('id'))
    return jsonify({'redemption': result}), 201


@child_bp.route('/redemptions', methods=['GET'])
def list_redemptions():
    ctx, err = require_portal_context()
    if err:
        return err
    from child_service import find_child_profile, fetch_child_redemptions, fetch_pending_redemptions
    db = get_db()
    if request.args.get('scope') == 'parent' and ctx.household_id:
        from parent_child_service import _require_parent
        ok, cap_err = _require_parent(ctx)
        if not ok:
            return jsonify({'error': cap_err}), 403
        return jsonify({'redemptions': fetch_pending_redemptions(db, ctx.household_id)})
    profile = find_child_profile(db, ctx)
    if not profile:
        return jsonify({'redemptions': []})
    return jsonify({'redemptions': fetch_child_redemptions(db, str(profile['_id']))})


@child_bp.route('/redemptions/<redemption_id>/approve', methods=['POST'])
def approve_redemption(redemption_id: str):
    ctx, err = require_portal_context()
    if err:
        return err
    from parent_child_service import _require_parent
    ok, cap_err = _require_parent(ctx)
    if not ok:
        return jsonify({'error': cap_err}), 403
    from child_service import resolve_reward_redemption
    result, error = resolve_reward_redemption(ctx, redemption_id, approve=True)
    if error:
        return jsonify({'error': error}), 400
    log_audit('child.reward.approve', user_id=ctx.user_id, portal_context=ctx, resource_type='redemption', resource_id=redemption_id)
    return jsonify({'redemption': result})


@child_bp.route('/redemptions/<redemption_id>/decline', methods=['POST'])
def decline_redemption(redemption_id: str):
    ctx, err = require_portal_context()
    if err:
        return err
    from parent_child_service import _require_parent
    ok, cap_err = _require_parent(ctx)
    if not ok:
        return jsonify({'error': cap_err}), 403
    from child_service import resolve_reward_redemption
    result, error = resolve_reward_redemption(ctx, redemption_id, approve=False)
    if error:
        return jsonify({'error': error}), 400
    log_audit('child.reward.decline', user_id=ctx.user_id, portal_context=ctx, resource_type='redemption', resource_id=redemption_id)
    return jsonify({'redemption': result})


@child_bp.route('/onboarding/complete', methods=['POST'])
def complete_onboarding():
    ctx, err = require_portal_context()
    if err:
        return err
    from child_service import complete_child_onboarding
    result, error = complete_child_onboarding(ctx, request.json or {})
    if error:
        return jsonify({'error': error}), 400
    log_audit('child.onboarding.complete', user_id=ctx.user_id, portal_context=ctx, resource_type='child_profile')
    return jsonify(result)


@child_bp.route('/homework', methods=['POST'])
def create_homework():
    """Parent assigns homework to a child profile."""
    ctx, err = require_portal_context()
    if err:
        return err
    ok, cap_err = require_capability(ctx.capabilities, 'can_manage_child_profile')
    if not ok and ctx.experience_type not in ('renter', 'owner'):
        return jsonify({'error': cap_err or 'Parent access required'}), 403
    data = request.json or {}
    child_profile_id = (data.get('childProfileId') or '').strip()
    title = (data.get('title') or '').strip()
    if not child_profile_id or not title:
        return jsonify({'error': 'childProfileId and title are required'}), 400
    doc = {
        'childProfileId': child_profile_id,
        'householdId': ctx.household_id,
        'title': title,
        'subject': (data.get('subject') or '').strip(),
        'dueDate': data.get('dueDate', ''),
        'completed': False,
        'status': 'active',
        'createdBy': ctx.user_id,
        'createdAt': _utcnow(),
    }
    db = get_db()
    result = db.child_homework.insert_one(doc)
    invalidate = ctx.child_profile_id or child_profile_id
    from dashboard_cache_service import invalidate_portal_dashboard_cache
    invalidate_portal_dashboard_cache('child', invalidate)
    return jsonify({'homework': {**doc, 'id': str(result.inserted_id)}}), 201


def _parent_gate(ctx):
    from parent_child_service import _require_parent
    ok, err = _require_parent(ctx)
    if not ok:
        return jsonify({'error': err}), 403
    return None


@child_bp.route('/parent/dashboard', methods=['GET'])
def parent_dashboard():
    ctx, err = require_portal_context()
    if err:
        return err
    gate = _parent_gate(ctx)
    if gate:
        return gate
    from parent_child_service import build_parent_children_dashboard
    return jsonify(build_parent_children_dashboard(ctx))


@child_bp.route('/parent/insights', methods=['GET'])
def parent_insights():
    ctx, err = require_portal_context()
    if err:
        return err
    gate = _parent_gate(ctx)
    if gate:
        return gate
    from family_behavior_intelligence_service import build_parent_family_intelligence
    from parent_child_service import _list_household_profiles
    from child_service import fetch_pending_redemptions
    db = get_db()
    profiles = _list_household_profiles(db, ctx)
    household_id = ctx.household_id or (profiles[0].get('householdId') if profiles else None)
    pending = fetch_pending_redemptions(db, household_id) if household_id else []
    return jsonify(build_parent_family_intelligence(db, household_id, profiles, pending))


@child_bp.route('/profiles/<profile_id>', methods=['GET'])
def get_profile_detail(profile_id: str):
    ctx, err = require_portal_context()
    if err:
        return err
    gate = _parent_gate(ctx)
    if gate:
        return gate
    from parent_child_service import get_child_detail_for_parent
    detail = get_child_detail_for_parent(ctx, profile_id)
    if not detail:
        return jsonify({'error': 'Child not found'}), 404
    log_audit('child.profile.parent_detail', user_id=ctx.user_id, portal_context=ctx, resource_type='child_profile', resource_id=profile_id)
    return jsonify(detail)


@child_bp.route('/profiles/<profile_id>', methods=['PATCH'])
def patch_profile(profile_id: str):
    ctx, err = require_portal_context()
    if err:
        return err
    gate = _parent_gate(ctx)
    if gate:
        return gate
    from parent_child_service import update_child_profile_settings
    result, error = update_child_profile_settings(ctx, profile_id, request.json or {})
    if error:
        return jsonify({'error': error}), 400
    return jsonify({'profile': result})


@child_bp.route('/chores', methods=['POST'])
def assign_chore():
    """Parent assigns a chore to a child profile."""
    ctx, err = require_portal_context()
    if err:
        return err
    gate = _parent_gate(ctx)
    if gate:
        return gate
    from parent_child_service import assign_chore_to_child
    result, error = assign_chore_to_child(ctx, request.json or {})
    if error:
        return jsonify({'error': error}), 400
    log_audit('child.chore.assign', user_id=ctx.user_id, portal_context=ctx, resource_type='chore', resource_id=result.get('id'))
    return jsonify({'chore': result}), 201


@child_bp.route('/routines', methods=['GET'])
def list_routines():
    ctx, err = require_portal_context()
    if err:
        return err
    gate = _parent_gate(ctx)
    if gate:
        return gate
    from recurring_chore_service import list_routines_for_household
    child_id = (request.args.get('childProfileId') or '').strip() or None
    if not ctx.household_id:
        return jsonify({'routines': []})
    routines = list_routines_for_household(get_db(), ctx.household_id, child_id)
    return jsonify({'routines': routines})


@child_bp.route('/routines/<series_id>/pause', methods=['POST'])
def pause_routine(series_id: str):
    ctx, err = require_portal_context()
    if err:
        return err
    gate = _parent_gate(ctx)
    if gate:
        return gate
    from recurring_chore_service import set_series_paused
    paused = bool((request.json or {}).get('paused', True))
    result, error = set_series_paused(get_db(), ctx, series_id, paused)
    if error:
        return jsonify({'error': error}), 400
    log_audit('child.routine.pause' if paused else 'child.routine.resume', user_id=ctx.user_id, portal_context=ctx, resource_type='routine', resource_id=series_id)
    return jsonify({'routine': result})


@child_bp.route('/routines/<series_id>/duplicate', methods=['POST'])
def duplicate_routine(series_id: str):
    ctx, err = require_portal_context()
    if err:
        return err
    gate = _parent_gate(ctx)
    if gate:
        return gate
    child_profile_id = ((request.json or {}).get('childProfileId') or '').strip()
    if not child_profile_id:
        return jsonify({'error': 'childProfileId is required'}), 400
    from recurring_chore_service import duplicate_series_to_child
    result, error = duplicate_series_to_child(get_db(), ctx, series_id, child_profile_id)
    if error:
        return jsonify({'error': error}), 400
    return jsonify({'chore': result}), 201


@child_bp.route('/profiles/<profile_id>/bonus-points', methods=['POST'])
def grant_bonus(profile_id: str):
    ctx, err = require_portal_context()
    if err:
        return err
    gate = _parent_gate(ctx)
    if gate:
        return gate
    data = request.json or {}
    from parent_child_service import grant_bonus_points
    result, error = grant_bonus_points(ctx, profile_id, data.get('points', 10), data.get('reason', ''))
    if error:
        return jsonify({'error': error}), 400
    return jsonify(result)


@child_bp.route('/activity', methods=['GET'])
def child_activity():
    ctx, err = require_portal_context()
    if err:
        return err
    gate = _parent_gate(ctx)
    if gate:
        return gate
    from parent_child_service import fetch_household_child_activity, _list_household_profiles
    db = get_db()
    profiles = _list_household_profiles(db, ctx)
    child_ids = [str(p['_id']) for p in profiles]
    if not ctx.household_id:
        return jsonify({'activity': []})
    limit = min(50, max(1, int(request.args.get('limit', 25))))
    activity = fetch_household_child_activity(db, ctx.household_id, child_ids, limit=limit)
    return jsonify({'activity': activity})


@child_bp.route('/invites', methods=['GET'])
def child_invites():
    ctx, err = require_portal_context()
    if err:
        return err
    gate = _parent_gate(ctx)
    if gate:
        return gate
    if not ctx.household_id:
        return jsonify({'invites': []})
    from parent_child_service import fetch_pending_child_invites
    db = get_db()
    return jsonify({'invites': fetch_pending_child_invites(db, ctx.household_id)})


def _memories_scope(ctx):
    """Resolve household + optional child filter for parent or child portal."""
    from child_service import find_child_profile
    from parent_child_service import _require_parent

    db = get_db()
    is_parent, _ = _require_parent(ctx)
    if is_parent:
        return {
            'db': db,
            'household_id': ctx.household_id,
            'child_filter': request.args.get('childProfileId'),
            'error': None,
        }

    profile = find_child_profile(db, ctx)
    if not profile:
        return {'db': None, 'household_id': None, 'child_filter': None, 'error': ('Child profile not found', 404)}
    return {
        'db': db,
        'household_id': profile.get('householdId'),
        'child_filter': str(profile['_id']),
        'error': None,
    }


@child_bp.route('/memories', methods=['GET'])
def family_memories():
    ctx, err = require_portal_context()
    if err:
        return err

    scope = _memories_scope(ctx)
    if scope['error']:
        return jsonify({'error': scope['error'][0]}), scope['error'][1]
    if not scope['household_id']:
        return jsonify({'memories': [], 'groups': [], 'resurfaced': []})

    from family_memory_service import fetch_family_memories, fetch_resurfaced_memories, group_memories_by_month

    limit = min(50, max(1, int(request.args.get('limit', 20))))
    before = request.args.get('before')
    include_resurface = request.args.get('resurface', 'true').lower() in ('1', 'true', 'yes')

    memories = fetch_family_memories(
        scope['db'],
        scope['household_id'],
        child_profile_id=scope['child_filter'],
        limit=limit,
        before=before,
    )
    resurfaced = (
        fetch_resurfaced_memories(
            scope['db'],
            scope['household_id'],
            child_profile_id=scope['child_filter'],
            limit=3,
        )
        if include_resurface
        else []
    )
    return jsonify({
        'memories': memories,
        'groups': group_memories_by_month(memories),
        'resurfaced': resurfaced,
        'portalContext': ctx.to_dict(),
    })


@child_bp.route('/memories/resurface', methods=['GET'])
def family_memories_resurface():
    ctx, err = require_portal_context()
    if err:
        return err

    scope = _memories_scope(ctx)
    if scope['error']:
        return jsonify({'error': scope['error'][0]}), scope['error'][1]
    if not scope['household_id']:
        return jsonify({'resurfaced': []})

    from family_memory_service import fetch_resurfaced_memories
    limit = min(5, max(1, int(request.args.get('limit', 3))))
    resurfaced = fetch_resurfaced_memories(
        scope['db'],
        scope['household_id'],
        child_profile_id=scope['child_filter'],
        limit=limit,
    )
    return jsonify({'resurfaced': resurfaced, 'portalContext': ctx.to_dict()})


@child_bp.route('/homework/<hw_id>/complete', methods=['POST'])
def complete_homework_route(hw_id: str):
    ctx, err = require_portal_context()
    if err:
        return err
    try:
        oid = ObjectId(hw_id)
    except Exception:
        return jsonify({'error': 'Invalid homework id'}), 400

    db = get_db()
    homework = db.child_homework.find_one({'_id': oid})
    if not homework:
        return jsonify({'error': 'Homework not found'}), 404

    from child_service import find_child_profile
    profile = find_child_profile(db, ctx)
    if profile:
        profile_id = str(profile['_id'])
        if homework.get('childProfileId') != profile_id and ctx.experience_type not in ('renter', 'owner'):
            return jsonify({'error': 'Access denied'}), 403
    elif ctx.experience_type not in ('renter', 'owner'):
        return jsonify({'error': 'Access denied'}), 403

    db.child_homework.update_one(
        {'_id': oid},
        {'$set': {'completed': True, 'updatedAt': _utcnow()}}
    )

    from dashboard_cache_service import invalidate_portal_dashboard_cache
    invalidate_portal_dashboard_cache('child', homework.get('childProfileId'))

    log_audit('child.homework.complete', user_id=ctx.user_id, portal_context=ctx, resource_type='homework', resource_id=hw_id)
    return jsonify({'ok': True, 'homeworkId': hw_id})


@child_bp.route('/profiles/<profile_id>/wallet/adjust', methods=['POST'])
def adjust_child_wallet(profile_id: str):
    ctx, err = require_portal_context()
    if err:
        return err
    gate = _parent_gate(ctx)
    if gate:
        return gate

    data = request.json or {}
    try:
        amount = float(data.get('amount', 0))
    except (ValueError, TypeError):
        return jsonify({'error': 'Amount must be a number'}), 400

    description = (data.get('description') or 'Parent adjustment').strip()

    db = get_db()
    try:
        oid = ObjectId(profile_id)
    except Exception:
        return jsonify({'error': 'Invalid profile id'}), 400

    profile = db.child_profiles.find_one({'_id': oid})
    if not profile:
        return jsonify({'error': 'Child profile not found'}), 404

    current_balance = float(profile.get('walletBalance') or 0.0)
    new_balance = max(0.0, current_balance + amount)

    db.child_profiles.update_one(
        {'_id': oid},
        {'$set': {'walletBalance': new_balance, 'updatedAt': _utcnow().isoformat()}}
    )

    # Log transaction
    tx_doc = {
        'childProfileId': profile_id,
        'amount': amount,
        'newBalance': new_balance,
        'description': description,
        'createdAt': _utcnow().isoformat(),
    }
    db.child_wallet_transactions.insert_one(tx_doc)

    # Invalidate dashboard cache
    from dashboard_cache_service import invalidate_portal_dashboard_cache
    invalidate_portal_dashboard_cache('child', profile_id)
    invalidate_portal_dashboard_cache('child', str(profile.get('userId') or ''))

    # Log audit
    log_audit(
        'child.wallet.adjust',
        user_id=ctx.user_id,
        portal_context=ctx,
        resource_type='child_profile',
        resource_id=profile_id,
        payload={'amount': amount, 'newBalance': new_balance}
    )

    return jsonify({'ok': True, 'walletBalance': new_balance, 'transaction': {**tx_doc, 'id': str(tx_doc['_id'])}})


@child_bp.route('/profiles/<profile_id>/savings-goal', methods=['POST'])
def set_child_savings_goal(profile_id: str):
    ctx, err = require_portal_context()
    if err:
        return err
    gate = _parent_gate(ctx)
    if gate:
        return gate

    data = request.json or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'Savings goal title is required'}), 400

    try:
        target_amount = float(data.get('targetAmount', 0))
    except (ValueError, TypeError):
        return jsonify({'error': 'Target amount must be a number'}), 400

    if target_amount <= 0:
        return jsonify({'error': 'Target amount must be positive'}), 400

    db = get_db()
    try:
        oid = ObjectId(profile_id)
    except Exception:
        return jsonify({'error': 'Invalid profile id'}), 400

    profile = db.child_profiles.find_one({'_id': oid})
    if not profile:
        return jsonify({'error': 'Child profile not found'}), 404

    savings_goal = {
        'title': title,
        'targetAmount': target_amount,
        'savedAmount': float(profile.get('walletBalance') or 0.0),
    }

    db.child_profiles.update_one(
        {'_id': oid},
        {'$set': {'savingsGoal': savings_goal, 'updatedAt': _utcnow().isoformat()}}
    )

    # Invalidate cache
    from dashboard_cache_service import invalidate_portal_dashboard_cache
    invalidate_portal_dashboard_cache('child', profile_id)
    invalidate_portal_dashboard_cache('child', str(profile.get('userId') or ''))

    log_audit(
        'child.savings_goal.set',
        user_id=ctx.user_id,
        portal_context=ctx,
        resource_type='child_profile',
        resource_id=profile_id,
        payload=savings_goal
    )

    return jsonify({'ok': True, 'savingsGoal': savings_goal})
