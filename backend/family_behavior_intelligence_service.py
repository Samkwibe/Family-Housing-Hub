"""Parent AI family assistant — warm behavioral intelligence from longitudinal family data."""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from bson import ObjectId

ROUTINE_LABELS = {
    'morning': 'Morning routines',
    'evening': 'Bedtime routines',
    'after_school': 'After-school routines',
}

CONSISTENCY_LABELS = (
    (85, 'Your family is shining ✨'),
    (70, 'Strong consistency this week'),
    (55, 'Building great habits together'),
    (40, 'Growing step by step'),
    (0, 'Every small win counts 💜'),
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _parse_dt(value) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            return None
    return None


def _consistency_label(score: int) -> str:
    for threshold, label in CONSISTENCY_LABELS:
        if score >= threshold:
            return label
    return CONSISTENCY_LABELS[-1][1]


def _collect_household_metrics(db, household_id: str, profiles: list[dict]) -> dict:
    now = _utcnow()
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)
    child_ids = [str(p['_id']) for p in profiles]
    name_map = {str(p['_id']): p.get('displayName', 'Child') for p in profiles}

    templates = list(db.chores.find({
        'householdId': household_id,
        'isTemplate': True,
        'status': {'$ne': 'archived'},
    })) if household_id else []

    completed_week = list(db.chores.find({
        'householdId': household_id,
        'childProfileId': {'$in': child_ids},
        'completed': True,
        'completedAt': {'$gte': week_ago},
    })) if household_id and child_ids else []

    completed_prev_week = list(db.chores.find({
        'householdId': household_id,
        'childProfileId': {'$in': child_ids},
        'completed': True,
        'completedAt': {'$gte': two_weeks_ago, '$lt': week_ago},
    })) if household_id and child_ids else []

    missed_week = list(db.chores.find({
        'householdId': household_id,
        'childProfileId': {'$in': child_ids},
        'status': 'missed',
        'missedAt': {'$gte': week_ago},
    })) if household_id and child_ids else []

    redemptions_week = list(db.child_reward_redemptions.find({
        'householdId': household_id,
        'status': 'approved',
        'resolvedAt': {'$gte': week_ago},
    })) if household_id else []

    redemptions_prev = list(db.child_reward_redemptions.find({
        'householdId': household_id,
        'status': 'approved',
        'resolvedAt': {'$gte': two_weeks_ago, '$lt': week_ago},
    })) if household_id else []

    history_entries: list[dict] = []
    routine_group_stats: dict[str, dict] = defaultdict(lambda: {'completed': 0, 'onTime': 0, 'total': 0})
    series_streaks: list[dict] = []
    completion_hours: list[int] = []
    completion_weekdays: Counter[int] = Counter()

    for t in templates:
        sid = t.get('seriesId')
        streak = int(t.get('seriesStreak') or 0)
        if streak > 0:
            series_streaks.append({
                'seriesId': sid,
                'title': t.get('title', 'Routine'),
                'childProfileId': t.get('childProfileId'),
                'childName': name_map.get(t.get('childProfileId', ''), 'Child'),
                'routineGroup': t.get('routineGroup'),
                'seriesStreak': streak,
                'recurrenceLabel': t.get('recurrenceLabel'),
            })
        group = t.get('routineGroup') or 'general'
        for entry in t.get('completionHistory') or []:
            history_entries.append({**entry, 'routineGroup': group, 'childProfileId': t.get('childProfileId')})
            routine_group_stats[group]['completed'] += 1
            if entry.get('onTime'):
                routine_group_stats[group]['onTime'] += 1
            dt = _parse_dt(entry.get('completedAt'))
            if dt and dt >= week_ago:
                completion_hours.append(dt.hour)
                completion_weekdays[dt.weekday()] += 1

    for c in completed_week:
        dt = _parse_dt(c.get('completedAt'))
        if dt:
            completion_hours.append(dt.hour)
            completion_weekdays[dt.weekday()] += 1

    active_children = sum(
        1 for p in profiles
        if int(p.get('streakDays') or 0) > 0 or int(p.get('totalChoresCompleted') or 0) > 0
    )
    max_streak = max((int(p.get('streakDays') or 0) for p in profiles), default=0)
    total_series_streak = sum(int(t.get('seriesStreak') or 0) for t in templates)

    due_instances = db.chores.count_documents({
        'householdId': household_id,
        'childProfileId': {'$in': child_ids},
        'isTemplate': False,
        'completed': False,
        'status': 'active',
    }) if household_id and child_ids else 0

    completed_due = len(completed_week)
    routine_rate = completed_due / max(1, completed_due + len(missed_week) + due_instances)

    return {
        'name_map': name_map,
        'child_ids': child_ids,
        'profiles': profiles,
        'templates': templates,
        'completed_week': completed_week,
        'completed_prev_week': completed_prev_week,
        'missed_week': missed_week,
        'redemptions_week': redemptions_week,
        'redemptions_prev': redemptions_prev,
        'history_entries': history_entries,
        'routine_group_stats': dict(routine_group_stats),
        'series_streaks': sorted(series_streaks, key=lambda x: x['seriesStreak'], reverse=True),
        'completion_hours': completion_hours,
        'completion_weekdays': completion_weekdays,
        'active_children': active_children,
        'max_streak': max_streak,
        'total_series_streak': total_series_streak,
        'routine_rate': routine_rate,
        'weekly_completions': len(completed_week),
        'prev_week_completions': len(completed_prev_week),
    }


