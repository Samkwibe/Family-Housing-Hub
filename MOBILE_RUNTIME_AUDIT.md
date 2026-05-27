# Mobile Runtime Audit

> **Last updated:** May 25, 2026  
> **Companion:** [`PLATFORM_INVENTORY.md`](PLATFORM_INVENTORY.md) · [`DEVELOPMENT_CHARTER.md`](DEVELOPMENT_CHARTER.md)  
> **Scope:** Every user-facing mobile screen — what works, what breaks, why users complain.

---

## Executive Summary

User complaints match **three systemic issues**, not 27 unrelated bugs:

| Root cause | Symptom | Screens affected |
|------------|---------|------------------|
| **Toast API mismatch** | `TypeError: toast.error is not a function` | Settings, Energy, Move-in, Document Vault, Inventory AI flows |
| **Address object rendered as string** | `[object Object]` in UI + bad API queries | Neighborhood, House Search |
| **Backend / env dependencies** | `API error 500` in LogBox | AI buttons, property search, household dashboard, automations, health |
| **Light card + dark theme text** | Illegible "My Children" banner | Dashboard, More tab |

**Mature and working:** My Children (parent + child portals), core auth, messaging (when API is up).

**Looks built but isn't complete:** Most Household OS modules in the More tab — UI exists, many depend on empty data, missing API keys, or stub backends.

---

## Status Legend

| Status | Meaning |
|--------|---------|
| ✅ | Works end-to-end with backend running |
| 🟡 | UI loads; empty state or partial; needs data/keys/config |
| 🔴 | Broken UX, crashes, or misleading "feature" |
| 🧪 | Stub — tips + "Ask AI" only |

---

## Bottom Tabs (5)

| Tab | Screen | Status | Notes |
|-----|--------|--------|-------|
| Home | Dashboard | 🟡 | Stats work if household API loads. Weather needs GPS + `GOOGLE_MAPS`/weather keys. My Children card text contrast **fixed**. |
| Maps | Maps | 🟡 | Needs `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`. Without it, places/weather fail. |
| Messages | Messages | 🟡 | API-backed groups + chat work when backend up. Empty state normal for new users. Create group works. |
| AI | Assistant | 🟡 | UI works. Responses need OpenAI/Gemini/NIM keys on backend. 500 = missing AI config. |
| More | Module directory | 🟡 | Lists 27 modules. Many link to partial/stub screens. My Children banner contrast **fixed**. |

---

## My Children (Parent) — ✅ Strongest area

| Screen | Status | Notes |
|--------|--------|-------|
| My Children list | ✅ | Multi-child dashboard, intelligence, activity |
| Child detail | ✅ | Chores, routines, rewards, approvals |
| Family memories | ✅ | Curated timeline + resurfacing |
| Add child / invites | 🟡 | Works; Settings toast errors **fixed** |

---

## Household OS Modules (27 in More tab)

### Food & Kitchen

| Module | Slug | Status | What users see | Blocker |
|--------|------|--------|----------------|---------|
| Smart Fridge | `smart-fridge` | 🟡 | Empty until items added | Needs manual add or camera + AI food analysis key |
| Meal Planner | `meal-planner` | 🟡 | "Add groceries first" | Depends on inventory + AI |
| Inventory | `inventory` | 🟡 | "Inventory empty" | Syncs from Smart Fridge; empty is correct with no data |
| Shopping | `shopping` | 🟡 | Empty list | Automation/Celery must run to auto-add items |

### Money

| Module | Slug | Status | What users see | Blocker |
|--------|------|--------|----------------|---------|
| Rent Split | `rent-split` | ✅ | Works with household expenses | None |
| Credit | `credit-builder` | ✅ | Score UI from rent payment history | Needs expense data |
| Goals | `financial-goals` | ✅ | Goals + forecast tabs | Forecast tab needs backend |
| Subscriptions | `subscriptions` | 🟡 | "No bills tracked" | Expenses must use subscription/utility categories |

### Home

| Module | Slug | Status | What users see | Blocker |
|--------|------|--------|----------------|---------|
| Energy | `energy-utilities` | 🟡 | Empty + AI button | Add bills works; toast errors **fixed** |
| Maintenance | `maintenance` | ✅ | CRUD requests | — |
| Move-in | `move-in-checklist` | 🟡 | Checklist + photos | Photo attach toast **fixed** |
| Packages | `package-tracker` | ✅ | Track deliveries | — |
| Lease AI | `lease-renewal` | 🟡 | Empty until lease + rent saved | Market data needs ZIP; AI needs keys |
| Documents | `document-vault` | 🟡 | Upload/list | R2/S3 presigned URLs must be configured |
| Owner Portal | `owner-portal` | 🟡 | Read-only rent/maintenance view | Not real owner API; misleading label |

### Family

