# Family Housing Hub — Platform Inventory

> **Last updated:** May 25, 2026  
> **Purpose:** Complete breakdown of features, logic, workflows, integrations, and current status for phase planning and prioritization.  
> **Governance:** [`DEVELOPMENT_CHARTER.md`](DEVELOPMENT_CHARTER.md) — how the platform evolves from here.  
> **Mobile runtime:** [`MOBILE_RUNTIME_AUDIT.md`](MOBILE_RUNTIME_AUDIT.md) — page-by-page working/broken status.

---

## Executive Summary

The product is effectively **two converging stacks**:

| Stack | Primary client | Data layer | Maturity |
|-------|----------------|------------|----------|
| **Household OS (modern)** | Mobile (Expo) | Mongo + Flask API + Socket.IO | **Highest** — portals, child/parent, realtime, memories, observability |
| **Legacy web app** | Web (React/Vite) | Firebase (Auth, Firestore, Storage) | **Broad but fragmented** — many pages, mocks, dual paths |

**Strategic center of gravity:** Mobile + Python backend + portal architecture (renter / owner / child). Web is feature-rich but not fully aligned with the Mongo portal model.

### Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | **Complete** — End-to-end functional, wired to real backend/data |
| 🟡 | **Partial** — Works with gaps, env keys, mocks, or incomplete UI |
| 🔴 | **Stub** — Placeholder, hardcoded, or non-functional path |
| ⚠️ | **Dual** — Two implementations (web Firebase vs mobile API) not unified |

---

## Table of Contents

