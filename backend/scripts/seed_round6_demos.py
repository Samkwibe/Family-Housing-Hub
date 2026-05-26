#!/usr/bin/env python3
"""Round 6 demos — purchase readiness, move-out estimate, rent market predictor."""
import os
import sys
from datetime import datetime, timedelta, timezone

import pymongo
import requests
from dotenv import dotenv_values, load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
BASE = os.getenv('DEMO_API_BASE', 'http://127.0.0.1:8000')


def mongo():
    cfg = dotenv_values(os.path.join(os.path.dirname(__file__), '..', '.env'))
    client = pymongo.MongoClient(cfg.get('MONGODB_URI', 'mongodb://localhost:27017'))
    return client[cfg.get('MONGODB_DB', 'family_housing_hub')]


def register_user(email):
    pw = 'SmokeTest123!'
    r = requests.post(f'{BASE}/api/auth/register', json={
        'email': email, 'password': pw, 'firstName': 'Round', 'lastName': 'Six',
        'userType': 'renter', 'emailVerified': True,
        'address': {'street': '134 W Baker St', 'city': 'Manchester', 'state': 'NH', 'zipCode': '03103', 'country': 'USA'},
    })
    r.raise_for_status()
    return r.json()['token'], pw


def demo_readiness(H, hid):
    print('\n=== ROUND 6 #21 — HOME PURCHASE READINESS SCORE ===')
    db = mongo()
    now = datetime.now(timezone.utc)

    db.credit_settings.update_one({'householdId': hid}, {'$set': {
        'householdId': hid, 'estimatedScore': 724, 'experian': True,
    }}, upsert=True)

    db.financial_goals.delete_many({'householdId': hid})
    db.financial_goals.insert_one({
        'householdId': hid, 'title': 'Security deposit', 'targetAmount': 3500,
        'savedAmount': 2380, 'targetDate': 'Aug 2026', 'icon': 'home',
        'createdAt': now,
    })
    db.household_financial_profiles.update_one({'householdId': hid}, {'$set': {
        'householdId': hid, 'monthlyGrossIncome': 7500, 'monthlySurplus': 409,
        'onTimeRentMonths': 18,
    }}, upsert=True)

    for i in range(6):
        ym = (now - timedelta(days=30 * (5 - i))).strftime('%Y-%m')
        db.income_history.update_one(
            {'householdId': hid, 'yearMonth': ym},
            {'$set': {'householdId': hid, 'yearMonth': ym, 'amount': 7500}},
            upsert=True,
        )

    db.expenses.delete_many({'householdId': hid, 'category': {'$in': ['rent', 'loan', 'debt']}})
    db.expenses.insert_one({
        'householdId': hid, 'title': 'Rent', 'category': 'rent', 'amount': 2400,
        'paid': True, 'dueDate': now.date().isoformat(), 'createdAt': now,
    })
    db.expenses.insert_one({
        'householdId': hid, 'title': 'Car loan', 'category': 'loan', 'amount': 450,
        'paid': True, 'createdAt': now,
    })
    db.expenses.insert_one({
        'householdId': hid, 'title': 'Student loan', 'category': 'debt', 'amount': 1650,
        'paid': True, 'createdAt': now,
    })
    for i in range(18):
        db.expenses.insert_one({
            'householdId': hid, 'title': f'Rent month {i}', 'category': 'rent',
            'amount': 2400, 'paid': True, 'createdAt': now - timedelta(days=30 * i),
        })

    r = requests.get(f'{BASE}/api/household/purchase-readiness', headers=H).json()['purchaseReadiness']
    print(f"  {r['message']}")
    print(f"  Band: {r['band']} | Timeline: {r.get('timelineMonths')} months")
    for f in r['factors']:
        print(f"  - {f['label']}: {f['score']}/100 (weight {f['weightPct']}%)")


def demo_moveout(H, hid):
    print('\n=== ROUND 6 #22 — MOVE-OUT COST ESTIMATOR ===')
    db = mongo()
    now = datetime.now(timezone.utc)
    db.checklist_items.delete_many({'householdId': hid, 'checklistType': 'move-in'})
    db.checklist_items.insert_many([
        {'householdId': hid, 'room': 'Bedroom', 'task': 'Carpet stain', 'checklistType': 'move-in',
         'condition': 'damaged', 'status': 'damaged', 'itemType': 'carpet', 'ageYears': 5, 'severity': 'major', 'verified': False},
        {'householdId': hid, 'room': 'Living room', 'task': 'Broken blind', 'checklistType': 'move-in',
         'condition': 'damaged', 'status': 'damaged', 'itemType': 'blind', 'ageYears': 4, 'severity': 'moderate', 'verified': False},
        {'householdId': hid, 'room': 'Kitchen', 'task': 'Appliances OK', 'checklistType': 'move-in',
         'condition': 'good', 'verified': True},
    ])
    db.maintenance.insert_one({
        'householdId': hid, 'title': 'Hole in drywall', 'description': 'Tenant caused',
        'tenantCaused': True, 'estimatedCost': 175, 'fixable': True, 'createdAt': now,
    })
    db.documents.update_one({'householdId': hid, 'category': 'lease'}, {'$set': {
        'securityDeposit': 2400, 'notes': 'Security deposit $2400',
    }}, upsert=False)
    if not db.documents.find_one({'householdId': hid, 'category': 'lease'}):
        db.documents.insert_one({
            'householdId': hid, 'title': 'Lease 2025', 'category': 'lease',
            'securityDeposit': 2400, 'createdAt': now,
        })

    est = requests.get(f'{BASE}/api/household/moveout-estimate', headers=H).json()['moveoutEstimate']
    print(f"  {est['message']}")
    print(f"  Range: ${est['lowEstimate']:,.0f} – ${est['highEstimate']:,.0f} (mid ${est['midEstimate']:,.0f})")


def demo_rent_market(H, hid):
    print('\n=== ROUND 6 #23 — RENT MARKET PRICE PREDICTOR ===')
    db = mongo()
    zip_code = '03103'
    db.rent_market_history.delete_many({'zipCode': zip_code})
    base = 2100
    start = datetime(2024, 6, 1, tzinfo=timezone.utc)
    for i in range(24):
        dt = start + timedelta(days=30 * i)
        ym = dt.strftime('%Y-%m')
        rent = base + i * 18 + (i // 6) * 25
        db.rent_market_history.insert_one({
            'zipCode': zip_code, 'yearMonth': ym, 'medianRent': rent, 'level': 'zip',
        })

    pred = requests.get(f'{BASE}/api/household/rent-market?zipCode={zip_code}', headers=H).json()['rentMarket']
    print(f"  {pred['message']}")
    print(f"  Recommendation: {pred['recommendation']}")


def main():
    try:
        requests.get(f'{BASE}/api/health', timeout=5).raise_for_status()
    except Exception as e:
        print(f'Backend not reachable: {e}', file=sys.stderr)
        sys.exit(1)

    ts = int(datetime.now().timestamp())
    token, _ = register_user(f'round6-{ts}@test.local')
    H = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    db = mongo()
    user = db.users.find_one({'email': f'round6-{ts}@test.local'})
    hid = user.get('activeHouseholdId') or db.household_members.find_one({'userId': str(user['_id'])})['householdId']

    demo_readiness(H, hid)
    demo_moveout(H, hid)
    demo_rent_market(H, hid)
    print('\nRound 6 demos complete.')


if __name__ == '__main__':
    main()
