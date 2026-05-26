#!/usr/bin/env python3
"""One-time migration: encrypt sensitive MongoDB fields at rest."""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

from database import get_db
from encryption_service import (
    DOCUMENT_FILE_KEY_FIELDS,
    DOSE_LOG_FIELDS,
    EMERGENCY_FIELDS,
    HEALTH_RECORD_FIELDS,
    MEDICATION_FIELDS,
    encrypt_fields,
    is_encrypted,
    require_encryption_key,
)


def _migrate_collection(db, collection_name: str, fields: tuple[str, ...], query=None):
    query = query or {}
    updated = 0
    for doc in db[collection_name].find(query):
        needs = any(
            doc.get(f) and isinstance(doc.get(f), str) and not is_encrypted(doc.get(f))
            for f in fields
        )
        if not needs:
            continue
        encrypted = encrypt_fields(doc, fields)
        db[collection_name].update_one({'_id': doc['_id']}, {'$set': {f: encrypted[f] for f in fields if f in encrypted}})
        updated += 1
    print(f'  {collection_name}: {updated} documents encrypted')


def _migrate_member_income(db):
    updated = 0
    for doc in db.household_member_income.find({}):
        raw = doc.get('monthlyIncome')
        if raw is None:
            continue
        if isinstance(raw, str) and is_encrypted(raw):
            continue
        from encryption_service import encrypt_value

        db.household_member_income.update_one(
            {'_id': doc['_id']},
            {'$set': {'monthlyIncome': encrypt_value(str(raw))}},
        )
        updated += 1
    print(f'  household_member_income: {updated} documents encrypted')


def main():
    require_encryption_key()
    db = get_db()
    print('Encrypting sensitive fields...')
    _migrate_collection(db, 'health_records', HEALTH_RECORD_FIELDS)
    _migrate_collection(db, 'medications', MEDICATION_FIELDS)
    _migrate_collection(db, 'dose_logs', DOSE_LOG_FIELDS)
    _migrate_collection(db, 'emergency_profiles', EMERGENCY_FIELDS)
    _migrate_collection(db, 'documents', DOCUMENT_FILE_KEY_FIELDS, {'fileKey': {'$exists': True, '$ne': None}})
    _migrate_member_income(db)
    print('Migration complete.')


if __name__ == '__main__':
    main()