def compute_family_consistency_score(metrics: dict) -> int:
    score = 35
    score += min(30, metrics['weekly_completions'] * 3)
    score += min(15, metrics['max_streak'] * 2)
    score += min(15, round(metrics['routine_rate'] * 15))
    score += min(10, metrics['active_children'] * 4)
    score += min(5, len(metrics['redemptions_week']) * 2)
    if metrics['weekly_completions'] > metrics['prev_week_completions']:
        score += 5
    return min(100, max(25, round(score)))


def _insight(
    iid: str,
    itype: str,
    emoji: str,
    title: str,
    message: str,
    priority: int = 50,
    child_profile_id: str | None = None,
    child_name: str | None = None,
) -> dict:
    return {
        'id': iid,
        'type': itype,
        'emoji': emoji,
        'title': title,
        'message': message,
        'priority': priority,
        'childProfileId': child_profile_id,
        'childName': child_name,
    }


def generate_family_insights(metrics: dict) -> list[dict]:
    insights: list[dict] = []
    name_map = metrics['name_map']

    for p in metrics['profiles']:
        streak = int(p.get('streakDays') or 0)
        name = p.get('displayName') or name_map.get(str(p['_id']), 'Your child')
        pid = str(p['_id'])
        if streak >= 7:
            insights.append(_insight(
                f'streak-{pid}',
                'celebration',
                '💪',
                f'{name} has a {streak}-day streak!',
                'What an amazing run — a small celebration could make this moment even more memorable.',
                priority=90,
                child_profile_id=pid,
                child_name=name,
            ))
        elif streak >= 3:
            insights.append(_insight(
                f'streak-{pid}',
                'milestone',
                '🔥',
                f'{name} is on a {streak}-day streak',
                'Momentum is building — keep cheering them on!',
                priority=75,
                child_profile_id=pid,
                child_name=name,
            ))

    if metrics['series_streaks']:
        top = metrics['series_streaks'][0]
        if top['seriesStreak'] >= 3:
            group = ROUTINE_LABELS.get(top.get('routineGroup') or '', top.get('title', 'Routine'))
            insights.append(_insight(
                f"series-{top['seriesId']}",
                'pattern',
                '🔁',
                f"{top['childName']}'s {group} is going strong",
                f"{top['seriesStreak']} completions in a row on \"{top['title']}\" — consistency is forming!",
                priority=80,
                child_profile_id=top.get('childProfileId'),
                child_name=top.get('childName'),
            ))

    group_stats = metrics['routine_group_stats']
    for group, stats in group_stats.items():
        if stats['completed'] >= 3 and group in ROUTINE_LABELS:
            on_time_pct = round(100 * stats['onTime'] / max(1, stats['completed']))
            insights.append(_insight(
                f'group-{group}',
                'pattern',
                '🌅' if group == 'morning' else '🌙' if group == 'evening' else '🎒',
                f"{ROUTINE_LABELS[group]} are taking shape",
                f"Your family completed {stats['completed']} this period — {on_time_pct}% on schedule. Beautiful rhythm!",
                priority=70,
            ))

    weekdays = metrics['completion_weekdays']
    if weekdays:
        weekday_total = sum(weekdays.get(d, 0) for d in range(5))
        weekend_total = sum(weekdays.get(d, 0) for d in (5, 6))
        if weekday_total > 0 and weekend_total > 0:
            if weekday_total >= weekend_total * 1.5:
                insights.append(_insight(
                    'weekday-strong',
                    'trend',
                    '📅',
                    'Weekday routines are your superpower',
                    'Your family completes the most during school days — a steady rhythm worth celebrating.',
                    priority=60,
                ))
        top_day = weekdays.most_common(1)
        if top_day and top_day[0][1] >= 3:
            day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            insights.append(_insight(
                'peak-day',
                'pattern',
                '✨',
                f"Strongest on {day_names[top_day[0][0]]}s",
                'Helpful to know when your family naturally shows up — lean into that energy!',
                priority=55,
            ))

    hours = metrics['completion_hours']
    if len(hours) >= 3:
        morning = sum(1 for h in hours if h < 9)
        evening = sum(1 for h in hours if h >= 17)
        if morning >= len(hours) * 0.4:
            insights.append(_insight(
                'timing-morning',
                'pattern',
                '☀️',
                'Morning is a great completion window',
                'Most routines finish before 9am — your family starts the day with intention.',
                priority=58,
            ))
        elif evening >= len(hours) * 0.4:
            insights.append(_insight(
                'timing-evening',
                'pattern',
                '🌙',
                'Evening routines are clicking',
                'Your family often wraps up routines after 5pm — a calm end-of-day rhythm.',
                priority=58,
            ))

    wc = metrics['weekly_completions']
    pw = metrics['prev_week_completions']
    if wc > 0 and pw > 0:
        delta = round(100 * (wc - pw) / pw)
        if delta >= 10:
            insights.append(_insight(
                'trend-up',
                'trend',
                '📈',
                f'Family completions up {delta}% this week',
                f'{wc} routines completed together — that\'s real progress!',
                priority=85,
            ))
        elif delta <= -15 and wc > 0:
            insights.append(_insight(
                'trend-soft',
                'encouragement',
                '💜',
                'A gentle week is still a good week',
                f'{wc} completions so far — small steps forward add up. You\'re doing great as a family.',
                priority=65,
            ))

    rw = len(metrics['redemptions_week'])
    rp = len(metrics['redemptions_prev'])
    if rw > 0:
        msg = f'{rw} reward{"s" if rw != 1 else ""} redeemed this week — rewards are fueling motivation!'
        if rp and rw > rp:
            delta = round(100 * (rw - rp) / rp)
            msg = f'Reward redemptions up {delta}% — your reward system is sparking engagement!'
        insights.append(_insight('rewards-engagement', 'trend', '🎁', 'Rewards are working', msg, priority=62))

    if wc >= 5:
        insights.append(_insight(
            'family-team',
            'celebration',
            '🎉',
            f'Your family completed {wc} routines this week',
            'That\'s teamwork in action — every completion builds trust and connection.',
            priority=88,
        ))

    if not insights and metrics['profiles']:
        insights.append(_insight(
            'getting-started',
            'encouragement',
            '🌱',
            'Your family journey is beginning',
            'Assign a daily routine and watch small wins turn into lasting habits together.',
            priority=40,
        ))

    insights.sort(key=lambda x: x['priority'], reverse=True)
    return insights[:8]


