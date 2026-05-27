# Feature Completion Audit — All Portals

> **Date:** May 25, 2026  
> **Purpose:** Pre-fix baseline — every feature, end-to-end status before Phase A/B work  
> **Governance:** [`DEVELOPMENT_CHARTER.md`](DEVELOPMENT_CHARTER.md) Definition of Complete  
> **Companion:** [`PLATFORM_INVENTORY.md`](PLATFORM_INVENTORY.md)

**User request:** Audit first. Fix nothing until this is reviewed and prioritized together.

---

## How to read this document

### Status (overall — what a real user experiences today)

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully working — user can complete the entire flow end-to-end on a real device with backend + keys configured |
| 🟡 | Partial — UI and/or backend exists but flow incomplete, env-dependent, empty-by-design, or misleading |
| 🔴 | Stub / broken — screen exists but core action fails, stub backend, or navigation broken |

### Column definitions

| Column | Question answered |
|--------|-----------------|
| **Backend** | Is API/service real Mongo logic or stub/mock? |
| **Mobile UI** | Wired to real API vs static/fake? |
| **Buttons/forms** | Does every primary action do something? |
| **States** | Loading + empty + error present? |
| **Real device** | Works off simulator with production-like URL + keys? |

---

## Executive summary

| Portal | ✅ | 🟡 | 🔴 | Notes |
|--------|----|----|-----|-------|
| **Mobile — Renter** | 18 | 9 | 3 | Strongest Household OS; stubs in Help/Neighborhood/Resources |
| **Mobile — Parent (My Children)** | 6 | 2 | 0 | Best mature path; homework assign UI missing |
| **Mobile — Child** | 7 | 2 | 0 | Messages preview-only; homework no complete |
| **Mobile — Owner (`activePortal: owner`)** | 0 | 1 | 2 | Dashboard only; no property CRUD; Settings nav broken |
| **Web — Renter** | 12 | 10 | 2 | Firebase-primary; parallel to mobile Mongo stack |
| **Web — Owner** | 4 | 4 | 0 | Firestore CRUD; weak route guards |
| **Web — Child** | 1 | 0 | 0 | Single rich Firebase page; isolated from Mongo child portal |
| **Cross-cutting infra** | 2 | 4 | 4 | Celery worker in blueprint; no Beat; push stub; legacy automation stubs |

**Bottom line:** ~40% of surfaced mobile modules are ✅ for happy-path renters with backend running. Owner mobile portal and several “OS modules” are 🟡/🔴. Web is a **separate Firebase stack** — not unified with mobile Mongo child/family APIs.

---

## Phase A — Infrastructure (must confirm before feature fixes)

