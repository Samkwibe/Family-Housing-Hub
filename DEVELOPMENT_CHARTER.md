# Development Charter

> **Effective:** May 2026  
> **Companion document:** [`PLATFORM_INVENTORY.md`](PLATFORM_INVENTORY.md)  
> **Purpose:** Define how the platform evolves from now on.

---

## How This Document Relates to the Inventory

| Document | Role |
|----------|------|
| [`PLATFORM_INVENTORY.md`](PLATFORM_INVENTORY.md) | **What exists** — factual system audit, maturity levels, gaps, fragmentation points |
| **`DEVELOPMENT_CHARTER.md`** | **How we build** — governance, phase gates, decision rules, quality bar |

The inventory stays factual and operational. This charter is the decision-making layer. Keep them separate as the team grows.

---

## 1. Product Direction

We are building:

# emotionally intelligent realtime household infrastructure

We are **not** building:

- Generic productivity software
- Dopamine gamification
- Social-feed engagement systems
- Disconnected feature collections

### Core Principles

| Principle | Meaning |
|-----------|---------|
| **Calm delight** | Warm, intentional feedback — never noisy or manipulative |
| **Emotional continuity** | The family experience should feel coherent over months and years |
| **Meaningful rarity** | Celebrations and memories are earned and sparse, not constant |
| **Family identity** | The product reflects *this* household, not generic app behavior |
| **Emotionally safe AI** | AI assists without pressure, judgment, or overreach |
| **Restrained realtime** | Socket events are scoped, meaningful, and paced |
| **Curated memories** | Timeline artifacts are preserved moments — not activity logs |

Every feature, screen, and backend path should strengthen these principles or it should not ship.

---

## 2. Platform Hierarchy

### Primary Platform (default for all new major systems)

- **Mobile** (Expo)
- **MongoDB** (source of truth)
- **Flask API**
- **Portal architecture** (Renter / Owner / Child + `PortalContext`)

All new major systems **default to the primary platform** unless explicitly approved otherwise.

### Secondary / Legacy

- **Firebase web stack** (`src/` — Auth, Firestore, Storage)

The web stack remains supported where it exists, but **must not receive parallel implementations** of systems already mature on the primary stack without a documented convergence decision.

### Strategic Center of Gravity

The strongest, most mature part of the product is:

**Child / family portal + realtime + observability + curated memory timeline**

Protect and deepen this before expanding elsewhere.

---

## 3. Phase Gates

Work proceeds in sequence. **No skipping ahead without review.**

### Phase A — Production Readiness

**Goal:** The primary platform runs reliably in production-like conditions.

| Item | Notes |
|------|-------|
| Celery worker + Redis in production | Recurring chores, email, automation |
| Push notifications (FCM/APNs) | Replace log-only stub |
| Remove/replace API stubs | e.g. `/api/automation/reminders`, sample notifications |
| Environment matrix | Document required keys per feature |
| Memory backfill | Staging → cohort → production (`scripts/backfill_family_memories.py`) |
| Web `/help` route fix | Known broken import |

**Exit criteria:** Production infra verified; no critical 🔴 stubs on primary paths; env requirements documented.

---

### Phase B — Complete Partial Flows

**Goal:** Close known incomplete mobile surfaces where backend already exists.

| Item | Priority |
|------|----------|
| Child messages → group chat or child-safe compose | High |
| Parent homework assign UI | Medium |
| Child homework complete workflow | Medium |
| Owner mobile property CRUD (API exists) | Medium |
| Maps tab API key setup + documentation | Medium |
| Offline queue expansion | Low |

**Exit criteria:** All 🟡 partial flows in Phase B scope reach ✅ per Definition of Complete (Section 6).

---

### Phase C — Convergence Decisions

**Goal:** Resolve fragmentation — especially Firebase vs Mongo — with explicit decisions, not parallel development.

| Decision | Required outcome |
|----------|------------------|
| Web child portal | Migrate to `/api/child` **or** formally isolate web scope |
| Parent children (web vs mobile) | Single backend source of truth |
| Rent payments | Backend rails **or** explicit web-only scope with no duplicate tracking |
| Owner portal | Align web Firestore CRUD with backend property API **or** document split |

**Exit criteria:** Written decision per fork; no new parallel implementations without charter exception.

---

### Phase D — Memory Depth

**Goal:** Deepen emotional continuity carefully — depth, not breadth.

| Item | Status |
|------|--------|
| Memory reactions (subtle ❤️ / favorite) | Planned |
| Annual recap ("Your Family Year") | Planned |
| Production emotional QA on timeline sparsity | Required |
| AI resurfacing intelligence (not engagement algo) | Future |

**Exit criteria:** New memory features pass emotional UX review; density guardrails preserved; no feed mechanics introduced.

---

### Phase Gate Rule

If proposed work belongs to Phase C but Phase A blockers remain open, **Phase A takes precedence**.

If proposed work is Phase D but Phase B partial flows block user trust, **Phase B takes precedence**.

Escalate skip requests to review — do not self-approve.

---

## 4. Do Not Build List

The following are **explicitly prohibited** unless the charter is formally amended:

| Prohibited | Rationale |
|------------|-----------|
| Social feeds | Conflicts with curated memories |
| Noisy notifications | Conflicts with calm delight and restrained realtime |
| Hyper-gamification | Conflicts with meaningful rarity |
| Duplicate Firebase/Mongo systems | Increases fragmentation tax |
| Random new registry modules | Household OS slugs require phase tag + inventory update |
| Parallel feature implementations | One canonical path per capability |
| Engagement spam | Toast/celebration/push volume expansion |
| Emotionally manipulative mechanics | Streak pressure, loss aversion, FOMO loops |
| Comment threads on memories | Social-feed drift |
| Turning memories into activity logs | e.g. backfilling every chore completion |
| Major new domains before prior phase exit | Discipline over creativity |

