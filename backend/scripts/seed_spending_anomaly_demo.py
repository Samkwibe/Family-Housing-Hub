#!/usr/bin/env python3
"""Seed baseline utility bills + spike, print the anomaly alert message."""
import os
import sys
from datetime import datetime, timedelta, timezone

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

BASE = os.getenv('DEMO_API_BASE', 'http://127.0.0.1:8000')


def main():
    ts = int(datetime.now().timestamp())
    email = f'anomaly-demo-{ts}@test.local'
    pw = 'SmokeTest123!'
    reg = requests.post(f'{BASE}/api/auth/register', json={
        'email': email, 'password': pw, 'firstName': 'Anomaly', 'lastName': 'Demo',
        'userType': 'renter', 'emailVerified': True,
    })
    reg.raise_for_status()
    token = reg.json()['token']
    H = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

    now = datetime.now(timezone.utc)
    baselines = [
        (now - timedelta(days=75), 95),
        (now - timedelta(days=45), 98),
        (now - timedelta(days=15), 97),
    ]
    for due, amt in baselines:
        requests.post(f'{BASE}/api/household/expenses', headers=H, json={
            'title': 'Electricity',
            'category': 'utility',
            'amount': amt,
            'dueDate': due.date().isoformat(),
            'paid': True,
        }).raise_for_status()

    spike = requests.post(f'{BASE}/api/household/expenses', headers=H, json={
        'title': 'Electricity',
        'category': 'utility',
        'amount': 138,
        'dueDate': now.date().isoformat(),
        'paid': False,
    })
    spike.raise_for_status()

    dash = requests.get(f'{BASE}/api/household/dashboard', headers=H)
    dash.raise_for_status()
    data = dash.json()
    anomalies = data.get('spendingAnomalies') or []
    spending_alerts = [a for a in data.get('alerts', []) if a.get('type') == 'spending']

    print('--- SPENDING ANOMALY DEMO ---')
    if anomalies:
        print(anomalies[0]['message'])
        print(f"Z-score: {anomalies[0]['zScore']} | Severity: {anomalies[0]['severity']}")
    elif spending_alerts:
        print(spending_alerts[0]['body'])
    else:
        print('No anomaly detected — check baseline data')
        sys.exit(1)


if __name__ == '__main__':
    main()
