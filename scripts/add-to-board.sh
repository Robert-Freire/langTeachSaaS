#!/usr/bin/env bash
# Usage: ./scripts/add-to-board.sh <issue-url> [status] [--sprint]
# Status: backlog (default), ready, in-progress, ready-to-test, done
# --sprint: also add to the Current Sprint project board
#
# Adds a GitHub issue to the LangTeach Roadmap board AND sets its status.
# With --sprint, also adds to the Current Sprint board with the same status.

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

# Current Sprint project (#3)
SPRINT_PROJECT_ID="PVT_kwHOAF1Pks4BShHi"
SPRINT_FIELD_ID="PVTSSF_lAHOAF1Pks4BShHizhABwO8"

declare -A SPRINT_STATUS_IDS=(
  [backlog]="f75ad846"
  [ready]="61e4505c"
  [in-progress]="47fc9ee4"
  [in-review]="df73e18b"
  [ready-to-test]="aaab90c6"
  [done]="98236657"
)

ISSUE_URL="${1:?Usage: add-to-board.sh <issue-url> [status] [--sprint]}"
STATUS="${2:-backlog}"
SPRINT_FLAG="${3:-}"

if [[ -z "${ROADMAP_STATUS_IDS[$STATUS]+x}" ]]; then
  echo "Unknown status: $STATUS"
  echo "Valid: backlog, ready, in-progress, ready-to-test, done"
  exit 1
fi

# Add to Roadmap board
ITEM_ID=$(gh project item-add 2 --owner Robert-Freire --url "$ISSUE_URL" --format json | python -c "import json,sys; print(json.load(sys.stdin)['id'])")
gh project item-edit --project-id "$ROADMAP_PROJECT_ID" --id "$ITEM_ID" --field-id "$ROADMAP_FIELD_ID" --single-select-option-id "${ROADMAP_STATUS_IDS[$STATUS]}"
echo "Roadmap: $STATUS"

# Add to Current Sprint board if --sprint flag
if [[ "$SPRINT_FLAG" == "--sprint" ]]; then
  SPRINT_STATUS="${SPRINT_STATUS_IDS[$STATUS]:-}"
  if [[ -z "$SPRINT_STATUS" || "$SPRINT_STATUS" == "PLACEHOLDER" ]]; then
    # Fall back to backlog if status not mapped
    SPRINT_STATUS="${SPRINT_STATUS_IDS[backlog]}"
  fi
  SPRINT_ITEM_ID=$(gh project item-add 3 --owner Robert-Freire --url "$ISSUE_URL" --format json | python -c "import json,sys; print(json.load(sys.stdin)['id'])")
  gh project item-edit --project-id "$SPRINT_PROJECT_ID" --id "$SPRINT_ITEM_ID" --field-id "$SPRINT_FIELD_ID" --single-select-option-id "$SPRINT_STATUS"
  echo "Current Sprint: $STATUS"
fi