def build_summary_cards(metrics: dict, consistency_score: int, pending_redemptions: int) -> list[dict]:
    cards: list[dict] = []
    cards.append({
        'id': 'consistency',
        'emoji': '💜',
        'label': 'Family consistency',
        'value': str(consistency_score),
        'hint': _consistency_label(consistency_score),
    })

    if metrics['series_streaks']:
        top = metrics['series_streaks'][0]
        cards.append({
            'id': 'strongest-routine',
            'emoji': '🔁',
            'label': 'Strongest routine',
            'value': top['title'][:24],
            'hint': f"{top['childName']} · {top['seriesStreak']}🔥",
        })

    if metrics['max_streak'] > 0:
        top_child = max(metrics['profiles'], key=lambda p: int(p.get('streakDays') or 0))
        cards.append({
            'id': 'top-streak',
            'emoji': '🔥',
            'label': 'Top streak',
            'value': f"{int(top_child.get('streakDays') or 0)} days",
            'hint': top_child.get('displayName', 'Child'),
        })

    cards.append({
        'id': 'weekly-completions',
        'emoji': '✅',
        'label': 'This week',
        'value': str(metrics['weekly_completions']),
        'hint': 'routines completed',
    })

    if pending_redemptions:
        cards.append({
            'id': 'pending-rewards',
            'emoji': '🎁',
            'label': 'Awaiting you',
            'value': str(pending_redemptions),
            'hint': 'reward requests',
        })

    return cards


