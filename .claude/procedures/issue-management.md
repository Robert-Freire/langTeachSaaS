# Issue Management

## Issue creation checklist

**Every issue must pass this checklist before creation. No exceptions.**

### Before writing the issue

1. **All decisions are made.** The issue body must not contain open choices ("A or B", "TBD", "consider X or Y", "Options:"). If a decision is needed, make it with the user first, then create the issue. An implementer should never have to choose between approaches.
2. **Scope is one concern.** If you're writing "also" or "additionally" for unrelated work, it's two issues.

### Required labels (set at creation time, not later)

| Label type | Rule |
|------------|------|
| Priority | Exactly one: `P0:blocker`, `P1:must`, `P2:should`, `P3:nice` |
| Area | At least one: `area:frontend`, `area:backend`, `area:e2e`, `area:infra`, `area:design`, `area:ai` |
| Size | One of: `size:XS`, `size:S`, `size:M`, `size:L`, `size:XL`. Estimate based on AC count and complexity. |
| qa:ready | Add only after verifying the checklist below passes. |

### Body quality gate

Before adding `qa:ready`, verify:

- [ ] **Problem statement**: 2+ sentences explaining what changes and why. Not a title restatement.
- [ ] **Acceptance criteria**: every AC is a `- [ ]` checkbox that is verifiable (pass/fail, not subjective).
- [ ] **No open decisions**: every "or" in the ACs is a red flag. Grep your own body for "or", "consider", "options", "TBD", "alternatively" before creating.
- [ ] **Milestone assigned**: every issue belongs to a milestone.
- [ ] **Out of scope section**: explicitly lists what this issue does NOT cover (prevents scope creep during implementation).
- [ ] **Stitch/design reference**: for `area:frontend` issues, include the path to the relevant Stitch design files.
- [ ] **Dependencies**: if this issue depends on another, state it explicitly.
- [ ] **Full-stack split**: if both `area:frontend` and `area:backend`, the body must justify why it's one issue (see "Full-stack issues" section below).

### Specialist gates (check before adding qa:ready)

These replace the qa-ready agent's specialist checks. Only apply when the trigger matches.

**Data model gate (trigger: issue mentions new table, entity, schema, migration, DTO, foreign key, content type)**
- Ask yourself: does this change the data model? If yes, flag it to the user and recommend a Sophy review before implementation starts. A bot building on a wrong data model wastes an entire PR cycle.

**AI traceability gate (trigger: issue changes PromptService, prompt templates, exercise/content types, pedagogy config)**
- The ACs must include: `- [ ] After PR merge, update .claude/skills/teacher-qa/output/prior-findings.md with what changed`
- Without this, Teacher QA loses track of generation behavior changes.

**Frontend data availability gate (trigger: issue has `area:frontend`)**
- Check: do the fields referenced in the ACs actually exist in the API response? Grep the relevant DTO or API endpoint to confirm.
- If a field is missing from the backend, **STOP**. Do not create the issue with a frontend-only label. Either: (a) add `area:backend` and include the API change in scope, (b) create a prerequisite backend issue, or (c) ask the user. Never assume a field exists without checking.

**Visual test coverage gate (trigger: issue has `area:frontend`)**
- Check: does a `@visual` spec exist in `e2e/tests/visual/` for the affected route?
- Check: does `DemoSeeder.cs` create the data needed for that screen to render?
- If gaps exist, note them in the issue body under "Notes for implementation" so the implementer adds the spec. These are non-blocking for `qa:ready` but must be flagged.

**XL size gate**
- Any issue sized XL must be explicitly approved by the user before adding `qa:ready`. Present the scope breakdown and ask: "This is XL. Should we split it, or is it good to go as one issue?" Do not proceed without confirmation.

### After creation

- Verify the issue appears on the project board (the sync workflow handles this, but check).
- If created during a PM session where decisions were made interactively, add `qa:ready` directly (no need to run the qa-ready agent). The PM conversation IS the quality gate.
- If created outside a PM session (backlog grooming, triage), run the `qa-ready` agent.

## Editing existing issues

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