| Item | Backend | Mobile impact | Status | Evidence / notes |
|------|---------|---------------|--------|------------------|
| **Celery worker on Render** | Worker defined in `render.yaml` | Email, AI tips, automation, recurring chores | 🟡 **Unconfirmed in prod** | Blueprint: `family-housing-hub-worker` runs `celery -A celery_app worker`. **You must verify in Render dashboard** that worker service is deployed and healthy. |
| **Redis on Render** | Required for Celery + cache | Dashboard cache, job queue | 🟡 **Unconfirmed** | `REDIS_URL` in `render.yaml` (`sync: false`). If unset, Celery may fail silently; app falls back locally. **Confirm in Render env.** |
| **Celery Beat / hourly automation** | 🔴 Not configured | Automations, recurring chores, shopping auto-add | 🔴 | No `beat_schedule` in `celery_app.py`. No Beat service in `render.yaml`. Hourly automation only via **daemon thread when running `python app.py` directly** — **not in gunicorn production**. |
| **Push notifications (FCM/APNs)** | 🔴 `tasks.send_push_notification` prints only; never called | No device alerts | 🔴 | SOS, geofence, automation firings use `print()` only |
| **`GET /api/automation/notifications`** | 🔴 Hardcoded sample | Any client calling this gets fake data | 🔴 | `app.py` — single “Rent Due Soon” item |
| **`POST /api/automation/reminders`** | 🔴 Ephemeral in-memory | No persistence | 🔴 | `app.py` — comment says use DB in production |
| **Real automation alerts** | 🟡 Rules engine writes DB; notify action prints | In-app alerts from dashboard ✅ | 🟡 | Mobile Notifications screen uses household `alerts` from dashboard, not stub endpoint |
| **Web `/help` route** | N/A | N/A | 🔴 | `App.jsx` imports `HelpCenter.jsx` which renders 404 UI; real FAQ in unrouted `Help.jsx` |
| **Environment matrix** | — | — | 🟡 | See [Environment variables by feature](#environment-variables-by-feature) below |

### Phase A verdict

**Cannot mark Phase A complete until:**
1. Render dashboard confirms worker + Redis running
2. Celery Beat (or cron) added for `run_hourly_automation`
3. Push notification implementation + device token registration
4. Legacy stub endpoints removed or replaced
5. Web `/help` fixed
6. Env matrix published and keys verified per feature

---

## Environment variables by feature

### Backend (`backend/.env` / Render `fhh-backend-shared`)

| Feature / domain | Required variables | Optional / fallback |
|------------------|-------------------|---------------------|
| **All API** | `MONGODB_URI`, `JWT_SECRET`, `FIELD_ENCRYPTION_KEY` | — |
| **Auth email** | `SMTP_*`, `EMAIL_FROM` | Dev: codes printed to console |
| **SMS verification** | `TWILIO_*` | Skip if unset |
| **OAuth** | `GOOGLE_OAUTH_CLIENT_IDS` (+ provider secrets per provider) | — |
| **Celery / cache** | `REDIS_URL` | Graceful no-cache fallback |
| **AI chat / tips** | One of: `NVIDIA_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY` | Rule-based fallback (degraded) |
| **AI food scan** | `GEMINI_API_KEY` or `NVIDIA_API_KEY` | Manual add only |
| **Maps / weather / places** | `GOOGLE_MAPS_API_KEY` | Mapbox / OSM fallbacks for some endpoints |
| **Property search** | `GOOGLE_MAPS_API_KEY` + one of Estated/Realtor/ATTOM keys in `app.py` | Empty results + helper URL |
| **Document upload** | `S3_*` or R2-compatible | 503 when unconfigured |
| **Observability internal** | `OBSERVABILITY_INTERNAL_KEY` (prod) | Dev: open if unset |
| **Push (when built)** | FCM server key / APNs credentials | Not in env.example yet |

### Mobile (`mobile/.env`)

| Feature | Required | Notes |
|---------|----------|-------|
| **All features** | `EXPO_PUBLIC_API_URL` | Must reach running backend (LAN IP for device, not localhost) |
| **Maps tab (native tiles)** | `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Same key as backend `GOOGLE_MAPS_API_KEY` |
| **OAuth / Firebase** | Provider client IDs as configured | — |

### Web (`.env.local`)

| Feature | Required | Notes |
|---------|----------|-------|
| **Core** | Firebase config vars | Primary data layer |
| **Stripe rent** | `VITE_STRIPE_PUBLISHABLE_KEY` + backend Stripe secret | Mock fallback |
| **House search** | `VITE_API_URL` + Maps key | Dual Firebase + API |
| **AI assistant** | AWS Bedrock / Gemini keys | Degraded without |

---

# MOBILE — RENTER PORTAL

## Main tabs

| Feature | Backend | Mobile UI | Buttons/forms | States | Real device | **Overall** |
|---------|---------|-----------|---------------|--------|-------------|-------------|
| **Dashboard** | ✅ `/api/dashboard/renter` or household dashboard | ✅ Real API | ✅ Refresh, tiles, AI search, My Children | ✅ Error banner, empty alerts | 🟡 Weather needs GPS + Maps key | **🟡** |
| **Maps** | ✅ `/api/location/*` | ✅ Native `maps.native.tsx` | ✅ Search, categories, AI sheet | ✅ Loading, GPS denied, errors | 🟡 Dev client + Maps key; web preview stub | **🟡** |
| **Messages** | ✅ `/api/messages/groups` | ✅ Real API | ✅ Create group, open chat | ✅ Loading, empty, Alert errors | ✅ With reachable API | **✅** |
| **Group chat** | ✅ + Socket.IO | ✅ Real API | ✅ Send message | 🟡 Send errors only | ✅ | **✅** |
| **AI Assistant** | ✅ `/api/ai/chat` | ✅ Real API | ✅ Send, voice, personas | ✅ Inline thread errors | 🟡 Needs AI key on backend | **🟡** |
| **More (directory)** | N/A | ✅ Registry navigation | ✅ All rows navigate | — | ✅ | **✅** |
| **Settings** | ✅ Invites, location, permissions | ✅ Real API | ✅ All forms | ✅ Toasts (fixed) | 🟡 Geofence needs background location | **✅** |
| **Profile** | ✅ `/api/auth/profile` | ✅ Real API | ✅ Save, role, address | ✅ Alert on error | ✅ | **✅** |

## Parent flows (inside Renter shell)

| Feature | Backend | Mobile UI | Buttons/forms | States | Real device | **Overall** |
|---------|---------|-----------|---------------|--------|-------------|-------------|
| **My Children list** | ✅ `/api/child/parent/dashboard` | ✅ | ✅ Add child, approve, navigate | ✅ Loading, error, refresh | ✅ | **✅** |
| **Child detail** | ✅ Chores, rewards, routines | ✅ | ✅ Assign chore, rewards, bonus, pause routine | ✅ Modals, toasts | ✅ | **✅** |
| **Assign homework** | ✅ `POST /api/child/homework` | 🔴 No UI | 🔴 | — | — | **🔴** |
| **Family memories** | ✅ `/api/child/memories` | ✅ | ✅ Timeline, resurface | ✅ Loading, empty, error | ✅ | **✅** |
| **Child invite (Settings)** | ✅ | ✅ | ✅ | ✅ Toasts | ✅ | **✅** |
| **Live activity / celebrations** | ✅ Socket.IO | ✅ | — | ✅ | ✅ | **✅** |

## Household OS — 28 registry features

| Feature | Backend | Mobile UI | Buttons/forms | States | Real device | **Overall** |
|---------|---------|-----------|---------------|--------|-------------|-------------|
| **Smart Fridge** | ✅ Inventory + AI image | ✅ | ✅ Scan, add manual | ✅ Empty, toast, loading | 🟡 Camera + AI key | **🟡** |
| **Meal Planner** | ✅ `/api/meals/generate-plan` | ✅ | ✅ Regenerate | ✅ Error, empty inventory msg | 🟡 Needs fridge data + AI | **🟡** |
| **Inventory** | ✅ Read via dashboard | 🟡 Read-only | 🟡 AI button only | ✅ Empty | ✅ Empty until fridge used | **🟡** |
| **Shopping** | ✅ Shopping list API | 🟡 Read-only list | 🟡 AI only; no check-off | ✅ Empty | 🟡 Auto-add needs Celery Beat | **🟡** |
| **Rent Split** | ✅ Expenses + split APIs | ✅ | ✅ Add bill, split modes, mark paid | ✅ Empty states | ✅ | **✅** |
| **Credit Builder** | 🟡 Local rent history only; no bureau API | ✅ | ✅ Toggle bureaus (prefs only) | ✅ Empty history | ✅ Misleading if user expects real reporting | **🟡** |
| **Financial Goals** | ✅ Goals + forecast APIs | ✅ | ✅ Add goal, tabs, forecast | ✅ Loading, empty | 🟡 Forecast needs data | **✅** |
| **Subscriptions** | 🟡 Filtered expenses | 🟡 No dedicated CRUD | 🟡 AI only | ✅ Empty | ✅ | **🟡** |
| **Energy & Utilities** | ✅ Utility readings API | ✅ | ✅ Log bill, AI tips | ✅ Empty | ✅ | **✅** |
| **Maintenance** | ✅ CRUD | ✅ | ✅ Submit, resolve, rate | ✅ Empty active/done | ✅ | **✅** |
| **Move-in Checklist** | ✅ + S3 photos | ✅ | ✅ Toggle, camera, photo | ✅ Progress, seeding | 🟡 Storage must be configured | **🟡** |
| **Package Tracker** | ✅ CRUD | ✅ | ✅ Add, status updates | ✅ Empty, stats | ✅ | **✅** |
| **Lease Renewal AI** | 🟡 Market API + docs | 🟡 | 🟡 AI CTA only | ✅ Empty until lease saved | 🟡 No negotiation workflow | **🟡** |
| **Document Vault** | ✅ + presigned upload | ✅ | ✅ Upload, open, metadata | ✅ Empty, upload errors | 🟡 S3/R2 required | **🟡** |
| **Owner Portal (in More)** | 🟡 Household read model | 🟡 | 🔴 Not real owner API | ✅ Empty hints | 🔴 Misleading name | **🔴** |
| **Chores (renter)** | ✅ + offline queue | ✅ | ✅ Add, complete | ✅ Empty, offline | ✅ | **✅** |
| **Calendar** | 🟡 Derived bills/chores | 🟡 | 🔴 No add event | ✅ Empty | 🔴 Not a real calendar | **🟡** |
| **Health** | ✅ Clinical APIs | ✅ | ✅ Mark dose, 911 links | ✅ Loading, empty | 🟡 No add-record UI in mobile | **🟡** |
| **Community Board** | 🟡 User-scoped posts | ✅ | ✅ Create post | ✅ Empty | ✅ | **🟡** |
| **Neighborhood** | 🔴 No walk score API | 🔴 Static redirect | 🟡 Maps + AI only | 🟡 Copy only | 🔴 Feature implied but absent | **🔴** |
| **House Search** | ✅ Property search API | ✅ | ✅ Search, filter | ✅ Loading, errors | 🟡 Property API keys + ZIP in profile | **🟡** |
| **Resources** | 🔴 Static links | 🔴 | 🟡 Maps + AI | — | 🔴 Not localized | **🔴** |
| **Automations** | ✅ Rules API | ✅ | ✅ Toggle rules | ✅ Loading, empty | 🟡 Rules fire only if Celery Beat runs | **🟡** |
| **Smart Home** | ✅ Manual device registry | 🟡 | ✅ Add device manually | ✅ Empty | 🔴 No live Ring/Nest/Alexa | **🟡** |
| **Smart Notifications** | ✅ Dashboard alerts (real) | ✅ | ✅ Dismiss, AI link | ✅ “All clear” | ✅ Not push — in-app only | **🟡** |
| **Safety & Emergency** | ✅ Profile + zones + ping | ✅ | ✅ SOS 911, edit profile | ✅ Empty zones | 🟡 Geofence alert = print on server | **🟡** |
| **Security** | 🟡 Device list from smart home | 🟡 | 🟡 AI checklist | ✅ Empty devices | 🔴 Biometrics info only | **🟡** |
| **Help** | 🔴 Stub | 🔴 StubFeature | 🟡 AI only | 🔴 No FAQ | 🔴 | **🔴** |

## Extra routes (not in registry)

| Feature | Backend | Mobile UI | Buttons/forms | States | Real device | **Overall** |
|---------|---------|-----------|---------------|--------|-------------|-------------|
| **Purchase Readiness** | ✅ Predictive API | ✅ | — | ✅ Loading, empty | 🟡 Needs financial data | **🟡** |

---

# MOBILE — OWNER PORTAL (`activePortal: owner`)

| Feature | Backend | Mobile UI | Buttons/forms | States | Real device | **Overall** |
|---------|---------|-----------|---------------|--------|-------------|-------------|
| **Owner dashboard** | 🟡 `/api/dashboard/owner` — static AI strings | 🟡 `OwnerShell` only | 🟡 Refresh, switch to renter | ✅ Loading, error | 🟡 | **🟡** |
| **Property CRUD** | ✅ `/api/owner/properties` | 🔴 No UI | 🔴 | — | — | **🔴** |
| **Tenants / leases / rent collection** | 🔴 Not on backend | 🔴 | 🔴 | — | — | **🔴** |
| **Settings (from Owner shell)** | ✅ Same API | 🔴 Nav likely broken | 🔴 | — | 🔴 No Stack when OwnerShell active | **🔴** |
| **Full OS as owner** | ✅ | 🟡 `userType: owner` + `activePortal: renter` | ✅ Renter shell with owner filters | ✅ | Usable workaround, not true owner portal | **🟡** |

---

# MOBILE — CHILD PORTAL

| Feature | Backend | Mobile UI | Buttons/forms | States | Real device | **Overall** |
|---------|---------|-----------|---------------|--------|-------------|-------------|
| **Welcome onboarding** | ✅ | ✅ | ✅ Avatar, theme, name | ✅ Blocks tabs until done | ✅ | **✅** |
| **Home** | ✅ Child dashboard | ✅ | ✅ Complete chores, memories | ✅ Loading, error, empty | ✅ | **✅** |
| **Tasks (chores)** | ✅ | ✅ | ✅ Complete chore | ✅ Empty, celebrations | ✅ | **✅** |
| **Tasks (homework)** | ✅ Assign exists | 🟡 Display only | 🔴 No complete action | ✅ Empty | 🔴 End-to-end broken | **🔴** |
| **Rewards** | ✅ | ✅ | ✅ Redeem request | ✅ Empty, celebration, errors | ✅ | **✅** |
| **Messages** | ✅ Groups API exists | 🟡 Preview text only | 🔴 No compose/send | ✅ Empty preview | 🔴 Child-safe chat missing | **🔴** |
| **Settings (Me)** | ✅ | ✅ | ✅ Refresh, switch portal | ✅ | ✅ | **✅** |
| **SOS** | 🟡 DB insert only; no push/socket to parent | ✅ | ✅ Confirm send | ✅ Alert on fail | 🟡 Parent may not be notified realtime | **🟡** |
| **Family memories** | ✅ | ✅ | ✅ View timeline | ✅ Loading, empty | ✅ | **✅** |
| **Celebrations / haptics** | ✅ Socket + local | ✅ | — | ✅ | ✅ | **✅** |

---

# WEB APP (Secondary / Firebase stack)

> Not the primary platform per charter. Included because users may still hit these flows.

## Renter (web)

| Feature | Backend | Web UI | Buttons/forms | States | **Overall** |
|---------|---------|--------|---------------|--------|-------------|
| Dashboard | Firebase | ✅ | ✅ | 🟡 | **✅** |
| Rent & payments | Firebase + Stripe API | ✅ | ✅ | 🟡 Stripe optional | **🟡** |
| Maintenance | Firebase | ✅ | ✅ | ✅ | **✅** |
| Documents | Firebase Storage | ✅ | ✅ | ✅ | **✅** |
| Messages | Firebase (+ Stream optional) | ✅ | ✅ | 🟡 | **🟡** |
| Landlord | 🔴 Hardcoded | 🔴 Static card | 🔴 | — | **🔴** |
| House search | API + Maps | ✅ | ✅ | 🟡 Keys | **🟡** |
| Budget / calendar / shopping | Firebase | ✅ | ✅ | 🟡 Mock pantry in shopping | **🟡** |
| AI assistant | Bedrock | ✅ | ✅ | 🟡 Keys | **🟡** |
| Help | 🔴 Wrong component | 🔴 Shows 404 | 🔴 | 🔴 | **🔴** |
| Family (children, health, safety) | Firebase | ✅ | ✅ | ✅ | **🟡** (parallel to mobile Mongo) |

## Owner (web)

| Feature | Backend | Web UI | **Overall** |
|---------|---------|--------|-------------|
| Owner dashboard | Firebase | ✅ | **✅** |
| Properties / tenants / leases / payments | Firebase | ✅ | **🟡** (no route guard on sub-pages) |

## Child (web)

| Feature | Backend | Web UI | **Overall** |
|---------|---------|--------|-------------|
| Child dashboard | Firebase | ✅ Rich single page | **✅** (Firebase only — not Mongo child API) |

---

# Phase B — Partial flows (your specific list)

| Item | Current status | What's missing for ✅ |
|------|----------------|----------------------|
| **Child messages** | 🔴 | Child-safe compose UI; link to `group-chat` or scoped thread; capability checks |
| **Parent homework assign UI** | 🔴 | Mobile UI calling `POST /api/child/homework` from child detail |
| **Child homework complete** | 🔴 | Child tap complete + parent confirm API + UI both sides |
| **Owner mobile property CRUD** | 🔴 | Screens wired to `/api/owner/properties` inside Owner shell or renter owner mode |
| **Maps tab real places** | 🟡 | Confirm `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` + backend location keys; test on physical device |
| **Offline queue expansion** | 🟡 | Today: chores + shopping only; expand per charter list |

---

# Priority fix order (recommended — for your review)

## Wave 1 — Phase A infrastructure (blocks everything)
1. Confirm Render: API + worker + Redis live
2. Add Celery Beat service (or cron) for hourly automation + recurring chores
3. Replace `/api/automation/notifications` and `/api/automation/reminders` stubs
4. Implement FCM/APNs + device token registration
5. Wire SOS + geofence + automation notify to push/socket
6. Fix web `/help`
7. Publish env checklist to team (section above)

## Wave 2 — Phase B partial flows (charter list)
8. Child messages (child-safe)
9. Homework assign + complete (parent + child)
10. Owner property CRUD mobile
11. Maps tab verification on real device
12. Offline queue expansion

## Wave 3 — Every remaining 🟡/🔴 feature to ✅
13. Help → real help or remove from registry
14. Neighborhood / Resources → implement or badge as Preview
15. Owner Portal module → rename or wire to owner API
16. Calendar → real calendar or honest rename
17. Smart Home → honest “manual registry” UX
18. Credit Builder → honest copy (no bureau implied)
19. Shopping list interactivity + Celery-driven auto-add
20. Health → add record UI on mobile
21. Document/move-in → verify S3 on production
22. House search → verify property provider keys

## Wave 4 — Web convergence (Phase C — strategic)
23. Firebase vs Mongo decision for child/parent web
24. Owner web route guards

---

# Definition of Done checklist (per feature fix)

When fixing each 🟡/🔴 item, confirm ALL before marking ✅:

- [ ] Backend routes, validation, capability checks (no stubs)
- [ ] Mobile UI wired to real API (no fake data)
- [ ] Every button/form completes its flow
- [ ] Loading state (spinner/skeleton)
- [ ] Empty state (calm, helpful)
- [ ] Error state (user-visible + recovery)
- [ ] Child-safe serialization where applicable
- [ ] Tested on **physical device** with **production Render URL** and **real keys**
- [ ] Row updated in this document + `PLATFORM_INVENTORY.md`

---

*This is the baseline. No feature work should start until you review and confirm priority order.*
