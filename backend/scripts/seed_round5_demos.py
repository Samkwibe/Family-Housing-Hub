#!/usr/bin/env python3
"""Round 5 demos — health timeline gaps, medication adherence, vaccination schedule."""
import os
import sys
from datetime import datetime, timedelta, timezone

import pymongo
import requests
from bson import ObjectId
from dotenv import dotenv_values, load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
BASE = os.getenv('DEMO_API_BASE', 'http://127.0.0.1:8000')


def mongo():
    cfg = dotenv_values(os.path.join(os.path.dirname(__file__), '..', '.env'))
    client = pymongo.MongoClient(cfg.get('MONGODB_URI', 'mongodb://localhost:27017'))
    return client[cfg.get('MONGODB_DB', 'family_housing_hub')]


def register_user(email, first='Demo', last='User'):
    pw = 'SmokeTest123!'
    r = requests.post(f'{BASE}/api/auth/register', json={
        'email': email, 'password': pw, 'firstName': first, 'lastName': last,
        'userType': 'renter', 'emailVerified': True,
    })
    r.raise_for_status()
    return r.json()['token'], pw


def setup_household(db, ts):
    owner_token, _ = register_user(f'health-owner-{ts}@test.local', 'Parent', 'Hub')
    H = {'Authorization': f'Bearer {owner_token}', 'Content-Type': 'application/json'}
    owner = db.users.find_one({'email': f'health-owner-{ts}@test.local'})
    hid = owner.get('activeHouseholdId') or db.household_members.find_one({'userId': str(owner['_id'])})['householdId']
    owner_id = str(owner['_id'])

    now = datetime.now(timezone.utc)
    emma_token, _ = register_user(f'health-emma-{ts}@test.local', 'Emma', 'Raymond')
    mike_token, _ = register_user(f'health-mike-{ts}@test.local', 'Mike', 'Adult')
    senior_token, _ = register_user(f'health-senior-{ts}@test.local', 'Grace', 'Senior')
    child4_token, _ = register_user(f'health-child4-{ts}@test.local', 'Liam', 'Child')

    members = [
        ('health-emma-{ts}@test.local', 'family', 'Emma', (now - timedelta(days=9 * 365 + 120)).date().isoformat()),
        ('health-mike-{ts}@test.local', 'renter', 'Mike', (now - timedelta(days=38 * 365)).date().isoformat()),
        ('health-senior-{ts}@test.local', 'renter', 'Grace', (now - timedelta(days=68 * 365)).date().isoformat()),
        ('health-child4-{ts}@test.local', 'family', 'Liam', (now - timedelta(days=4 * 365 + 60)).date().isoformat()),
    ]
    ids = {}
    for email_tpl, role, name, dob in members:
        email = email_tpl.format(ts=ts)
        u = db.users.find_one({'email': email})
        uid = str(u['_id'])
        ids[name] = uid
        db.household_members.insert_one({
            'householdId': hid, 'userId': uid, 'role': role, 'status': 'active',
            'displayName': name, 'firstName': name, 'dateOfBirth': dob,
            'joinedAt': now,
        })
        db.users.update_one({'_id': u['_id']}, {'$set': {'activeHouseholdId': hid}})

    return H, hid, owner_id, ids


def demo_timeline_gaps(H, hid, ids):
    print('\n=== ROUND 5 #18 — FAMILY HEALTH TIMELINE + GAP DETECTION ===')
    db = mongo()
    now = datetime.now(timezone.utc)

    records = [
        (ids['Emma'], 'Emma', 'checkup', 'physical', 'Annual physical', now - timedelta(days=400)),
        (ids['Emma'], 'Emma', 'checkup', 'eye_exam', 'Eye exam', now - timedelta(days=380)),
        (ids['Emma'], 'Emma', 'checkup', 'dental', 'Dental check-up', now - timedelta(days=426)),
        (ids['Mike'], 'Mike', 'checkup', 'physical', 'Annual physical', now - timedelta(days=920)),
        (ids['Mike'], 'Mike', 'checkup', 'dental', 'Dental cleaning', now - timedelta(days=200)),
        (ids['Grace'], 'Grace', 'checkup', 'physical', 'Physical exam', now - timedelta(days=250)),
        (ids['Grace'], 'Grace', 'checkup', 'flu_shot', 'Flu shot', now - timedelta(days=400)),
    ]
    for mid, name, rtype, ctype, title, dt in records:
        db.health_records.insert_one({
            'householdId': hid, 'memberId': mid, 'memberName': name,
            'type': rtype, 'checkupType': ctype, 'title': title, 'date': dt,
            'notes': '', 'createdAt': now,
        })

    gaps = requests.get(f'{BASE}/api/household/health/gaps', headers=H).json()['gaps']
    for g in gaps:
        print(f"  {g['message']}")


