#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export npm_config_cache="${VISA_NPM_CACHE:-/tmp/visa-npm-cache}"
if [ ! -f .env ]; then cp .env.example .env; chmod 600 .env; fi
npm ci --ignore-scripts
npm run db:generate
docker compose up -d --wait db
npm run db:migrate
npm run db:seed
echo "Setup complete. Run npm run dev; validate GET /api/health before development."
