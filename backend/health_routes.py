"""Round 5 health routes — timeline, medications, vaccinations."""
from datetime import datetime, timezone

from bson import ObjectId
from flask import Blueprint, jsonify, request

from auth_routes import get_current_user_doc
from database import get_db
from encryption_service import DOSE_LOG_FIELDS, HEALTH_RECORD_FIELDS, MEDICATION_FIELDS, decrypt_fields, encrypt_fields
from health_timeline_service import build_timeline, detect_gaps_for_member, member_age_years
from household_service import ensure_user_household
from medication_adherence_service import adherence_stats, compute_smart_reminder_times
from permission_graph_service import get_member_role
from vaccination_schedule_service import build_vaccination_schedule

health_bp = Blueprint('health', __name__, url_prefix='/api/household/health')


def _utcnow():
    return datetime.now(timezone.utc)


def _require_user():
    user = get_current_user_doc()
    if not user:
        return None, (jsonify({'error': 'Authentication required'}), 401)
    return user, None


def _user_id(user) -> str:
    return str(user['_id'])


def _hid(user) -> str:
    return ensure_user_household(user)


def can_view_member_health(viewer_id: str, target_member_id: str, household_id: str) -> bool:
    if viewer_id == target_member_id:
        return True
    return get_member_role(viewer_id, household_id) == 'owner'


def _visible_members(db, viewer_id: str, household_id: str) -> list[dict]:
    members = list(db.household_members.find({'householdId': household_id, 'status': 'active'}))
    return [m for m in members if can_view_member_health(viewer_id, m.get('userId', ''), household_id)]


def _serialize_record(doc) -> dict:
    doc = decrypt_fields(doc, HEALTH_RECORD_FIELDS) if doc else doc
    dt = doc.get('date')
    return {
        'id': str(doc['_id']),
        'memberId': doc.get('memberId'),
        'memberName': doc.get('memberName'),
        'type': doc.get('type'),
        'checkupType': doc.get('checkupType'),
        'vaccineName': doc.get('vaccineName'),
        'dose': doc.get('dose'),
        'title': doc.get('title'),
        'date': dt.isoformat() if hasattr(dt, 'isoformat') else str(dt or ''),
        'nextDueDate': doc.get('nextDueDate').isoformat() if doc.get('nextDueDate') else None,
        'notes': doc.get('notes', ''),
    }


def _collect_gaps(db, household_id: str, viewer_id: str) -> list[dict]:
    gaps = []
    for member in _visible_members(db, viewer_id, household_id):
        mid = member.get('userId', '')
        records = list(db.health_records.find({'householdId': household_id, 'memberId': mid}))
        gaps.extend(detect_gaps_for_member(member, records))
    return gaps


@health_bp.route('/gaps', methods=['GET'])
def health_gaps():
    user, err = _require_user()
    if err:
        return err
    hid = _hid(user)
    db = get_db()
    gaps = _collect_gaps(db, hid, _user_id(user))
    return jsonify({'gaps': gaps, 'totalGaps': len(gaps)})


@health_bp.route('/timeline', methods=['GET'])
def health_timeline():
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    hid = _hid(user)
    db = get_db()
    member_filter = (request.args.get('memberId') or '').strip()

    if member_filter and not can_view_member_health(uid, member_filter, hid):
        return jsonify({'error': 'Access denied for this member'}), 403

    query = {'householdId': hid}
    if member_filter:
        query['memberId'] = member_filter
    else:
        visible_ids = [m.get('userId') for m in _visible_members(db, uid, hid)]
        query['memberId'] = {'$in': visible_ids}

    records = list(db.health_records.find(query).sort('date', -1))
    gaps = []
    members = _visible_members(db, uid, hid)
    if member_filter:
        members = [m for m in members if m.get('userId') == member_filter]
    for member in members:
        mid = member.get('userId', '')
        member_records = [r for r in records if r.get('memberId') == mid]
        gaps.extend(detect_gaps_for_member(member, member_records))

    return jsonify({
        'timeline': build_timeline(records, gaps),
        'gaps': gaps,
        'members': [{
            'userId': m.get('userId'),
            'displayName': m.get('displayName') or m.get('firstName') or m.get('userId'),
            'dateOfBirth': m.get('dateOfBirth'),
            'age': member_age_years(m.get('dateOfBirth')),
            'role': m.get('role'),
        } for m in members],
    })


