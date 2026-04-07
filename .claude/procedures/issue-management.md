# Issue Management

## Creating and editing issues

- Run the `qa-ready` agent on every newly created issue before considering it done.
- Before editing a `qa:ready` issue: check it's not assigned (stop if it is), remove `qa:ready`, make the edit, re-run the `qa-ready` agent, restore the label only if QA passes.

### Full-stack issues: split by default

When creating an issue that touches both frontend and backend, decide explicitly at creation time: **one issue or two?**

Split into two issues when:
- The frontend and backend work can be PR'd and reviewed independently
- A backend developer could implement the API without needing the UI to be done first
- The issue body lists distinct backend deliverables (endpoints, services, migrations) AND distinct frontend deliverables (components, pages, hooks)

Keep as one issue only when:
- The change is trivially atomic end-to-end (e.g., rename a field in the DTO and update the display label)
- Splitting would create a meaningless stub PR on one side

If kept as one, **the body must explicitly say why** (one sentence is enough). The qa-ready agent will flag any dual-area issue that does not justify itself.

## Adding issues to the project board

**Automatic sync (via GitHub Actions):** The `sync-board.yml` workflow fires on `milestoned`, `labeled`, `unlabeled`, `assigned`, `unassigned`, and `reopened` events. It adds the issue to the board and sets Status automatically:
- assigned -> In Progress
- `qa:ready` label (unassigned) -> Ready
- everything else -> Backlog

This requires the `GH_PROJECT_TOKEN` repository secret (classic PAT with `project` scope).

**Manual add (when workflow hasn't fired yet):** Every new issue must be added to the board with a status. **Never use `gh project item-add` directly** (leaves items in "No Status").

Use the helper script:
```bash
./scripts/add-to-board.sh <issue-url> [status]
```
Status values: `backlog` (default), `ready`, `in-progress`, `ready-to-test`, `done`

**Full milestone sync (fix drift):** If the board has drifted from the issue list, run:
```bash
./scripts/sync-board-milestone.sh "Adaptive Replanning"
```
Run this at sprint start and whenever you notice missing items.

## Labels

- **Priority** (mutually exclusive): `P0:blocker`, `P1:must`, `P2:should`, `P3:nice`
- **Area** (stackable): `area:frontend`, `area:backend`, `area:e2e`, `area:infra`, `area:design`, `area:ai`
- **Type**: `type:polish`, `type:tech-debt`
- **Workflow**: `qa:ready`, `demo-sprint`
- **Sprint**: `sprint:active` (deprecated, no longer added to new issues)

## Closing issues via PR

- PR body must include `Closes #N` for documentation, but **auto-close only works for PRs targeting `main`**. Sprint PRs will NOT auto-close.
- Apply appropriate area/type labels when creating issues.

## After PR is merged

Run the `task-merged` agent (pass the issue number). It closes the issue and moves it to "Ready to Test" on the board. Then call `ExitWorktree(action: "remove")`.

Never move issues to "Done" (user does sanity checks and moves manually).
