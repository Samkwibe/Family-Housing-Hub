"""Audit logging for sensitive portal actions."""
from __future__ import annotations

from datetime import datetime, timezone

from flask import request

from database import get_db
from portal_context_service import PortalContext


def _utcnow():
    return datetime.now(timezone.utc)


def log_audit(
    action: str,
    *,
    user_id: str | None = None,
    portal_context: PortalContext | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    metadata: dict | None = None,
) -> None:
    """Write an audit log entry. Failures are swallowed to avoid breaking requests."""
    try:
        ctx_snapshot = portal_context.to_dict() if portal_context else None
        ip = request.remote_addr if request else None
        get_db().audit_logs.insert_one({
            'userId': user_id,
            'action': action,
            'portalContext': ctx_snapshot,
            'resourceType': resource_type,
            'resourceId': resource_id,
            'metadata': metadata or {},
            'ip': ip,
            'timestamp': _utcnow(),
        })
    except Exception as exc:
        print(f'[audit] failed to log {action}: {exc}')