def build_trends(metrics: dict) -> dict:
    wc = metrics['weekly_completions']
    pw = metrics['prev_week_completions']
    rw = len(metrics['redemptions_week'])
    rp = len(metrics['redemptions_prev'])
    return {
        'weeklyCompletions': wc,
        'prevWeeklyCompletions': pw,
        'completionTrendPct': round(100 * (wc - pw) / pw) if pw else (100 if wc else 0),
        'rewardRedemptions': rw,
        'prevRewardRedemptions': rp,
        'rewardTrendPct': round(100 * (rw - rp) / rp) if rp else (100 if rw else 0),
        'activeChildren': metrics['active_children'],
        'maxStreak': metrics['max_streak'],
    }


def _rule_based_parent_messages(insights: list[dict], consistency_score: int) -> list[str]:
    messages = [i['message'] for i in insights[:3]]
    if not messages:
        messages.append('Your family hub is ready — assign a routine and celebrate the first win together.')
    return messages


def _maybe_llm_parent_summary(metrics: dict, insights: list[dict], consistency_score: int, household_id: str | None = None) -> str | None:
    import time
    start = time.perf_counter()
    try:
        from ai_text_service import generate_ai_text
    except ImportError:
        from observability_service import trace_ai
        trace_ai('parent_family_headline', duration_ms=(time.perf_counter() - start) * 1000, success=False, fallback=True, household_id=household_id, reason='import_failed')
        return None

    lines = [
        f'Family consistency score: {consistency_score}/100',
        f'Weekly completions: {metrics["weekly_completions"]} (prev {metrics["prev_week_completions"]})',
        f'Max child streak: {metrics["max_streak"]} days',
        f'Active children: {metrics["active_children"]}',
    ]
    for i in insights[:4]:
        lines.append(f'- {i["title"]}: {i["message"]}')

    prompt = (
        'Write ONE warm, encouraging sentence for a parent about their family\'s progress. '
        'Celebrate effort, not surveillance. No corporate tone. Max 25 words.\n\n'
        + '\n'.join(lines)
    )
    system = (
        'You are FamilyHub, a warm family companion. Supportive, emotionally intelligent, '
        'never supervisory or judgmental. Like Apple Family meets Duolingo encouragement.'
    )
    text = generate_ai_text(
        prompt,
        system_hint=system,
        max_tokens=80,
        observability_path='parent_family_headline',
        household_id=household_id,
    )
    if not text:
        from observability_service import trace_ai
        trace_ai('parent_family_headline', duration_ms=(time.perf_counter() - start) * 1000, success=False, fallback=True, household_id=household_id, reason='llm_unavailable')
    return text


