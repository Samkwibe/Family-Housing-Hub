#!/usr/bin/env bash
# Sync production env vars to Railway shared variables from local backend/.env.
# Requires: railway CLI logged in (`railway login`) and project linked (`railway link`).
#
# Usage:
#   ./scripts/railway-sync-production.sh
#   FCM_SERVER_KEY=your-key ./scripts/railway-sync-production.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/backend/.env"

if ! command -v railway >/dev/null 2>&1; then
  echo "Install Railway CLI: https://docs.railway.com/guides/cli"
  exit 1
fi

if ! railway whoami >/dev/null 2>&1; then
  echo "Run: railway login && railway link"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

# Production overrides (not in backend/.env or differ from local dev)
JWT_SECRET="${JWT_SECRET:-UNqyVGDa5ArnDXxQ-zY-K57CR5iNhOOwf27b0P3BDk7PRhIihF9f15UnmQ_2A1WvmH5KU8Eb4_4UQdYUK7ycIQ}"
FIELD_ENCRYPTION_KEY="${FIELD_ENCRYPTION_KEY:-af0966048eea098ced29a300381336053efca3bd60e77532bfcd73a204642da3}"
FLASK_ENV=production
MONGODB_DB=family_housing_hub
EMAIL_FROM="${EMAIL_FROM:-sraymo377@gmail.com}"
CORS_ORIGINS="${CORS_ORIGINS},https://family-housing-hub-production.up.railway.app"

if [[ -z "${FCM_SERVER_KEY:-}" ]]; then
  echo "Warning: FCM_SERVER_KEY not set. Export it before running, or set in Railway dashboard."
fi

set_var() {
  local key="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "Skip empty: $key"
    return
  fi
  echo "Setting $key..."
  printf '%s' "$value" | railway variable set "$key" --stdin
}

echo "Syncing Railway shared variables..."

set_var MONGODB_URI "$MONGODB_URI"
set_var MONGODB_DB "$MONGODB_DB"
set_var REDIS_URL "$REDIS_URL"
set_var FIELD_ENCRYPTION_KEY "$FIELD_ENCRYPTION_KEY"
set_var JWT_SECRET "$JWT_SECRET"
set_var JWT_EXPIRES_HOURS "${JWT_EXPIRES_HOURS:-168}"
set_var FLASK_ENV "$FLASK_ENV"
set_var EMAIL_FROM "$EMAIL_FROM"
set_var CORS_ORIGINS "$CORS_ORIGINS"

set_var S3_ENDPOINT_URL "$S3_ENDPOINT_URL"
set_var S3_ACCESS_KEY_ID "$S3_ACCESS_KEY_ID"
set_var S3_SECRET_ACCESS_KEY "$S3_SECRET_ACCESS_KEY"
set_var S3_BUCKET_NAME "${S3_BUCKET_NAME:-familyhub-files}"
set_var S3_REGION "${S3_REGION:-auto}"

if [[ -n "${FCM_SERVER_KEY:-}" ]]; then
  set_var FCM_SERVER_KEY "$FCM_SERVER_KEY"
fi

echo "Done. Redeploy API service, then verify:"
echo "  curl -s https://family-housing-hub-production.up.railway.app/api/health | python3 -m json.tool"
