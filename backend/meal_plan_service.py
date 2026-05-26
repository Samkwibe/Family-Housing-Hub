"""Fridge-to-meal-plan: expiry-first constraint ordering + AI generation."""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone


def _utcnow():
    return datetime.now(timezone.utc)


def _days_until(expires_at) -> int:
    if not expires_at:
        return 999
    if isinstance(expires_at, str):
        try:
            dt = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        except ValueError:
            return 999
    else:
        dt = expires_at
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return max(0, (dt - _utcnow()).days)


def sort_inventory_by_expiry(inventory: list) -> list[dict]:
    items = []
    for item in inventory:
        expires = item.get('expiresAt')
        days = _days_until(expires)
        items.append({
            'id': str(item.get('_id', item.get('id', ''))),
            'name': item.get('name', 'Item'),
            'location': item.get('location', 'fridge'),
            'quantity': item.get('quantity', ''),
            'daysUntilExpiry': days,
            'expiresAt': expires.isoformat() if hasattr(expires, 'isoformat') else str(expires or ''),
        })
    items.sort(key=lambda x: (x['daysUntilExpiry'], x['name']))
    return items


def build_meal_plan_prompt(inventory: list[dict], days: int = 7) -> tuple[str, str]:
    sorted_items = sort_inventory_by_expiry(inventory)
    priority = sorted_items[:15]
    lines = [
        f"- {i['name']} (expires in {i['daysUntilExpiry']} days, {i['location']})"
        for i in priority
    ]
    inventory_block = '\n'.join(lines) if lines else 'No inventory tracked'

    system_hint = (
        'You are Chef AI for FamilyHub. Build meal plans that USE FRIDGE ITEMS EXPIRING SOONEST FIRST. '
        'Minimize waste. Flag meals needing ingredients not in the pantry.'
    )
    prompt = f"""Create a {days}-day meal plan (breakfast, lunch, dinner each day).

FRIDGE INVENTORY (sorted by expiry — use top items first):
{inventory_block}

Rules:
1. Prioritize items expiring within 3 days in the first 2 days of meals.
2. Each meal must list which fridge items it uses.
3. Mark any meal that needs ingredients NOT in the inventory as needsShopping: true.

Return valid JSON:
{{
  "days": [
    {{
      "day": 1,
      "dateLabel": "Mon",
      "meals": [
        {{
          "type": "breakfast|lunch|dinner",
          "name": "Meal name",
          "usesFridgeItems": ["item1"],
          "needsShopping": false,
          "missingIngredients": [],
          "notes": "brief prep note"
        }}
      ]
    }}
  ],
  "summary": "one sentence about waste reduction"
}}"""
    return system_hint, prompt


def parse_meal_plan_response(text: str) -> dict:
    if not text:
        return {'raw': '', 'days': [], 'summary': ''}
    cleaned = re.sub(r'^```json\s*|\s*```$', '', text.strip(), flags=re.MULTILINE)
    try:
        data = json.loads(cleaned)
        return data
    except json.JSONDecodeError:
        return {'raw': text, 'days': [], 'summary': text[:200]}


def fallback_meal_plan(inventory: list, days: int = 7) -> dict:
    """Deterministic plan when AI is slow/unavailable — expiry-first ordering."""
    sorted_items = sort_inventory_by_expiry(inventory)
    names = [i['name'] for i in sorted_items] or ['pantry staples']
    days_out = []
    for d in range(1, days + 1):
        focus = names[(d - 1) % len(names)]
        secondary = names[d % len(names)] if len(names) > 1 else focus
        meals = [
            {'type': 'breakfast', 'name': f'{focus} scramble', 'usesFridgeItems': [focus], 'needsShopping': False, 'missingIngredients': []},
            {'type': 'lunch', 'name': f'{secondary} bowl', 'usesFridgeItems': [secondary], 'needsShopping': len(names) < 2},
            {'type': 'dinner', 'name': f'Use-up {focus} & {secondary}', 'usesFridgeItems': [focus, secondary], 'needsShopping': False, 'missingIngredients': ['olive oil'] if d > 5 else []},
        ]
        days_out.append({'day': d, 'dateLabel': f'Day {d}', 'meals': meals})
    return {
        'days': days_out,
        'summary': f'Prioritized {names[0]} and items expiring within {sorted_items[0]["daysUntilExpiry"] if sorted_items else 0} days.',
    }


def format_meal_plan_display(plan: dict) -> str:
    if plan.get('raw') and not plan.get('days'):
        return plan['raw']
    lines = [plan.get('summary', ''), '']
    for day in plan.get('days', []):
        lines.append(f"Day {day.get('day')} ({day.get('dateLabel', '')})")
        for meal in day.get('meals', []):
            uses = ', '.join(meal.get('usesFridgeItems') or []) or 'none'
            flag = ' ⚠ needs shopping' if meal.get('needsShopping') else ''
            lines.append(f"  {meal.get('type', 'meal').title()}: {meal.get('name')}{flag}")
            lines.append(f"    Uses: {uses}")
            if meal.get('missingIngredients'):
                lines.append(f"    Missing: {', '.join(meal['missingIngredients'])}")
        lines.append('')
    return '\n'.join(lines).strip()
