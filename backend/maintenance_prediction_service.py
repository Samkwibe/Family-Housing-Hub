"""Maintenance prediction — threshold + decay on service intervals."""
from __future__ import annotations

from datetime import datetime, timezone

BUILTIN_INTERVALS = {
    'hvac_filter': {'label': 'HVAC filter', 'days': 90},
    'furnace_inspection': {'label': 'Furnace inspection', 'days': 365},
    'water_heater_flush': {'label': 'Water heater flush', 'days': 365},
    'smoke_detector_test': {'label': 'Smoke detector test', 'days': 30},
    'fire_extinguisher_check': {'label': 'Fire extinguisher check', 'days': 365},
    'refrigerator_coils': {'label': 'Refrigerator coil cleaning', 'days': 180},
    'hvac': {'label': 'HVAC filter', 'days': 90},
    'furnace': {'label': 'Furnace inspection', 'days': 365},
    'water_heater': {'label': 'Water heater flush', 'days': 365},
    'refrigerator': {'label': 'Refrigerator coil cleaning', 'days': 180},
}


def _utcnow():
    return datetime.now(timezone.utc)


def _coerce_dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        try:
            dt = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _interval_for_appliance(appliance: dict) -> tuple[str, int]:
    custom = appliance.get('serviceIntervalDays')
    if custom:
        return appliance.get('name') or appliance.get('deviceType', 'Appliance'), int(custom)
    device_type = (appliance.get('deviceType') or appliance.get('applianceType') or '').lower()
    name = (appliance.get('name') or '').lower()
    for key, spec in BUILTIN_INTERVALS.items():
        if key in device_type or key.replace('_', ' ') in name or spec['label'].lower() in name:
            return spec['label'], spec['days']
    return appliance.get('name') or 'Appliance', int(appliance.get('serviceIntervalDays') or 180)


def predict_maintenance(appliances: list) -> list[dict]:
    predictions = []
    now = _utcnow()
    for app in appliances:
        label, interval_days = _interval_for_appliance(app)
        last_service = _coerce_dt(app.get('lastServiceDate') or app.get('createdAt'))
        if not last_service:
            last_service = now
        days_since = max(0, (now - last_service).days)
        pct = min(1.5, days_since / interval_days) if interval_days else 0
        days_until = interval_days - days_since

        urgency_score = pct ** 1.5
        status = 'ok'
        message = None
        if pct >= 1.0:
            status = 'overdue'
            message = f"{label} is overdue for service ({days_since} days since last service). Tap to log service or find a technician."
        elif pct >= 0.9:
            status = 'warning'
            message = f"{label} due in {max(0, days_until)} days — tap to log service or find a technician."
        elif pct >= 0.75:
            status = 'upcoming'
            message = f"{label} service coming up in {days_until} days."

        predictions.append({
            'id': str(app.get('_id', app.get('id', ''))),
            'name': app.get('name') or label,
            'deviceType': app.get('deviceType') or app.get('applianceType', 'other'),
            'label': label,
            'intervalDays': interval_days,
            'daysSinceService': days_since,
            'daysUntilDue': max(0, days_until),
            'progressPct': round(min(100, pct * 100), 1),
            'urgencyScore': round(urgency_score, 3),
            'status': status,
            'message': message,
        })

    predictions.sort(key=lambda p: -p['urgencyScore'])
    return predictions
