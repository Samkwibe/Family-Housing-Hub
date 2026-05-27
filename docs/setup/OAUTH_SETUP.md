# OAuth setup (mobile + backend)

Family Housing Hub supports **Google**, **Microsoft**, **GitHub**, and **Apple** (iOS) sign-in alongside email/password.

## Redirect URI

The mobile app uses scheme `familyhousinghub` (see `app.json`). Redirect URI:

```
familyhousinghub://oauth
```

In Expo dev, `AuthSession.makeRedirectUri()` may also produce a proxy URL — add **every** URI shown in the Expo dev tools OAuth helper to each provider’s allowed redirect list.

---

## Backend (`backend/.env`)

Copy from `backend/env.example`:

| Variable | Purpose |
|----------|---------|
| `GOOGLE_OAUTH_CLIENT_IDS` | Comma-separated Web + iOS + Android client IDs (validates Google `id_token` audience) |
| `MICROSOFT_OAUTH_CLIENT_ID` | Azure app client ID (validates Microsoft `id_token`) |
| `GITHUB_OAUTH_CLIENT_ID` | GitHub OAuth app client ID (documentation; tokens verified via GitHub API) |
| `APPLE_BUNDLE_ID` | iOS bundle ID, default `com.familyhousinghub.app` |

**Endpoints:**

- `POST /api/auth/oauth` — body: `{ "provider", "idToken"?, "accessToken"? }`
- `POST /api/auth/oauth/{provider}` — same body

---

## Mobile (`mobile/.env`)

| Variable | Provider |
|----------|----------|
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Google Web client |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google iOS client |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google Android client |
| `EXPO_PUBLIC_MICROSOFT_CLIENT_ID` | Microsoft Azure app |
| `EXPO_PUBLIC_GITHUB_CLIENT_ID` | GitHub OAuth app |

Apple uses native Sign in with Apple (no client ID in `.env`).

---

## Google

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create **OAuth 2.0 Client IDs**: Web, iOS (bundle `com.familyhousinghub.app`), Android (package + SHA-1).
3. Authorized redirect URIs: `familyhousinghub://oauth` and Expo dev URIs if needed.
4. Copy client IDs into mobile `.env` and backend `GOOGLE_OAUTH_CLIENT_IDS`.

---

## Microsoft (Azure AD)

1. [Azure Portal](https://portal.azure.com/) → Microsoft Entra ID → App registrations → New registration.
2. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**.
3. Redirect URI: **Mobile and desktop applications** → `familyhousinghub://oauth`.
4. Authentication → enable **ID tokens**; add redirect URIs as needed.
5. Copy **Application (client) ID** to `EXPO_PUBLIC_MICROSOFT_CLIENT_ID` and `MICROSOFT_OAUTH_CLIENT_ID`.

---

## GitHub

1. GitHub → Settings → Developer settings → **OAuth Apps** → New OAuth App.
2. Authorization callback URL: `familyhousinghub://oauth` (and Expo proxy URL in dev).
3. Copy **Client ID** to mobile and backend env files.
4. Users must have a **verified email** on GitHub (public or via `/user/emails` scope).

---

## Apple (iOS only)

1. [Apple Developer](https://developer.apple.com/) → Identifiers → App ID → enable **Sign In with Apple**.
2. Bundle ID must match `com.familyhousinghub.app` and `APPLE_BUNDLE_ID`.
3. Run a **development build** (`expo run:ios` or EAS); Sign in with Apple does not work in Expo Go for production flows.
4. Users must choose **Share My Email** on first sign-in.

---

## Account linking

- Same email as an existing password account → OAuth links to that user (`oauthProvider` + `oauthId` stored).
- OAuth-only users have no `passwordHash`; they must use social sign-in.