def build_parent_family_intelligence(
    db,
    household_id: str | None,
    profiles: list[dict],
    pending_redemptions: list | None = None,
) -> dict:
    if not household_id or not profiles:
        return {
            'consistencyScore': 0,
            'consistencyLabel': 'Invite your first child to begin',
            'insights': [],
            'summaryCards': [],
            'trends': {},
            'aiRecommendations': ['Invite your first child or create a managed profile to start building family rhythms.'],
            'headline': None,
        }

    metrics = _collect_household_metrics(db, household_id, profiles)
    score = compute_family_consistency_score(metrics)
    label = _consistency_label(score)
    insights = generate_family_insights(metrics)
    pending_count = len(pending_redemptions or [])
    cards = build_summary_cards(metrics, score, pending_count)
    trends = build_trends(metrics)
    recommendations = _rule_based_parent_messages(insights, score)
    headline = _maybe_llm_parent_summary(metrics, insights, score, household_id)
    if headline:
        recommendations = [headline] + recommendations[:2]
    else:
        from observability_service import trace_ai
        trace_ai('parent_family_headline', duration_ms=0, success=True, provider='rule_based', fallback=True, household_id=household_id, reason='using_rule_insights')

    return {
        'consistencyScore': score,
        'consistencyLabel': label,
        'insights': insights,
        'summaryCards': cards,
        'trends': trends,
        'aiRecommendations': recommendations[:3],
        'headline': headline,
    }


def generate_child_companion_message(db, profile: dict, chores: list[dict], rewards: list[dict]) -> str:
    """Warm motivational companion — celebrates effort, never criticizes."""
    name = profile.get('displayName') or 'friend'
    pending = [c for c in chores if not c.get('completed')]
    points = int(profile.get('pointsBalance') or 0)
    streak = int(profile.get('streakDays') or 0)
    household_id = profile.get('householdId')
    pid = str(profile['_id'])

    routine_pending = [c for c in pending if c.get('routineGroup')]
    morning = [c for c in routine_pending if c.get('routineGroup') == 'morning']
    evening = [c for c in routine_pending if c.get('routineGroup') == 'evening']

    if not chores:
        return f"Hey {name}! When your parent adds a routine, you'll earn stars here. You've got this! ⭐"

    if not pending:
        if streak >= 7:
            return f"WOW {name}! {streak} days strong — you're basically a routine superhero! 🦸"
        if streak >= 3:
            return f"All done today, {name}! Your {streak}-day streak is glowing. Proud of you! 🌟"
        return f"Amazing work, {name}! Everything's complete today — time to enjoy your rewards! 🎉"

    if morning:
        return f"Good morning, {name}! ☀️ {len(morning)} morning mission{'s' if len(morning) != 1 else ''} — start strong!"
    if evening:
        return f"Hey {name}! 🌙 Bedtime routines ready — finish up and rest like a champion."

    if streak >= 3:
        return f"You're on a {streak}-day streak, {name}! 🔥 Just {len(pending)} more to keep it going!"

    best_series = 0
    if household_id:
        templates = list(db.chores.find({
            'householdId': household_id,
            'childProfileId': pid,
            'isTemplate': True,
        }).limit(10))
        best_series = max((int(t.get('seriesStreak') or 0) for t in templates), default=0)
    if best_series >= 3:
        return f"Your routine streak is {best_series} — so close to another win, {name}! 🚀"

    if rewards and points >= min(r['cost'] for r in rewards):
        return f"You've got enough stars for a reward, {name}! ⭐ Finish a chore or treat yourself!"

    return f"You've got {len(pending)} mission{'s' if len(pending) != 1 else ''} today, {name}. One step at a time — I believe in you! 💜"
