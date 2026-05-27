"""Attach PortalContext to every authenticated Flask request."""
from __future__ import annotations

from flask import g

from auth_routes import get_current_user_doc
from portal_context_service import resolve_portal_context

_SKIP_PREFIXES = ('/socket.io', '/api/health', '/api/internal/observability', '/')


def register_portal_middleware(app) -> None:
    @app.before_request
    def _attach_portal_context():
        from flask import request
        path = request.path or ''
        if path.startswith('/socket.io') or path.startswith('/api/internal/observability') or path in ('/', '/api/health'):
            g.portal_ctx = None
            return None
        user = get_current_user_doc()
        g.portal_ctx = resolve_portal_context(user, request) if user else None
        return None
