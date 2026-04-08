#!/usr/bin/env bash
# Usage: ./scripts/sync-board-milestone.sh "<milestone-name>"
#
# Syncs all OPEN issues in a milestone to the LangTeach Roadmap board.
# Run at sprint start or whenever the board has drifted from the issue list.
#
# Status mapping:
#   assigned             -> in-progress
#   qa:ready (unassigned)-> ready
#   everything else      -> backlog
#
# Closed issues are NOT touched (task-merged.py owns that transition).

set -euo pipefail

MILESTONE="${1:?Usage: sync-board-milestone.sh \"<milestone-name>\"}"

PROJECT_OWNER="Robert-Freire"
PROJECT_NUMBER="2"
PROJECT_ID="PVT_kwHOAF1Pks4BSLsS"
STATUS_FIELD_ID="PVTSSF_lAHOAF1Pks4BSLsSzg_ysiA"

status_option_id() {
  case "$1" in
    backlog)      echo "7cba4571" ;;
    ready)        echo "eec9fa45" ;;
    in-progress)  echo "47fc9ee4" ;;
    ready-to-test)echo "530fcec2" ;;
    done)         echo "61f69a4c" ;;
    *) echo "Unknown status: $1" >&2; exit 1 ;;
  esac
}

echo "Fetching open issues for milestone: $MILESTONE"

ISSUES_JSON=$(gh issue list \
  --milestone "$MILESTONE" \
  --state open \
  --json url,labels,assignees \
  --limit 100)

PAIRS=$(echo "$ISSUES_JSON" | python3 -c "
import json, sys

issues = json.load(sys.stdin)
for issue in issues:
    labels = [l['name'] for l in issue['labels']]
    assignees = issue['assignees']

    if assignees:
        status = 'in-progress'
    elif 'qa:ready' in labels:
        status = 'ready'
    else:
        status = 'backlog'

    print(issue['url'] + '|' + status)
")

if [ -z "$PAIRS" ]; then
  echo "No open issues found for milestone: $MILESTONE"
  exit 0
fi

while IFS='|' read -r url status; do
  echo -n "  $url -> $status ... "

  OPTION_ID=$(status_option_id "$status")

  ITEM_ID=$(gh project item-add "$PROJECT_NUMBER" \
    --owner "$PROJECT_OWNER" \
    --url "$url" \
    --format json \
    | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")

  gh project item-edit \
    --project-id "$PROJECT_ID" \
    --id "$ITEM_ID" \
    --field-id "$STATUS_FIELD_ID" \
    --single-select-option-id "$OPTION_ID"

  echo "done"
done < <(echo "$PAIRS" | tr -d '\r')

echo "Sync complete."
