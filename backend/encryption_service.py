"""AES-256-GCM field-level encryption for sensitive MongoDB fields."""
from __future__ import annotations

import base64
import hashlib
import os
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_ENC_PREFIX = 'enc:v1:'
_KEY: bytes | None = None


def _load_key() -> bytes:
    global _KEY
    if _KEY is not None:
        return _KEY
    raw = (os.getenv('FIELD_ENCRYPTION_KEY') or '').strip()
    if not raw:
        raise RuntimeError(
            'FIELD_ENCRYPTION_KEY is required in backend/.env — '
            'generate with: python -c "import secrets; print(secrets.token_hex(32))"'
        )
    if len(raw) == 64 and all(c in '0123456789abcdefABCDEF' for c in raw):
        _KEY = bytes.fromhex(raw)
    else:
        _KEY = hashlib.sha256(raw.encode('utf-8')).digest()
    return _KEY


def require_encryption_key() -> None:
    _load_key()


def is_encrypted(value: Any) -> bool:
    return isinstance(value, str) and value.startswith(_ENC_PREFIX)


def encrypt_value(plaintext: str | None) -> str | None:
    if plaintext is None or plaintext == '':
        return plaintext
    if is_encrypted(plaintext):
        return plaintext
    key = _load_key()
    aes = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aes.encrypt(nonce, plaintext.encode('utf-8'), None)
    blob = base64.urlsafe_b64encode(nonce + ciphertext).decode('ascii')
    return f'{_ENC_PREFIX}{blob}'


def decrypt_value(value: str | None) -> str | None:
    if value is None or value == '':
        return value
    if not is_encrypted(value):
        return value
    key = _load_key()
    aes = AESGCM(key)
    blob = base64.urlsafe_b64decode(value[len(_ENC_PREFIX):].encode('ascii'))
    nonce, ciphertext = blob[:12], blob[12:]
    return aes.decrypt(nonce, ciphertext, None).decode('utf-8')


def encrypt_fields(doc: dict, fields: tuple[str, ...]) -> dict:
    out = dict(doc)
    for field in fields:
        if field in out and out[field] is not None:
            if isinstance(out[field], str):
                out[field] = encrypt_value(out[field])
            elif isinstance(out[field], (int, float)):
                out[field] = encrypt_value(str(out[field]))
    return out


def decrypt_fields(doc: dict | None, fields: tuple[str, ...]) -> dict | None:
    if not doc:
        return doc
    out = dict(doc)
    for field in fields:
        if field in out and out[field] is not None:
            if isinstance(out[field], str):
                out[field] = decrypt_value(out[field])
            elif isinstance(out[field], (int, float)) and is_encrypted(str(out[field])):
                decrypted = decrypt_value(str(out[field]))
                try:
                    out[field] = float(decrypted) if '.' in decrypted else int(decrypted)
                except ValueError:
                    out[field] = decrypted
    return out


HEALTH_RECORD_FIELDS = (
    'title', 'notes', 'checkupType', 'vaccineName', 'dose', 'memberName', 'type',
)
MEDICATION_FIELDS = ('name', 'dosage', 'schedule', 'notes', 'memberName')
DOSE_LOG_FIELDS = ('notes', 'status')
EMERGENCY_FIELDS = ('contactName', 'contactPhone', 'medicalNotes', 'addressNotes')
MEMBER_INCOME_FIELDS = ('monthlyGrossIncome', 'monthlyNetIncome', 'annualIncome')
INCOME_SPLIT_FIELDS = ('ratios', 'notes')
DOCUMENT_FILE_KEY_FIELDS = ('fileKey', 'storageKey')
