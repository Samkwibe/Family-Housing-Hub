#!/usr/bin/env python3
"""Round 3 demos — automation, meal plan, replenishment, maintenance prediction."""
import os
import sys
from datetime import datetime, timedelta, timezone

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
BASE = os.getenv('DEMO_API_BASE', 'http://127.0.0.1:8000')


def auth():
    ts = int(datetime.now().timestamp())
    email = f'round3-{ts}@test.local'
    pw = 'SmokeTest123!'
    r = requests.post(f'{BASE}/api/auth/register', json={
        'email': email, 'password': pw, 'firstName': 'Round', 'lastName': 'Three',
        'userType': 'renter', 'emailVerified': True,
    })
    r.raise_for_status()
    token = r.json()['token']
    H = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    dash = requests.get(f'{BASE}/api/household/dashboard', headers=H).json()
    hid = dash.get('members', [{}])[0].get('id')
    # resolve householdId via financial profile call — use mongo lookup by user email
    return H, email


def demo_savings_fix(H):
    print('\n=== SAVINGS OPTIMISER FIX ===')
    for g in [
        {'title': 'Security deposit', 'targetAmount': 3500, 'savedAmount': 800, 'targetDate': 'Aug 2026', 'icon': 'home'},
        {'title': 'Moving costs', 'targetAmount': 2000, 'savedAmount': 400, 'targetDate': 'Dec 2026', 'icon': 'car'},
        {'title': 'Home fund', 'targetAmount': 10000, 'savedAmount': 1200, 'targetDate': '2028', 'icon': 'flag'},
    ]:
        requests.post(f'{BASE}/api/household/financial-goals', headers=H, json=g)
    requests.patch(f'{BASE}/api/household/financial-profile', headers=H, json={'monthlySurplus': 800})
    plan = requests.get(f'{BASE}/api/household/savings-plan', headers=H).json()['savingsPlan']
    print(plan['message'])
    for a in plan['allocations']:
        if a['monthlyAllocation'] > 0:
            print(f"  {a['title']}: ${a['monthlyAllocation']:.0f}/mo (urgency weight {a.get('urgencyWeight', '—')})")


def demo_automation(H):
    now = datetime.now(timezone.utc)
    print('\n=== ROUND 3 #10 — AUTOMATION RULES ===')
    requests.post(f'{BASE}/api/household/inventory', headers=H, json={
        'name': 'Milk', 'expiresInDays': 2,
    })
    requests.post(f'{BASE}/api/household/maintenance', headers=H, json={
        'title': 'Leaky faucet', 'description': 'Kitchen sink', 'location': 'Kitchen', 'priority': 'medium',
    })
    db_created = now - timedelta(days=8)
    requests.post(f'{BASE}/api/household/expenses', headers=H, json={
        'title': 'Rent', 'category': 'rent', 'amount': 2400,
        'dueDate': (now + timedelta(days=3)).date().isoformat(), 'paid': False,
    })
    requests.post(f'{BASE}/api/household/documents', headers=H, json={
        'title': 'Renter insurance', 'category': 'insurance', 'expiresInDays': 25,
    })
    # Backdate maintenance for 7-day rule
    import pymongo
    from dotenv import dotenv_values
    env = dotenv_values(os.path.join(os.path.dirname(__file__), '..', '.env'))
    client = pymongo.MongoClient(env.get('MONGODB_URI', 'mongodb://localhost:27017'))
    db = client[env.get('MONGODB_DB', 'family_housing_hub')]
    maint = db.maintenance.find_one(sort=[('_id', -1)])
    if maint:
        db.maintenance.update_one({'_id': maint['_id']}, {'$set': {'createdAt': db_created}})

    fired = requests.post(f'{BASE}/api/household/automation/run', headers=H, json={'force': True}).json()
    for f in fired.get('fired', []):
        print(f"  [{f['ruleKey']}] {f['message']}")


def demo_meal_plan(H):
    print('\n=== ROUND 3 #11 — FRIDGE-TO-MEAL-PLAN ===')
    requests.post(f'{BASE}/api/household/inventory', headers=H, json={'name': 'Chicken', 'expiresInDays': 1})
    requests.post(f'{BASE}/api/household/inventory', headers=H, json={'name': 'Spinach', 'expiresInDays': 2})
    requests.post(f'{BASE}/api/household/inventory', headers=H, json={'name': 'Rice', 'expiresInDays': 30})
    try:
        r = requests.post(f'{BASE}/api/meals/generate-plan', headers=H, json={'days': 7}, timeout=20)
        if r.status_code == 200:
            data = r.json()
            print('  Pantry priority:', ', '.join(i['name'] for i in data.get('pantryPriority', [])[:5]))
            print(data.get('meal_plan', '')[:600])
        else:
            print('  Meal plan:', r.json().get('error', r.status_code))
    except Exception as exc:
        print(f'  Meal plan request slow/failed ({exc}); showing expiry-first fallback:')
        import sys
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
        from meal_plan_service import fallback_meal_plan, format_meal_plan_display
        inv = [
            {'name': 'Chicken', 'expiresAt': (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()},
            {'name': 'Spinach', 'expiresAt': (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()},
            {'name': 'Rice', 'expiresAt': (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()},
        ]
        print(format_meal_plan_display(fallback_meal_plan(inv, 7))[:500])


def demo_replenishment(H, email):
    print('\n=== ROUND 3 #12 — AUTO-REPLENISHMENT ===')
    now = datetime.now(timezone.utc)
    import pymongo
    from dotenv import dotenv_values
    env = dotenv_values(os.path.join(os.path.dirname(__file__), '..', '.env'))
    client = pymongo.MongoClient(env.get('MONGODB_URI', 'mongodb://localhost:27017'))
    db = client[env.get('MONGODB_DB', 'family_housing_hub')]
    user = db.users.find_one({'email': email})
    if not user:
        print('  Could not resolve user for replenishment demo')
        return
    member = db.household_members.find_one({'userId': str(user['_id'])})
    if not member:
        print('  Could not resolve household for replenishment demo')
        return
    hid = member['householdId']
    uid = str(user['_id'])
    for days_ago in [15, 10, 5]:
        db.inventory.insert_one({
            'userId': uid, 'householdId': hid, 'name': 'Bread', 'location': 'pantry',
            'createdAt': now - timedelta(days=days_ago),
        })
    rep = requests.post(f'{BASE}/api/household/automation/run', headers=H, json={}).json()
    for r in rep.get('replenishment', []):
        print(f"  {r['message']}")
    if not rep.get('replenishment'):
        print('  (No replenishment triggered — check consumption history seed)')


def demo_maintenance(H):
    print('\n=== ROUND 3 #13 — MAINTENANCE PREDICTION ===')
    now = datetime.now(timezone.utc)
    last = (now - timedelta(days=87)).date().isoformat()
    requests.post(f'{BASE}/api/household/appliances', headers=H, json={
        'name': 'HVAC filter', 'deviceType': 'hvac_filter', 'lastServiceDate': last,
    })
    preds = requests.get(f'{BASE}/api/household/maintenance-predictions', headers=H).json()['predictions']
    for p in preds:
        if p.get('message'):
            print(f"  [{p['status']}] {p['message']}")


def main():
    try:
        H, email = auth()
        demo_savings_fix(H)
        demo_automation(H)
        demo_meal_plan(H)
        demo_replenishment(H, email)
        demo_maintenance(H)
    except Exception as exc:
        print(f'Demo failed: {exc}', file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
