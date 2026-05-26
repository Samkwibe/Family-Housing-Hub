"""MongoDB-backed verification code storage."""
import random
import re
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request

from database import get_db, ping_db

verification_bp = Blueprint('verification_store', __name__, url_prefix='/api/verification')

CODE_TTL_MINUTES = 10
MAX_ATTEMPTS = 5


def _utcnow():
    return datetime.now(timezone.utc)


def _as_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _normalize_email(email: str) -> str:
    return (email or '').strip().lower()


def _normalize_phone(phone: str) -> str:
    digits = re.sub(r'\D', '', phone or '')
    if len(digits) == 11 and digits.startswith('1'):
        digits = digits[1:]
    return digits


def _generate_code() -> str:
    return str(random.randint(100000, 999999))


@verification_bp.route('/store-code', methods=['POST'])
def store_code():
    """Store a verification code in MongoDB (used by mobile before send)."""
    if not ping_db():
        return jsonify({'error': 'Database unavailable'}), 503

    data = request.json or {}
    channel = (data.get('channel') or data.get('type') or 'email').lower()
    target = data.get('target') or data.get('email') or data.get('phone') or ''
    code = data.get('code') or _generate_code()

    if channel == 'email':
        target = _normalize_email(target)
        if not target or '@' not in target:
            return jsonify({'error': 'Valid email required'}), 400
    elif channel == 'phone':
        target = _normalize_phone(target)
        if len(target) != 10:
            return jsonify({'error': 'Valid 10-digit phone required'}), 400
    else:
        return jsonify({'error': 'channel must be email or phone'}), 400

    db = get_db()
    db.verifications.delete_many({'channel': channel, 'target': target, 'verified': False})

    doc = {
        'channel': channel,
        'target': target,
        'code': code,
        'attempts': 0,
        'verified': False,
        'expiresAt': _utcnow() + timedelta(minutes=CODE_TTL_MINUTES),
        'createdAt': _utcnow(),
    }
    result = db.verifications.insert_one(doc)

    return jsonify({
        'verificationId': str(result.inserted_id),
        'code': code,
    })


@verification_bp.route('/confirm', methods=['POST'])
def confirm_code():
    if not ping_db():
        return jsonify({'error': 'Database unavailable'}), 503

    data = request.json or {}
    channel = (data.get('channel') or data.get('type') or 'email').lower()
    target = data.get('target') or data.get('email') or data.get('phone') or ''
    code = str(data.get('code', '')).strip()

    if channel == 'email':
        target = _normalize_email(target)
    else:
        target = _normalize_phone(target)

    if not code:
        return jsonify({'error': 'Code is required'}), 400

    db = get_db()
    doc = db.verifications.find_one(
        {'channel': channel, 'target': target, 'verified': False},
        sort=[('createdAt', -1)],
    )

    if not doc:
        return jsonify({'error': 'No verification code found. Request a new code.'}), 404

    if doc.get('expiresAt') and _as_utc(doc['expiresAt']) < _utcnow():
        db.verifications.delete_one({'_id': doc['_id']})
        return jsonify({'error': 'Code expired. Request a new code.'}), 400

    if doc.get('attempts', 0) >= MAX_ATTEMPTS:
        db.verifications.delete_one({'_id': doc['_id']})
        return jsonify({'error': 'Too many attempts. Request a new code.'}), 400

    if doc.get('code') != code:
        db.verifications.update_one({'_id': doc['_id']}, {'$inc': {'attempts': 1}})
        return jsonify({'error': 'Invalid code.'}), 400

    db.verifications.update_one(
        {'_id': doc['_id']},
        {'$set': {'verified': True, 'verifiedAt': _utcnow()}},
    )
    return jsonify({'verified': True})
