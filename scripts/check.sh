#!/bin/sh
# Project check (.taskcheck): install deps if the lockfile changed, then lint + type-check + test everything.
set -e
cd "$(dirname "$0")/.."
if [ ! -f node_modules/.package-lock.json ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  echo "check: installing dependencies (npm ci)"
  npm ci --no-audit --no-fund --loglevel=error
fi
npm run check --silent
