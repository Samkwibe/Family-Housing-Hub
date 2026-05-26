"""Rent market price predictor — linear regression on historical ZIP rent data."""
from __future__ import annotations

from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

# Seeded dataset — monthly median rent by ZIP (populated via seed script / API)
DEFAULT_ZIP_HISTORY = {}


def _parse_month(key: str) -> datetime:
    return datetime.strptime(key + '-01', '%Y-%m-%d').replace(tzinfo=timezone.utc)


def _linear_regression(months_x: list[float], rents_y: list[float]) -> dict:
    if not HAS_NUMPY or len(months_x) < 3:
        n = len(rents_y)
        slope = (rents_y[-1] - rents_y[0]) / max(n - 1, 1) if n > 1 else 0
        intercept = rents_y[-1] - slope * (n - 1)
        return {'slope': slope, 'intercept': intercept, 'r2': 0.5}

    x = np.array(months_x, dtype=float)
    y = np.array(rents_y, dtype=float)
    A = np.vstack([x, np.ones(len(x))]).T
    slope, intercept = np.linalg.lstsq(A, y, rcond=None)[0]
    pred = slope * x + intercept
    ss_res = np.sum((y - pred) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r2 = float(1 - ss_res / ss_tot) if ss_tot > 0 else 0.0
    residuals = y - pred
    std_err = float(np.std(residuals, ddof=2)) if len(residuals) > 2 else float(np.std(residuals))
    return {'slope': float(slope), 'intercept': float(intercept), 'r2': r2, 'stdErr': std_err}


def _trend_label(slope: float, current: float) -> tuple[str, float]:
    if current <= 0:
        return 'stable', 0.0
    pct = (slope * 6 / current) * 100
    if abs(pct) < 1.5:
        return 'stable', round(pct, 1)
    if pct > 0:
        return 'rising', round(pct, 1)
    return 'falling', round(abs(pct), 1)


def predict_rent_market(
    zip_code: str,
    history_records: list[dict],
    city_history: list[dict] | None = None,
    state_history: list[dict] | None = None,
) -> dict:
    zip_code = (zip_code or '').strip()[:5]
    records = [r for r in history_records if str(r.get('zipCode', r.get('zip', ''))).startswith(zip_code)]
    fallback_level = 'zip'
    if not records and city_history:
        records = city_history
        fallback_level = 'city'
    if not records and state_history:
        records = state_history
        fallback_level = 'state'
    if not records:
        return {
            'zipCode': zip_code,
            'available': False,
            'message': 'Not enough local data for this ZIP. Add your address or try again after market data is seeded.',
        }

    records.sort(key=lambda r: r.get('yearMonth', ''))
    months_x = []
    rents_y = []
    for i, r in enumerate(records):
        months_x.append(float(i))
        rents_y.append(float(r.get('medianRent', r.get('rent', 0))))

    reg = _linear_regression(months_x, rents_y)
    current = rents_y[-1]
    future_x = len(rents_y) - 1 + 6
    projected = reg['slope'] * future_x + reg['intercept']
    std_err = reg.get('stdErr', current * 0.03)
    ci_margin = 1.96 * std_err * (1 + 6 / max(len(rents_y), 1)) ** 0.5
    low = max(0, projected - ci_margin)
    high = projected + ci_margin
    trend, trend_pct = _trend_label(reg['slope'], current)

    savings = max(0, projected - current)
    if trend == 'rising':
        rec = (
            f'Rents in your area are trending up {trend_pct}% over 6 months. '
            f'Locking in your current lease now could save you an estimated ${savings:,.0f}/mo '
            f'compared to renewing in 6 months.'
        )
    elif trend == 'falling':
        rec = (
            f'Rents in your area are trending down {trend_pct}% over 6 months. '
            f'You may have room to negotiate on renewal.'
        )
    else:
        rec = 'Rents in your area are stable. Compare renewal terms before deciding to lock in early.'

    return {
        'zipCode': zip_code,
        'available': True,
        'dataLevel': fallback_level,
        'currentMedianRent': round(current, 0),
        'projectedRent6Mo': round(projected, 0),
        'confidenceInterval': {
            'low': round(low, 0),
            'high': round(high, 0),
        },
        'trend': trend,
        'trendPct6Mo': trend_pct,
        'slopePerMonth': round(reg['slope'], 2),
        'r2': round(reg.get('r2', 0), 3),
        'monthsOfHistory': len(rents_y),
        'recommendation': rec,
        'message': (
            f'Current median rent for ZIP {zip_code}: ${current:,.0f}. '
            f'Projected rent in 6 months: ${projected:,.0f} '
            f'(95% CI: ${low:,.0f}–${high:,.0f}). Trend: {trend} ({trend_pct:+.1f}%).'
        ),
    }
