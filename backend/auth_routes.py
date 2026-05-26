"""MongoDB-backed authentication routes."""
import hashlib
import os
import re
import secrets
import smtplib
import uuid
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import bcrypt
import jwt
from bson import ObjectId
from flask import Blueprint, jsonify, request

from database import get_db, ping_db
from household_service import ensure_user_household
from oauth_service import OAuthError, verify_oauth_provider
from rate_limit_service import check_auth_rate_limit, rate_limit_response

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

OAUTH_PROVIDERS = frozenset({'google', 'microsoft', 'github', 'apple'})

JWT_SECRET = os.getenv('JWT_SECRET', 'dev-change-me-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRES_HOURS = int(os.getenv('JWT_EXPIRES_HOURS', '168'))  # 7 days

SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
SMTP_USER = os.getenv('SMTP_USER')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')
EMAIL_FROM = os.getenv('EMAIL_FROM', SMTP_USER or 'noreply@family-housing-hub.com')
RESET_LINK_BASE = (
    os.getenv('RESET_LINK_BASE')
    or os.getenv('EXPO_PUBLIC_RESET_LINK_BASE')
    or 'familyhousinghub://reset-password'
).rstrip('/')
RESET_TOKEN_HOURS = int(os.getenv('RESET_TOKEN_HOURS', '1'))


def _utcnow():
    return datetime.now(timezone.utc)


def _normalize_email(email: str) -> str:
    return (email or '').strip().lower()


def _normalize_phone(phone: str) -> str:
    digits = re.sub(r'\D', '', phone or '')
    if len(digits) == 11 and digits.startswith('1'):
        digits = digits[1:]
    return digits


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def _check_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception:
        return False


def _create_token(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'iat': _utcnow(),
        'exp': _utcnow() + timedelta(hours=JWT_EXPIRES_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


def _serialize_user(doc: dict) -> dict:
    if not doc:
        return {}
    out = {k: v for k, v in doc.items() if k not in ('passwordHash', '_id')}
    out['id'] = str(doc.get('_id', doc.get('id', '')))
    out['uid'] = out['id']
    out['activeHouseholdId'] = doc.get('activeHouseholdId')
    out['ownedHouseholdIds'] = doc.get('ownedHouseholdIds') or []
    return out


def _get_bearer_token() -> str | None:
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:].strip()
    return None


def get_current_user_doc():
    token = _get_bearer_token()
    if not token:
        return None
    payload = _decode_token(token)
    if not payload or not payload.get('sub'):
        return None
    try:
        oid = ObjectId(payload['sub'])
    except Exception:
        return None
    return get_db().users.find_one({'_id': oid})


def _validate_password(password: str):
    if not password or len(password) < 6:
        return 'Password must be at least 6 characters'


def _validate_register_body(data: dict):
    email = _normalize_email(data.get('email', ''))
    password = data.get('password', '')
    first_name = (data.get('firstName') or '').strip()
    last_name = (data.get('lastName') or '').strip()

    if not email or '@' not in email:
        return None, ('Email is required', 400)
    pw_err = _validate_password(password)
    if pw_err:
        return None, (pw_err, 400)
    if not first_name:
        return None, ('First name is required', 400)

    phone = _normalize_phone(data.get('phone', ''))
    user_doc = {
        'email': email,
        'passwordHash': _hash_password(password),
        'firstName': first_name,
        'lastName': last_name,
        'phone': data.get('phone', '') if phone else '',
        'phoneDigits': phone or None,
        'role': data.get('role', 'family'),
        'userType': data.get('userType', 'renter'),
        'emailVerified': bool(data.get('emailVerified', False)),
        'phoneVerified': bool(data.get('phoneVerified', False)),
        'profileComplete': False,
        'onboardingComplete': False,
        'address': data.get('address') or {
            'street': '',
            'city': '',
            'state': '',
            'zipCode': '',
            'country': 'USA',
        },
        'createdAt': _utcnow().isoformat(),
        'updatedAt': _utcnow().isoformat(),
        'lastLogin': None,
    }
    return user_doc, None


@auth_bp.route('/register', methods=['POST'])
def register():
    if not ping_db():
        return jsonify({'error': 'Database unavailable. Check MONGODB_URI.'}), 503

    ok, info = check_auth_rate_limit(request, '/api/auth/register', increment=True)
    if not ok and info:
        return rate_limit_response(info)

    data = request.json or {}
    user_doc, err = _validate_register_body(data)
    if err:
        return jsonify({'error': err[0]}), err[1]

    if not user_doc.get('emailVerified'):
        return jsonify({'error': 'Email verification is required before creating an account'}), 400

    db = get_db()
    if db.users.find_one({'email': user_doc['email']}):
        return jsonify({'error': 'An account with this email already exists'}), 409

    if user_doc.get('phoneDigits'):
        existing_phone = db.users.find_one({'phoneDigits': user_doc['phoneDigits']})
        if existing_phone:
            return jsonify({'error': 'An account with this phone number already exists'}), 409

    result = db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    user_doc['_id'] = result.inserted_id
    ensure_user_household(user_doc)
    token = _create_token(user_id)

    return jsonify({
        'token': token,
        'user': _serialize_user(user_doc),
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    if not ping_db():
        return jsonify({'error': 'Database unavailable. Check MONGODB_URI.'}), 503

    ok, info = check_auth_rate_limit(request, '/api/auth/login')
    if not ok and info:
        return rate_limit_response(info)

    data = request.json or {}
    identifier = (data.get('identifier') or data.get('email') or '').strip()
    password = data.get('password', '')

    if not identifier or not password:
        return jsonify({'error': 'Email/phone and password are required'}), 400

    db = get_db()
    user = None
    if '@' in identifier:
        user = db.users.find_one({'email': _normalize_email(identifier)})
    else:
        digits = _normalize_phone(identifier)
        if len(digits) != 10:
            return jsonify({'error': 'Use a valid email or 10-digit US phone number'}), 400
        user = db.users.find_one({'phoneDigits': digits})

    if not user or not user.get('passwordHash'):
        ok, info = check_auth_rate_limit(request, '/api/auth/login', increment=True)
        if not ok and info:
            return rate_limit_response(info)
        return jsonify({'error': 'Invalid credentials'}), 401
    if not _check_password(password, user['passwordHash']):
        ok, info = check_auth_rate_limit(request, '/api/auth/login', increment=True)
        if not ok and info:
            return rate_limit_response(info)
        return jsonify({'error': 'Invalid credentials'}), 401

    from login_anomaly_service import assess_login_risk, build_login_features, device_hash, record_login_attempt

    user_id = str(user['_id'])
    history = list(db.login_history.find({'userId': user_id}).sort('createdAt', -1).limit(50))
    now = _utcnow()
    ua = request.headers.get('User-Agent', '')
    demo_city = (data.get('city') or request.headers.get('X-Demo-City') or '').strip()
    demo_country = (data.get('country') or request.headers.get('X-Demo-Country') or 'US').strip()
    demo_device = (data.get('deviceId') or request.headers.get('X-Device-Id') or '').strip()
    feat = build_login_features(
        device_hash_val=device_hash(ua, demo_device),
        city=demo_city or (history[0].get('city') if history else ''),
        country=demo_country,
        hour=now.hour,
        weekday=now.weekday(),
        history=history,
    )
    if demo_city:
        feat['city'] = demo_city
        feat['isNewCity'] = demo_city not in {h.get('city') for h in history if h.get('city')}
    if demo_device:
        dh = device_hash(ua, demo_device)
        feat['deviceHash'] = dh
        feat['isNewDevice'] = dh not in {h.get('deviceHash') for h in history}
    hour_override = data.get('hourOverride')
    if hour_override is not None:
        feat['hour'] = int(hour_override)
        now = now.replace(hour=int(hour_override))

    risk = assess_login_risk(user_id, feat, history)
    record_login_attempt(db, user_id, feat, risk, ip=request.remote_addr or '')

    if risk.get('block'):
        return jsonify({
            'error': risk['message'],
            'riskLevel': 'high',
            'blocked': True,
            'requireReauth': True,
        }), 403

    db.users.update_one(
        {'_id': user['_id']},
        {'$set': {'lastLogin': _utcnow().isoformat(), 'updatedAt': _utcnow().isoformat()}},
    )
    ensure_user_household(user)
    refreshed = db.users.find_one({'_id': user['_id']})
    token = _create_token(str(user['_id']))

    return jsonify({
        'token': token,
        'user': _serialize_user(refreshed or user),
        'loginRisk': {
            'level': risk.get('riskLevel', 'low'),
            'score': risk.get('score'),
            'alert': risk.get('message'),
        },
    })


@auth_bp.route('/me', methods=['GET'])
def me():
    user = get_current_user_doc()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    ensure_user_household(user)
    refreshed = get_db().users.find_one({'_id': user['_id']})
    return jsonify({'user': _serialize_user(refreshed or user)})


@auth_bp.route('/logout', methods=['POST'])
def logout():
    # JWT is stateless; client clears token. Endpoint exists for API symmetry.
    return jsonify({'success': True, 'message': 'Logged out'})


@auth_bp.route('/profile', methods=['PATCH'])
def update_profile():
    user = get_current_user_doc()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json or {}
    allowed = {
        'firstName', 'lastName', 'phone', 'userType', 'role',
        'address', 'profileComplete', 'onboardingComplete',
        'emailVerified', 'phoneVerified',
    }
    update = {k: v for k, v in data.items() if k in allowed}
    if 'phone' in update:
        digits = _normalize_phone(str(update['phone']))
        update['phoneDigits'] = digits or None
    if not update:
        return jsonify({'error': 'No valid fields to update'}), 400

    update['updatedAt'] = _utcnow().isoformat()
    if update.get('onboardingComplete') or update.get('profileComplete'):
        update['profileComplete'] = True
        update['onboardingComplete'] = True

    db = get_db()
    db.users.update_one({'_id': user['_id']}, {'$set': update})
    refreshed = db.users.find_one({'_id': user['_id']})
    return jsonify({'user': _serialize_user(refreshed)})


@auth_bp.route('/lookup-email', methods=['GET'])
def lookup_email():
    phone = _normalize_phone(request.args.get('phone', ''))
    if len(phone) != 10:
        return jsonify({'error': 'Valid 10-digit phone required'}), 400
    user = get_db().users.find_one({'phoneDigits': phone}, {'email': 1})
    if not user:
        return jsonify({'error': 'No account found for this phone'}), 404
    return jsonify({'email': user.get('email')})


def _find_or_create_oauth_user(profile: dict) -> tuple[dict, bool]:
    """Return (user_doc, created). Links OAuth to existing email account when possible."""
    db = get_db()
    provider = profile['oauth_provider']
    oauth_id = profile['oauth_id']
    email = _normalize_email(profile['email'])

    existing_oauth = db.users.find_one({
        'oauthProvider': provider,
        'oauthId': oauth_id,
    })
    if existing_oauth:
        return existing_oauth, False

    by_email = db.users.find_one({'email': email})
    if by_email:
        db.users.update_one(
            {'_id': by_email['_id']},
            {
                '$set': {
                    'oauthProvider': provider,
                    'oauthId': oauth_id,
                    'emailVerified': True,
                    'updatedAt': _utcnow().isoformat(),
                }
            },
        )
        return db.users.find_one({'_id': by_email['_id']}), False

    first_name = (profile.get('firstName') or '').strip() or email.split('@')[0]
    last_name = (profile.get('lastName') or '').strip()
    user_doc = {
        'email': email,
        'firstName': first_name,
        'lastName': last_name,
        'phone': '',
        'phoneDigits': None,
        'role': 'family',
        'userType': 'renter',
        'emailVerified': bool(profile.get('emailVerified', True)),
        'phoneVerified': False,
        'profileComplete': False,
        'onboardingComplete': False,
        'oauthProvider': provider,
        'oauthId': oauth_id,
        'avatarUrl': profile.get('avatarUrl'),
        'address': {
            'street': '',
            'city': '',
            'state': '',
            'zipCode': '',
            'country': 'USA',
        },
        'createdAt': _utcnow().isoformat(),
        'updatedAt': _utcnow().isoformat(),
        'lastLogin': None,
    }
    result = db.users.insert_one(user_doc)
    user_doc['_id'] = result.inserted_id
    return user_doc, True


@auth_bp.route('/oauth', methods=['POST'])
@auth_bp.route('/oauth/<provider>', methods=['POST'])
def oauth_login(provider=None):
    if not ping_db():
        return jsonify({'error': 'Database unavailable. Check MONGODB_URI.'}), 503

    data = request.json or {}
    resolved_provider = (provider or data.get('provider') or '').lower().strip()
    if resolved_provider not in OAUTH_PROVIDERS:
        return jsonify({'error': f'Unsupported provider. Use one of: {", ".join(sorted(OAUTH_PROVIDERS))}'}), 400

    id_token = data.get('idToken') or data.get('id_token')
    access_token = data.get('accessToken') or data.get('access_token')
    if not id_token and not access_token:
        return jsonify({'error': 'idToken or accessToken is required'}), 400

    try:
        profile = verify_oauth_provider(
            resolved_provider,
            id_token=id_token,
            access_token=access_token,
        )
    except OAuthError as exc:
        return jsonify({'error': str(exc)}), 401

    user, _created = _find_or_create_oauth_user(profile)
    db = get_db()
    db.users.update_one(
        {'_id': user['_id']},
        {'$set': {'lastLogin': _utcnow().isoformat(), 'updatedAt': _utcnow().isoformat()}},
    )
    ensure_user_household(user)
    refreshed = db.users.find_one({'_id': user['_id']})
    token = _create_token(str(user['_id']))
    return jsonify({
        'token': token,
        'user': _serialize_user(refreshed),
    })


@auth_bp.route('/health', methods=['GET'])
def auth_health():
    return jsonify({
        'status': 'ok' if ping_db() else 'degraded',
        'mongodb': ping_db(),
    })


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def _send_reset_email(to_email: str, reset_link: str) -> None:
    if not SMTP_USER or not SMTP_PASSWORD:
        print(f'[dev] Password reset link for {to_email}: {reset_link}')
        return
    sender = EMAIL_FROM if EMAIL_FROM else SMTP_USER
    if sender == 'noreply@family-housing-hub.com' and SMTP_USER != 'apikey':
        sender = SMTP_USER
    html = f"""
    <html><body style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Reset your Family Housing Hub password</h2>
      <p>Tap the button below to choose a new password. This link expires in {RESET_TOKEN_HOURS} hour(s).</p>
      <p><a href="{reset_link}" style="background:#6366f1;color:#fff;padding:12px 20px;text-decoration:none;border-radius:8px;">Reset password</a></p>
      <p>Or open this link in the app:<br><code>{reset_link}</code></p>
      <p style="color:#666;font-size:12px;">If you did not request this, you can ignore this email.</p>
    </body></html>
    """
    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Family Housing Hub — Password reset'
    msg['From'] = sender
    msg['To'] = to_email
    msg.attach(MIMEText(html, 'html'))
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
    server.starttls()
    server.login(SMTP_USER, SMTP_PASSWORD)
    server.sendmail(sender, [to_email], msg.as_string())
    server.quit()


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    if not ping_db():
        return jsonify({'error': 'Database unavailable'}), 503

    ok, info = check_auth_rate_limit(request, '/api/auth/forgot-password', increment=True)
    if not ok and info:
        return rate_limit_response(info)

    data = request.json or {}
    email = _normalize_email(data.get('email', ''))
    if not email or '@' not in email:
        return jsonify({'error': 'Valid email is required'}), 400

    db = get_db()
    user = db.users.find_one({'email': email})
    dev_token = None
    if user:
        raw_token = secrets.token_urlsafe(32)
        token_hash = _hash_reset_token(raw_token)
        now = _utcnow()
        db.password_reset_tokens.update_many(
            {'email': email, 'usedAt': None},
            {'$set': {'revokedAt': now}},
        )
        db.password_reset_tokens.insert_one({
            'email': email,
            'userId': str(user['_id']),
            'tokenHash': token_hash,
            'createdAt': now,
            'expiresAt': now + timedelta(hours=RESET_TOKEN_HOURS),
            'usedAt': None,
            'revokedAt': None,
        })
        reset_link = f'{RESET_LINK_BASE}/{raw_token}'
        try:
            from job_queue import enqueue
            from tasks import send_password_reset_email_task

            enqueue(send_password_reset_email_task, email, reset_link)
        except Exception as exc:
            print(f'Password reset email queue failed for {email}: {exc}')
            try:
                _send_reset_email(email, reset_link)
            except Exception as inner:
                print(f'Password reset email failed for {email}: {inner}')
        if os.getenv('FLASK_ENV') == 'development' or not (SMTP_USER and SMTP_PASSWORD):
            dev_token = raw_token

    payload = {
        'success': True,
        'message': 'If an account exists for that email, a reset link has been sent.',
    }
    if dev_token:
        payload['devResetLink'] = f'{RESET_LINK_BASE}/{dev_token}'
    return jsonify(payload)


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    if not ping_db():
        return jsonify({'error': 'Database unavailable'}), 503

    data = request.json or {}
    token = (data.get('token') or '').strip()
    password = data.get('password') or data.get('newPassword') or ''
    pw_err = _validate_password(password)
    if not token:
        return jsonify({'error': 'Reset token is required'}), 400
    if pw_err:
        return jsonify({'error': pw_err}), 400

    db = get_db()
    token_hash = _hash_reset_token(token)
    record = db.password_reset_tokens.find_one({'tokenHash': token_hash, 'usedAt': None})
    if not record:
        return jsonify({'error': 'Invalid or expired reset link'}), 400
    expires_at = record.get('expiresAt')
    if expires_at:
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        if isinstance(expires_at, datetime) and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < _utcnow():
            return jsonify({'error': 'Reset link has expired'}), 400

    user = db.users.find_one({'_id': ObjectId(record['userId'])})
    if not user:
        return jsonify({'error': 'Account not found'}), 404

    db.users.update_one(
        {'_id': user['_id']},
        {'$set': {'passwordHash': _hash_password(password), 'updatedAt': _utcnow().isoformat()}},
    )
    now = _utcnow()
    db.password_reset_tokens.update_one({'_id': record['_id']}, {'$set': {'usedAt': now}})
    db.password_reset_tokens.update_many(
        {'userId': record['userId'], 'usedAt': None},
        {'$set': {'revokedAt': now}},
    )
    return jsonify({'success': True, 'message': 'Password updated. You can sign in now.'})
