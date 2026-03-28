#!/bin/sh
set -e
export CI="${CI:-true}"
# Monorepo: workspace ở /app, service backend ở /app/backend
if [ -f /app/pnpm-workspace.yaml ]; then
  cd /app
  pnpm install --frozen-lockfile --filter backend
  cd /app/backend
else
  cd /app
  pnpm install --frozen-lockfile
fi
exec "$@"
