#!/usr/bin/env bash
# Add Celery worker + beat services on Railway (requires interactive dashboard for start commands).
#
# Railway CLI can create services from the repo, but custom start commands must be set
# in the dashboard after creation (or via Railway API).
#
# Prerequisites:
#   railway login && railway link
#
# After running this script, open Railway dashboard and set for each new service:
#   Root directory: backend
#   Worker start: celery -A celery_app worker --loglevel=info
#   Beat start:   celery -A celery_app beat --loglevel=info
#   Variables:    Shared Variables (same as API)

set -euo pipefail

if ! railway whoami >/dev/null 2>&1; then
  echo "Run: railway login && railway link"
  exit 1
fi

REPO="${RAILWAY_REPO:-Samkwibe/Family-Housing-Hub}"

echo "Creating worker service..."
railway add --service family-housing-hub-worker --repo "$REPO" --json || true

echo "Creating beat service..."
railway add --service family-housing-hub-beat --repo "$REPO" --json || true

cat <<'EOF'

Next steps in Railway dashboard (each new service):

1. Settings → Source → Branch: dev
2. Settings → Root Directory: backend
3. Settings → Deploy → Start Command:
   Worker: celery -A celery_app worker --loglevel=info
   Beat:   celery -A celery_app beat --loglevel=info
4. Variables → Use Shared Variables
5. Beat service → keep 1 replica only
6. Deploy

Then sync env vars if not done:
  ./scripts/railway-sync-production.sh

EOF
