"""Realtime family celebration events — warm, scoped, notification-disciplined."""
from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
from typing import Any

STREAK_MILESTONES = frozenset({3, 7, 14, 30})
SERIES_STREAK_MILESTONES = frozenset({3, 5, 7, 10})
FAMILY_ROUTINE_MILESTONES = frozenset({25, 50, 100})


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _emit(household_id: str | None, payload: dict[str, Any], child_user_id: str | None = None, child_profile_id: str | None = None, *, household_only: bool = False, child_only: bool = False) -> None:
    if not household_id and not child_user_id and not child_profile_id:
        return
    try:
        from observability_service import generate_trace_id, should_dedupe, trace_celebration
        from realtime_service import emit_celebration_event

        dedupe_key = f"{payload.get('type')}:{child_profile_id or ''}:{payload.get('title', '')}"
        if should_dedupe(dedupe_key, window_seconds=2.5):
            return

        trace_id = generate_trace_id()
        payload = {**payload, 'traceId': trace_id}
        trace_celebration(
            'emitted',
            event_type=payload.get('type', 'unknown'),
            trace_id=trace_id,
            household_id=household_id,
            child_profile_id=child_profile_id,
            child_user_id=child_user_id,
            priority=payload.get('priority'),
        )
        emit_celebration_event(
            household_id if not child_only else None,
            payload,
            child_user_id=child_user_id,
            child_profile_id=child_profile_id,
            child_only=child_only,
            trace_id=trace_id,
        )
        trace_celebration(
            'delivered',
            event_type=payload.get('type', 'unknown'),
            trace_id=trace_id,
            household_id=household_id,
            child_profile_id=child_profile_id,
        )
        try:
            from database import get_db
            from family_memory_service import record_from_celebration_payload
            record_from_celebration_payload(get_db(), household_id, payload, trace_id=trace_id)
        except Exception as mem_exc:
            print(f'[memory] record failed: {mem_exc}')
    except Exception as exc:
        print(f'[celebration] emit failed: {exc}')


def _base_payload(
    ctype: str,
    title: str,
    message: str,
    emoji: str = '🎉',
    *,
    child_profile_id: str | None = None,
    child_name: str | None = None,
    points: int | None = None,
    priority: str = 'normal',
    show_parent: bool = True,
    show_child: bool = False,
) -> dict[str, Any]:
    return {
        'type': ctype,
        'title': title,
        'message': message,
        'emoji': emoji,
        'childProfileId': child_profile_id,
        'childName': child_name,
        'points': points,
        'priority': priority,
        'showParent': show_parent,
        'showChild': show_child,
        'ts': time.time(),
    }


def emit_reward_approved(db, redemption: dict, profile: dict) -> None:
    household_id = redemption.get('householdId')
    child_user_id = profile.get('userId')
    name = profile.get('displayName') or redemption.get('childName') or 'Child'
    title = redemption.get('rewardTitle') or 'Reward'
    emoji = redemption.get('rewardEmoji') or '🎁'
    _emit(
        household_id,
        _base_payload(
            'reward_approved',
            f'{title} approved!',
            f'Your parent approved "{title}" — enjoy it, {name}!',
            emoji=emoji,
            child_profile_id=str(profile['_id']),
            child_name=name,
            priority='high',
            show_parent=False,
            show_child=True,
        ),
        child_user_id=child_user_id,
        child_profile_id=str(profile['_id']),
        child_only=True,
    )
    _emit(
        household_id,
        _base_payload(
            'reward_approved',
            f'Reward sent to {name}',
            f'"{title}" approved — a great moment to celebrate together!',
            emoji=emoji,
            child_profile_id=str(profile['_id']),
            child_name=name,
            priority='normal',
            show_parent=True,
            show_child=False,
        ),
        household_only=True,
    )


def emit_welcome_complete(profile: dict) -> None:
    household_id = profile.get('householdId')
    name = profile.get('displayName') or 'Friend'
    _emit(
        household_id,
        _base_payload(
            'welcome_complete',
            f'{name} joined FamilyHub!',
            'Your family world is ready — welcome badges unlocked.',
            emoji='🎉',
            child_profile_id=str(profile['_id']),
            child_name=name,
            priority='high',
            show_parent=True,
            show_child=True,
        ),
        child_user_id=profile.get('userId'),
        child_profile_id=str(profile['_id']),
    )