| Module | Slug | Status | What users see | Blocker |
|--------|------|--------|----------------|---------|
| Chores | `chores` | ✅ | Renter household chores | Separate from child portal chores |
| Calendar | `calendar` | 🟡 | Aggregated bills/chores only | Not a real calendar; empty without data |
| Health | `health` | 🟡 | Clinical timeline/meds | API errors now caught; needs health records |

### Community

| Module | Slug | Status | What users see | Blocker |
|--------|------|--------|----------------|---------|
| Community | `community-board` | ✅ | Posts CRUD | Empty until posts created |
| Neighborhood | `neighborhood-insights` | 🟡 | Maps + AI redirect | `[object Object]` **fixed**; no walk score API |
| Search | `house-search` | 🟡 | Property search | `[object Object]` **fixed**; needs property API keys |
| Resources | `resources` | ✅ | Static resource links | — |

### Smart Home

| Module | Slug | Status | What users see | Blocker |
|--------|------|--------|----------------|---------|
| Automations | `automations` | 🟡 | Rule list or empty | Celery hourly job; uncaught errors **fixed** |
| Smart Home | `smart-home` | 🟡 | Manual device registry | "until live integrations connected" — no Ring/Nest |
| Alerts | `notifications` | 🟡 | "All clear" | Correct when no expiring food/bills; not push notifications |

### Safety & Command

| Module | Slug | Status | What users see | Blocker |
|--------|------|--------|----------------|---------|
| Safety | `safety` | 🟡 | SOS, emergency profile, geofence | Geofence needs location + safe zones in Settings |
| Security | `security` | 🟡 | Account safety + empty devices | Devices come from Smart Home manual add |
| Help | `help` | 🧪 | Tips + Ask AI | **Not a real help center** — stub only |

---

## Other Screens

| Screen | Status | Notes |
|--------|--------|-------|
| Profile | ✅ | Edit name, address, role |
| Settings | 🟡 | Invites, location, permissions; toast API **fixed** |
| Group chat | ✅ | Realtime when socket + API up |
| Child portal (5 tabs) | ✅ | Most mature UX path |

---

## Errors in Screenshots — Mapped

| Error shown | Cause | Fix status |
|-------------|-------|------------|
| `TypeError: toast.er...` | Code called `toast.error()` but context only had `showToast()` | ✅ Fixed — added `toast.error/success/info` |
| `API error 500` | Backend endpoint failing (AI, household, property, health) | 🟡 Env/backend — verify `EXPO_PUBLIC_API_URL`, run backend, configure keys |
| `[object Object]` | Profile `address` is an object, rendered as string | ✅ Fixed — `formatUserLocation()` |
| Weather unavailable | No GPS permission or weather API key | 🟡 User must grant location; backend needs Maps/weather |
| White My Children text | Light card `#F5F3FF` + light theme text `#EDE9FE` | ✅ Fixed — dark text on light card |

---

## Environment Checklist (Before blaming features)

| Variable / service | Required for |
|--------------------|--------------|
| `EXPO_PUBLIC_API_URL` | **Everything** — must reach running Flask backend |
| Backend Mongo + JWT | Auth, household, child, messages |
| OpenAI / Gemini / NIM | AI tab + all "Ask AI" buttons |
| Google Maps / Mapbox | Maps tab, weather, nearby places |
| Property API keys (RapidAPI etc.) | House Search live results |
| R2/S3 presigned config | Document Vault uploads |
| Celery + Redis | Recurring chores, automations, shopping auto-add |
| FCM/APNs | Push (not implemented — alerts are in-app only) |

---

## Recommended Fix Order (Phase A + B alignment)

### P0 — Done this pass
- [x] Toast API shim (`toast.error/success/info`)
- [x] Address formatting (`[object Object]`)
- [x] My Children card contrast
- [x] Uncaught promise: automations fetch
- [x] Uncaught promise: health timeline fetch

### P1 — Next sprint
- [ ] Hide or badge stub modules (Help, Neighborhood walk score, Smart Home integrations)
- [ ] Show calm inline errors instead of Expo LogBox for API failures
- [ ] Household dashboard 500 — diagnose `/api/household/dashboard` in production
- [ ] Document which modules need user data first (empty state copy)

### P2 — Convergence
- [ ] Don't show 27 modules as equal — tier: **Core / Ready / Preview / Stub**
- [ ] Owner Portal: rename or wire to backend property API
- [ ] Calendar: rename to "Upcoming bills & chores" until real calendar exists

---

## Honest User-Facing Truth

**What the app is today:**
- A strong **family/child parent portal** inside a broad **household OS shell**
- The shell exposes many modules; **~40% are fully usable**, **~40% are empty-until-configured**, **~20% are stubs or placeholders**

**What users expect from the More tab:**
- Every row works like a finished app

**What they get:**
- A catalog where many rows are previews, empty states, or AI redirects

**Charter-aligned response:** Reduce entropy — hide, badge, or complete before showing.

---

*Update this file when module status changes. Cross-update `PLATFORM_INVENTORY.md` per charter inventory discipline.*
