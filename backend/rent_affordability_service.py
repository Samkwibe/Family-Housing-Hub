"""Rent affordability — 30% rule and debt-to-income."""
from __future__ import annotations


def calculate_rent_affordability(
    monthly_gross_income: float,
    monthly_debt_payments: float = 0.0,
) -> dict:
    if monthly_gross_income <= 0:
        return {
            'configured': False,
            'message': 'Add your monthly income in Budget settings to see what rent you can afford.',
            'maxRent': None,
            'rule30Pct': None,
            'ruleDti': None,
            'recommendedMax': None,
            'method': None,
        }

    rule_30 = round(monthly_gross_income * 0.30, 2)
    rule_dti = round(max(0.0, monthly_gross_income * 0.36 - monthly_debt_payments), 2)
    recommended = min(rule_30, rule_dti)
    limiting = '30% rule' if rule_30 <= rule_dti else 'debt-to-income'

    return {
        'configured': True,
        'monthlyGrossIncome': round(monthly_gross_income, 2),
        'monthlyDebtPayments': round(monthly_debt_payments, 2),
        'rule30Pct': rule_30,
        'ruleDti': rule_dti,
        'recommendedMax': recommended,
        'limitingMethod': limiting,
        'message': (
            f"Based on ${monthly_gross_income:,.0f}/mo income, you can afford up to "
            f"${recommended:,.0f}/mo rent ({limiting} is the tighter constraint)."
        ),
    }


def filter_properties_by_affordability(properties: list, max_rent: float | None) -> list:
    if not max_rent or max_rent <= 0:
        return properties
    filtered = []
    for p in properties:
        price = p.get('price') or p.get('rent') or p.get('listPrice')
        try:
            val = float(price)
        except (TypeError, ValueError):
            filtered.append(p)
            continue
        if val <= max_rent:
            filtered.append(p)
    return filtered
