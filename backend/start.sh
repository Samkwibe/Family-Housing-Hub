#!/bin/bash
# Start script for Python backend
cd "$(dirname "$0")"
gunicorn app:app --bind 0.0.0.0:${PORT:-5000} --workers 2 --threads 2 --timeout 120

