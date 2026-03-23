#!/usr/bin/env bash
# Usage: ./scripts/add-to-board.sh <issue-url> [status]
# Status: backlog (default), ready, in-progress, ready-to-test, done
#
# Adds a GitHub issue to the LangTeach Roadmap board AND sets its status.

set -euo pipefail

# Roadmap project (#2)
ROADMAP_PROJECT_ID="PVT_kwHOAF1Pks4BSLsS"
ROADMAP_FIELD_ID="PVTSSF_lAHOAF1Pks4BSLsSzg_ysiA"

declare -A ROADMAP_STATUS_IDS=(
  [backlog]="7cba4571"
  [ready]="eec9fa45"
  [in-progress]="47fc9ee4"
  [ready-to-test]="530fcec2"
  [done]="61f69a4c"
)

ISSUE_URL="${1:?Usage: add-to-board.sh <issue-url> [status]}"
STATUS="${2:-backlog}"

if [[ -z "${ROADMAP_STATUS_IDS[$STATUS]+x}" ]]; then
  echo "Unknown status: $STATUS"
  echo "Valid: backlog, ready, in-progress, ready-to-test, done"
  exit 1
fi

# Add to Roadmap board
ITEM_ID=$(gh project item-add 2 --owner Robert-Freire --url "$ISSUE_URL" --format json | python -c "import json,sys; print(json.load(sys.stdin)['id'])")
gh project item-edit --project-id "$ROADMAP_PROJECT_ID" --id "$ITEM_ID" --field-id "$ROADMAP_FIELD_ID" --single-select-option-id "${ROADMAP_STATUS_IDS[$STATUS]}"
echo "Roadmap: $STATUS"
