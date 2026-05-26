"""Conversational memory — embeddings per household, cosine retrieval for related past sessions."""
from __future__ import annotations

import hashlib
import math
import re
from datetime import datetime, timezone

EMBED_DIM = 128


def _utcnow():
    return datetime.now(timezone.utc)


def _tokenize(text: str) -> list[str]:
    return re.findall(r'[a-z0-9]+', (text or '').lower())


def embed_text(text: str) -> list[float]:
    """Lightweight local embedding (feature hashing) — no external API required."""
    vec = [0.0] * EMBED_DIM
    tokens = _tokenize(text)
    if not tokens:
        return vec
    for token in tokens:
        h = int(hashlib.sha256(token.encode()).hexdigest(), 16)
        idx = h % EMBED_DIM
        sign = 1.0 if (h >> 8) & 1 else -1.0
        vec[idx] += sign
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    return sum(x * y for x, y in zip(a, b))


def store_session(db, household_id: str, user_message: str, ai_response: str) -> None:
    combined = f"{user_message}\n{ai_response}".strip()
    if not combined:
        return
    db.ai_chat_sessions.insert_one({
        'householdId': household_id,
        'userMessage': user_message,
        'aiResponse': ai_response,
        'embedding': embed_text(combined),
        'createdAt': _utcnow(),
    })
    # Keep last 200 sessions per household
    excess = db.ai_chat_sessions.count_documents({'householdId': household_id}) - 200
    if excess > 0:
        old = list(
            db.ai_chat_sessions.find({'householdId': household_id})
            .sort('createdAt', 1)
            .limit(excess)
        )
        if old:
            db.ai_chat_sessions.delete_many({'_id': {'$in': [d['_id'] for d in old]}})


def retrieve_relevant_sessions(
    db,
    household_id: str,
    query: str,
    *,
    limit: int = 3,
    min_similarity: float = 0.25,
) -> list[dict]:
    query_vec = embed_text(query)
    sessions = list(
        db.ai_chat_sessions.find({'householdId': household_id})
        .sort('createdAt', -1)
        .limit(80)
    )
    ranked = []
    for session in sessions:
        sim = cosine_similarity(query_vec, session.get('embedding') or [])
        if sim >= min_similarity:
            ranked.append((sim, session))
    ranked.sort(key=lambda x: x[0], reverse=True)
    return [
        {
            'similarity': round(sim, 3),
            'userMessage': s.get('userMessage', ''),
            'aiResponse': s.get('aiResponse', ''),
            'createdAt': s.get('createdAt').isoformat() if s.get('createdAt') else '',
        }
        for sim, s in ranked[:limit]
    ]


def format_memory_for_prompt(sessions: list[dict]) -> str:
    if not sessions:
        return ''
    lines = ['=== RELEVANT PAST CONVERSATIONS ===']
    for i, s in enumerate(sessions, 1):
        lines.append(
            f"{i}. (similarity {s['similarity']}) User asked: \"{s['userMessage'][:200]}\" "
            f"→ You answered: \"{s['aiResponse'][:300]}\""
        )
    lines.append('=== END PAST CONVERSATIONS — reference when the current question relates ===')
    return '\n'.join(lines)
