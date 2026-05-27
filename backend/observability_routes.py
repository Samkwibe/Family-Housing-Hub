"""Internal observability endpoints — timeline inspector, metrics, client ingest."""
from __future__ import annotations

import os

from flask import Blueprint, jsonify, request

from observability_service import (
    get_snapshot,
    get_timeline,
    observability_enabled,
    record_client_metric,
    verify_internal_access,
)

observability_bp = Blueprint('observability', __name__, url_prefix='/api/internal/observability')


def _gate():
    if not observability_enabled():
        return jsonify({'error': 'Observability disabled'}), 404
    key = request.headers.get('X-Observability-Key') or request.args.get('key')
    if not verify_internal_access(key):
        return jsonify({'error': 'Unauthorized'}), 401
    return None


@observability_bp.route('/snapshot', methods=['GET'])
def snapshot():
    err = _gate()
    if err:
        return err
    return jsonify(get_snapshot())


@observability_bp.route('/timeline', methods=['GET'])
def timeline():
    err = _gate()
    if err:
        return err
    limit = min(200, int(request.args.get('limit', 100)))
    domain = request.args.get('domain')
    severity = request.args.get('severity')
    return jsonify({
        'events': get_timeline(limit=limit, domain=domain, severity=severity),
    })


@observability_bp.route('/client-metrics', methods=['POST'])
def client_metrics():
    """Mobile clients report render/hydration metrics (lightweight, batched)."""
    if not observability_enabled():
        return jsonify({'ok': True, 'skipped': True})
    data = request.json or {}
    metrics = data.get('metrics') or []
    if isinstance(metrics, dict):
        metrics = [metrics]
    for m in metrics[:20]:
        if isinstance(m, dict):
            record_client_metric(m)
    return jsonify({'ok': True, 'accepted': len(metrics)})


@observability_bp.route('/health', methods=['GET'])
def obs_health():
    """Public-lite observability ping (no timeline)."""
    snap = get_snapshot()
    return jsonify({
        'enabled': observability_enabled(),
        'timelineSize': snap.get('timelineSize', 0),
        'socketActive': snap.get('socket', {}).get('active_connections', 0),
        'celebrationEvents': snap.get('counters', {}).get('celebration_events:stage=emitted,type=*', 0),
    })
