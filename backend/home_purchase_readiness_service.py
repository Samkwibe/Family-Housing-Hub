"""Home purchase readiness composite score (0–100) with timeline projection."""
from __future__ import annotations

from datetime import datetime, timezone

from savings_optimizer_service import optimize_savings_allocation


def _band(score: float) -> str:
    if score <= 40:
        return 'Not ready'
    if score <= 60:
        return 'Building'
    if score <= 80:
        return 'Getting close'
    return 'Ready'


def _credit_factor(score: int | None) -> dict:
    if score is None:
        return {'score': 0, 'label': 'Credit score', 'detail': 'No credit data yet', 'tip': 'Add rent payments to build credit history'}
    s = int(score)
    if s >= 740:
        pts = 95
    elif s >= 720:
        pts = 70
    elif s >= 700:
        pts = 82
    elif s >= 660:
        pts = 68
    elif s >= 620:
        pts = 52
    else:
        pts = max(10, int((s - 300) / 5.5))
    return {
        'score': pts,
        'label': 'Credit score estimate',
        'detail': f'Estimated score {s}',
        'tip': 'Keep rent reporting on and pay down revolving balances' if pts < 80 else 'Strong credit — maintain on-time payments',
    }


def _savings_factor(goals: list, savings_plan: dict | None) -> dict:
    deposit = None
    for g in goals:
        title = (g.get('title') or '').lower()
        if any(k in title for k in ('deposit', 'down payment', 'security deposit', 'home fund')):
            deposit = g
            break
    if not deposit and goals:
        deposit = max(goals, key=lambda g: float(g.get('targetAmount', 0)))

    if not deposit:
        return {'score': 0, 'label': 'Down payment savings', 'detail': 'No savings goal set', 'tip': 'Create a down payment goal in Budget'}

    target = float(deposit.get('targetAmount', 0))
    saved = float(deposit.get('savedAmount', 0))
    pct = int(round((saved / target) * 100)) if target > 0 else 0
    pts = min(100, pct)
    monthly = 0.0
    if savings_plan:
        for a in savings_plan.get('allocations', []):
            if a.get('goalId') == str(deposit.get('_id', deposit.get('id', ''))):
                monthly = float(a.get('monthlyAllocation', 0))
            elif deposit.get('title') and a.get('title') == deposit.get('title'):
                monthly = float(a.get('monthlyAllocation', 0))

    remaining = max(0.0, target - saved)
    months_to_goal = round(remaining / monthly, 1) if monthly > 0 else None
    return {
        'score': pts,
        'label': 'Down payment savings',
        'detail': f'{pct}% of ${target:,.0f} goal saved',
        'tip': f'Increase monthly savings toward deposit' if pct < 80 else 'On track for down payment',
        'progressPct': pct,
        'monthlySavingsRate': monthly,
        'monthsToGoal': months_to_goal,
        'goalTitle': deposit.get('title', 'Down payment'),
    }


def _income_stability_factor(income_history: list, profile: dict) -> dict:
    months = len(income_history)
    if months == 0 and profile.get('monthlyGrossIncome'):
        months = int(profile.get('incomeStabilityMonths', 0)) or 1
    if months >= 12:
        pts = 95
    elif months >= 6:
        pts = 58
    elif months >= 3:
        pts = 48
    elif months >= 1:
        pts = 25
    else:
        pts = 0
    return {
        'score': pts,
        'label': 'Income stability',
        'detail': f'{months} month(s) of consistent income recorded',
        'tip': 'Log income monthly for 6+ months to strengthen this factor' if months < 6 else 'Stable income history',
        'monthsRecorded': months,
    }


def _dti_factor(income: float, debt_payments: float) -> dict:
    if income <= 0:
        return {'score': 0, 'label': 'Debt-to-income', 'detail': 'Income not set', 'tip': 'Add monthly income in Budget', 'dtiPct': None}
    dti = (debt_payments / income) * 100
    if dti <= 20:
        pts = 95
    elif dti <= 28:
        pts = 76
    elif dti <= 36:
        pts = 65
    elif dti <= 43:
        pts = 40
    else:
        pts = max(5, int(100 - dti))
    return {
        'score': pts,
        'label': 'Debt-to-income ratio',
        'detail': f'DTI {dti:.0f}%',
        'tip': 'Pay down debt to get DTI below 36%' if dti > 36 else 'Healthy DTI for mortgage qualification',
        'dtiPct': round(dti, 1),
    }


def _rent_history_factor(rent_expenses: list, on_time_months: int | None = None) -> dict:
    if on_time_months is not None:
        months = on_time_months
    else:
        months = sum(1 for e in rent_expenses if e.get('paid'))
    if months >= 24:
        pts = 100
    elif months >= 18:
        pts = 86
    elif months >= 12:
        pts = 78
    elif months >= 6:
        pts = 55
    elif months >= 1:
        pts = 30
    else:
        pts = 0
    return {
        'score': pts,
        'label': 'Rent payment history',
        'detail': f'{months} on-time rent payment(s) recorded',
        'tip': 'Keep paying rent on time — it builds your readiness profile' if months < 12 else 'Strong rent payment track record',
        'onTimeMonths': months,
    }


def compute_home_readiness(
    *,
    credit_score: int | None,
    goals: list,
    income_history: list,
    profile: dict,
    monthly_income: float,
    debt_payments: float,
    rent_expenses: list,
    monthly_surplus: float = 0,
    on_time_rent_months: int | None = None,
) -> dict:
    savings_plan = optimize_savings_allocation(goals, monthly_surplus) if goals else None
    factors = {
        'credit': _credit_factor(credit_score),
        'savings': _savings_factor(goals, savings_plan),
        'incomeStability': _income_stability_factor(income_history, profile),
        'dti': _dti_factor(monthly_income, debt_payments),
        'rentHistory': _rent_history_factor(rent_expenses, on_time_rent_months),
    }
    weights = {'credit': 0.30, 'savings': 0.25, 'incomeStability': 0.20, 'dti': 0.15, 'rentHistory': 0.10}
    composite = round(sum(factors[k]['score'] * weights[k] for k in weights), 1)
    band = _band(composite)

    savings = factors['savings']
    months = savings.get('monthsToGoal')
    monthly_rate = savings.get('monthlySavingsRate', 0)
    goal_title = savings.get('goalTitle', 'deposit goal')

    if months is not None and monthly_rate > 0:
        timeline = f'At your current savings rate of ${monthly_rate:,.0f}/mo toward your {goal_title.lower()}, you could be ready to buy in approximately {months} months.'
    elif composite >= 81:
        timeline = 'You appear ready to speak with a lender about pre-approval.'
    else:
        timeline = 'Increase savings rate and credit score to shorten your timeline to homeownership.'

    message = f'Your home readiness score is {int(round(composite))}/100 ({band}). {timeline}'

    return {
        'score': composite,
        'band': band,
        'message': message,
        'timelineMonths': months,
        'monthlySavingsRate': monthly_rate,
        'factors': [{
            'key': k,
            'weightPct': int(weights[k] * 100),
            **factors[k],
        } for k in ('credit', 'savings', 'incomeStability', 'dti', 'rentHistory')],
        'recommendation': (
            'Focus on credit and savings' if composite <= 40 else
            'Stay consistent — you are building momentum' if composite <= 60 else
            'Start exploring markets and mortgage options' if composite <= 80 else
            'Consider speaking with a lender for pre-approval'
        ),
    }
