#!/usr/bin/env python3
"""One-time curated backfill for family_memories — origin stories only.

Preserves emotional sparsity: milestones and firsts, NOT routine activity logs.

Usage:
  cd backend && python3 scripts/backfill_family_memories.py
  python3 scripts/backfill_family_memories.py --dry-run
  python3 scripts/backfill_family_memories.py --household-id <id>
"""
from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone

import pymongo
from dotenv import dotenv_values, load_dotenv

# Allow imports from backend root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from child_service import BADGE_RULES, compute_badges
from family_memory_service import _build_memory_key, ensure_memory_indexes, record_family_memory

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Major badges only — not every badge, not welcome (handled separately)
MAJOR_BACKFILL_BADGE_IDS = frozenset({'streak_7', 'star', 'routine_starter'})

# Household routine counts worth backfilling (skip 25 — use 50/100 per product spec)
BACKFILL_ROUTINE_COUNTS = frozenset({50, 100})


def _mongo():
    cfg = dotenv_values(os.path.join(os.path.dirname(__file__), '..', '.env'))
    client = pymongo.MongoClient(cfg.get('MONGODB_URI', 'mongodb://localhost:27017'))
    return client[cfg.get('MONGODB_DB', 'family_housing_hub')]


def _as_dt(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            return None
    return None


def _first_child_completion_at(db, household_id: str, child_profile_id: str) -> datetime | None:
    row = db.chores.find_one(
        {
            'householdId': household_id,
            'childProfileId': child_profile_id,
            'completed': True,
            'completedAt': {'$exists': True},
        },
        sort=[('completedAt', 1)],
    )
    return _as_dt(row.get('completedAt') if row else None)


def _last_child_completion_at(db, household_id: str, child_profile_id: str) -> datetime | None:
    row = db.chores.find_one(
        {
            'householdId': household_id,
            'childProfileId': child_profile_id,
            'completed': True,
            'completedAt': {'$exists': True},
        },
        sort=[('completedAt', -1)],
    )
    return _as_dt(row.get('completedAt') if row else None)


def _nth_household_completion_at(db, household_id: str, n: int) -> datetime | None:
    rows = list(
        db.chores.find(
            {
                'householdId': household_id,
                'completed': True,
                'completedAt': {'$exists': True},
            },
            {'completedAt': 1},
        )
        .sort('completedAt', 1)
        .limit(n)
    )
    if len(rows) < n:
        return None
    return _as_dt(rows[n - 1].get('completedAt'))


def _badge_label_emoji(badge_id: str) -> tuple[str, str]:
    for bid, label, emoji, _ in BADGE_RULES:
        if bid == badge_id:
            return label, emoji
    return badge_id, '🏅'


def _try_record(db, dry_run: bool, stats: dict, label: str, **kwargs) -> None:
    if dry_run:
        key = kwargs.get('memory_key') or _build_memory_key(
            kwargs['household_id'],
            kwargs['event_type'],
            child_profile_id=kwargs.get('child_profile_id'),
            title=kwargs.get('title'),
        )
        exists = db.family_memories.find_one({'memoryKey': key})
        if exists:
            stats['skipped_duplicate'] += 1
            print(f'  [skip duplicate] {label}')
        else:
            stats['would_insert'] += 1
            print(f'  [would insert] {label}')
        return

    doc = record_family_memory(db, source_type='backfill', metadata={'backfill': True}, **kwargs)
    if doc:
        stats['inserted'] += 1
        print(f'  [inserted] {label}')
    else:
        stats['skipped_duplicate'] += 1
        print(f'  [skip duplicate] {label}')


def backfill_profile_welcome(db, profile: dict, dry_run: bool, stats: dict) -> None:
    if not profile.get('childOnboardingComplete'):
        return
    household_id = profile.get('householdId')
    if not household_id:
        return
    pid = str(profile['_id'])
    name = profile.get('displayName') or 'Friend'
    occurred = _as_dt(profile.get('updatedAt')) or _as_dt(profile.get('createdAt'))
    _try_record(
        db,
        dry_run,
        stats,
        f'welcome · {name}',
        household_id=household_id,
        event_type='welcome_complete',
        title=f'{name} joined FamilyHub!',
        message='Welcome day — the beginning of your family story here.',
        emoji='🎉',
        child_profile_id=pid,
        child_name=name,
        memory_key=_build_memory_key(household_id, 'welcome_complete', child_profile_id=pid, extra='welcome'),
        occurred_at=occurred,
    )


def backfill_profile_streaks(db, profile: dict, dry_run: bool, stats: dict) -> None:
    household_id = profile.get('householdId')
    if not household_id:
        return
    pid = str(profile['_id'])
    name = profile.get('displayName') or 'Child'
    streak = int(profile.get('streakDays') or 0)
    if streak < 3:
        return

    first_at = _first_child_completion_at(db, household_id, pid) or _as_dt(profile.get('createdAt'))
    _try_record(
        db,
        dry_run,
        stats,
        f'first streak · {name}',
        household_id=household_id,
        event_type='streak_milestone',
        title=f'{name} reached their first 3-day streak',
        message='The beginning of a powerful consistency habit.',
        emoji='🔥',
        child_profile_id=pid,
        child_name=name,
        memory_key=_build_memory_key(household_id, 'streak_milestone', child_profile_id=pid, extra='first-3'),
        occurred_at=first_at,
    )

    if streak > 3:
        peak_at = _last_child_completion_at(db, household_id, pid) or _as_dt(profile.get('updatedAt'))
        emoji = '💪' if streak >= 7 else '🔥'
        _try_record(
            db,
            dry_run,
            stats,
            f'longest streak · {name} ({streak}d)',
            household_id=household_id,
            event_type='streak_milestone',
            title=f'{name}\'s longest streak: {streak} days',
            message='A meaningful peak in your family\'s consistency journey.',
            emoji=emoji,
            child_profile_id=pid,
            child_name=name,
            memory_key=_build_memory_key(household_id, 'streak_milestone', child_profile_id=pid, extra='longest'),
            occurred_at=peak_at,
        )


def backfill_profile_badges(db, profile: dict, dry_run: bool, stats: dict) -> None:
    household_id = profile.get('householdId')
    if not household_id:
        return
    pid = str(profile['_id'])
    name = profile.get('displayName') or 'Child'
    earned = {b['id'] for b in compute_badges(profile) if b.get('earned')}
    occurred = _last_child_completion_at(db, household_id, pid) or _as_dt(profile.get('updatedAt'))

    for badge_id in sorted(earned & MAJOR_BACKFILL_BADGE_IDS):
        label, emoji = _badge_label_emoji(badge_id)
        _try_record(
            db,
            dry_run,
            stats,
            f'badge · {name} · {label}',
            household_id=household_id,
            event_type='badge_earned',
            title=f'{name} unlocked {label}!',
            message='A breakthrough moment in their journey.',
            emoji=emoji,
            child_profile_id=pid,
            child_name=name,
            memory_key=_build_memory_key(household_id, 'badge_earned', child_profile_id=pid, extra=badge_id),
            occurred_at=occurred,
        )


def backfill_profile_rewards(db, profile: dict, dry_run: bool, stats: dict) -> None:
    household_id = profile.get('householdId')
    if not household_id:
        return
    pid = str(profile['_id'])
    name = profile.get('displayName') or 'Child'

    first_request = db.child_reward_redemptions.find_one(
        {'childProfileId': pid, 'householdId': household_id},
        sort=[('requestedAt', 1)],
    )
    if first_request:
        title = first_request.get('rewardTitle') or 'a reward'
        emoji = first_request.get('rewardEmoji') or '🎯'
        _try_record(
            db,
            dry_run,
            stats,
            f'first reward goal · {name}',
            household_id=household_id,
            event_type='first_reward_goal',
            title=f'{name} set their first reward goal',
            message=f'Working toward "{title}" — a meaningful first step.',
            emoji=emoji,
            child_profile_id=pid,
            child_name=name,
            memory_key=_build_memory_key(household_id, 'first_reward_goal', child_profile_id=pid),
            occurred_at=_as_dt(first_request.get('requestedAt')),
            source_id=str(first_request['_id']),
        )

    first_approved = db.child_reward_redemptions.find_one(
        {'childProfileId': pid, 'householdId': household_id, 'status': 'approved'},
        sort=[('resolvedAt', 1)],
    )
    if first_approved:
        title = first_approved.get('rewardTitle') or 'Reward'
        emoji = first_approved.get('rewardEmoji') or '🎁'
        _try_record(
            db,
            dry_run,
            stats,
            f'first reward redeemed · {name}',
            household_id=household_id,
            event_type='first_reward_redeemed',
            title=f'{name} redeemed their first reward',
            message=f'"{title}" — a special family moment worth remembering.',
            emoji=emoji,
            child_profile_id=pid,
            child_name=name,
            memory_key=_build_memory_key(household_id, 'first_reward_redeemed', child_profile_id=pid),
            occurred_at=_as_dt(first_approved.get('resolvedAt')),
            source_id=str(first_approved['_id']),
        )


def backfill_household_routines(db, household_id: str, dry_run: bool, stats: dict) -> None:
    total = db.chores.count_documents({
        'householdId': household_id,
        'completed': True,
    })
    for milestone in sorted(BACKFILL_ROUTINE_COUNTS):
        if total < milestone:
            continue
        occurred = _nth_household_completion_at(db, household_id, milestone)
        _try_record(
            db,
            dry_run,
            stats,
            f'family routines · {milestone}',
            household_id=household_id,
            event_type='family_milestone',
            title=f'Family completed {milestone} routines together',
            message='Teamwork and consistency — a chapter in your family story.',
            emoji='🏆',
            memory_key=_build_memory_key(household_id, 'family_milestone', extra=f'routines-{milestone}'),
            occurred_at=occurred,
        )


def backfill_first_child_joined(db, household_id: str, dry_run: bool, stats: dict) -> None:
    invite = db.household_invites.find_one(
        {
            'householdId': household_id,
            'inviteType': 'child',
            'status': 'accepted',
        },
        sort=[('acceptedAt', 1), ('createdAt', 1)],
    )
    pid = None
    if invite:
        name = invite.get('displayName') or invite.get('email') or 'A child'
        occurred = _as_dt(invite.get('acceptedAt')) or _as_dt(invite.get('createdAt'))
    else:
        profile = db.child_profiles.find_one(
            {'householdId': household_id, 'status': {'$ne': 'archived'}},
            sort=[('createdAt', 1)],
        )
        if not profile:
            return
        name = profile.get('displayName') or 'A child'
        occurred = _as_dt(profile.get('createdAt'))
        pid = str(profile['_id'])

    _try_record(
        db,
        dry_run,
        stats,
        f'first child joined · {household_id[:8]}',
        household_id=household_id,
        event_type='family_milestone',
        title=f'{name} joined the family',
        message='The first chapter of your FamilyHub household story.',
        emoji='💜',
        child_profile_id=pid,
        child_name=name if pid else None,
        memory_key=_build_memory_key(household_id, 'family_milestone', extra='first-child-joined'),
        occurred_at=occurred,
    )


def backfill_household(db, household_id: str, dry_run: bool) -> dict:
    stats = {'inserted': 0, 'would_insert': 0, 'skipped_duplicate': 0}
    profiles = list(db.child_profiles.find({
        'householdId': household_id,
        'status': {'$ne': 'archived'},
    }))

    print(f'\nHousehold {household_id} ({len(profiles)} child profiles)')
    backfill_first_child_joined(db, household_id, dry_run, stats)
    backfill_household_routines(db, household_id, dry_run, stats)

    for profile in profiles:
        name = profile.get('displayName') or str(profile['_id'])
        print(f'  Profile · {name}')
        backfill_profile_welcome(db, profile, dry_run, stats)
        backfill_profile_streaks(db, profile, dry_run, stats)
        backfill_profile_badges(db, profile, dry_run, stats)
        backfill_profile_rewards(db, profile, dry_run, stats)

    return stats


def main() -> int:
    parser = argparse.ArgumentParser(description='Curated family memory backfill')
    parser.add_argument('--dry-run', action='store_true', help='Preview without writing')
    parser.add_argument('--household-id', help='Limit to one household')
    args = parser.parse_args()

    db = _mongo()
    ensure_memory_indexes(db)

    if args.household_id:
        household_ids = [args.household_id]
    else:
        from_child = db.child_profiles.distinct('householdId', {'householdId': {'$ne': None}})
        from_hh = [str(h['_id']) for h in db.households.find({}, {'_id': 1})]
        household_ids = sorted({h for h in from_child + from_hh if h})

    totals = {'inserted': 0, 'would_insert': 0, 'skipped_duplicate': 0}
    print(f'Curated memory backfill — {len(household_ids)} household(s) — dry_run={args.dry_run}')

    for hid in household_ids:
        if not hid:
            continue
        stats = backfill_household(db, hid, args.dry_run)
        for k in totals:
            totals[k] += stats.get(k, 0)

    print('\n--- Summary ---')
    if args.dry_run:
        print(f'Would insert: {totals["would_insert"]}')
    else:
        print(f'Inserted: {totals["inserted"]}')
    print(f'Skipped (duplicate): {totals["skipped_duplicate"]}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
