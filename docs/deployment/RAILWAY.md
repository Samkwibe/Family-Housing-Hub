# Railway Deployment

**Production API:** https://family-housing-hub-production.up.railway.app

## Services (3 required)

| Service | Root directory | Start command |
|---------|----------------|---------------|
| **API (web)** | `backend` (or repo root + `cd backend`) | `gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT --timeout 120 --access-logfile - app:app` |
| **Worker** | `backend` | `celery -A celery_app worker --loglevel=info --concurrency=2` |
| **Beat** | `backend` | `celery -A celery_app beat --loglevel=info` |

All three share the **same project variables**.

**Beat:** keep **1 replica** only.

## MongoDB not connecting on Railway

If `/api/health` shows `"mongodb": "not connected"` but the same encoded `MONGODB_URI` works locally:

1. **Atlas Network Access** — Railway uses dynamic egress IPs. In [MongoDB Atlas](https://cloud.mongodb.com) → **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`). This is required for Railway (and Render).
2. **Exact URI** (password must be encoded — do not wrap in quotes):

```
mongodb+srv://kwibesamuel_db_user:Sammy2020%40ray16%21@familyhousehub.nsjzkta.mongodb.net/?appName=FamilyHouseHub
```

3. Set **`MONGODB_DB`** = `family_housing_hub` in shared variables.
4. **Redeploy** the API service after saving variables (Railway → service → Deployments → Redeploy).

Local `backend/.env` already uses this URI — Railway shared variables must match.

## Required shared variables

Copy from `backend/.env` / `backend/env.example`. Critical:

```
MONGODB_URI=mongodb+srv://...encoded-password...   # @ → %40, ! → %21
MONGODB_DB=family_housing_hub
REDIS_URL=rediss://...                             # NOT "redis-cli --tls -u ..."
FIELD_ENCRYPTION_KEY=...                           # production key (64 hex chars)
JWT_SECRET=...                                     # production secret
S3_ENDPOINT_URL=...                                # Cloudflare R2
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=familyhub-files
S3_REGION=auto
FCM_SERVER_KEY=...                                 # Firebase Cloud Messaging legacy server key
CORS_ORIGINS=https://family-housing-hub.web.app,https://family-housing-hub-production.up.railway.app,http://localhost:8081,exp://localhost:8081
FLASK_ENV=production
```

Sync from local machine (after `railway login && railway link`):

```bash
./scripts/railway-sync-production.sh
```

## Add Celery worker + beat (dashboard)

1. Railway project → **+ New** → **GitHub Repo** → same repo, **`dev`** branch.
2. **Worker service**
   - Name: `family-housing-hub-worker`
   - Root directory: `backend`
   - Start command: `celery -A celery_app worker --loglevel=info`
   - Variables: use **Shared Variables** (same as API)
3. **Beat service**
   - Name: `family-housing-hub-beat`
   - Root directory: `backend`
   - Start command: `celery -A celery_app beat --loglevel=info`
   - Variables: **Shared Variables**
   - Replicas: **1** only
4. Redeploy all three services after shared variables are set.

## Verify

```bash
curl -s https://family-housing-hub-production.up.railway.app/api/health | python3 -m json.tool
```

Expect `config.mongodb.connected: true` and `config.redis.connected: true` after latest deploy.

## Mobile

```
EXPO_PUBLIC_API_URL=https://family-housing-hub-production.up.railway.app
```
