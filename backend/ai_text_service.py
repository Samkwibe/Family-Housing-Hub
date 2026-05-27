"""Shared AI text generation (NVIDIA → Gemini → OpenAI)."""
from __future__ import annotations

import os
import time

import google.generativeai as genai
import openai
import requests

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY') or os.getenv('VITE_GEMINI_API_KEY')
NVIDIA_API_KEY = os.getenv('NVIDIA_API_KEY') or os.getenv('INVidia_API_KEY')
NVIDIA_API_MODEL = os.getenv('NVIDIA_API_MODEL', 'meta/llama-3.1-70b-instruct')
NVIDIA_API_BASE = (os.getenv('NVIDIA_API_BASE') or 'https://integrate.api.nvidia.com/v1').rstrip('/')

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY


def _call_nvidia_chat(messages, max_tokens=800, timeout=45):
    if not NVIDIA_API_KEY:
        return None
    try:
        resp = requests.post(
            f'{NVIDIA_API_BASE}/chat/completions',
            headers={'Authorization': f'Bearer {NVIDIA_API_KEY}', 'Content-Type': 'application/json'},
            json={'model': NVIDIA_API_MODEL, 'messages': messages, 'max_tokens': max_tokens, 'temperature': 0.7},
            timeout=timeout,
        )
        resp.raise_for_status()
        return resp.json()['choices'][0]['message']['content']
    except Exception as exc:
        print(f'NVIDIA error: {exc}')
        return None


def generate_ai_text(
    prompt: str,
    system_hint: str = 'You are FamilyHub AI. Be helpful and concise.',
    max_tokens: int = 800,
    *,
    observability_path: str = 'generic',
    household_id: str | None = None,
) -> str | None:
    start = time.perf_counter()
    messages = [
        {'role': 'system', 'content': system_hint},
        {'role': 'user', 'content': prompt},
    ]
    text = _call_nvidia_chat(messages, max_tokens=max_tokens)
    if text:
        _trace_ai(observability_path, time.perf_counter() - start, True, 'nvidia', household_id)
        return text

    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content(f'{system_hint}\n\n{prompt}')
            _trace_ai(observability_path, time.perf_counter() - start, True, 'gemini', household_id)
            return response.text
        except Exception as exc:
            print(f'Gemini error: {exc}')

    if OPENAI_API_KEY:
        try:
            response = openai.ChatCompletion.create(
                model='gpt-3.5-turbo',
                messages=messages,
                max_tokens=max_tokens,
                temperature=0.7,
            )
            _trace_ai(observability_path, time.perf_counter() - start, True, 'openai', household_id)
            return response.choices[0].message.content
        except Exception as exc:
            print(f'OpenAI error: {exc}')

    _trace_ai(observability_path, time.perf_counter() - start, False, None, household_id, fallback=True)
    return None


def _trace_ai(path, elapsed_s, success, provider, household_id, fallback=False):
    try:
        from observability_service import trace_ai
        trace_ai(
            path,
            duration_ms=elapsed_s * 1000,
            success=success,
            provider=provider,
            fallback=fallback,
            household_id=household_id,
        )
    except Exception:
        pass