@health_bp.route('/records', methods=['GET', 'POST'])
def health_records():
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    hid = _hid(user)
    db = get_db()

    if request.method == 'GET':
        member_filter = (request.args.get('memberId') or '').strip()
        query = {'householdId': hid}
        if member_filter:
            if not can_view_member_health(uid, member_filter, hid):
                return jsonify({'error': 'Access denied'}), 403
            query['memberId'] = member_filter
        else:
            visible_ids = [m.get('userId') for m in _visible_members(db, uid, hid)]
            query['memberId'] = {'$in': visible_ids}
        items = list(db.health_records.find(query).sort('date', -1))
        return jsonify({'records': [_serialize_record(r) for r in items]})

    data = request.json or {}
    member_id = (data.get('memberId') or uid).strip()
    if not can_view_member_health(uid, member_id, hid):
        return jsonify({'error': 'Access denied'}), 403

    member = db.household_members.find_one({'householdId': hid, 'userId': member_id, 'status': 'active'})
    member_name = (member or {}).get('displayName') or (member or {}).get('firstName') or data.get('memberName', 'Member')
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'Title is required'}), 400

    date_val = data.get('date') or _utcnow().isoformat()
    doc = {
        'householdId': hid,
        'memberId': member_id,
        'memberName': member_name,
        'type': data.get('type', 'appointment'),
        'checkupType': data.get('checkupType'),
        'vaccineName': data.get('vaccineName'),
        'dose': data.get('dose'),
        'title': title,
        'date': datetime.fromisoformat(str(date_val).replace('Z', '+00:00')) if isinstance(date_val, str) else date_val,
        'nextDueDate': None,
        'notes': data.get('notes', ''),
        'createdAt': _utcnow(),
    }
    doc = encrypt_fields(doc, HEALTH_RECORD_FIELDS)
    result = db.health_records.insert_one(doc)
    doc['_id'] = result.inserted_id
    return jsonify({'record': _serialize_record(doc)}), 201


@health_bp.route('/medications', methods=['GET', 'POST'])
def medications():
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    hid = _hid(user)
    db = get_db()

    if request.method == 'GET':
        member_filter = (request.args.get('memberId') or '').strip()
        query = {'householdId': hid, 'active': {'$ne': False}}
        if member_filter:
            if not can_view_member_health(uid, member_filter, hid):
                return jsonify({'error': 'Access denied'}), 403
            query['memberId'] = member_filter
        else:
            visible_ids = [m.get('userId') for m in _visible_members(db, uid, hid)]
            query['memberId'] = {'$in': visible_ids}

        meds = []
        for m in db.medications.find(query):
            m = decrypt_fields(m, MEDICATION_FIELDS)
            logs = list(db.dose_logs.find({'medicationId': str(m['_id'])}))
            sessions = list(db.login_history.find({'userId': m.get('memberId')}).sort('createdAt', -1).limit(200))
            session_times = [s.get('createdAt') for s in sessions if s.get('createdAt')]
            smart_times = compute_smart_reminder_times(session_times)
            stats = adherence_stats(logs, m)
            meds.append({
                'id': str(m['_id']),
                'memberId': m.get('memberId'),
                'memberName': m.get('memberName'),
                'name': m.get('name'),
                'dosage': m.get('dosage'),
                'frequency': m.get('frequency'),
                'scheduledTimes': m.get('scheduledTimes') or smart_times,
                'smartReminderTimes': smart_times,
                'active': bool(m.get('active', True)),
                'adherenceRate': stats['adherenceRate'],
                'streakDays': stats['streakDays'],
                'dosesTaken': stats['dosesTaken'],
                'dosesDue': stats['dosesDue'],
            })
        return jsonify({'medications': meds})

    data = request.json or {}
    member_id = (data.get('memberId') or uid).strip()
    if not can_view_member_health(uid, member_id, hid):
        return jsonify({'error': 'Access denied'}), 403
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Medication name is required'}), 400

    member = db.household_members.find_one({'householdId': hid, 'userId': member_id})
    doc = {
        'householdId': hid,
        'memberId': member_id,
        'memberName': (member or {}).get('displayName') or data.get('memberName', 'Member'),
        'name': name,
        'dosage': data.get('dosage', ''),
        'frequency': data.get('frequency', 'daily'),
        'scheduledTimes': data.get('scheduledTimes', []),
        'startDate': _utcnow(),
        'endDate': None,
        'active': True,
        'createdAt': _utcnow(),
    }
    doc = encrypt_fields(doc, MEDICATION_FIELDS)
    result = db.medications.insert_one(doc)
    doc['_id'] = result.inserted_id
    return jsonify({'medication': {'id': str(doc['_id']), **{k: doc[k] for k in doc if k != '_id'}}}), 201


