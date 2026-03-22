#!/usr/bin/env bash
# Usage: ./scripts/add-to-board.sh <issue-url> [status]
# Status: backlog (default), ready, in-progress, ready-to-test, done
#
# Adds a GitHub issue to the LangTeach project board AND sets its status.
# This replaces the two-step process that agents keep forgetting.

set -euo pipefail

PROJECT_ID="PVT_kwHOAF1Pks4BSLsS"
FIELD_ID="PVTSSF_lAHOAF1Pks4BSLsSzg_ysiA"

declare -A STATUS_IDS=(
  [backlog]="7cba4571"
  [ready]="eec9fa45"
  [in-progress]="47fc9ee4"
  [ready-to-test]="530fcec2"
  [done]="61f69a4c"
)

ISSUE_URL="${1:?Usage: add-to-board.sh <issue-url> [status]}"
STATUS="${2:-backlog}"

if [[ -z "${STATUS_IDS[$STATUS]+x}" ]]; then
  echo "Unknown status: $STATUS"
  echo "Valid: backlog, ready, in-progress, ready-to-test, done"
  exit 1
fi

ITEM_ID=$(gh project item-add 2 --owner Robert-Freire --url "$ISSUE_URL" --format json | python -c "import json,sys; print(json.load(sys.stdin)['id'])")

gh project item-edit --project-id "$PROJECT_ID" --id "$ITEM_ID" --field-id "$FIELD_ID" --single-select-option-id "${STATUS_IDS[$STATUS]}"

echo "Added to board as: $STATUS"
