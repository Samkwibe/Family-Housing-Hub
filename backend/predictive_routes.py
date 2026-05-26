"""Round 6 predictive feature routes."""
from flask import Blueprint, jsonify, request

from auth_routes import get_current_user_doc
from database import get_db
from home_purchase_readiness_service import compute_home_readiness
from household_service import ensure_user_household
from moveout_cost_estimator_service import build_moveout_estimate
from rent_market_predictor_service import predict_rent_market
from financial_routes import _monthly_surplus, _debt_payments, _get_profile

predictive_bp = Blueprint('predictive', __name__, url_prefix='/api/household')


def _require_user():
    user = get_current_user_doc()
    if not user:
        return None, (jsonify({'error': 'Authentication required'}), 401)
    return user, None


def _hid(user) -> str:
    return ensure_user_household(user)


def _scope(user) -> dict:
    return {'householdId': _hid(user)}


def _user_zip(user) -> str:
    addr = user.get('address') or {}
    z = (addr.get('zipCode') or addr.get('zip') or '').strip()
    return z[:5] if z else ''


@predictive_bp.route('/purchase-readiness', methods=['GET'])
def purchase_readiness():
    user, err = _require_user()
    if err:
        return err
    db = get_db()
    hid = _hid(user)
    expenses = list(db.expenses.find(_scope(user)))
    goals = list(db.financial_goals.find(_scope(user)))
    profile = _get_profile(db, hid)
    credit_settings = db.credit_settings.find_one(_scope(user)) or {}
    income_history = list(db.income_history.find({'householdId': hid}).sort('yearMonth', 1))

    credit_summary_score = credit_settings.get('estimatedScore')
    if credit_summary_score is None:
        from household_routes import _build_credit_summary
        credit_summary_score = _build_credit_summary(expenses, credit_settings).get('estimatedScore')

    monthly_income = float(profile.get('monthlyGrossIncome', 0))
    if not monthly_income:
        monthly_income = float(get_member_income_safe(db, str(user['_id']), hid) or 0)

    on_time = profile.get('onTimeRentMonths')
    if on_time is None:
        on_time = sum(1 for e in expenses if e.get('category') == 'rent' and e.get('paid'))

    readiness = compute_home_readiness(
        credit_score=int(credit_summary_score) if credit_summary_score else None,
        goals=goals,
        income_history=income_history,
        profile=profile,
        monthly_income=monthly_income,
        debt_payments=_debt_payments(expenses),
        rent_expenses=[e for e in expenses if e.get('category') == 'rent'],
        monthly_surplus=_monthly_surplus(expenses, profile),
        on_time_rent_months=int(on_time) if on_time else None,
    )
    return jsonify({'purchaseReadiness': readiness})


def get_member_income_safe(db, uid, hid):
    doc = db.household_member_income.find_one({'userId': uid, 'householdId': hid})
    return doc.get('monthlyIncome') if doc else None


@predictive_bp.route('/moveout-estimate', methods=['GET'])
def moveout_estimate():
    user, err = _require_user()
    if err:
        return err
    db = get_db()
    checklist = list(db.checklist_items.find({**_scope(user), 'checklistType': 'move-in'}))
    maintenance = list(db.maintenance.find(_scope(user)))
    lease = db.documents.find_one({**_scope(user), 'category': 'lease'})
    deposit = 2400.0
    if lease and lease.get('securityDeposit'):
        deposit = float(lease['securityDeposit'])
    notes = (lease or {}).get('notes', '')
    if 'deposit' in notes.lower():
        import re
        m = re.search(r'\$?\s*([\d,]+)', notes)
        if m:
            deposit = float(m.group(1).replace(',', ''))

    estimate = build_moveout_estimate(checklist, maintenance, deposit)
    return jsonify({'moveoutEstimate': estimate})


@predictive_bp.route('/rent-market', methods=['GET'])
def rent_market():
    user, err = _require_user()
    if err:
        return err
    db = get_db()
    hid = _hid(user)
    zip_code = (request.args.get('zipCode') or _user_zip(user) or '').strip()[:5]
    if not zip_code:
        return jsonify({'error': 'ZIP code required'}), 400

    history = list(db.rent_market_history.find({'zipCode': zip_code}).sort('yearMonth', 1))
    city = (user.get('address') or {}).get('city', '')
    state = (user.get('address') or {}).get('state', '')
    city_hist = list(db.rent_market_history.find({'city': city, 'level': 'city'}).sort('yearMonth', 1)) if city else []
    state_hist = list(db.rent_market_history.find({'state': state, 'level': 'state'}).sort('yearMonth', 1)) if state else []

    prediction = predict_rent_market(zip_code, history, city_hist, state_hist)
    return jsonify({'rentMarket': prediction})


def build_purchase_readiness_summary(db, user, expenses, goals) -> dict | None:
    hid = _hid(user)
    profile = _get_profile(db, hid)
    credit_settings = db.credit_settings.find_one({'householdId': hid}) or {}
    income_history = list(db.income_history.find({'householdId': hid}))
    score_override = credit_settings.get('estimatedScore')
    if score_override is None:
        from household_routes import _build_credit_summary
        score_override = _build_credit_summary(expenses, credit_settings).get('estimatedScore')
    monthly_income = float(profile.get('monthlyGrossIncome', 0)) or float(get_member_income_safe(db, str(user['_id']), hid) or 0)
    on_time = profile.get('onTimeRentMonths') or sum(1 for e in expenses if e.get('category') == 'rent' and e.get('paid'))
    r = compute_home_readiness(
        credit_score=int(score_override) if score_override else None,
        goals=goals,
        income_history=income_history,
        profile=profile,
        monthly_income=monthly_income,
        debt_payments=_debt_payments(expenses),
        rent_expenses=[e for e in expenses if e.get('category') == 'rent'],
        monthly_surplus=_monthly_surplus(expenses, profile),
        on_time_rent_months=int(on_time),
    )
    return {
        'score': r['score'],
        'band': r['band'],
        'message': r['message'],
        'timelineMonths': r.get('timelineMonths'),
    }
