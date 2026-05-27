# Render — Urgent Production Fixes

> **Date:** May 2026  
> Applies to: `family-housing-hub-api`, `family-housing-hub-worker`, `family-housing-hub-beat`

---

## 1. MONGODB_URI — URL-encode the password

### Symptom
```
request_log insert failed: Username and password must be escaped according to RFC 3986
```

### Cause
The password `Sammy2020@ray16!` contains `@` and `!`. In a MongoDB URI, these **must** be percent-encoded in the Render env var.

### Correct value (exact)
Set in Render → **Environment Groups** → `fhh-backend-shared` → `MONGODB_URI`:

```
mongodb+srv://kwibesamuel_db_user:Sammy2020%40ray16%21@familyhousehub.nsjzkta.mongodb.net/?appName=FamilyHouseHub
```

| Character | Encoded |
|-----------|---------|
| `@` | `%40` |
| `!` | `%21` |

**Do not** paste the raw password with `@` and `!` into Render.

### Verify after save
1. **Manual Deploy** → Deploy latest on `family-housing-hub-api`
2. Open: `https://family-housing-hub-api.onrender.com/api/health`
3. Confirm:
   ```json
   "mongodb": { "uriEncodingOk": true, "connected": true, "issue": null }
   ```
4. Logs should **stop** showing `request_log insert failed: RFC 3986`

Local `backend/.env` already uses the encoded URI — Render must match.

---

## 2. Celery worker — deploy missing services

### Current state
`render.yaml` defines **three** backend services:

| Service | Type | Purpose |
|---------|------|---------|
| `family-housing-hub-api` | web | Flask + Socket.IO |
| `family-housing-hub-worker` | worker | Celery tasks (email, AI tips, automation, chores) |
| `family-housing-hub-beat` | worker | Celery Beat — hourly automation schedule |

If you only see the **web** service, the worker and beat were never synced from the blueprint.

### Fix — sync Blueprint

1. Go to [Render Dashboard](https://dashboard.render.com)
2. **Blueprints** → select this repo’s blueprint (or **New → Blueprint** → connect repo → select `render.yaml`)
3. Click **Sync** / **Apply**
4. Confirm three services appear:
   - `family-housing-hub-api`
   - `family-housing-hub-worker`
   - `family-housing-hub-beat`
5. Ensure `REDIS_URL` is set in `fhh-backend-shared` (Upstash or Render Redis). **Celery requires Redis.**

### Verify worker
1. Open `family-housing-hub-worker` → **Logs**
2. You should see: `celery@... ready`
3. Health check: `"redis": { "configured": true, "connected": true }`

Without worker: no emails, no AI tips cache, no recurring chores, no automation engine in production.

---

## 3. Restart web service after env changes

After updating API keys in `fhh-backend-shared`:

1. Render → `family-housing-hub-api` → **Manual Deploy** → **Deploy latest**
2. Repeat for worker + beat if their env group changed

Env vars are injected at **container start** — a restart is required.

---

## 4. Verify all API keys via `/api/health`

After restart, open:

```
https://family-housing-hub-api.onrender.com/api/health
```

Check the `config` object (no secret values exposed):

| Key path | Expected |
|----------|----------|
| `config.mongodb.uriEncodingOk` | `true` |
| `config.mongodb.connected` | `true` |
| `config.redis.connected` | `true` |
| `config.email.configured` | `true` (SendGrid) |
| `config.storage.configured` | `true` (R2/S3) |
| `config.ai.openai` / `gemini` / `nvidia` | at least one `true` |
| `config.maps.google_maps` | `true` |
| `config.push.configured` | `true` after `FCM_SERVER_KEY` set |

### Still required for full Wave 1 push
- `FCM_SERVER_KEY` — Firebase Console → Project Settings → Cloud Messaging → **Server key** (legacy)
- Mobile app must register device tokens via `POST /api/auth/push-token` (Expo push token)

---

## 5. Checklist

- [ ] `MONGODB_URI` encoded in Render env group
- [ ] Web service redeployed
- [ ] `family-housing-hub-worker` exists and logs `ready`
- [ ] `family-housing-hub-beat` exists and logs beat schedule
- [ ] `REDIS_URL` set and `config.redis.connected: true`
- [ ] `/api/health` shows all required `config.*.configured` flags
- [ ] No more RFC 3986 errors in logs
