"""Portal-scoped dashboard routes — renter, owner, child."""
from __future__ import annotations

import time

from flask import Blueprint, jsonify

from audit_service import log_audit
from auth_routes import get_current_user_doc
from capability_service import require_capability
from dashboard_cache_service import (
    get_cached_portal_dashboard,
    set_cached_portal_dashboard,
)
from database import get_db
from household_routes import build_renter_dashboard_payload, _hid
from portal_context_service import get_portal_context, require_portal_context

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')


def _dashboard_response(payload: dict, cache_status: str, start: float, portal: str):
    resp = jsonify(payload)
    resp.headers['X-Cache'] = cache_status
    resp.headers['X-Portal'] = portal
    resp.headers['X-Response-Time-Ms'] = str(round((time.perf_counter() - start) * 1000, 2))
    return resp


@dashboard_bp.route('/renter', methods=['GET'])
def renter_dashboard():
    ctx, err = require_portal_context()
    if err:
        return err
    start = time.perf_counter()
    user = get_current_user_doc()
    hid = ctx.household_id or _hid(user)

    cached, _meta = get_cached_portal_dashboard('renter', hid)
    if cached:
        payload = {k: v for k, v in cached.items() if not k.startswith('_')}
        payload['portalContext'] = ctx.to_dict()
        return _dashboard_response(payload, 'HIT', start, 'renter')

    payload = build_renter_dashboard_payload(user)
    payload['portalContext'] = ctx.to_dict()
    set_cached_portal_dashboard('renter', hid, payload)
    log_audit('dashboard.renter.view', user_id=ctx.user_id, portal_context=ctx, resource_type='household', resource_id=hid)
    return _dashboard_response(payload, 'MISS', start, 'renter')


def _build_owner_dashboard(ctx) -> dict:
    db = get_db()
    owner_id = ctx.user_id
    query = {'ownerId': owner_id, 'status': {'$ne': 'archived'}}
    if ctx.property_id:
        from bson import ObjectId
        try:
            query['_id'] = ObjectId(ctx.property_id)
        except Exception:
            pass

    properties = list(db.properties.find(query).sort('createdAt', -1))
    total_units = sum(int(p.get('unitCount') or 1) for p in properties)
    vacant_units = sum(int(p.get('vacantUnits') or 0) for p in properties)
    occupied_units = max(0, total_units - vacant_units)
    occupancy_rate = round((occupied_units / total_units) * 100, 1) if total_units else 0.0

    open_maintenance = 0
    if properties:
        prop_ids = [str(p['_id']) for p in properties]
        open_maintenance = db.maintenance.count_documents({
            'propertyId': {'$in': prop_ids},
            'status': {'$nin': ['completed', 'cancelled']},
        })

    return {
        'portalContext': ctx.to_dict(),
        'summary': {
            'propertyCount': len(properties),
            'totalUnits': total_units,
            'occupiedUnits': occupied_units,
            'vacantUnits': vacant_units,
            'occupancyRate': occupancy_rate,
            'openMaintenanceRequests': open_maintenance,
        },
        'properties': [{
            'id': str(p['_id']),
            'name': p.get('name', ''),
            'address': p.get('address') or {},
            'unitCount': int(p.get('unitCount') or 1),
            'vacantUnits': int(p.get('vacantUnits') or 0),
            'occupancyStatus': p.get('occupancyStatus', 'unknown'),
        } for p in properties],
        'alerts': [],
        'aiRecommendations': [
            'Add your first property to start tracking occupancy and rent collection.',
        ] if not properties else [
            'Review vacant units and send listing reminders from the owner portal.',
        ],
    }


@dashboard_bp.route('/owner', methods=['GET'])
def owner_dashboard():
    ctx, err = require_portal_context()
    if err:
        return err
    ok, cap_err = require_capability(ctx.capabilities, 'can_manage_properties')
    if not ok and ctx.experience_type != 'owner':
        return jsonify({'error': cap_err or 'Owner portal access required'}), 403

    start = time.perf_counter()
    scope_id = ctx.property_id or ctx.user_id
    cached, _meta = get_cached_portal_dashboard('owner', scope_id)
    if cached:
        payload = {k: v for k, v in cached.items() if not k.startswith('_')}
        return _dashboard_response(payload, 'HIT', start, 'owner')

    payload = _build_owner_dashboard(ctx)
    set_cached_portal_dashboard('owner', scope_id, payload)
    log_audit('dashboard.owner.view', user_id=ctx.user_id, portal_context=ctx, resource_type='owner', resource_id=scope_id)
    return _dashboard_response(payload, 'MISS', start, 'owner')


def _build_child_dashboard(ctx) -> dict:
    from auth_routes import get_current_user_doc
    from child_service import build_child_dashboard as build_payload
    user = get_current_user_doc()
    if not user:
        return {'portalContext': ctx.to_dict(), 'profile': None, 'needsProfile': True, 'chores': [], 'rewards': [], 'homework': [], 'badges': [], 'messagesPreview': [], 'aiRecommendations': []}
    return build_payload(ctx, user)


@dashboard_bp.route('/child', methods=['GET'])
def child_dashboard():
    ctx, err = require_portal_context()
    if err:
        return err
    if ctx.experience_type not in ('child', 'teen') and ctx.active_portal != 'child':
        ok, cap_err = require_capability(ctx.capabilities, 'can_view_own_rewards')
        if not ok:
            return jsonify({'error': 'Child portal access required'}), 403

    start = time.perf_counter()
    scope_id = ctx.child_profile_id or ctx.user_id
    cached, _meta = get_cached_portal_dashboard('child', scope_id)
    if cached:
        payload = {k: v for k, v in cached.items() if not k.startswith('_')}
        return _dashboard_response(payload, 'HIT', start, 'child')

    payload = _build_child_dashboard(ctx)
    set_cached_portal_dashboard('child', scope_id, payload)
    log_audit('dashboard.child.view', user_id=ctx.user_id, portal_context=ctx, resource_type='child_profile', resource_id=scope_id)
    return _dashboard_response(payload, 'MISS', start, 'child')
