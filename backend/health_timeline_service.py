"""Family health timeline with age-based gap detection."""
from __future__ import annotations

from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta


def _utcnow():
    return datetime.now(timezone.utc)


def _parse_date(value) -> datetime | None:
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


def member_age_years(date_of_birth, as_of: datetime | None = None) -> float | None:
    dob = _parse_date(date_of_birth)
    if not dob:
        return None
    as_of = as_of or _utcnow()
    delta = relativedelta(as_of, dob)
    return delta.years + delta.months / 12.0


def age_group(age_years: float | None) -> str:
    if age_years is None:
        return 'adult_18_64'
    if age_years < 5:
        return 'under_5'
    if age_years < 18:
        return 'child_5_18'
    if age_years < 65:
        return 'adult_18_64'
    return 'adult_65_plus'


RECOMMENDED_SCHEDULE = {
    'under_5': [
        {'checkupType': 'well_child', 'intervalMonths': 6, 'label': 'Well-child visit'},
    ],
    'child_5_18': [
        {'checkupType': 'physical', 'intervalMonths': 12, 'label': 'Annual physical'},
        {'checkupType': 'dental', 'intervalMonths': 12, 'label': 'Dental check-up'},
        {'checkupType': 'eye_exam', 'intervalMonths': 12, 'label': 'Eye exam'},
    ],
    'adult_18_64': [
        {'checkupType': 'physical', 'intervalMonths': 12, 'label': 'Annual physical'},
        {'checkupType': 'dental', 'intervalMonths': 6, 'label': 'Dental check-up'},
        {'checkupType': 'eye_exam', 'intervalMonths': 24, 'label': 'Eye exam'},
    ],
    'adult_65_plus': [
        {'checkupType': 'physical', 'intervalMonths': 6, 'label': 'Physical'},
        {'checkupType': 'flu_shot', 'intervalMonths': 12, 'label': 'Flu shot'},
        {'checkupType': 'screening', 'intervalMonths': 12, 'label': 'Additional screenings'},
    ],
}


def _months_since(dt: datetime, as_of: datetime | None = None) -> float:
    as_of = as_of or _utcnow()
    delta = relativedelta(as_of, dt)
    return delta.years * 12 + delta.months + delta.days / 30.0


def _format_interval(months: float) -> str:
    if months >= 24:
        return f"{months / 12:.1f} years"
    return f"{int(round(months))} months"


def _interval_label(months: int) -> str:
    if months == 6:
        return 'Every 6 months recommended'
    if months == 12:
        return 'Annual recommended'
    if months == 24:
        return 'Every 2 years recommended'
    return f'Every {months} months recommended'


def last_record_for_checkup(records: list[dict], checkup_type: str) -> dict | None:
    matches = []
    for r in records:
        if r.get('checkupType') == checkup_type:
            matches.append(r)
        elif r.get('type') == 'checkup' and checkup_type in (r.get('title') or '').lower():
            matches.append(r)
    if not matches:
        return None
    matches.sort(key=lambda x: _parse_date(x.get('date')) or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return matches[0]


def _label_for_message(label: str) -> str:
    return label.replace('Annual ', '').replace('annual ', '').lower()


def detect_gaps_for_member(member: dict, records: list[dict], as_of: datetime | None = None) -> list[dict]:
    as_of = as_of or _utcnow()
    age = member_age_years(member.get('dateOfBirth'), as_of)
    if age is None and not records:
        return []
    group = age_group(age)
    member_id = member.get('userId') or member.get('memberId', '')
    member_name = member.get('displayName') or member.get('firstName') or 'Member'
    gaps = []

    for req in RECOMMENDED_SCHEDULE.get(group, []):
        last = last_record_for_checkup(records, req['checkupType'])
        if not last:
            gaps.append({
                'memberId': member_id,
                'memberName': member_name,
                'age': round(age, 1) if age is not None else None,
                'checkupType': req['checkupType'],
                'label': req['label'],
                'monthsOverdue': None,
                'message': f"{member_name} has no recorded {_label_for_message(req['label'])}. {_interval_label(req['intervalMonths'])}.",
                'severity': 'warning',
            })
            continue

        last_date = _parse_date(last.get('date'))
        if not last_date:
            continue
        elapsed = _months_since(last_date, as_of)
        if elapsed > req['intervalMonths']:
            overdue = elapsed - req['intervalMonths']
            age_note = f" (age {int(age)})" if age is not None and age < 18 else ''
            msg = (
                f"{member_name}{age_note} hasn't had a {_label_for_message(req['label'])} in "
                f"{_format_interval(elapsed)}. {_interval_label(req['intervalMonths'])}."
            )
            gaps.append({
                'memberId': member_id,
                'memberName': member_name,
                'age': round(age, 1) if age is not None else None,
                'checkupType': req['checkupType'],
                'label': req['label'],
                'monthsOverdue': round(overdue, 1),
                'monthsSinceLast': round(elapsed, 1),
                'lastDate': last_date.date().isoformat(),
                'message': msg,
                'severity': 'warning',
            })
    return gaps


def build_timeline(records: list[dict], gaps: list[dict]) -> list[dict]:
    timeline = []
    for r in records:
        dt = _parse_date(r.get('date'))
        timeline.append({
            'id': str(r.get('_id', r.get('id', ''))),
            'kind': 'record',
            'memberId': r.get('memberId'),
            'memberName': r.get('memberName'),
            'type': r.get('type'),
            'title': r.get('title'),
            'date': dt.isoformat() if dt else '',
            'notes': r.get('notes', ''),
            'checkupType': r.get('checkupType'),
        })
    for g in gaps:
        timeline.append({
            'id': f"gap-{g['memberId']}-{g['checkupType']}",
            'kind': 'gap',
            'memberId': g['memberId'],
            'memberName': g['memberName'],
            'type': 'gap',
            'title': g['label'],
            'date': '',
            'message': g['message'],
            'severity': g['severity'],
        })
    timeline.sort(key=lambda x: x.get('date') or '', reverse=True)
    return timeline
