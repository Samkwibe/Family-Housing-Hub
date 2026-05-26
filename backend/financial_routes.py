"""Round 2 financial intelligence API routes."""
from flask import Blueprint, jsonify, request

from auth_routes import get_current_user_doc
from bill_forecast_service import build_bill_forecast
from database import get_db
from household_service import ensure_user_household
from income_split_service import (
    agree_to_split,
    compute_income_shares,
    get_member_income,
    get_split_agreement,
    propose_income_split,
    request_split_renegotiation,
    set_member_income,
)
from rent_affordability_service import calculate_rent_affordability
from savings_optimizer_service import optimize_savings_allocation
from subscription_waste_service import detect_subscription_waste

financial_bp = Blueprint('financial', __name__, url_prefix='/api/household')


def _require_user():
    user = get_current_user_doc()
    if not user:
        return None, (jsonify({'error': 'Authentication required'}), 401)
    return user, None


def _hid(user) -> str:
    return ensure_user_household(user)


def _scope(user) -> dict:
    return {'householdId': _hid(user)}


def _get_profile(db, household_id: str) -> dict:
    return db.household_financial_profiles.find_one({'householdId': household_id}) or {}


def _monthly_surplus(expenses, profile: dict) -> float:
    if profile.get('monthlySurplus'):
        return float(profile['monthlySurplus'])
    income = float(profile.get('monthlyGrossIncome', 0))
    if income <= 0:
        for e in expenses:
            if (e.get('category') or '').lower() == 'income':
                income = max(income, float(e.get('amount', 0)))
    latest: dict[str, float] = {}
    for e in expenses:
        cat = (e.get('category') or '').lower()
        if cat == 'income' or e.get('expectedLargePurchase'):
            continue
        key = f"{cat}::{(e.get('title') or 'bill').strip().lower()}"
        latest[key] = float(e.get('amount', 0))
    fixed = sum(latest.values())
    return max(0.0, income - fixed)


def _debt_payments(expenses) -> float:
    return sum(
        float(e.get('amount', 0))
        for e in expenses
        if (e.get('category') or '').lower() in ('loan', 'debt', 'credit', 'car')
    )


@financial_bp.route('/financial-profile', methods=['GET', 'PATCH'])
def financial_profile():
    user, err = _require_user()
    if err:
        return err
    db = get_db()
    hid = _hid(user)
    if request.method == 'GET':
        profile = _get_profile(db, hid)
        return jsonify({'profile': {
            'monthlyGrossIncome': float(profile.get('monthlyGrossIncome', 0)),
            'currentBalance': float(profile.get('currentBalance', 0)),
        }})

    data = request.json or {}
    updates = {}
    if 'monthlyGrossIncome' in data:
        updates['monthlyGrossIncome'] = float(data['monthlyGrossIncome'])
    if 'currentBalance' in data:
        updates['currentBalance'] = float(data['currentBalance'])
    if 'monthlySurplus' in data:
        updates['monthlySurplus'] = float(data['monthlySurplus'])
    if updates:
        db.household_financial_profiles.update_one(
            {'householdId': hid},
            {'$set': {**updates, 'householdId': hid}},
            upsert=True,
        )
    profile = _get_profile(db, hid)
    return jsonify({'profile': {
        'monthlyGrossIncome': float(profile.get('monthlyGrossIncome', 0)),
        'currentBalance': float(profile.get('currentBalance', 0)),
    }})


@financial_bp.route('/forecast', methods=['GET'])
def cash_flow_forecast():
    user, err = _require_user()
    if err:
        return err
    db = get_db()
    hid = _hid(user)
    expenses = list(db.expenses.find(_scope(user)))
    profile = _get_profile(db, hid)
    return jsonify({'forecast': build_bill_forecast(expenses, profile=profile)})


@financial_bp.route('/savings-plan', methods=['GET'])
def savings_plan():
    user, err = _require_user()
    if err:
        return err
    db = get_db()
    expenses = list(db.expenses.find(_scope(user)))
    goals = list(db.financial_goals.find(_scope(user)))
    profile = _get_profile(db, _hid(user))
    surplus = float(profile.get('monthlySurplus', 0)) or _monthly_surplus(expenses, profile)
    plan = optimize_savings_allocation(goals, surplus)
    return jsonify({'savingsPlan': plan})


