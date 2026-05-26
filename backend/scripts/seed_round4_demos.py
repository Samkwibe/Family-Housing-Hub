#!/usr/bin/env python3
"""Round 4 demos — geofencing, login anomaly, permissions, document expiry risk."""
import os
import sys
from datetime import datetime, timedelta, timezone

import pymongo
import requests
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
BASE = os.getenv('DEMO_API_BASE', 'http://127.0.0.1:8000')
env = load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))


def mongo():
    from dotenv import dotenv_values
    cfg = dotenv_values(os.path.join(os.path.dirname(__file__), '..', '.env'))
    client = pymongo.MongoClient(cfg.get('MONGODB_URI', 'mongodb://localhost:27017'))
    return client[cfg.get('MONGODB_DB', 'family_housing_hub')]


def register_user(email, first='Demo', last='User', role='renter'):
    pw = 'SmokeTest123!'
    r = requests.post(f'{BASE}/api/auth/register', json={
        'email': email, 'password': pw, 'firstName': first, 'lastName': last,
        'userType': 'renter', 'emailVerified': True, 'role': role,
    })
    r.raise_for_status()
    return r.json()['token'], pw


def demo_geofence():
    print('\n=== ROUND 4 #14 — GEOFENCING SAFE ZONES ===')
    ts = int(datetime.now().timestamp())
    token, _ = register_user(f'geo-owner-{ts}@test.local', 'Parent', 'Raymond')
    H = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    db = mongo()
    owner = db.users.find_one({'email': f'geo-owner-{ts}@test.local'})
    hid = owner.get('activeHouseholdId') or db.household_members.find_one({'userId': str(owner['_id'])})['householdId']

    child_token, _ = register_user(f'geo-child-{ts}@test.local', 'Emma', 'Raymond', 'family')
    child = db.users.find_one({'email': f'geo-child-{ts}@test.local'})
    child_id = str(child['_id'])
    db.household_members.insert_one({
        'householdId': hid, 'userId': child_id, 'role': 'family', 'status': 'active',
        'displayName': 'Emma', 'firstName': 'Emma', 'joinedAt': datetime.now(timezone.utc),
    })
    db.member_location_prefs.update_one(
        {'householdId': hid, 'userId': child_id},
        {'$set': {'locationSharingEnabled': True}},
        upsert=True,
    )

    home_lat, home_lng = 41.8781, -87.6298
    requests.post(f'{BASE}/api/household/safe-zones', headers=H, json={
        'name': 'Home', 'type': 'home', 'lat': home_lat, 'lng': home_lng, 'radiusMeters': 200,
    })
    requests.post(f'{BASE}/api/household/safe-zones', headers=H, json={
        'name': 'School (Washington Elementary)', 'type': 'school',
        'lat': 41.8820, 'lng': -87.6350, 'radiusMeters': 200,
    })

    db.geofence_member_state.delete_many({'householdId': hid, 'memberUserId': child_id})
    db.geofence_events.delete_many({'householdId': hid, 'memberUserId': child_id})
    zone = db.safe_zones.find_one({'householdId': hid, 'name': 'Home'})
    if zone:
        db.geofence_member_state.insert_one({
            'householdId': hid,
            'memberUserId': child_id,
            'zoneStates': {str(zone['_id']): 'inside'},
            'updatedAt': datetime.now(timezone.utc),
        })

    outside_lat = home_lat + 0.003
    inside_lat = home_lat + 0.0005
    ping = lambda lat: requests.post(f'{BASE}/api/household/location/ping', headers=H, json={
        'memberUserId': child_id, 'lat': lat, 'lng': home_lng, 'demo': True,
    }).json()

    leave = ping(outside_lat)
    enter = ping(inside_lat)
    for e in leave.get('events', []) + enter.get('events', []):
        print(f"  {e.get('message')}")


def demo_login_anomaly():
    print('\n=== ROUND 4 #15 — LOGIN ANOMALY DETECTION ===')
    ts = int(datetime.now().timestamp())
    email = f'login-risk-{ts}@test.local'
    pw = 'SmokeTest123!'
    requests.post(f'{BASE}/api/auth/register', json={
        'email': email, 'password': pw, 'firstName': 'Risk', 'lastName': 'Demo',
        'userType': 'renter', 'emailVerified': True,
    }).raise_for_status()

    db = mongo()
    uid = str(db.users.find_one({'email': email})['_id'])
    for i in range(8):
        db.login_history.insert_one({
            'userId': uid, 'deviceHash': 'known-device-abc',
            'city': 'Seattle', 'country': 'US', 'hour': 10, 'weekday': 2,
            'riskLevel': 'low', 'riskScore': 0.1, 'blocked': False,
            'createdAt': datetime.now(timezone.utc) - timedelta(days=i),
        })

    medium = requests.post(f'{BASE}/api/auth/login', json={
        'identifier': email, 'password': pw,
        'city': 'Chicago, IL', 'deviceId': 'new-iphone-14', 'hourOverride': 14,
    }).json()
    print(f"  Medium risk: {medium.get('loginRisk', {}).get('alert')}")

    high = requests.post(f'{BASE}/api/auth/login', json={
        'identifier': email, 'password': pw,
        'city': 'Lagos', 'country': 'NG', 'deviceId': 'unknown-tablet-x', 'hourOverride': 3,
    })
    if high.status_code == 403:
        print(f"  High risk (blocked): {high.json().get('error')}")
    else:
        print(f"  High risk (blocked): {high.json().get('loginRisk', {}).get('alert', 'unexpected pass')}")


