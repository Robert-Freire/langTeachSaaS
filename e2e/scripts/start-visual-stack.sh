#!/usr/bin/env bash
# start-visual-stack.sh
# Starts the e2e stack (docker-compose.e2e.yml) for visual Playwright specs.
# Builds the frontend, starts all services, waits for health, runs visual seed.
# Idempotent: safe to call on an already-running stack.
#
# Uses docker-compose.e2e.yml (project: langteachsaas-e2e, frontend on port 5174)
# to match the playwright.config.ts default baseURL (http://localhost:5174).
#
# Requires .env.e2e in the repo root. The post-worktree-creation hook copies it.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${REPO_ROOT}"

COMPOSE_FILE="docker-compose.e2e.yml"
COMPOSE_CMD="docker compose -f ${COMPOSE_FILE} --env-file .env.e2e"
API_CONTAINER="langteachsaas-e2e-api-1"
FRONTEND_PORT=5174
API_PORT=5000

echo "[visual-stack] Building frontend image..."
${COMPOSE_CMD} build frontend

echo "[visual-stack] Starting services (excluding playwright container)..."
${COMPOSE_CMD} up -d azurite sqlserver api frontend

echo "[visual-stack] Waiting for SQL Server to be healthy..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
  status=$(docker inspect --format='{{.State.Health.Status}}' langteachsaas-e2e-sqlserver-1 2>/dev/null || echo "missing")
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
  if curl -sf http://localhost:${API_PORT}/health > /dev/null 2>&1; then
    echo "[visual-stack] API is healthy."
    break
  fi
  attempt=$((attempt + 1))
  echo "[visual-stack]   API not ready yet (attempt $attempt/$max_attempts)"
  sleep 3
done
if [ $attempt -eq $max_attempts ]; then
  echo "[visual-stack] ERROR: API did not become healthy in time." >&2
  exit 1
fi

echo "[visual-stack] Waiting for frontend to be ready..."
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if curl -sf http://localhost:${FRONTEND_PORT} > /dev/null 2>&1; then
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

echo "[visual-stack] Running visual seed (idempotent)..."
MSYS_NO_PATHCONV=1 docker exec "${API_CONTAINER}" dotnet LangTeach.Api.dll --visual-seed auth0|e2e-test-teacher
echo "[visual-stack] Visual seed complete."

echo "[visual-stack] Stack is ready. Run: cd e2e && npx playwright test --project=visual"