@financial_bp.route('/subscription-waste', methods=['GET'])
def subscription_waste():
    user, err = _require_user()
    if err:
        return err
    db = get_db()
    hid = _hid(user)
    expenses = list(db.expenses.find(_scope(user)))
    flags = detect_subscription_waste(expenses, db, hid)
    return jsonify({'subscriptionWaste': flags})


@financial_bp.route('/rent-affordability', methods=['GET'])
def rent_affordability():
    user, err = _require_user()
    if err:
        return err
    db = get_db()
    expenses = list(db.expenses.find(_scope(user)))
    profile = _get_profile(db, _hid(user))
    income = float(profile.get('monthlyGrossIncome', 0))
    result = calculate_rent_affordability(income, _debt_payments(expenses))
    return jsonify({'rentAffordability': result})


@financial_bp.route('/member-income', methods=['GET', 'POST'])
def member_income():
    user, err = _require_user()
    if err:
        return err
    uid = str(user['_id'])
    hid = _hid(user)
    if request.method == 'GET':
        inc = get_member_income(uid, hid)
        return jsonify({'monthlyIncome': inc, 'private': True})
    data = request.json or {}
    income = float(data.get('monthlyIncome', 0))
    if income <= 0:
        return jsonify({'error': 'Valid monthly income required'}), 400
    set_member_income(uid, hid, income)
    return jsonify({'ok': True, 'message': 'Income saved privately. Other members cannot see this amount.'})


@financial_bp.route('/income-split', methods=['GET'])
def income_split_status():
    user, err = _require_user()
    if err:
        return err
    hid = _hid(user)
    shares = compute_income_shares(hid)
    agreement = get_split_agreement(hid)
    uid = str(user['_id'])
    my_income = get_member_income(uid, hid)
    return jsonify({
        'incomeSplit': {
            **shares,
            'agreement': {
                'status': agreement.get('status') if agreement else None,
                'method': agreement.get('method') if agreement else None,
                'shares': agreement.get('shares') if agreement else shares.get('shares'),
                'agreedBy': agreement.get('agreedBy', []) if agreement else [],
                'requestedRenegotiationBy': agreement.get('requestedRenegotiationBy') if agreement else None,
            },
            'myIncomeSet': my_income is not None,
        },
    })


@financial_bp.route('/income-split/propose', methods=['POST'])
def income_split_propose():
    user, err = _require_user()
    if err:
        return err
    result = propose_income_split(_hid(user), str(user['_id']))
    return jsonify({'incomeSplit': result})


@financial_bp.route('/income-split/agree', methods=['POST'])
def income_split_agree():
    user, err = _require_user()
    if err:
        return err
    result = agree_to_split(_hid(user), str(user['_id']))
    return jsonify({'incomeSplit': result})


@financial_bp.route('/income-split/renegotiate', methods=['POST'])
def income_split_renegotiate():
    user, err = _require_user()
    if err:
        return err
    result = request_split_renegotiation(_hid(user), str(user['_id']))
    return jsonify({'incomeSplit': result})


def build_financial_dashboard_bundle(db, user, expenses, goals) -> dict:
    """Aggregate Round 2 data for dashboard payload."""
    hid = _hid(user)
    profile = _get_profile(db, hid)
    forecast = build_bill_forecast(expenses, profile=profile)
    surplus = _monthly_surplus(expenses, profile)
    savings = optimize_savings_allocation(goals, surplus)
    waste = detect_subscription_waste(expenses, db, hid)
    affordability = calculate_rent_affordability(
        float(profile.get('monthlyGrossIncome', 0)),
        _debt_payments(expenses),
    )
    return {
        'forecastSummary': forecast.get('forecastSummary'),
        'cashFlowSummary': forecast.get('summary'),
        'savingsPlan': savings,
        'subscriptionWaste': waste,
        'rentAffordability': affordability,
    }
