#!/bin/bash

# Script to run dev server with OneDrive sync workaround
# This script waits for files to be accessible before running npm

cd "/Users/samuelraymond/Library/CloudStorage/OneDrive-SNHU/SNHU Academic Materials/2025 Fall & Spring/PERSONAL PROJECTS/Family-Housing-Hub"

echo "Waiting for OneDrive files to sync..."
echo "This may take a moment if files are syncing from the cloud..."

# Wait for package.json to be readable (max 30 seconds)
MAX_WAIT=30
WAIT_TIME=0
while [ $WAIT_TIME -lt $MAX_WAIT ]; do
  if cat package.json > /dev/null 2>&1; then
    echo "✅ Files are accessible!"
    break
  fi
  echo "⏳ Waiting for files to sync... (${WAIT_TIME}s)"
  sleep 2
  WAIT_TIME=$((WAIT_TIME + 2))
done

if [ $WAIT_TIME -ge $MAX_WAIT ]; then
  echo "❌ Timeout waiting for files to sync."
  echo "Please wait for OneDrive to finish syncing and try again."
  exit 1
fi

echo ""
echo "Starting dev server..."
npm run dev





