#!/bin/sh
set -e
cd /app
pnpm install --frozen-lockfile
exec "$@"
