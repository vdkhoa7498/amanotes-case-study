#!/bin/sh
set -e
export CI="${CI:-true}"
if [ -f /app/pnpm-workspace.yaml ]; then
  cd /app
  pnpm install --frozen-lockfile --filter frontend
  cd /app/frontend
else
  cd /app
  pnpm install --frozen-lockfile
fi
exec "$@"
