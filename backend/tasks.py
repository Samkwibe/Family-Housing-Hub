"""Background jobs — email, AI tips, forecasting, anomalies, automation."""
from __future__ import annotations

import os
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from celery_app import celery_app
from redis_service import cache_get_json, cache_set_json, is_redis_available

SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
SMTP_USER = os.getenv('SMTP_USER')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')
EMAIL_FROM = os.getenv('EMAIL_FROM', SMTP_USER or 'noreply@family-housing-hub.com')

AI_TIPS_TTL = 3600


def _send_smtp(to_email: str, subject: str, html: str) -> None:
    if not (SMTP_USER and SMTP_PASSWORD):
        print(f'[celery] email skipped (no SMTP): {to_email} — {subject}')
        return
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = EMAIL_FROM
    msg['To'] = to_email
    msg.attach(MIMEText(html, 'html'))
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
    server.starttls()
    server.login(SMTP_USER, SMTP_PASSWORD)
    server.sendmail(EMAIL_FROM, [to_email], msg.as_string())
    server.quit()
    print(f'[celery] email sent to {to_email}: {subject}')


@celery_app.task(name='tasks.send_email')
def send_email_task(to_email: str, subject: str, html: str) -> dict:
    _send_smtp(to_email, subject, html)
    return {'ok': True, 'to': to_email}


@celery_app.task(name='tasks.send_password_reset_email')
def send_password_reset_email_task(to_email: str, reset_link: str) -> dict:
    html = f'<p>Reset your password: <a href="{reset_link}">{reset_link}</a></p>'
    _send_smtp(to_email, 'Family Housing Hub — Password reset', html)
    return {'ok': True}


@celery_app.task(name='tasks.send_household_invite_email')
def send_household_invite_email_task(to_email: str, subject: str, html: str) -> dict:
    _send_smtp(to_email, subject, html)
    return {'ok': True}


@celery_app.task(name='tasks.send_push_notification')
def send_push_notification_task(user_id: str, title: str, body: str, data: dict | None = None) -> dict:
    from push_service import send_push_to_user

    result = send_push_to_user(user_id, title, body, data)
    return {'ok': result.get('ok', False), 'userId': user_id, **result}


@celery_app.task(name='tasks.generate_ai_tips')
def generate_ai_tips_task(household_id: str, user_id: str) -> dict:
    from bson import ObjectId

    from database import get_db
    from household_context_builder import build_rag_household_context

    db = get_db()
    user = db.users.find_one({'_id': ObjectId(user_id)})
    if not user:
        return {'ok': False, 'error': 'user not found'}

    tips_key = f'ai_tips:{household_id}'
    try:
        rag = build_rag_household_context(user)
        context = rag.get('contextText', '') if isinstance(rag, dict) else str(rag)
        tips = _generate_tips_from_context(context)
        cache_set_json(tips_key, {'tips': tips, 'generatedAt': datetime.now(timezone.utc).isoformat()}, AI_TIPS_TTL)
        return {'ok': True, 'count': len(tips)}
    except Exception as exc:
        print(f'[celery] AI tips failed: {exc}')
        return {'ok': False, 'error': str(exc)}


def _generate_tips_from_context(context: str) -> list[str]:
    """Generate contextual tips with rule-based fallback."""
    try:
        from ai_text_service import generate_ai_text

        prompt = (
            'Based on this household context, return exactly 4 short actionable tips '
            '(one sentence each, no numbering):\n\n' + (context or 'No context available.')
        )
        text = generate_ai_text(prompt, max_tokens=300)
        lines = [ln.strip().lstrip('0123456789.-) ') for ln in (text or '').split('\n') if ln.strip()]
        if lines:
            return lines[:4]
    except Exception as exc:
        print(f'[celery] AI tips generation error: {exc}')
    return _fallback_tips(context)


def _fallback_tips(context: str) -> list[str]:
    tips = ['Review upcoming bills and mark paid items to keep your health score high.']
    if 'expir' in (context or '').lower():
        tips.append('Use expiring fridge items this week to reduce food waste.')
    if 'chore' in (context or '').lower():
        tips.append('Complete pending chores to improve household coordination.')
    tips.append('Check automation rules for smart replenishment suggestions.')
    return tips[:4]


def get_cached_ai_tips(household_id: str) -> list[str] | None:
    cached = cache_get_json(f'ai_tips:{household_id}')
    if cached and cached.get('tips'):
        return cached['tips']
    return None


@celery_app.task(name='tasks.run_bill_forecast')
def run_bill_forecast_task(household_id: str) -> dict:
    from bill_forecast_service import build_bill_forecast
    from database import get_db

    db = get_db()
    expenses = list(db.expenses.find({'householdId': household_id}))
    forecast = build_bill_forecast(expenses)
    cache_set_json(f'bill_forecast:{household_id}', forecast, 3600)
    return {'ok': True, 'householdId': household_id}


@celery_app.task(name='tasks.detect_spending_anomaly')
def detect_spending_anomaly_task(household_id: str, expense_id: str) -> dict:
    from database import get_db
    from spending_anomaly_service import detect_spending_anomalies

    db = get_db()
    expenses = list(db.expenses.find({'householdId': household_id}))
    anomalies = detect_spending_anomalies(expenses, focus_expense_id=expense_id)
    if anomalies:
        cache_set_json(f'anomaly:{household_id}:{expense_id}', anomalies[0], 86400)
    return {'ok': True, 'anomalies': len(anomalies)}


@celery_app.task(name='tasks.run_automation_engine')
def run_automation_engine_task() -> dict:
    from automation_engine import run_all_households
    from database import get_db
    from replenishment_service import run_replenishment_for_household

    db = get_db()
    count = run_all_households(db)
    for hh in db.households.find({}, {'_id': 1}):
        run_replenishment_for_household(db, str(hh['_id']))
    return {'ok': True, 'householdsProcessed': count}


@celery_app.task(name='tasks.run_recurring_chores')
def run_recurring_chores_task() -> dict:
    import time
    from database import get_db
    from recurring_chore_service import run_recurring_chore_maintenance

    start = time.perf_counter()
    try:
        db = get_db()
        result = run_recurring_chore_maintenance(db)
        from observability_service import trace_celery_task
        trace_celery_task('run_recurring_chores', duration_ms=(time.perf_counter() - start) * 1000, success=True, result=result)
        print(f'[celery] recurring chores: {result}')
        return {'ok': True, **result}
    except Exception as exc:
        from observability_service import trace_celery_task
        trace_celery_task('run_recurring_chores', duration_ms=(time.perf_counter() - start) * 1000, success=False, result={'error': str(exc)})
        raise


@celery_app.task(name='tasks.run_hourly_automation')
def run_hourly_automation_task() -> dict:
    run_recurring_chores_task()
    return run_automation_engine_task()
