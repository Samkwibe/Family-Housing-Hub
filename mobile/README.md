# Family Housing Hub — Mobile (Expo)

Native **iOS** and **Android** app for [Family Housing Hub](../README.md), sharing Firebase (`family-housing-hub`) and the production Flask API on Railway (`https://family-housing-hub-production.up.railway.app`).

## Why Expo (not Capacitor)

| Approach | Decision |
|----------|----------|
| **Expo (chosen)** | True native navigation, safe areas, maps, and Firebase Auth persistence via AsyncStorage. Better long-term UX on phones. |
| Capacitor | Faster initial wrap of the Vite web app, but weaker native feel, heavier WebView maps/chat, and more friction for store builds. |

Business logic mirrors the web app: email/phone login, Firestore profiles, verification codes, group messaging, AI chat, nearby places via backend.

## Folder structure

```
mobile/
  app/                    # Expo Router screens
    (auth)/               # login, register, onboarding
    (main)/(tabs)/        # dashboard, maps, messages, AI, more
    (main)/feature/       # stub routes for remaining web sections
  src/
    config/               # firebase, env
    contexts/             # AuthContext
    services/             # api, verification, messaging, userService
    utils/                # cache, phone (re-exports shared/)
  assets/
  app.json, eas.json
```

Shared phone helpers live in [`../shared/utils/phone.js`](../shared/utils/phone.js) (used by web + mobile via Metro `watchFolders`).

## Features

| Status | Feature |
|--------|---------|
| **Implemented** | Email/phone + password login, register (email or phone verification), onboarding, dashboard (cached), profile, settings, maps (location + backend places + markers), AI chat (`/api/ai/chat`), group messaging (Firestore send/receive) |
| **Stub (navigable)** | Rent, maintenance, documents, landlord, health, budget, calendar, resources, shopping, safety, security, house-search, children, help |

## Prerequisites

- Node 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- **iOS**: Xcode + Simulator (macOS)
- **Android**: Android Studio + emulator
- Optional: [EAS CLI](https://docs.expo.dev/build/introduction/) for device builds

## Setup

```bash
cd mobile
cp .env.example .env
# Edit .env — add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY for map tiles (iOS/Android native maps)
npm install
```

For **Android** Google Maps, add your API key to `app.json` / `AndroidManifest` when doing a dev client or EAS build (see [react-native-maps Expo docs](https://docs.expo.dev/versions/latest/sdk/map-view/)).

## Run locally

```bash
cd mobile
npm start
```

Then:

| Platform | Command |
|----------|---------|
| **iOS Simulator** | Press `i` in the Expo terminal, or `npm run ios` |
| **Android Emulator** | Press `a` in the Expo terminal, or `npm run android` |
| **Physical device** | Scan QR code with Expo Go (limited: native maps may need dev build) |

## Health checks

```bash
cd mobile
npx expo-doctor
npx tsc --noEmit
```

## Production builds (EAS)

1. `npm install -g eas-cli`
2. `eas login`
3. `eas init` (replace `REPLACE_WITH_EAS_PROJECT_ID` in `app.json`)
4. `eas build --platform ios` / `eas build --platform android`

## Blockers / keys

- **Render API**: Cold starts on free tier; AI/maps endpoints need Gemini/Google configured on the server.
- **Google Maps**: `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` + platform-specific setup for release builds.
- **SMS/Email verification**: Uses same backend as web; if delivery fails, set `EXPO_PUBLIC_SHOW_VERIFICATION_CODES=true` for dev.
- **Stream Chat**: Not wired on mobile yet (web uses Stream); group chat uses Firestore `groupMessages`.
- **EAS project ID**: Placeholder in `app.json` until you run `eas init`.

## Related web fixes (same repo)

- `GroupChatPanel` now calls `messagingService.sendGroupMessage`
- `verificationService` uses `VITE_API_URL` then `VITE_BACKEND_URL` (aligned with `api.js`)
- Shared US phone normalization in `shared/utils/phone.js`
