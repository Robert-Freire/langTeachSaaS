# Sprint Branch Lifecycle

## Start

Create `sprint/<slug>` from `main`. Update "Current milestone" view filter on the Roadmap board in GitHub UI. New sprint issues use `./scripts/add-to-board.sh <url> <status>`.

## During sprint

Agents open PRs against the sprint branch. Robert periodically triggers the `merge-sprint-to-main` GitHub Action to sync sprint work into main (unless frozen).

Deploy freeze = Robert does not trigger the merge action. Sprint branch keeps receiving work, main stays stable, Azure stays on last good state.

## Sprint close

Three stages:

**Stage 1 (PM, main conversation):** Read `plan/code-review-backlog.md`, `plan/ui-review-backlog.md`, `plan/observed-issues.md`. Triage each entry as FIX NOW / NEXT SPRINT / DELETE. Present to user. Implement FIX NOW items via normal worktree flow. Batch NEXT SPRINT items into themed GitHub issues. Clear triaged entries.

**Stage 2 (agent):** After user approves backlogs, run the `sprint-close` agent (`subagent_type: "sprint-close"`). It verifies board/issues, runs Teacher QA, prompt health review, and pedagogy review. Returns READY / NOT READY.

**Stage 3 (cleanup, after user triggers merge action):** Close the milestone, delete the sprint branch, update memory (task status, sprint overviews), clear remaining backlog entries.

## Next sprint

New `sprint/<slug>` from `main`. Update milestone view filter.