1. [Architecture & Cross-Cutting Systems](#1-architecture--cross-cutting-systems)
2. [Child & Family Portal](#2-child--family-portal-highest-maturity)
3. [Emotional & Continuity Layer](#3-emotional--continuity-layer)
4. [Household OS — Mobile (Renter Shell)](#4-household-os--mobile-renter-shell)
5. [Backend Household Domains (Renter API)](#5-backend-household-domains-renter-api)
6. [Web App (`src/`) — Page Inventory](#6-web-app-src--page-inventory)
7. [Mongo Collections](#7-mongo-collections-backend-source-of-truth)
8. [Recommended Development Phases](#8-recommended-development-phases)
9. [What Works Today Matrix](#9-what-works-today-matrix)
10. [Bottom Line for Planning](#10-bottom-line-for-planning)

---

## 1. Architecture & Cross-Cutting Systems

### 1.1 Portal Model ✅

| Portal | Mobile | Web | Backend |
|--------|--------|-----|---------|
| **Renter (parent/household)** | `RenterShell` + Household OS | `Dashboard.jsx` | `PortalContext`, capabilities |
| **Owner** | `OwnerShell` (read dashboard) | `OwnerDashboard` + `/owner/*` | `/api/dashboard/owner`, `/api/owner/properties` |
| **Child** | `ChildShell` (5 tabs) | `ChildDashboard.jsx` (Firebase) ⚠️ | `/api/dashboard/child`, `/api/child/*` |
| **Teen** | Same as child (capability tier) | — | `ageTier` / `experience_type` |

**Portal resolution:** `portal_context_service.py` + mobile `resolvePortal.ts` + `POST /api/auth/portal/switch`

**Key files:**

| Area | Paths |
|------|-------|
| Backend entry | `backend/app.py` |
| Portal middleware | `backend/portal_middleware.py` |
| Mobile shells | `mobile/src/portals/renter/`, `owner/`, `child/` |
| Web routing | `src/App.jsx`, `src/pages/*` |

### 1.2 Authentication & Identity

| Feature | Backend | Mobile | Web | Status |
|---------|---------|--------|-----|--------|
| Email/password register/login | ✅ JWT | ✅ | ✅ Firebase ⚠️ | **Dual stack** |
| Email verification (required signup) | ✅ Mongo codes + SMTP | ✅ | ✅ Firestore + API | ✅ / ⚠️ |
| SMS verification | ✅ Twilio | ✅ | ✅ | 🟡 (needs Twilio) |
| OAuth (Google, Microsoft, GitHub, Apple) | ✅ | ✅ | ✅ | 🟡 (needs client IDs) |
| Password reset | ✅ Celery email | ✅ | ✅ | ✅ |
| Portal switch | ✅ | ✅ | 🔴 | Mobile ✅, web limited |
| Login anomaly detection | ✅ sklearn optional | — | — | 🟡 |
| Session / JWT | ✅ | SecureStore | Firebase | **Dual** |
| Cognito auth path | — | — | 🔴 unused | Dead code |

### 1.3 Realtime (Socket.IO) ✅

| Event | Direction | Used by |
|-------|-----------|---------|
| `connect` / JWT rooms | Client→Server | All realtime clients |
| `new_message` | Server→Client | Mobile group chat |
| `household_updated` | Server→Client | Mobile `HouseholdContext` refresh |
| `notification` | Server→Client | Extensible |
| `family_celebration` | Server→Client | Child + parent celebration layer |
| `family_activity` | Server→Client | Parent live activity feed |
| `celebration_ack` | Client→Server | Observability trace completion |

**Key files:** `backend/realtime_service.py`, `backend/celebration_realtime_service.py`, `mobile/src/portals/shared/RealtimeCelebrationLayer.tsx`

### 1.4 Observability ✅ (mobile + backend)

| Component | Status |
|-----------|--------|
| Trace IDs, timeline ring buffer (500) | ✅ |
| Celebration lifecycle (emit→delivered→rendered→completed) | ✅ |
| Performance budgets | ✅ |
| `GET /api/internal/observability/snapshot` | ✅ |
| `GET /api/internal/observability/timeline` | ✅ |
| `POST /api/internal/observability/client-metrics` | ✅ |
| Mobile client metrics batch | ✅ |
| Celery / AI path tracing | 🟡 partial |

**Performance budgets** (`observability_service.py`):

| Metric | Budget |
|--------|--------|
| celebration_emit | 150ms |
| celebration_delivery | 500ms |
| celebration_render | 800ms |
| socket_reconnect | 3000ms |
| dashboard_hydration | 2000ms |
| ai_insight | 4000ms |
| celery_recurring | 30000ms |

**Key files:** `backend/observability_service.py`, `backend/observability_routes.py`, `mobile/src/services/observabilityService.ts`

### 1.5 Background Jobs (Celery)

| Task | Purpose | Status |
|------|---------|--------|
| `send_email` / invite / reset | SMTP | ✅ |
| `send_push_notification` | FCM/APNs | 🔴 logs only |
| `generate_ai_tips` | RAG tips → Redis | ✅ |
| `run_bill_forecast` | Forecast cache | ✅ |
| `detect_spending_anomaly` | On expense write | ✅ |
| `run_automation_engine` | Rules + replenishment | ✅ |
| `run_recurring_chores` | Routine engine | ✅ |
| `run_hourly_automation` | Chain above | 🟡 (thread in dev `app.py`; needs worker + Redis) |
| Celery Beat / cron | Scheduled jobs | 🔴 not configured |

**Key file:** `backend/tasks.py`

### 1.6 External Integrations

| Integration | Used for | Status |
|-------------|----------|--------|
| **MongoDB** | Primary datastore (mobile backend) | ✅ required |
| **Redis/Upstash** | Cache, Celery, rate limits | 🟡 optional fallback |
| **SMTP** | Email verification, invites, reset | 🟡 |
| **Twilio** | SMS verification | 🟡 |
| **OpenAI / Gemini / NVIDIA NIM** | AI chat, tips, child intelligence | 🟡 key-dependent |
| **Google Maps Platform** | Places, weather, solar, geocode | 🟡 |
| **Mapbox / OSM** | Location fallbacks | 🟡 |
| **Cloudflare R2 / S3** | Presigned uploads | 🟡 |
| **Property APIs** (RapidAPI, ATTOM, etc.) | House search | 🟡 |
| **Firebase** | Web auth + Firestore | ✅ web only ⚠️ |
| **AWS Bedrock** | Web AI Assistant | 🟡 web only |
| **Stripe** | Web rent payments | 🟡 mock fallback |
| **Stripe / payments on backend** | — | 🔴 **not implemented** |

---

## 2. Child & Family Portal (Highest Maturity)

### 2.1 Backend (`/api/child/*`) ✅

| Feature | Endpoints / Logic | Status |
|---------|-------------------|--------|
| Child profile | GET `/profile`, parent CRUD `/profiles` | ✅ |
| Child onboarding | POST `/onboarding/complete`, badges, welcome | ✅ |
| Chore complete | POST `/chores/:id/complete` → points, streak, badges | ✅ |
| Recurring chores / routines | Templates, Celery maintenance, `/routines` | ✅ |
| Rewards catalog | GET/POST `/rewards` | ✅ |
| Redemption request/approve | `/rewards/:id/redeem`, `/redemptions/*` | ✅ |
| SOS alert | POST `/sos` → `child_sos_alerts` | ✅ |
| Homework assign | POST `/homework` | ✅ backend only |
| Parent dashboard | GET `/parent/dashboard` | ✅ |
| Family AI insights | GET `/parent/insights` | ✅ |
| Activity feed (operational) | GET `/activity` | ✅ |
| Celebration realtime | `celebration_realtime_service` | ✅ |
| Family memories | GET `/memories`, `/memories/resurface` | ✅ |
| Memory density guardrails | 12/month, 48h category cooldown | ✅ |
| Memory backfill script | `scripts/backfill_family_memories.py` | ✅ (not yet run on prod) |

**Memory density guardrails** (`family_memory_service.py`):

- Max 12 memories/household/30 days
- 48h category cooldown (firsts exempt)
- Backfill bypasses guardrails
- Resurface: min 30 days age, max 3 per fetch

**Memories preserved (curated, not activity logs):**

- Welcome, streak milestones, badges, family milestones, reward approvals, firsts
- **NOT** chore_completed

**Key files:** `backend/child_service.py`, `backend/child_routes.py`, `backend/parent_child_service.py`, `backend/family_memory_service.py`, `backend/family_behavior_intelligence_service.py`

### 2.2 Mobile Child Portal ✅ / 🟡

| Tab / Screen | Workflows | Status |
|--------------|-----------|--------|
| **Home** | Level ring, routines, buddy message, stats, memories preview | ✅ |
| **Tasks** | Chore list, complete, recurring badges | ✅ |
| **Rewards** | Browse, redeem request, celebration | ✅ |
| **Messages** | Preview only | 🟡 no send / no link to chat |
| **Settings (Me)** | Refresh, switch to renter portal | ✅ |
| **Welcome flow** | Avatar, theme, nickname, celebration | ✅ |
| **SOS** | Floating button → parent alert | ✅ |
| **Celebrations** | Orchestrated toast→badge→streak, queue, haptics | ✅ |
| **Homework** | Display only | 🟡 |
| **Family memories** | Preview + full overlay timeline | ✅ |

**Key files:** `mobile/src/portals/child/*`, `mobile/src/portals/shared/CelebrationFeedback.tsx`, `mobile/src/portals/shared/celebrationOrchestrator.ts`

### 2.3 Mobile Parent (My Children) ✅ / 🟡

| Feature | Status |
|---------|--------|
| Multi-child dashboard + summary cards | ✅ |
| Family intelligence panel (consistency, AI insights) | ✅ |
| Pending reward approvals | ✅ |
| Add child (invite email / managed profile) | ✅ |
| Child detail: assign chores, recurrence, routines | ✅ |
| Pause/resume routines | ✅ |
| Create rewards, bonus points | ✅ |
| Live activity feed (socket + API) | ✅ |
| Ambient parent toasts (calm pacing) | ✅ |
| Family memories preview + full route | ✅ |
| Assign homework UI | 🟡 API exists, no UI |
| Realtime celebrations (parent toasts) | ✅ |

**Key files:** `mobile/src/portals/parent/screens/MyChildrenScreen.tsx`, `ChildDetailScreen.tsx`, `mobile/app/(main)/my-children/memories.tsx`

### 2.4 Web Child / Parent ⚠️

| Feature | Status |
|---------|--------|
| `ChildDashboard.jsx` (12+ tabs, Firebase) | 🟡 extensive UI, **not Mongo portal** |
| `ParentChildrenManagement.jsx` | 🟡 Firebase, **parallel to mobile parent** |
| Child Firebase → Mongo migration | 🔴 not done |

---

## 3. Emotional & Continuity Layer ✅

| System | Description | Status |
|--------|-------------|--------|
| Celebration bus | Local + socket bridge | ✅ |
| Realtime celebrations | Streak, badge, reward, family milestone | ✅ |
| Celebration orchestration | Sequenced, 600ms queue gap | ✅ |
| Haptic hierarchy | Light → premium layered | ✅ |
| Motion language | Shared springs, durations | ✅ |
| Emotional rhythm guardrails | Milestone thresholds, toast cooldowns | ✅ |
| Observability trace | Full celebration lifecycle | ✅ |
| Family memories (curated) | Persisted artifacts, not activity log | ✅ |
| Anniversary resurfacing | Same calendar day, 30+ days old | ✅ |
| Memory backfill | Curated origin stories | ✅ script ready |
| Memory reactions (❤️ favorite) | — | 🔴 not built |
| Annual recap | — | 🔴 not built |

**Milestone thresholds** (aligned backend ↔ mobile):

- Streaks: `{3, 7, 14, 30}`
- Series: `{3, 5, 7, 10}`
- Parent haptic cooldown: 420ms

**Key files:** `mobile/src/portals/shared/emotionalRhythm.ts`, `mobile/src/portals/shared/motion.ts`, `mobile/src/portals/shared/haptics.ts`, `mobile/src/portals/shared/FamilyMemoryRow.tsx`, `mobile/src/services/memoryService.ts`

---

## 4. Household OS — Mobile (Renter Shell)

**Registry:** 30+ feature slugs in `mobile/src/features/registry.ts`  
**Renderer:** `FeatureRenderer.tsx` → rich screens or stub

### 4.1 Renter Navigation ✅

| Route | Purpose | Status |
|-------|---------|--------|
| `(tabs)/dashboard` | Command center, weather, alerts, quick modules | ✅ |
| `(tabs)/maps` | Nearby places, AI sheet | 🟡 needs Maps API key |
| `(tabs)/messages` | Group list | ✅ |
| `(tabs)/assistant` | AI chat + voice | ✅ |
| `(tabs)/more` | Feature catalog + My Children entry | ✅ |
| `feature/[slug]` | Household OS modules | Mixed |
| `settings` | Household, invites, geofence, permissions | ✅ |
| `group-chat` | Realtime messaging | ✅ |

### 4.2 Household OS Modules by Status

#### ✅ Complete (API-backed CRUD)

Smart Fridge, Rent Split, Credit Builder, Financial Goals, Energy/Utilities, Maintenance, Move-in Checklist, Package Tracker, Document Vault, Renter Chores, Notifications, Community Board, Health (timeline/meds/vax), Resources, House Search, Purchase Readiness, Safety (geofence, emergency profile)

#### 🟡 Partial

Meal Planner, Inventory, Shopping, Subscriptions, Calendar (aggregated, not true calendar), Lease Renewal, Neighborhood (redirects to maps/AI), Automations (toggle only), Smart Home (manual registry), Security (checklist), Owner Portal screen (renter view), Offline sync (limited write types), Geofence background pings

#### 🔴 Stub

Help feature (`StubFeature` + AI tips only)

---

## 5. Backend Household Domains (Renter API)

**14 blueprints, 44+ services** registered in `backend/app.py`.

### 5.1 Core Household CRUD ✅

Inventory, chores, expenses, maintenance, packages, documents, smart devices, utilities, checklist, health reminders (simple), emergency profile, community posts, financial goals, credit settings, household create/switch, invites

### 5.2 Financial Intelligence ✅ (no payment rails)

Bill forecast, savings plan, subscription waste, rent affordability, member income (encrypted), income split propose/agree/renegotiate

### 5.3 Automation ✅

Rules engine (fridge expiry, rent due, docs, maintenance), replenishment → shopping list, manual run endpoint

### 5.4 Safety ✅

Safe zones, location sharing opt-in, location ping → geofence events, permission graph

### 5.5 Clinical Health ✅

Health records (encrypted), medications + dose logs + adherence, vaccination schedule, care gaps, timeline

### 5.6 Predictive 🟡

Purchase readiness, move-out estimate, rent market predictor (needs seeded history data)

### 5.7 Messaging ✅

Mongo message groups, paginated messages, socket on send

### 5.8 Owner API 🟡

Property CRUD only — no leases, tenants, or rent collection on backend

### 5.9 AI & Location (inline `app.py`) ✅ / 🟡

AI chat (RAG + multi-provider), image food analysis, meal plans, budget analyze (stateless), nearby places, search, geocode, weather, solar, street view, property search

### 5.10 Stubs 🔴

| Endpoint / Feature | Status |
|--------------------|--------|
| `/api/automation/reminders` | In-memory stub |
| `/api/automation/notifications` | Hardcoded sample |
| Push notifications (Celery) | Print/log only |

---

## 6. Web App (`src/`) — Page Inventory

~40 pages, Firebase-first, separate from mobile Mongo stack.

### 6.1 Auth & Onboarding ✅ / ⚠️

Landing, Login, Register (owner/renter/child), Renter onboarding (required), Owner onboarding (optional), role-based redirects

### 6.2 Dashboards ⚠️

| Page | Data | Status |
|------|------|--------|
| Renter dashboard | Firestore | ✅ Firebase path |
| Owner dashboard | Firestore realtime | ✅ |
| Child dashboard | Firestore | 🟡 parallel to mobile child |

### 6.3 Housing & Property 🟡

| Page | Status |
|------|--------|
| Rent (`Rent.jsx`) | 🟡 Stripe + Firestore; **no backend rent collection** |
| Maintenance | ✅ Firestore |
| Documents | ✅ Firebase Storage |
| Landlord | 🔴 hardcoded contact card |
| House Search | 🟡 backend + maps key |
| Nearby Places | 🟡 Google Maps key |

### 6.4 Owner Management (Web Only) 🟡

Properties, Tenants, Leases, Payments — Firestore/`userDataService`, **not** backend owner API

### 6.5 Family (Web) 🟡

Parent Children Management (extensive Firebase), Children Savings, Family Health, Family Safety, Family Calendar — ✅ on Firebase, ⚠️ not unified with mobile Mongo child portal

### 6.6 Finance & Lifestyle 🟡

Budget (~2800 lines Firestore), Shopping & Meals (mock pantry/stores in places), Community Resources (static), AI Assistant (Bedrock)

### 6.7 Communication & Account 🟡

Messages (Firestore works; Stream Chat dead code), Profile, Settings, Security, Verification Status (backend panel)

### 6.8 Known Web Bugs 🔴

| Issue | Details |
|-------|---------|
| `/help` route | Imports broken `HelpCenter.jsx` (404 content); real FAQ is in `Help.jsx` |
| Orphan pages | `FamilyChat`, `EmergencySafety`, `Privacy` |
| Stale router | `router/index.jsx` (not used) |

---

## 7. Mongo Collections (Backend Source of Truth)

**45+ collections** including:

`users`, `households`, `household_members`, `household_invites`, `child_profiles`, `chores`, `child_rewards`, `child_reward_redemptions`, `family_memories`, `expenses`, `inventory`, `messages`, `message_groups`, `health_records`, `medications`, `properties`, `audit_logs`, `ai_chat_sessions`, and more.

> Web Firestore schemas are **separate** and not automatically synced.

---

## 8. Recommended Development Phases

Use this to **finish before expanding**.

### Phase A — Production Readiness (current stack) 🔴 not done

| Item | Status |
|------|--------|
| Run memory backfill (staging → cohort → prod) | 🔴 |
| Celery worker + Redis in production | 🟡 |
| Push notifications (FCM/APNs) | 🔴 |
| Remove/replace API stubs (`automation/reminders`, sample notifications) | 🔴 |
| Web `/help` route fix | 🔴 |
| Environment matrix doc (which keys required per feature) | 🟡 |

**Backfill command:**

```bash
python3 backend/scripts/backfill_family_memories.py --dry-run
python3 backend/scripts/backfill_family_memories.py --household-id <id>
```

### Phase B — Complete Partial Mobile Surfaces 🟡

| Item | Priority |
|------|----------|
| Child messages → link to group chat or child-safe compose | High |
| Parent homework assign UI | Medium |
| Child homework complete workflow | Medium |
| Owner mobile: property CRUD (API exists) | Medium |
| Maps tab: document API key setup | Medium |
| Offline queue: expand write types | Low |

### Phase C — Unify Child/Family Experience ⚠️ strategic

| Item | Notes |
|------|-------|
| Decide: web child stays Firebase OR migrates to `/api/child` | **Critical fork** |
| Align parent children (web vs mobile) on one backend | Reduces duplicate logic |
| Single source of truth for rewards/chores/streaks | Mongo already canonical for mobile |

### Phase D — Memory Layer Maturity (depth, not breadth)

| Item | Status |
|------|--------|
| Memory reactions (subtle ❤️ / favorite) | 🔴 planned |
| Annual recap ("Your Family Year") | 🔴 planned |
| AI resurfacing intelligence (not engagement algo) | 🔴 future |
| Production emotional QA on timeline sparsity | 🔴 |

### Phase E — Web ↔ Backend Convergence (longer term)

| Item | Notes |
|------|-------|
| Migrate high-value web pages off pure Firebase | Rent, maintenance, documents |
| Stripe/rent collection via backend (if desired) | Currently expense tracking only |
| Deprecate duplicate Firebase child services | After mobile parity |

### Phase F — Explicitly Defer ⚠️

- Social feed mechanics on memories
- Comment threads on timeline
- New gamification systems
- Notification volume expansion
- Hyper-gamified child mechanics

---

## 9. What Works Today Matrix

| Capability | Mobile | Web | Backend |
|------------|--------|-----|---------|
| Auth | ✅ | ✅ Firebase | ✅ |
| Renter household OS | ✅ | 🟡 Firebase | ✅ |
| Owner portal | 🟡 read-only | 🟡 Firestore CRUD | 🟡 properties only |
| Child portal (modern) | ✅ | 🔴 Firebase parallel | ✅ |
| Parent child management | ✅ | 🟡 Firebase | ✅ |
| Realtime + celebrations | ✅ | 🔴 | ✅ |
| Family memories | ✅ | 🔴 | ✅ |
| Observability | ✅ | 🔴 | ✅ |
| Messaging | ✅ | 🟡 Firestore | ✅ |
| Health (clinical) | ✅ | 🟡 | ✅ |
| Rent **tracking** | ✅ | ✅ | ✅ |
| Rent **payments** | 🔴 | 🟡 Stripe mock | 🔴 |
| Push notifications | 🔴 | 🔴 | 🔴 stub |
| AI assistant | ✅ | 🟡 Bedrock | ✅ |

---

## 10. Bottom Line for Planning

### What is most mature and should be protected

Mobile renter shell + Household OS API + child/parent portal + realtime + observability + curated memory timeline.

### What is most fragmented

Web (Firebase) vs mobile (Mongo) for the same family concepts — especially **child**, **parent children**, and **rent payments**.

### What to complete before new features

1. Production backfill + Celery/Redis
2. Close partial mobile gaps (child messages, homework)
3. Strategic decision on web child Firebase vs Mongo migration
4. Memory reactions + annual recap (depth, not breadth)

### Architecture rules (locked)

- Portal shells + `PortalContext` + capability enforcement
- Child-safe API responses; Mongo source of truth for family/child
- Realtime: disciplined emissions, warm tone, no notification spam
- Observability: structured, portal-aware, lightweight
- Memories: **curated artifacts, not activity logs**
- Product tone: **calm delight**, not dopamine overload

---

## Appendix: Key File Index

| Area | Paths |
|------|-------|
| Backend entry | `backend/app.py` |
| Child/family | `backend/child_service.py`, `child_routes.py`, `parent_child_service.py` |
| Celebrations | `backend/celebration_realtime_service.py`, `realtime_service.py` |
| Memories | `backend/family_memory_service.py`, `backend/scripts/backfill_family_memories.py` |
| Observability | `backend/observability_service.py`, `observability_routes.py` |
| Mobile child | `mobile/src/portals/child/*` |
| Mobile parent | `mobile/src/portals/parent/screens/MyChildrenScreen.tsx`, `ChildDetailScreen.tsx` |
| Mobile shared | `mobile/src/portals/shared/*` (motion, haptics, celebrations, memories) |
| Web app | `src/App.jsx`, `src/pages/*` |
| Env examples | `backend/env.example`, `.env.local.example`, `mobile/.env` |
