"""CDC childhood vaccination schedule from date of birth."""
from __future__ import annotations

from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta


def _utcnow():
    return datetime.now(timezone.utc)


def _parse_dob(value) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, str):
        try:
            dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            try:
                dt = datetime.strptime(value[:10], '%Y-%m-%d')
            except ValueError:
                return None
    else:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


CDC_SCHEDULE = [
    {'vaccine': 'Hepatitis B', 'dose': 'Dose 1', 'ageMonths': 0},
    {'vaccine': 'DTaP', 'dose': 'Dose 1', 'ageMonths': 2},
    {'vaccine': 'IPV', 'dose': 'Dose 1', 'ageMonths': 2},
    {'vaccine': 'Hib', 'dose': 'Dose 1', 'ageMonths': 2},
    {'vaccine': 'PCV15', 'dose': 'Dose 1', 'ageMonths': 2},
    {'vaccine': 'RV', 'dose': 'Dose 1', 'ageMonths': 2},
    {'vaccine': 'DTaP', 'dose': 'Dose 2', 'ageMonths': 4},
    {'vaccine': 'IPV', 'dose': 'Dose 2', 'ageMonths': 4},
    {'vaccine': 'Hib', 'dose': 'Dose 2', 'ageMonths': 4},
    {'vaccine': 'PCV15', 'dose': 'Dose 2', 'ageMonths': 4},
    {'vaccine': 'RV', 'dose': 'Dose 2', 'ageMonths': 4},
    {'vaccine': 'DTaP', 'dose': 'Dose 3', 'ageMonths': 6},
    {'vaccine': 'IPV', 'dose': 'Dose 3', 'ageMonths': 6},
    {'vaccine': 'Hib', 'dose': 'Dose 3', 'ageMonths': 6},
    {'vaccine': 'PCV15', 'dose': 'Dose 3', 'ageMonths': 6},
    {'vaccine': 'RV', 'dose': 'Dose 3', 'ageMonths': 6},
    {'vaccine': 'Influenza', 'dose': 'Annual', 'ageMonths': 6},
    {'vaccine': 'MMR', 'dose': 'Dose 1', 'ageMonths': 12},
    {'vaccine': 'Varicella', 'dose': 'Dose 1', 'ageMonths': 12},
    {'vaccine': 'Hep A', 'dose': 'Dose 1', 'ageMonths': 12},
    {'vaccine': 'DTaP', 'dose': 'Booster', 'ageMonths': 15},
    {'vaccine': 'Hib', 'dose': 'Booster', 'ageMonths': 15},
    {'vaccine': 'PCV15', 'dose': 'Booster', 'ageMonths': 15},
    {'vaccine': 'DTaP', 'dose': 'Booster (4–6 yr)', 'ageMonths': 48},
    {'vaccine': 'IPV', 'dose': 'Booster (4–6 yr)', 'ageMonths': 48},
    {'vaccine': 'MMR', 'dose': 'Booster (4–6 yr)', 'ageMonths': 48},
    {'vaccine': 'Varicella', 'dose': 'Booster (4–6 yr)', 'ageMonths': 48},
    {'vaccine': 'Tdap', 'dose': 'Dose 1', 'ageMonths': 132},
    {'vaccine': 'HPV', 'dose': 'Dose 1', 'ageMonths': 132},
    {'vaccine': 'HPV', 'dose': 'Dose 2', 'ageMonths': 138},
    {'vaccine': 'MenACWY', 'dose': 'Dose 1', 'ageMonths': 132},
    {'vaccine': 'MenACWY', 'dose': 'Booster', 'ageMonths': 192},
]


def _vaccine_key(vaccine: str, dose: str) -> str:
    return f"{vaccine}|{dose}"


def _received_map(records: list[dict]) -> dict[str, datetime]:
    out = {}
    for r in records:
        if r.get('type') != 'vaccination':
            continue
        key = _vaccine_key(r.get('vaccineName') or r.get('title', ''), r.get('dose') or '')
        dt = r.get('date')
        if isinstance(dt, str):
            dt = _parse_dob(dt)
        if dt and key not in out:
            out[key] = dt
    return out


def build_vaccination_schedule(date_of_birth, vaccination_records: list[dict], as_of: datetime | None = None) -> list[dict]:
    dob = _parse_dob(date_of_birth)
    if not dob:
        return []
    as_of = as_of or _utcnow()
    received = _received_map(vaccination_records)
    schedule = []

    for entry in CDC_SCHEDULE:
        due_date = dob + relativedelta(months=entry['ageMonths'])
        key = _vaccine_key(entry['vaccine'], entry['dose'])
        recv_date = received.get(key)

        if recv_date:
            status = 'received'
        elif due_date > as_of + relativedelta(days=30):
            status = 'upcoming'
        elif due_date > as_of:
            status = 'due_soon'
        else:
            status = 'overdue'

        schedule.append({
            'vaccine': entry['vaccine'],
            'dose': entry['dose'],
            'dueDate': due_date.date().isoformat(),
            'status': status,
            'receivedDate': recv_date.date().isoformat() if recv_date else None,
            'ageMonths': entry['ageMonths'],
        })
    return schedule
