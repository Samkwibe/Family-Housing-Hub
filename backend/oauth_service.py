"""Verify OAuth tokens from mobile clients and return normalized user profiles."""
import os
from typing import Any

import jwt
import requests
from jwt import PyJWKClient

GOOGLE_CLIENT_IDS = [
    x.strip()
    for x in os.getenv('GOOGLE_OAUTH_CLIENT_IDS', os.getenv('GOOGLE_OAUTH_CLIENT_ID', '')).split(',')
    if x.strip()
]
MICROSOFT_CLIENT_ID = os.getenv('MICROSOFT_OAUTH_CLIENT_ID', '').strip()
GITHUB_CLIENT_ID = os.getenv('GITHUB_OAUTH_CLIENT_ID', '').strip()
APPLE_BUNDLE_ID = os.getenv('APPLE_BUNDLE_ID', 'com.familyhousinghub.app').strip()

APPLE_JWKS_CLIENT = PyJWKClient('https://appleid.apple.com/auth/keys')
MICROSOFT_JWKS_CLIENT = PyJWKClient(
    'https://login.microsoftonline.com/common/discovery/v2.0/keys'
)


class OAuthError(Exception):
    pass


def _split_name(full_name: str) -> tuple[str, str]:
    parts = (full_name or '').strip().split(None, 1)
    if not parts:
        return '', ''
    if len(parts) == 1:
        return parts[0], ''
    return parts[0], parts[1]


def verify_google(id_token: str | None = None, access_token: str | None = None) -> dict[str, Any]:
    if id_token:
        res = requests.get(
            'https://oauth2.googleapis.com/tokeninfo',
            params={'id_token': id_token},
            timeout=10,
        )
        if res.status_code != 200:
            raise OAuthError('Invalid Google token')
        data = res.json()
        if GOOGLE_CLIENT_IDS and data.get('aud') not in GOOGLE_CLIENT_IDS:
            raise OAuthError('Google token audience mismatch')
        email = (data.get('email') or '').lower()
        if not email:
            raise OAuthError('Google account has no email')
        return {
            'oauth_provider': 'google',
            'oauth_id': str(data.get('sub', '')),
            'email': email,
            'firstName': data.get('given_name') or _split_name(data.get('name', ''))[0],
            'lastName': data.get('family_name') or _split_name(data.get('name', ''))[1],
            'emailVerified': data.get('email_verified') in (True, 'true', 'True', '1'),
            'avatarUrl': data.get('picture'),
        }

    if access_token:
        res = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10,
        )
        if res.status_code != 200:
            raise OAuthError('Invalid Google access token')
        data = res.json()
        email = (data.get('email') or '').lower()
        if not email:
            raise OAuthError('Google account has no email')
        return {
            'oauth_provider': 'google',
            'oauth_id': str(data.get('sub', '')),
            'email': email,
            'firstName': data.get('given_name') or _split_name(data.get('name', ''))[0],
            'lastName': data.get('family_name') or _split_name(data.get('name', ''))[1],
            'emailVerified': bool(data.get('verified_email', True)),
            'avatarUrl': data.get('picture'),
        }

    raise OAuthError('Google id_token or access_token required')


