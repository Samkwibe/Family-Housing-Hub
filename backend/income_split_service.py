"""Income-proportional bill splitting — private income, shared percentages only."""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId

from database import get_db
from encryption_service import decrypt_value, encrypt_value, is_encrypted


def _utcnow():
    return datetime.now(timezone.utc)


def _read_income(doc) -> float | None:
    if not doc:
        return None
    raw = doc.get('monthlyIncome')
    if raw is None:
        return None
    if isinstance(raw, str):
        if is_encrypted(raw):
            raw = decrypt_value(raw)
        return float(raw)
    return float(raw)


def set_member_income(user_id: str, household_id: str, monthly_income: float) -> None:
    db = get_db()
    db.household_member_income.update_one(
        {'userId': user_id, 'householdId': household_id},
        {'$set': {
            'monthlyIncome': encrypt_value(str(float(monthly_income))),
            'updatedAt': _utcnow(),
        }},
        upsert=True,
    )


def get_member_income(user_id: str, household_id: str) -> float | None:
    db = get_db()
    doc = db.household_member_income.find_one({'userId': user_id, 'householdId': household_id})
    return _read_income(doc)


def compute_income_shares(household_id: str) -> dict:
    db = get_db()
    members = list(db.household_members.find({'householdId': household_id, 'status': 'active'}))
    incomes = {}
    for m in members:
        uid = m['userId']
        inc = get_member_income(uid, household_id)
        if inc and inc > 0:
            incomes[uid] = inc

    total = sum(incomes.values())
    if total <= 0 or len(incomes) < 2:
        return {
            'ready': False,
            'message': 'All household members must enter their private income to enable proportional splits.',
            'shares': {},
            'totalIncome': total,
        }

    shares = {uid: round(inc / total * 100, 1) for uid, inc in incomes.items()}
    return {
        'ready': True,
        'shares': shares,
        'totalIncome': total,
        'memberCount': len(incomes),
        'message': 'Income-proportional split is ready. Percentages are shared; raw income stays private.',
    }


def get_split_agreement(household_id: str) -> dict | None:
    db = get_db()
    return db.household_split_agreements.find_one({'householdId': household_id})


def propose_income_split(household_id: str, user_id: str) -> dict:
    share_data = compute_income_shares(household_id)
    if not share_data['ready']:
        return share_data

    db = get_db()
    members = list(db.household_members.find({'householdId': household_id, 'status': 'active'}))
    member_ids = [m['userId'] for m in members]

    db.household_split_agreements.update_one(
        {'householdId': household_id},
        {'$set': {
            'method': 'income_proportional',
            'shares': share_data['shares'],
            'agreedBy': [],
            'status': 'pending',
            'requestedRenegotiationBy': None,
            'updatedAt': _utcnow(),
            'proposedBy': user_id,
        }},
        upsert=True,
    )
    return {**share_data, 'status': 'pending', 'agreedBy': [], 'needsAgreementFrom': member_ids}


def agree_to_split(household_id: str, user_id: str) -> dict:
    db = get_db()
    agreement = get_split_agreement(household_id)
    if not agreement:
        return {'error': 'No split agreement pending'}

    agreed = list(set(agreement.get('agreedBy', []) + [user_id]))
    members = list(db.household_members.find({'householdId': household_id, 'status': 'active'}))
    member_ids = [m['userId'] for m in members]
    all_agreed = all(uid in agreed for uid in member_ids)

    status = 'active' if all_agreed else 'pending'
    db.household_split_agreements.update_one(
        {'householdId': household_id},
        {'$set': {'agreedBy': agreed, 'status': status, 'lockedAt': _utcnow() if all_agreed else None}},
    )
    return {
        'status': status,
        'shares': agreement.get('shares', {}),
        'agreedBy': agreed,
        'locked': all_agreed,
    }


def request_split_renegotiation(household_id: str, user_id: str) -> dict:
    db = get_db()
    db.household_split_agreements.update_one(
        {'householdId': household_id},
        {'$set': {
            'status': 'renegotiation',
            'agreedBy': [],
            'requestedRenegotiationBy': user_id,
            'updatedAt': _utcnow(),
        }},
    )
    return {'status': 'renegotiation', 'message': 'Split re-negotiation requested. All members must re-agree.'}


def apply_split_to_amount(household_id: str, amount: float, member_names: dict) -> list[dict]:
    """Return split lines with amounts — no raw income exposed."""
    agreement = get_split_agreement(household_id)
    if not agreement or agreement.get('status') != 'active':
        return []

    shares = agreement.get('shares', {})
    splits = []
    for uid, pct in shares.items():
        try:
            user = get_db().users.find_one({'_id': ObjectId(uid)})
        except Exception:
            user = None
        name = member_names.get(uid) or (f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() if user else 'Member')
        splits.append({
            'userId': uid,
            'name': name,
            'sharePct': pct,
            'amount': round(amount * pct / 100, 2),
            'paid': False,
        })
    return splits
