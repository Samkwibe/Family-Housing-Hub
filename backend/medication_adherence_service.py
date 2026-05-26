"""Medication adherence tracking with smart reminder timing."""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone


def _utcnow():
    return datetime.now(timezone.utc)


def _parse_dt(value) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, str):
        try:
            dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            return None
    else:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def compute_smart_reminder_times(session_timestamps: list[datetime], count: int = 2) -> list[str]:
    """Find peak app-open hours and return reminder times 10 minutes earlier."""
    if not session_timestamps:
        return ['07:50', '21:30']

    hours = Counter()
    for ts in session_timestamps:
        dt = _parse_dt(ts)
        if dt:
            hours[dt.hour + dt.minute / 60.0] += 1

    if not hours:
        return ['07:50', '21:30']

    peaks = [h for h, _ in hours.most_common(count)]
    peaks.sort()
    times = []
    for peak in peaks:
        total_minutes = int(round(peak * 60)) - 10
        if total_minutes < 0:
            total_minutes += 24 * 60
        hh = (total_minutes // 60) % 24
        mm = total_minutes % 60
        suffix = 'AM' if hh < 12 else 'PM'
        display_h = hh % 12 or 12
        times.append(f"{display_h}:{mm:02d} {suffix}")
    while len(times) < count:
        defaults = ['7:55 AM', '9:37 PM']
        times.append(defaults[len(times)])
    return times[:count]


def doses_due_in_period(medication: dict, start: datetime, end: datetime) -> int:
    freq = medication.get('frequency', 'daily')
    start_date = _parse_dt(medication.get('startDate')) or start
    end_date = _parse_dt(medication.get('endDate'))
    active = medication.get('active', True)
    if not active:
        return 0

    window_start = max(start, start_date)
    window_end = min(end, end_date) if end_date else end
    if window_end <= window_start:
        return 0

    days = max(1, (window_end.date() - window_start.date()).days + 1)
    if freq == 'twice-daily':
        return days * 2
    if freq == 'weekly':
        return max(1, days // 7)
    return days


def adherence_stats(dose_logs: list[dict], medication: dict, days: int = 30) -> dict:
    end = _utcnow()
    start = end - timedelta(days=days)
    due = doses_due_in_period(medication, start, end)

    relevant = []
    for log in dose_logs:
        dt = _parse_dt(log.get('scheduledAt') or log.get('createdAt'))
        if dt and start <= dt <= end:
            relevant.append(log)

    taken = sum(1 for l in relevant if l.get('status') == 'taken')
    missed = sum(1 for l in relevant if l.get('status') == 'missed')
    logged = taken + missed
    due = max(doses_due_in_period(medication, start, end), logged, 1)
    rate = round(min(100.0, (taken / due) * 100), 1)

    streak = _compute_streak(dose_logs, medication)
    return {
        'adherenceRate': rate,
        'dosesTaken': taken,
        'dosesDue': due,
        'dosesMissed': missed,
        'streakDays': streak,
        'periodDays': days,
    }


def _compute_streak(dose_logs: list[dict], medication: dict) -> int:
    """Consecutive days ending today with 100% adherence."""
    by_day: dict[str, dict] = {}
    for log in dose_logs:
        dt = _parse_dt(log.get('scheduledAt') or log.get('createdAt'))
        if not dt:
            continue
        key = dt.date().isoformat()
        by_day.setdefault(key, {'due': 0, 'taken': 0})
        by_day[key]['due'] += 1
        if log.get('status') == 'taken':
            by_day[key]['taken'] += 1

    streak = 0
    day = _utcnow().date()
    while True:
        key = day.isoformat()
        stats = by_day.get(key)
        if not stats:
            break
        if stats['due'] > 0 and stats['taken'] == stats['due']:
            streak += 1
            day -= timedelta(days=1)
        else:
            break
    return streak
