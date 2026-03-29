# Issue Management

## Creating and editing issues

- Run `/qa` on every newly created issue before considering it done.
- Before editing a `qa:ready` issue: check it's not assigned (stop if it is), remove `qa:ready`, make the edit, re-run `/qa`, restore the label only if QA passes.

## Adding issues to the project board

Every new issue must be added to the board with a status. **Never use `gh project item-add` directly** (leaves items in "No Status").

Use the helper script:
```bash
./scripts/add-to-board.sh <issue-url> [status]
```
Status values: `backlog` (default), `ready`, `in-progress`, `ready-to-test`, `done`

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
