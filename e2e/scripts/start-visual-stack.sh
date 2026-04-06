#!/usr/bin/env bash
# start-visual-stack.sh
# Starts the e2e stack for host-side visual Playwright specs.
# Uses docker-compose.e2e.yml + docker-compose.visual.yml overlay.
# The overlay exposes api:5178 and sqlserver:1434 to the host so that
# host-side Playwright can call the API and SQL Server directly.
#
# Frontend is at http://localhost:5174 (matches playwright.config.ts default baseURL).
# API is at http://localhost:5178 (matches VITE_API_BASE_URL default in specs).
# SQL Server is at 127.0.0.1:1434 (matches DB_PORT default in db-helper.ts).
#
# Idempotent: safe to call on an already-running stack.
# Requires .env.e2e in the repo root.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${REPO_ROOT}"

COMPOSE_CMD="docker compose -f docker-compose.e2e.yml -f docker-compose.visual.yml --env-file .env.e2e"
API_CONTAINER="langteachsaas-e2e-api-1"
SQL_CONTAINER="langteachsaas-e2e-sqlserver-1"
max_attempts=30

echo "[visual-stack] Building api and frontend images..."
${COMPOSE_CMD} build api frontend

echo "[visual-stack] Starting services (azurite, sqlserver, api, frontend)..."
${COMPOSE_CMD} up -d azurite sqlserver api frontend

echo "[visual-stack] Waiting for SQL Server to be healthy..."
attempt=0
while [ $attempt -lt $max_attempts ]; do
  status=$(docker inspect --format='{{.State.Health.Status}}' "${SQL_CONTAINER}" 2>/dev/null || echo "missing")
  if [ "$status" = "healthy" ]; then
    echo "[visual-stack] SQL Server is healthy."
    break
  fi
  attempt=$((attempt + 1))
  echo "[visual-stack]   SQL Server status: $status (attempt $attempt/$max_attempts)"
  sleep 3
done
if [ $attempt -eq $max_attempts ]; then
  echo "[visual-stack] ERROR: SQL Server did not become healthy in time." >&2
  exit 1
fi

echo "[visual-stack] Waiting for API to be healthy..."
attempt=0
while [ $attempt -lt $max_attempts ]; do
  status=$(docker inspect --format='{{.State.Health.Status}}' "${API_CONTAINER}" 2>/dev/null || echo "missing")
  if [ "$status" = "healthy" ]; then
    echo "[visual-stack] API is healthy."
    break
  fi
  attempt=$((attempt + 1))
  echo "[visual-stack]   API status: $status (attempt $attempt/$max_attempts)"
  sleep 3
done
if [ $attempt -eq $max_attempts ]; then
  echo "[visual-stack] ERROR: API did not become healthy in time." >&2
  exit 1
fi

echo "[visual-stack] Waiting for frontend to be ready..."
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if curl -sf http://localhost:5174 > /dev/null 2>&1; then
    echo "[visual-stack] Frontend is ready."
    break
  fi
  attempt=$((attempt + 1))
  echo "[visual-stack]   Frontend not ready yet (attempt $attempt/$max_attempts)"
  sleep 3
done
if [ $attempt -eq $max_attempts ]; then
  echo "[visual-stack] ERROR: Frontend did not become ready in time." >&2
  exit 1
fi

echo "[visual-stack] Registering mock teacher (auto-registers on first /api/auth/me call)..."
curl -sf http://localhost:5178/api/auth/me \
  -H "Authorization: Bearer test-token" \
  -H "Accept: application/json" > /dev/null
echo "[visual-stack] Mock teacher registered."

echo "[visual-stack] Running visual seed (idempotent)..."
MSYS_NO_PATHCONV=1 docker exec "${API_CONTAINER}" dotnet LangTeach.Api.dll --visual-seed "auth0|e2e-test-teacher"
echo "[visual-stack] Visual seed complete."

echo "[visual-stack] Stack is ready."
echo "[visual-stack]   Frontend: http://localhost:5174"
echo "[visual-stack]   API:      http://localhost:5178"
echo "[visual-stack] Run: cd e2e && npx playwright test --project=visual"
