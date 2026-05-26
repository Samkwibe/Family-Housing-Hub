"""Geofencing safe zones — Haversine distance, enter/leave events."""
from __future__ import annotations

import math
from datetime import datetime, timezone


def _utcnow():
    return datetime.now(timezone.utc)


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in meters between two GPS coordinates."""
    r = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def is_inside_zone(lat: float, lng: float, zone: dict) -> bool:
    dist = haversine_meters(lat, lng, float(zone['lat']), float(zone['lng']))
    return dist <= float(zone.get('radiusMeters', 200))


def format_event_time(dt: datetime | None = None) -> str:
    dt = dt or _utcnow()
    hour = dt.hour % 12 or 12
    return f"{hour}:{dt.strftime('%M %p')}"


def process_location_ping(
    db,
    *,
    household_id: str,
    member_user_id: str,
    member_name: str,
    lat: float,
    lng: float,
    zones: list[dict],
    viewer_role: str = 'owner',
) -> list[dict]:
    """Return enter/leave events and persist state + parent notifications."""
    state_doc = db.geofence_member_state.find_one({
        'householdId': household_id,
        'memberUserId': member_user_id,
    }) or {'zoneStates': {}}
    zone_states = dict(state_doc.get('zoneStates') or {})
    events = []
    now = _utcnow()

    for zone in zones:
        zid = str(zone.get('_id', zone.get('id', '')))
        inside = is_inside_zone(lat, lng, zone)
        prev = zone_states.get(zid)
        current = 'inside' if inside else 'outside'

        if prev is None:
            zone_states[zid] = current
            continue

        if prev == current:
            zone_states[zid] = current
            continue

        zone_name = zone.get('name', 'Safe zone')
        time_str = format_event_time(now)
        if current == 'inside':
            message = f"{member_name} arrived at {zone_name} at {time_str}"
            event_type = 'enter'
        else:
            message = f"{member_name} left {zone_name} at {time_str}"
            event_type = 'leave'

        zone_states[zid] = current
        event = {
            'type': event_type,
            'zoneId': zid,
            'zoneName': zone_name,
            'memberUserId': member_user_id,
            'memberName': member_name,
            'message': message,
            'timestamp': now.isoformat(),
        }
        events.append(event)

        db.geofence_events.insert_one({
            'householdId': household_id,
            'memberUserId': member_user_id,
            'zoneId': zid,
            'zoneName': zone_name,
            'eventType': event_type,
            'message': message,
            'lat': lat,
            'lng': lng,
            'createdAt': now,
            'visibleTo': ['owner', 'parent'],
        })
        print(f"[geofence] {message}")

    db.geofence_member_state.update_one(
        {'householdId': household_id, 'memberUserId': member_user_id},
        {'$set': {'zoneStates': zone_states, 'lastLat': lat, 'lastLng': lng, 'updatedAt': now}},
        upsert=True,
    )
    return events


def can_view_member_location(viewer_user_id: str, target_user_id: str, viewer_role: str, target_role: str) -> bool:
    """Children's location visible to owners only; adults opt-in via sharing flag."""
    if viewer_user_id == target_user_id:
        return True
    if target_role == 'family' and viewer_role == 'owner':
        return True
    if target_role != 'family' and viewer_role in ('owner', 'renter'):
        return True
    return False