When in doubt: **do not build.**

---

## 5. New Feature Requirements

Before **any** feature begins, the team must answer:

| Question | Required answer |
|----------|-----------------|
| Which phase does this belong to? | A / B / C / D — or "charter exception" with approval |
| Which stack does this extend? | Primary (mobile/Mongo) or legacy (web/Firebase) — justify if legacy |
| Does it reduce fragmentation? | Yes preferred; "neutral" needs justification; "no" = stop |
| Is the current flow already complete? | Incomplete upstream flows must finish first |
| Does it strengthen emotional continuity? | Must align with Section 1 principles |
| Does it preserve calm delight? | No dopamine escalation |
| Does observability exist? | Trace/metrics for new realtime or async paths |
| Is realtime scoped correctly? | Event type, audience, dedupe, pacing defined |
| Are memory implications considered? | Will this create a memory? Should it? Guardrails? |

**If these answers are unclear, the feature should not begin.**

### Feature Proposal Minimum

Every approved feature should record:

- Phase tag
- Stack target
- Inventory rows affected
- Definition of Complete checklist (Section 6)
- Realtime event names (if any)
- Memory category (if any)

---

## 6. Definition of Complete

A feature is **not complete** unless it includes:

| Layer | Requirement |
|-------|-------------|
| **Backend** | API routes, service logic, validation, capability checks |
| **Mobile UI** | Primary client implementation (unless explicitly web-only) |
| **Loading states** | Skeleton/spinner — no blank screens |
| **Empty states** | Guided, calm copy — not dead ends |
| **Error handling** | User-visible recovery; no silent failures |
| **Realtime behavior** | Scoped events, dedupe, correct rooms — if applicable |
| **Observability** | Traces/metrics for async, AI, celebration paths — if applicable |
| **Capability enforcement** | Portal-appropriate access; child-safe field omission |
| **PortalContext compliance** | Correct portal shell, routing, switch behavior |
| **Production-like QA** | Tested with real API, env keys, socket reconnect |
| **Emotional UX review** | Calm delight check — pacing, copy, celebration intensity |

Partial implementations remain 🟡 in the inventory until all rows above are satisfied.

---

## 7. Architecture Rules (Locked)

These rules are **non-negotiable** unless the charter is formally amended.

### PortalContext is the nervous system

- All portal-aware behavior flows through `PortalContext` and capability enforcement
- Portal switch is explicit — no implicit role bleed

### Mongo is source of truth

- Primary platform data lives in Mongo collections
- Firebase data is legacy/secondary — do not create new canonical state there

### Child-safe responses omit fields, not hide them

- Child API responses exclude sensitive fields at serialization
- Never rely on UI-only hiding for child-facing data

### Realtime must remain disciplined

- Emit only meaningful moments
- Warm tone; no notification spam
- Use dedupe, pacing, and celebration orchestration patterns already established
- Client acks for observability where celebrations are involved

### Memories are curated artifacts, not feeds

- Density guardrails: max 12/household/30 days; 48h category cooldown
- Firsts exempt from cooldown; backfill bypasses guardrails
- Do not log routine activity (e.g. every chore) as memories

### AI must remain emotionally safe

- No pressure, shame, or manipulative nudging
- Child-facing AI respects capability tier and age context
- Insights are supportive, not alarmist

### Domain isolation

- Household, property, and child domains remain isolated
- Cross-domain access only through defined service boundaries and capabilities

---

## 8. Inventory Discipline

No new surface area without documentation.

The following require an **inventory update** in [`PLATFORM_INVENTORY.md`](PLATFORM_INVENTORY.md):

- New route (web or mobile)
- New screen
- New API endpoint or blueprint
- New realtime event
- New Household OS registry slug
- New AI surface

Each entry must include:

| Field | Example |
|-------|---------|
| **Phase tag** | `Phase B` |
| **Stack** | Primary / Legacy |
| **Completeness status** | ✅ / 🟡 / 🔴 / ⚠️ |
| **Brief description** | What it does and what it connects to |

Undocumented routes, events, and slugs are considered **technical debt** and may be reverted in stabilization passes.

---

## 9. Product Quality Priority

Current priority order:

1. **Stability** — crashes, data loss, socket failures, observability gaps
2. **Completeness** — partial flows closed end-to-end
3. **Convergence** — one canonical path per capability
4. **Emotional consistency** — motion, haptics, toast pacing, celebration rarity
5. **Production readiness** — Celery, push, env, stubs removed
6. **Depth** — memory reactions, recap, resurfacing QA
7. **Expansion** — new domains, new modules, new portals

**Not:** feature count.

Sprint planning should skew toward closing 🔴 and 🟡 items in the inventory before adding new ✅ rows.

---

## 10. Final Principle

The platform's moat is no longer:

- Features
- Dashboards
- AI helpers

The moat is:

# accumulated emotional continuity over years.

Families should feel that FamilyHub **remembers who they are** — calmly, meaningfully, and without manipulation.

Every decision should **protect and deepen that continuity**, not fragment it.

---

## Quick Reference for Developers

```
Before you code:
  → Read PLATFORM_INVENTORY.md for current state
  → Read this charter for rules and phase
  → Answer Section 5 checklist
  → Tag phase + update inventory

While you code:
  → Primary stack default (mobile + Mongo + portals)
  → Definition of Complete (Section 6)
  → Architecture Rules (Section 7)

Before you merge:
  → Inventory updated
  → Emotional UX review for family-facing changes
  → No Do Not Build violations (Section 4)
```

---

*This charter governs development from May 2026 forward. Amendments require explicit team review and documented rationale.*
