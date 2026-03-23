#!/usr/bin/env bash
# Usage: ./scripts/add-to-board.sh <issue-url> [status] [--sprint]
# Status: backlog (default), ready, in-progress, ready-to-test, done
# --sprint: also add the sprint:active label (use for issues in the active sprint)
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

ISSUE_URL="${1:?Usage: add-to-board.sh <issue-url> [status] [--sprint]}"
STATUS="${2:-backlog}"
SPRINT_FLAG="${3:-}"

if [[ -z "${STATUS_IDS[$STATUS]+x}" ]]; then
  echo "Unknown status: $STATUS"
  echo "Valid: backlog, ready, in-progress, ready-to-test, done"
  exit 1
fi

ITEM_ID=$(gh project item-add 2 --owner Robert-Freire --url "$ISSUE_URL" --format json | python -c "import json,sys; print(json.load(sys.stdin)['id'])")

gh project item-edit --project-id "$PROJECT_ID" --id "$ITEM_ID" --field-id "$FIELD_ID" --single-select-option-id "${STATUS_IDS[$STATUS]}"

if [[ "$SPRINT_FLAG" == "--sprint" ]]; then
  ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$')
  gh issue edit "$ISSUE_NUM" --add-label "sprint:active"
  echo "Added to board as: $STATUS (sprint:active label added)"
else
  echo "Added to board as: $STATUS"
fi
