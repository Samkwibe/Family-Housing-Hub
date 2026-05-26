"""Post-write hooks: dashboard cache invalidation + realtime events."""
from __future__ import annotations

from typing import Any

from dashboard_cache_service import invalidate_dashboard_cache
from realtime_service import emit_household_data_changed, emit_notification


def after_household_write(
    household_id: str,
    entity: str,
    payload: dict | None = None,
    *,
    notify_user_ids: list[str] | None = None,
    notification: dict | None = None,
) -> None:
    if household_id:
        invalidate_dashboard_cache(household_id)
        emit_household_data_changed(household_id, entity, payload)
    if notification:
        targets = notify_user_ids or []
        for uid in targets:
            emit_notification(uid, notification)
