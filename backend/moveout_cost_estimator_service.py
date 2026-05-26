"""Move-out security deposit deduction estimator with Monte Carlo simulation."""
from __future__ import annotations

import random
from datetime import datetime, timezone

DEPRECIATION_YEARS = {
    'carpet': 7,
    'paint': 5,
    'appliance': 10,
    'blind': 7,
    'fixture': 10,
    'wall': 5,
    'floor': 7,
    'default': 7,
}


def _item_type(task: str, room: str, notes: str = '') -> str:
    text = f'{task} {room} {notes}'.lower()
    for key in DEPRECIATION_YEARS:
        if key in text:
            return key
    if 'blind' in text or 'shade' in text:
        return 'blind'
    if 'paint' in text or 'wall' in text:
        return 'paint'
    return 'default'


def _base_damage_cost(item_type: str, severity: str = 'moderate') -> float:
    bases = {
        'carpet': 180,
        'paint': 120,
        'blind': 85,
        'appliance': 220,
        'fixture': 95,
        'default': 100,
    }
    mult = {'minor': 0.6, 'moderate': 1.0, 'major': 1.6}.get(severity, 1.0)
    return bases.get(item_type, 100) * mult


def _depreciation_factor(item_type: str, age_years: float) -> float:
    life = DEPRECIATION_YEARS.get(item_type, 7)
    return max(0.15, 1.0 - (age_years / life))


def estimate_checklist_deductions(checklist_items: list) -> tuple[list[dict], float]:
    items = []
    total = 0.0
    for item in checklist_items:
        condition = (item.get('condition') or '').lower()
        verified = item.get('verified', item.get('completed', True))
        if condition not in ('damaged', 'poor', 'broken') and verified is not False:
            if item.get('status') not in ('damaged', 'not_verified'):
                continue
        if condition in ('', 'good', 'ok') and verified is not False:
            continue

        item_type = _item_type(item.get('task', ''), item.get('room', ''), item.get('notes', ''))
        age = float(item.get('ageYears', item.get('yearsOld', 2)))
        severity = item.get('severity', 'moderate')
        base = _base_damage_cost(item_type, severity)
        dep = _depreciation_factor(item_type, age)
        est = round(base * dep, 2)
        total += est
        label = f"{item.get('task', 'Item')} ({item.get('room', 'unit')})"
        items.append({
            'label': label,
            'itemType': item_type,
            'estimatedDeduction': est,
            'fixable': True,
            'severity': severity,
        })
    return items, total


def estimate_maintenance_penalty(maintenance_items: list) -> tuple[list[dict], float]:
    penalties = []
    total = 0.0
    for m in maintenance_items:
        if not m.get('tenantCaused') and m.get('cause') != 'tenant':
            continue
        amt = float(m.get('estimatedCost', m.get('deductionEstimate', 150)))
        total += amt
        penalties.append({
            'label': m.get('title', 'Maintenance issue'),
            'estimatedDeduction': amt,
            'fixable': bool(m.get('fixable', True)),
        })
    return penalties, total


def monte_carlo_deposit_estimate(
    base_deduction: float,
    checklist_items: list,
    maintenance_items: list,
    deposit_amount: float = 2400.0,
    simulations: int = 1000,
) -> dict:
    fixable = []
    for it in checklist_items:
        if isinstance(it, dict) and it.get('fixable'):
            fixable.append(it.get('label', it.get('task', 'Item')))
    for m in maintenance_items:
        if isinstance(m, dict) and m.get('fixable'):
            fixable.append(m.get('label', m.get('title', 'Issue')))

    if base_deduction <= 0 and not fixable:
        return {
            'depositAmount': deposit_amount,
            'lowEstimate': 0,
            'midEstimate': 0,
            'highEstimate': 0,
            'fixableItems': [],
            'message': f'Based on your move-in checklist and maintenance history, we estimate your landlord may deduct little to nothing from your ${deposit_amount:,.0f} deposit.',
        }

    samples = []
    for _ in range(simulations):
        noise = random.uniform(0.85, 1.45)
        extra = sum(random.uniform(35, 150) for _ in range(max(1, len(fixable)))) * 0.2
        samples.append(max(0, base_deduction * noise + extra))

    samples.sort()
    low = round(samples[int(simulations * 0.10)], 0)
    mid = round(samples[int(simulations * 0.50)], 0)
    high = round(samples[int(simulations * 0.90)], 0)

    fix_list = fixable[:5]
    fix_text = ', '.join(fix_list) if fix_list else 'none flagged'
    message = (
        f'Based on your move-in checklist and maintenance history, we estimate your landlord may deduct '
        f'between ${low:,.0f} and ${high:,.0f} from your ${deposit_amount:,.0f} deposit. '
        f'Most likely deduction: ${mid:,.0f}. '
        f'Items to fix before moving out: {fix_text}.'
    )

    return {
        'depositAmount': deposit_amount,
        'lowEstimate': low,
        'midEstimate': mid,
        'highEstimate': high,
        'simulations': simulations,
        'fixableItems': fix_list,
        'message': message,
    }


def build_moveout_estimate(checklist_items: list, maintenance_items: list, deposit_amount: float = 2400.0) -> dict:
    checklist_damages, checklist_total = estimate_checklist_deductions(checklist_items)
    maint_penalties, maint_total = estimate_maintenance_penalty(maintenance_items)
    base = checklist_total + maint_total
    mc = monte_carlo_deposit_estimate(base, checklist_damages, maint_penalties, deposit_amount)
    return {
        **mc,
        'checklistDeductions': checklist_damages,
        'maintenancePenalties': maint_penalties,
        'baseDeduction': round(base, 2),
    }