def demo_medication(H, hid, ids):
    print('\n=== ROUND 5 #19 — MEDICATION ADHERENCE + SMART REMINDERS ===')
    db = mongo()
    now = datetime.now(timezone.utc)
    mid = ids['Mike']

    for day in range(30):
        dt = now - timedelta(days=29 - day)
        for hour in (8, 5), (21, 47):
            db.login_history.insert_one({
                'userId': mid, 'deviceHash': 'phone', 'city': 'Seattle', 'country': 'US',
                'hour': hour[0], 'weekday': dt.weekday(),
                'createdAt': dt.replace(hour=hour[0], minute=hour[1], second=0, microsecond=0),
            })

    med = requests.post(f'{BASE}/api/household/health/medications', headers=H, json={
        'memberId': mid, 'memberName': 'Mike', 'name': 'Lisinopril',
        'dosage': '10mg', 'frequency': 'twice-daily',
    }).json()['medication']
    med_id = med['id']
    db.medications.update_one({'_id': ObjectId(med_id)}, {'$set': {'startDate': now - timedelta(days=30)}})

    for day in range(30):
        dt = now - timedelta(days=29 - day)
        for slot, hour in enumerate((8, 21)):
            status = 'taken'
            if day % 7 == 3 and slot == 1:
                status = 'missed'
            if day >= 23:
                status = 'taken'
            db.dose_logs.insert_one({
                'medicationId': med_id, 'householdId': hid, 'memberId': mid,
                'status': status,
                'scheduledAt': dt.replace(hour=hour, minute=0, second=0, microsecond=0),
                'createdAt': dt,
            })

    meds = requests.get(f'{BASE}/api/household/health/medications?memberId={mid}', headers=H).json()
    m = meds['medications'][0]
    print(f"  Medication: {m['name']} ({m['dosage']}, {m['frequency']})")
    print(f"  Adherence (30d): {m['adherenceRate']}% ({m['dosesTaken']}/{m['dosesDue']} doses taken)")
    print(f"  Current streak: {m['streakDays']}-day streak")
    print(f"  Smart reminder times: {', '.join(m['smartReminderTimes'])}")


def demo_vaccinations(H, hid, ids):
    print('\n=== ROUND 5 #20 — VACCINATION SCHEDULE BY DOB ===')
    db = mongo()
    now = datetime.now(timezone.utc)
    liam_id = ids['Liam']

    received = [
        ('Hepatitis B', 'Dose 1', now - timedelta(days=4 * 365 + 30)),
        ('DTaP', 'Dose 1', now - timedelta(days=4 * 365 - 60)),
        ('MMR', 'Dose 1', now - timedelta(days=4 * 365 - 700)),
        ('Varicella', 'Dose 1', now - timedelta(days=4 * 365 - 700)),
    ]
    for vaccine, dose, dt in received:
        requests.post(f'{BASE}/api/household/health/vaccinations/mark-received', headers=H, json={
            'memberId': liam_id, 'vaccine': vaccine, 'dose': dose,
            'receivedDate': dt.date().isoformat(),
        })

    sched = requests.get(f'{BASE}/api/household/health/vaccinations/{liam_id}', headers=H).json()
    print(f"  Child: {sched['memberName']} (DOB {sched['dateOfBirth'][:10]})")
    for item in sched['schedule']:
        icon = {'received': '✓', 'overdue': 'RED', 'due_soon': 'ORANGE', 'upcoming': '—'}[item['status']]
        if item['status'] in ('received', 'overdue', 'due_soon'):
            print(f"  [{icon}] {item['vaccine']} ({item['dose']}) — due {item['dueDate']} — {item['status']}")


def main():
    try:
        requests.get(f'{BASE}/api/health', timeout=5).raise_for_status()
    except Exception as e:
        print(f'Backend not reachable at {BASE}: {e}', file=sys.stderr)
        sys.exit(1)

    ts = int(datetime.now().timestamp())
    db = mongo()
    H, hid, owner_id, ids = setup_household(db, ts)
    demo_timeline_gaps(H, hid, ids)
    demo_medication(H, hid, ids)
    demo_vaccinations(H, hid, ids)
    print('\nRound 5 demos complete.')


if __name__ == '__main__':
    main()