def demo_permissions():
    print('\n=== ROUND 4 #16 — HOUSEHOLD PERMISSION GRAPH ===')
    ts = int(datetime.now().timestamp())
    owner_token, _ = register_user(f'perm-owner-{ts}@test.local', 'Owner', 'House')
    H_owner = {'Authorization': f'Bearer {owner_token}', 'Content-Type': 'application/json'}
    db = mongo()
    owner = db.users.find_one({'email': f'perm-owner-{ts}@test.local'})
    hid = owner.get('activeHouseholdId') or db.household_members.find_one({'userId': str(owner['_id'])})['householdId']

    adult_token, _ = register_user(f'perm-adult-{ts}@test.local', 'Alex', 'Adult')
    child_token, _ = register_user(f'perm-child-{ts}@test.local', 'Sam', 'Child')
    adult_id = str(db.users.find_one({'email': f'perm-adult-{ts}@test.local'})['_id'])
    child_id = str(db.users.find_one({'email': f'perm-child-{ts}@test.local'})['_id'])
    for uid, role, name in [(adult_id, 'renter', 'Alex'), (child_id, 'family', 'Sam')]:
        db.household_members.insert_one({
            'householdId': hid, 'userId': uid, 'role': role, 'status': 'active',
            'displayName': name, 'joinedAt': datetime.now(timezone.utc),
        })
        db.users.update_one({'_id': ObjectId(uid)}, {'$set': {'activeHouseholdId': hid}})

    H_child = {'Authorization': f'Bearer {child_token}', 'Content-Type': 'application/json'}
    r = requests.get(f'{BASE}/api/household/expenses', headers=H_child)
    print(f"  Child GET /expenses → {r.status_code} {r.json().get('error', 'OK')}")

    grant = requests.post(f'{BASE}/api/household/permissions/grant', headers=H_owner, json={
        'targetUserId': adult_id, 'dataType': 'documents', 'allow': True,
    }).json()
    print(f"  Owner granted documents to adult: {grant.get('grant', {}).get('permission')}")

    perms = requests.get(f'{BASE}/api/household/permissions', headers=H_owner).json()
    adult = next(m for m in perms['members'] if m['userId'] == adult_id)
    print(f"  Adult documents access: {adult['permissions'].get('documents')}")


def demo_document_risk():
    print('\n=== ROUND 4 #17 — DOCUMENT EXPIRY RISK SCORING ===')
    ts = int(datetime.now().timestamp())
    token, _ = register_user(f'docrisk-{ts}@test.local')
    H = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    now = datetime.now(timezone.utc)
    docs = [
        ('Renter\'s insurance policy', 'insurance', 12),
        ('Lease agreement', 'lease', 45),
        ('Passport scan', 'passport', 90),
    ]
    for title, cat, days in docs:
        requests.post(f'{BASE}/api/household/documents', headers=H, json={
            'title': title, 'category': cat, 'expiresInDays': days,
        })

    dash = requests.get(f'{BASE}/api/household/dashboard', headers=H).json()
    ranked = dash.get('documentExpiryRiskRankings', [])
    for i, d in enumerate(ranked, 1):
        card = d.get('cardLevel') or '—'
        print(f"  #{i} score={d['riskScore']:.0f} ({card}) — {d['title']} ({d['daysUntilExpiry']}d, weight {d['severityWeight']:.0f})")
    top = dash.get('topDocumentRisk')
    if top:
        print(f"  Dashboard card ({top.get('cardLevel')}): {top.get('message')}")


def main():
    try:
        requests.get(f'{BASE}/api/health', timeout=5).raise_for_status()
    except Exception as e:
        print(f'Backend not reachable at {BASE}: {e}', file=sys.stderr)
        sys.exit(1)
    demo_geofence()
    demo_login_anomaly()
    demo_permissions()
    demo_document_risk()
    print('\nRound 4 demos complete.')


if __name__ == '__main__':
    main()