@health_bp.route('/medications/<med_id>/dose', methods=['POST'])
def medication_dose(med_id):
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    hid = _hid(user)
    db = get_db()
    try:
        oid = ObjectId(med_id)
    except Exception:
        return jsonify({'error': 'Invalid medication id'}), 400

    med = db.medications.find_one({'_id': oid, 'householdId': hid})
    if not med:
        return jsonify({'error': 'Not found'}), 404
    if not can_view_member_health(uid, med.get('memberId', ''), hid):
        return jsonify({'error': 'Access denied'}), 403

    data = request.json or {}
    status = data.get('status', 'taken')
    if status not in ('taken', 'missed'):
        return jsonify({'error': 'status must be taken or missed'}), 400

    log = {
        'medicationId': med_id,
        'householdId': hid,
        'memberId': med.get('memberId'),
        'status': status,
        'scheduledAt': _utcnow(),
        'createdAt': _utcnow(),
        'notes': data.get('notes', ''),
    }
    log = encrypt_fields(log, DOSE_LOG_FIELDS)
    db.dose_logs.insert_one(log)
    logs = list(db.dose_logs.find({'medicationId': med_id}))
    stats = adherence_stats(logs, med)
    return jsonify({'doseLog': log, 'adherence': stats})


@health_bp.route('/vaccinations/<member_id>', methods=['GET'])
def vaccination_schedule(member_id):
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    hid = _hid(user)
    if not can_view_member_health(uid, member_id, hid):
        return jsonify({'error': 'Access denied'}), 403

    db = get_db()
    member = db.household_members.find_one({'householdId': hid, 'userId': member_id, 'status': 'active'})
    if not member:
        return jsonify({'error': 'Member not found'}), 404
    if not member.get('dateOfBirth'):
        return jsonify({'error': 'Member date of birth required for vaccination schedule'}), 400

    records = list(db.health_records.find({
        'householdId': hid,
        'memberId': member_id,
        'type': 'vaccination',
    }))
    schedule = build_vaccination_schedule(member.get('dateOfBirth'), records)
    return jsonify({
        'memberId': member_id,
        'memberName': member.get('displayName') or member.get('firstName'),
        'dateOfBirth': member.get('dateOfBirth'),
        'schedule': schedule,
    })


@health_bp.route('/vaccinations/mark-received', methods=['POST'])
def mark_vaccination_received():
    user, err = _require_user()
    if err:
        return err
    uid = _user_id(user)
    hid = _hid(user)
    data = request.json or {}
    member_id = (data.get('memberId') or '').strip()
    if not member_id or not can_view_member_health(uid, member_id, hid):
        return jsonify({'error': 'Access denied'}), 403

    vaccine = (data.get('vaccine') or '').strip()
    dose = (data.get('dose') or '').strip()
    if not vaccine:
        return jsonify({'error': 'vaccine is required'}), 400

    db = get_db()
    member = db.household_members.find_one({'householdId': hid, 'userId': member_id})
    date_val = data.get('receivedDate') or _utcnow().isoformat()
    received = datetime.fromisoformat(str(date_val).replace('Z', '+00:00'))

    doc = {
        'householdId': hid,
        'memberId': member_id,
        'memberName': (member or {}).get('displayName') or 'Member',
        'type': 'vaccination',
        'vaccineName': vaccine,
        'dose': dose,
        'title': f"{vaccine} ({dose})",
        'date': received,
        'notes': data.get('notes', ''),
        'createdAt': _utcnow(),
    }
    doc = encrypt_fields(doc, HEALTH_RECORD_FIELDS)
    result = db.health_records.insert_one(doc)
    doc['_id'] = result.inserted_id
    schedule = build_vaccination_schedule(member.get('dateOfBirth'), [
        decrypt_fields(r, HEALTH_RECORD_FIELDS)
        for r in db.health_records.find({
        'householdId': hid, 'memberId': member_id, 'type': 'vaccination',
    })])
    return jsonify({'record': _serialize_record(doc), 'schedule': schedule})


def build_health_dashboard_summary(db, household_id: str, viewer_id: str) -> dict | None:
    gaps = _collect_gaps(db, household_id, viewer_id)
    if not gaps:
        return None
    top = gaps[0]
    return {
        'totalGaps': len(gaps),
        'topGap': top,
        'message': top.get('message'),
        'gaps': gaps[:5],
    }
