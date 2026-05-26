#!/usr/bin/env python3
"""Round 2 demos — forecast, savings, subscriptions, affordability, income split."""
import os
import sys
from datetime import datetime, timedelta, timezone

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
BASE = os.getenv('DEMO_API_BASE', 'http://127.0.0.1:8000')


def auth():
    ts = int(datetime.now().timestamp())
    email = f'round2-{ts}@test.local'
    pw = 'SmokeTest123!'
    r = requests.post(f'{BASE}/api/auth/register', json={
        'email': email, 'password': pw, 'firstName': 'Round', 'lastName': 'Two',
        'userType': 'renter', 'emailVerified': True,
    })
    r.raise_for_status()
    token = r.json()['token']
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


def demo_forecast(H):
    now = datetime.now(timezone.utc)
    requests.patch(f'{BASE}/api/household/financial-profile', headers=H, json={
        'monthlyGrossIncome': 4200, 'currentBalance': 180, 'monthlySurplus': 800,
    })
    utilities = [92, 118, 105]
    for i, amt in enumerate(utilities):
        d = (now - timedelta(days=75 - i * 30)).date().isoformat()
        requests.post(f'{BASE}/api/household/expenses', headers=H, json={
            'title': 'Electricity', 'category': 'utility', 'amount': amt, 'dueDate': d, 'paid': True,
        })
    rent_day = now.replace(day=1) + timedelta(days=32)
    rent_day = rent_day.replace(day=1)
    for m in range(3):
        d = (rent_day - timedelta(days=30 * (2 - m))).date().isoformat()
        requests.post(f'{BASE}/api/household/expenses', headers=H, json={
            'title': 'Rent', 'category': 'rent', 'amount': 2400, 'dueDate': d, 'paid': True,
        })
    next_rent = (now + timedelta(days=5)).date().isoformat()
    requests.post(f'{BASE}/api/household/expenses', headers=H, json={
        'title': 'Rent', 'category': 'rent', 'amount': 2400, 'dueDate': next_rent, 'paid': False,
    })
    next_util = (now + timedelta(days=12)).date().isoformat()
    requests.post(f'{BASE}/api/household/expenses', headers=H, json={
        'title': 'Electricity', 'category': 'utility', 'amount': 138, 'dueDate': next_util, 'paid': False,
    })

    fc = requests.get(f'{BASE}/api/household/forecast', headers=H).json()['forecast']
    print('\n=== ROUND 2 #5 — BILL FORECAST ===')
    print(f"Summary: {fc.get('summary')}")
    print(f"Starting balance: ${fc.get('startingBalance')} | Smoothing: {fc.get('smoothingMode')}")
    for w in fc.get('weeks', []):
        flag = f"  *** {w.get('tightLabel')} ***" if w.get('isTight') else ''
        print(
            f"  Week {w['weekStart']}: income ${w['income']:.0f} | bills ${w['bills']:.0f} | "
            f"net ${w['netCashFlow']:.0f} | balance ${w['runningBalance']:.0f}{flag}"
        )
        for ev in w.get('events', []):
            print(f"    - {ev['name']}: ${ev['projectedAmount']:.0f} due {ev['dueDate']}")
    if not any(w.get('isTight') for w in fc.get('weeks', [])):
        print('  (WARN: no tight week — check seed data)')


def demo_savings(H):
    requests.post(f'{BASE}/api/household/financial-goals', headers=H, json={
        'title': 'Security deposit', 'targetAmount': 3500, 'savedAmount': 800, 'targetDate': 'Aug 2026', 'icon': 'home',
    })
    requests.post(f'{BASE}/api/household/financial-goals', headers=H, json={
        'title': 'Moving costs', 'targetAmount': 2000, 'savedAmount': 400, 'targetDate': 'Dec 2026', 'icon': 'car',
    })
    requests.post(f'{BASE}/api/household/financial-goals', headers=H, json={
        'title': 'Home fund', 'targetAmount': 10000, 'savedAmount': 1200, 'targetDate': '2028', 'icon': 'flag',
    })
    plan = requests.get(f'{BASE}/api/household/savings-plan', headers=H).json()['savingsPlan']
    print('\n=== ROUND 2 #6 — SAVINGS OPTIMISER ===')
    print(plan.get('message'))
    for a in plan.get('allocations', []):
        eta = f"{a['monthsToGoal']} mo" if a.get('monthsToGoal') else 'long term'
        print(f"  {a['title']}: ${a['monthlyAllocation']:.0f}/mo ({eta})")


def demo_subscriptions(H):
    now = datetime.now(timezone.utc)
    for i in range(4):
        d = (now - timedelta(days=30 * (3 - i))).date().isoformat()
        requests.post(f'{BASE}/api/household/expenses', headers=H, json={
            'title': 'Streaming Plus', 'category': 'subscription', 'amount': 14.99, 'dueDate': d, 'paid': True,
        })
    waste = requests.get(f'{BASE}/api/household/subscription-waste', headers=H).json()['subscriptionWaste']
    print('\n=== ROUND 2 #7 — SUBSCRIPTION WASTE ===')
    if waste:
        print(waste[0]['message'])
    else:
        print('  No waste flags (inventory may have recent activity)')


def demo_affordability(H):
    requests.patch(f'{BASE}/api/household/financial-profile', headers=H, json={'monthlyGrossIncome': 6000})
    requests.post(f'{BASE}/api/household/expenses', headers=H, json={
        'title': 'Car loan', 'category': 'debt', 'amount': 350, 'dueDate': '2026-06-01', 'paid': False,
    })
    aff = requests.get(f'{BASE}/api/household/rent-affordability', headers=H).json()['rentAffordability']
    print('\n=== ROUND 2 #8 — RENT AFFORDABILITY ===')
    print(aff.get('message'))
    print(f"  30% rule: ${aff.get('rule30Pct'):,.0f} | DTI: ${aff.get('ruleDti'):,.0f} | Recommended max: ${aff.get('recommendedMax'):,.0f}")


def demo_income_split(H):
    # Simulate two members by setting income for current user only — show partial state
    requests.post(f'{BASE}/api/household/member-income', headers=H, json={'monthlyIncome': 5000})
    split = requests.get(f'{BASE}/api/household/income-split', headers=H).json()['incomeSplit']
    print('\n=== ROUND 2 #9 — INCOME-PROPORTIONAL SPLIT ===')
    print(f"  Ready: {split.get('ready')} | {split.get('message')}")
    # Illustrate math for Sarah/Mike example (documentation output)
    sarah, mike = 5000, 3000
    total = sarah + mike
    rent = 2400
    print(f"  Example (2 members): Sarah ${sarah:,} + Mike ${mike:,} = ${total:,} household income")
    print(f"  Sarah pays {sarah/total*100:.1f}% → ${rent*sarah/total:,.0f} rent | Mike pays {mike/total*100:.1f}% → ${rent*mike/total:,.0f} rent")
    print('  Raw income is private — only percentages and split amounts are shared.')


def main():
    try:
        H = auth()
        demo_forecast(H)
        demo_savings(H)
        demo_subscriptions(H)
        demo_affordability(H)
        demo_income_split(H)
    except Exception as exc:
        print(f'Demo failed: {exc}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
