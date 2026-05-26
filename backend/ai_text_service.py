"""Shared AI text generation (NVIDIA → Gemini → OpenAI)."""
from __future__ import annotations

import os

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
) -> str | None:
    messages = [
        {'role': 'system', 'content': system_hint},
        {'role': 'user', 'content': prompt},
    ]
    text = _call_nvidia_chat(messages, max_tokens=max_tokens)
    if text:
        return text

    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content(f'{system_hint}\n\n{prompt}')
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
            return response.choices[0].message.content
        except Exception as exc:
            print(f'OpenAI error: {exc}')

    return None
