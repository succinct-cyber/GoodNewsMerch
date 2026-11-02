#!/usr/bin/env sh
# Railway / Nixpacks: PORT is required. Use exec so gunicorn replaces PID 1 (clean signals).
set -e
if [ -z "${PORT}" ]; then
  echo "ERROR: PORT is not set. Railway must inject PORT for the web process."
  exit 1
fi
exec gunicorn goodnews_merch.wsgi:application \
  --bind "0.0.0.0:${PORT}" \
  --workers 1 \
  --timeout 120 \
  --graceful-timeout 30 \
  --access-logfile - \
  --error-logfile -