def _check_family_milestones(db, household_id: str, completing_profile_id: str) -> None:
    if not household_id:
        return
    month_ago = _utcnow() - timedelta(days=30)

    month_count = db.chores.count_documents({
        'householdId': household_id,
        'completed': True,
        'completedAt': {'$gte': month_ago},
    })
    for milestone in FAMILY_ROUTINE_MILESTONES:
        if month_count == milestone:
            _emit(
                household_id,
                _base_payload(
                    'family_milestone',
                    f'Family completed {milestone} routines this month!',
                    'What an amazing team — celebrate this win together tonight!',
                    emoji='🏆',
                    priority='high',
                    show_parent=True,
                    show_child=True,
                ),
            )
            break

    profiles = list(db.child_profiles.find({
        'householdId': household_id,
        'status': {'$ne': 'archived'},
    }))
    if len(profiles) >= 2:
        all_clear = True
        for p in profiles:
            pid = str(p['_id'])
            pending = db.chores.count_documents({
                'householdId': household_id,
                'childProfileId': pid,
                'isTemplate': {'$ne': True},
                'completed': False,
                'status': 'active',
            })
            if pending > 0:
                all_clear = False
                break
        if all_clear:
            _emit(
                household_id,
                _base_payload(
                    'family_milestone',
                    'Everyone completed routines today!',
                    'The whole family showed up — that\'s real teamwork.',
                    emoji='💜',
                    priority='high',
                    show_parent=True,
                    show_child=True,
                ),
            )


def emit_chore_completion_celebrations(
    db,
    profile: dict,
    chore: dict,
    result: dict,
    previous_badges: set[str],
) -> None:
    household_id = profile.get('householdId')
    name = profile.get('displayName') or 'Child'
    pid = str(profile['_id'])
    child_user_id = profile.get('userId')
    points = int(result.get('pointsEarned') or 0)
    new_streak = int(result.get('streakDays') or 0)
    series_streak = int(result.get('seriesStreak') or 0) if result.get('seriesStreak') else 0

    earned_now = [b for b in (result.get('badges') or []) if b.get('earned') and b.get('id') not in previous_badges]

    is_routine = bool(chore.get('seriesId') or chore.get('routineGroup'))
    routine_label = chore.get('routineLabel') or chore.get('title') or 'Routine'

    if is_routine:
        emoji = '🌅' if chore.get('routineGroup') == 'morning' else '🌙' if chore.get('routineGroup') == 'evening' else '🎒' if chore.get('routineGroup') == 'after_school' else '✅'
        _emit(
            household_id,
            _base_payload(
                'chore_completed',
                f'{name} completed {routine_label}',
                f'+{points} stars · keep the family rhythm going!',
                emoji=emoji,
                child_profile_id=pid,
                child_name=name,
                points=points,
                priority='normal',
                show_parent=True,
                show_child=False,
            ),
        )

    if new_streak in STREAK_MILESTONES:
        streak_emoji = '🔥' if new_streak < 7 else '💪'
        _emit(
            household_id,
            _base_payload(
                'streak_milestone',
                f'{name} hit a {new_streak}-day streak!',
                'Amazing consistency — this is worth celebrating together.',
                emoji=streak_emoji,
                child_profile_id=pid,
                child_name=name,
                priority='high',
                show_parent=True,
                show_child=True,
            ),
            child_user_id=child_user_id,
            child_profile_id=pid,
        )

    if series_streak in SERIES_STREAK_MILESTONES:
        _emit(
            household_id,
            _base_payload(
                'streak_milestone',
                f'{routine_label} · {series_streak} in a row!',
                f'{name} is building a powerful habit streak.',
                emoji='🔁',
                child_profile_id=pid,
                child_name=name,
                priority='high',
                show_parent=True,
                show_child=True,
            ),
            child_user_id=child_user_id,
            child_profile_id=pid,
        )

    for badge in earned_now:
        _emit(
            household_id,
            _base_payload(
                'badge_earned',
                f'{name} unlocked {badge.get("label", "a badge")}!',
                'A special moment — praise the effort, not just the outcome.',
                emoji=badge.get('emoji') or '🏅',
                child_profile_id=pid,
                child_name=name,
                priority='high',
                show_parent=True,
                show_child=True,
            ),
            child_user_id=child_user_id,
            child_profile_id=pid,
        )

    _check_family_milestones(db, household_id or '', pid)

    if earned_now or new_streak in STREAK_MILESTONES or series_streak in SERIES_STREAK_MILESTONES or is_routine:
        _emit_activity_live(household_id, profile, chore, result)


def _emit_activity_live(household_id: str | None, profile: dict, chore: dict, result: dict) -> None:
    if not household_id:
        return
    try:
        from realtime_service import emit_household_event
        emit_household_event(household_id, 'family_activity', {
            'type': 'chore_completed',
            'childProfileId': str(profile['_id']),
            'childName': profile.get('displayName', 'Child'),
            'title': chore.get('title', 'Routine'),
            'message': f"+{result.get('pointsEarned', 0)} stars",
            'emoji': '✅',
            'createdAt': _utcnow().isoformat(),
            'ts': time.time(),
        })
    except Exception:
        pass