def verify_microsoft(id_token: str | None = None, access_token: str | None = None) -> dict[str, Any]:
    if id_token:
        try:
            signing_key = MICROSOFT_JWKS_CLIENT.get_signing_key_from_jwt(id_token)
            payload = jwt.decode(
                id_token,
                signing_key.key,
                algorithms=['RS256'],
                audience=MICROSOFT_CLIENT_ID or None,
                options={'verify_aud': bool(MICROSOFT_CLIENT_ID)},
            )
        except jwt.PyJWTError as exc:
            raise OAuthError('Invalid Microsoft token') from exc
        email = (
            (payload.get('email') or payload.get('preferred_username') or payload.get('upn') or '')
            .lower()
        )
        if not email:
            raise OAuthError('Microsoft account has no email')
        name = payload.get('name', '')
        first, last = _split_name(name)
        return {
            'oauth_provider': 'microsoft',
            'oauth_id': str(payload.get('oid') or payload.get('sub', '')),
            'email': email,
            'firstName': payload.get('given_name') or first,
            'lastName': payload.get('family_name') or last,
            'emailVerified': True,
        }

    if access_token:
        res = requests.get(
            'https://graph.microsoft.com/v1.0/me',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10,
        )
        if res.status_code != 200:
            raise OAuthError('Invalid Microsoft access token')
        data = res.json()
        email = (data.get('mail') or data.get('userPrincipalName') or '').lower()
        if not email:
            raise OAuthError('Microsoft account has no email')
        first, last = _split_name(data.get('displayName', ''))
        return {
            'oauth_provider': 'microsoft',
            'oauth_id': str(data.get('id', '')),
            'email': email,
            'firstName': data.get('givenName') or first,
            'lastName': data.get('surname') or last,
            'emailVerified': True,
        }

    raise OAuthError('Microsoft id_token or access_token required')


def verify_github(access_token: str | None = None, **_kwargs) -> dict[str, Any]:
    if not access_token:
        raise OAuthError('GitHub access_token required')

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Family-Housing-Hub',
    }
    user_res = requests.get('https://api.github.com/user', headers=headers, timeout=10)
    if user_res.status_code != 200:
        raise OAuthError('Invalid GitHub token')
    user = user_res.json()

    email = (user.get('email') or '').lower()
    if not email:
        emails_res = requests.get('https://api.github.com/user/emails', headers=headers, timeout=10)
        if emails_res.status_code == 200:
            for entry in emails_res.json():
                if entry.get('primary') and entry.get('verified'):
                    email = (entry.get('email') or '').lower()
                    break
            if not email:
                for entry in emails_res.json():
                    if entry.get('verified'):
                        email = (entry.get('email') or '').lower()
                        break

    if not email:
        raise OAuthError('GitHub account has no public email. Add a verified email in GitHub settings.')

    name = user.get('name') or user.get('login', '')
    first, last = _split_name(name)
    return {
        'oauth_provider': 'github',
        'oauth_id': str(user.get('id', '')),
        'email': email,
        'firstName': first or str(user.get('login', '')),
        'lastName': last,
        'emailVerified': True,
        'avatarUrl': user.get('avatar_url'),
    }


def verify_apple(id_token: str | None = None, **_kwargs) -> dict[str, Any]:
    if not id_token:
        raise OAuthError('Apple identity token required')

    try:
        signing_key = APPLE_JWKS_CLIENT.get_signing_key_from_jwt(id_token)
        payload = jwt.decode(
            id_token,
            signing_key.key,
            algorithms=['RS256'],
            audience=APPLE_BUNDLE_ID,
            issuer='https://appleid.apple.com',
        )
    except jwt.PyJWTError as exc:
        raise OAuthError('Invalid Apple token') from exc

    email = (payload.get('email') or '').lower()
    if not email:
        raise OAuthError('Apple sign-in did not return an email. Use "Share My Email" when signing in.')

    return {
        'oauth_provider': 'apple',
        'oauth_id': str(payload.get('sub', '')),
        'email': email,
        'firstName': '',
        'lastName': '',
        'emailVerified': payload.get('email_verified', 'true') in (True, 'true', 'True'),
    }


def verify_oauth_provider(
    provider: str,
    *,
    id_token: str | None = None,
    access_token: str | None = None,
) -> dict[str, Any]:
    provider = (provider or '').lower().strip()
    verifiers = {
        'google': verify_google,
        'microsoft': verify_microsoft,
        'github': verify_github,
        'apple': verify_apple,
    }
    fn = verifiers.get(provider)
    if not fn:
        raise OAuthError(f'Unsupported provider: {provider}')

    profile = fn(id_token=id_token, access_token=access_token)
    if not profile.get('oauth_id'):
        raise OAuthError('OAuth provider did not return a user id')
    return profile
