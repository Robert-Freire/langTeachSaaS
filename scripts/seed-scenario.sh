#!/usr/bin/env bash
# seed-scenario.sh <N> [teacher-email-or-auth0-id]
#
# Switches the local Docker DB to one of 6 named dashboard test scenarios.
# Runs inside the already-running API container — start the stack first.
#
# Usage:
#   scripts/seed-scenario.sh 1                         # uses E2E_TEST_EMAIL from .env.e2e
#   scripts/seed-scenario.sh 1 teacher@example.com     # explicit teacher
#   SEED_TEACHER=me@example.com scripts/seed-scenario.sh 3
#
# Scenarios:
#   1 — "Class in 20 minutes"   (Ana Visual)
#   2 — "Session this week"     (Marco B1)
#   3 — "Nothing scheduled"     (Carmen C1, all empty states)
#   4 — "Overdue followups"     (Nadia B2)
#   5 — "Roster signals"        (Ana/Marco/Clara/Diego Seed, 4 signal states)
#   6 — "Full hero briefing"    (Hans B1)

set -euo pipefail

SCENARIO="${1:-}"
TEACHER="${2:-${SEED_TEACHER:-}}"

if [ -z "$SCENARIO" ]; then
  echo "Usage: seed-scenario.sh <N> [teacher-email-or-auth0-id]" >&2
  echo "       Valid scenarios: 1-6" >&2
  exit 1
fi

if ! [[ "$SCENARIO" =~ ^[1-6]$ ]]; then
  echo "ERROR: scenario must be 1-6, got: $SCENARIO" >&2
  exit 1
fi

# Resolve teacher: arg > env var > E2E_TEST_EMAIL from .env.e2e
if [ -z "$TEACHER" ] && [ -f ".env.e2e" ]; then
  TEACHER=$(grep -E '^E2E_TEST_EMAIL=' .env.e2e | cut -d= -f2 | tr -d '"' || true)
fi

if [ -z "$TEACHER" ]; then
  echo "ERROR: teacher not set. Pass as arg 2, set SEED_TEACHER, or add E2E_TEST_EMAIL to .env.e2e" >&2
  exit 1
fi

# Find the running API container (matches name containing "api" on port 5000)
CONTAINER=$(MSYS_NO_PATHCONV=1 docker ps \
  --filter "status=running" \
  --format "{{.Names}}\t{{.Ports}}" \
  | grep -E ':5000([^0-9]|$)' \
  | awk '{print $1}' \
  | head -1 || true)

if [ -z "$CONTAINER" ]; then
  echo "ERROR: No running API container found (expected one with port 5000 exposed)." >&2
  echo "       Start the stack first, e.g.: docker compose -f docker-compose.e2e.yml --env-file .env.e2e up -d" >&2
  exit 1
fi

echo "Seeding scenario $SCENARIO via container '$CONTAINER' (teacher: $TEACHER)..."
MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" dotnet LangTeach.Api.dll --seed-scenario "$SCENARIO" "$TEACHER"
