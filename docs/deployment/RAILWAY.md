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

## Required shared variables

Copy from `backend/env.example`. Critical:

```
MONGODB_URI=mongodb+srv://...encoded-password...   # @ → %40, ! → %21
REDIS_URL=rediss://...                             # NOT "redis-cli --tls -u ..."
CORS_ORIGINS=https://family-housing-hub.web.app,https://family-housing-hub-production.up.railway.app,http://localhost:8081,exp://localhost:8081
```

## Verify

```bash
curl -s https://family-housing-hub-production.up.railway.app/api/health | python3 -m json.tool
```

Expect `config.mongodb.connected: true` and `config.redis.connected: true` after latest deploy.

## Mobile

```
EXPO_PUBLIC_API_URL=https://family-housing-hub-production.up.railway.app
```
