# Sprint Board Investigation (2026-03-23)

## The Goal

Robert wants to open one screen and see the sprint status at a glance: what's pending, in progress, ready to test, done.

## What Happened

### Initial State
- "Current milestone" view on Roadmap board (project #2), filtered by `milestone:"Curriculum & Personalization"`
- Only showed 3 items: #224 (Backlog), #243 (Backlog), #217 (Ready)
- Should have shown ~21 items

### Root Cause Discovery
All 19 sprint issues with merged PRs are **CLOSED** on GitHub. The PRs used `Closes #N`, and when merged into the sprint branch, GitHub auto-closed the issues. Only #224 and #243 were truly open.

**Key question still unresolved:** Does the "Current milestone" view filter to open issues only by default? Or is there another reason closed issues don't appear? Robert suspects milestones should show both open and closed, which is typical for milestone tracking. This needs verification in the next session.

### Intermediate Solutions Tried (and their problems)

1. **`sprint:active` label + Roadmap board view** (partially worked)
   - Created `sprint:active` label, added to all 21 open sprint issues
   - Created "Current Sprint" view on Roadmap board filtered by `label:sprint:active`
   - Initially only showed 2 items (sync delay), but after ~15 minutes showed all items correctly
   - This works NOW but may have the same problem: if issues are closed, the label view might also hide them

2. **Separate "Current Sprint" project (#3)** (created unnecessarily)
   - Created project #3 at https://github.com/users/Robert-Freire/projects/3
   - Added all 21 issues, set statuses
   - Works but adds management overhead
   - Robert said to leave it but prefers the label view on the Roadmap board

3. **Mistakes made during the session:**
   - Added #224 (deferred to Phase 2B) and #243 (P3 backlog) to the sprint board, they don't belong in the sprint
   - Wrongly assumed milestones were broken (they were working correctly, the issues were just closed)
   - Committed to sprint branch instead of main multiple times, had to cherry-pick
   - Multiple merge conflicts on memory files from parallel agent work

## Current State

- **Roadmap board (project #2):** Has "Current Sprint" view filtered by `label:sprint:active`. Shows items correctly when they're open.
- **Current Sprint board (project #3):** Has all sprint items. Left in place as secondary option.
- **`sprint:active` label:** On all 19 sprint issues (all currently closed)
- **`add-to-board.sh`:** Updated with `--sprint` flag to add to both boards
- **CLAUDE.md:** Updated with sprint label workflow and two-board documentation
- **Memory files:** Updated (task management, GitHub labels)

## RESOLVED (2026-03-23)

**Root cause:** The previous session's agent had a code bug (comparing a dict to a string), making it look like the milestone view only returned 3 items. The milestone view works perfectly: 35 items, open + closed, all columns.

**Decision:** Milestone view is the single sprint screen. Removed Project #3, `sprint:active` label workflow, `--sprint` flag, and "Current Sprint" view. Installed GitHub MCP server with projects toolset for reliable board operations.

**Changes made:** `.mcp.json` (new), `scripts/add-to-board.sh` (simplified), `.claude/CLAUDE.md` (single-board workflow), memory files updated.

**Manual steps for Robert:**
1. Delete "Current Sprint" view on Roadmap board
2. Archive Project #3 (Settings > Danger Zone > Close project)
3. Update "Current milestone" view filter to `milestone:"Curriculum & Personalization"` and save
4. Create a GitHub **Classic** Personal Access Token (Settings > Developer settings > Personal access tokens > Tokens (classic)). Fine-grained tokens do NOT support Projects for personal accounts. Scopes: `repo`, `project`, `read:org`
5. Set `GITHUB_PERSONAL_ACCESS_TOKEN` as an environment variable in your shell profile
6. Restart Claude Code, verify MCP with `/mcp`

---

## Open Questions (resolved)

1. **Why does the milestone view hide closed issues?** Check the "Current milestone" view settings. Is there an `is:open` filter? Can it be changed to show all issues? If yes, milestones alone solve the problem and we don't need the label.

2. **Should we stop using `Closes #N` in sprint PRs?** If the view can show closed issues, this doesn't matter. If it can't, we need to switch to `Refs #N` so issues stay open until Robert's QA pass. The third option is to reopen issues after merge.

3. **What's the right workflow?** Possibilities:
   - A) Fix the milestone view to show closed issues (simplest if possible)
   - B) Use `Refs #N` instead of `Closes #N` for sprint PRs, close manually after QA
   - C) Keep the `sprint:active` label view (works, but duplicates milestone functionality)
   - D) Use project #3 as the sprint board (works, adds overhead)

4. **Should #224 and #243 be removed from the milestone?** #224 was deferred to Phase 2B. #243 is P3 backlog. Neither belongs in the active sprint.

## Files Changed This Session

- `.claude/CLAUDE.md` — e2e stack clarification for review-ui, sprint label workflow, two-board docs
- `.claude/agents/review.md` — two new patterns (React key prop, over-broad filter)
- `scripts/add-to-board.sh` — `--sprint` flag, dual-board support
- `.claude/memory/project_langteach_task_management.md` — two-board workflow, sprint label docs
- `.claude/memory/project_langteach_github_labels.md` — sprint:active label entry
- `.claude/memory/feedback_worktree_cwd_discipline.md` — rebase conflict resolution rule
- `.claude/memory/project_langteach_task_status.md` — #223, #241, #242 completion entries
- `plan/sprints/curriculum-personalization-test-script.md` — added sections 9-11
- `plan/code-review-backlog.md` — cleaned up, items promoted to issues
- `plan/ui-review-backlog.md` — cleaned up, items promoted to issues
- `plan/observed-issues.md` — annotated with covering issues

## Issues Created This Session

| # | Title | Priority | Milestone |
|---|-------|----------|-----------|
| #241 | Student form UX bugs (z-index, stale weaknesses, chips) | P1 | C&P (DONE, PR #248 merged) |
| #242 | Duplicate Regenerate labels + auto-fill hint | P2 | C&P (DONE, PR #247 merged) |
| #243 | Batch visual polish (~50 minor items) | P3 | C&P (should it be here?) |
| #244 | Silent error swallowing in deserialization/forms | P2 | None (backlog) |
| #245 | Fragile string matching and manual field listings | P2 | None (backlog) |
| #246 | Mobile header overflow at 375px | P2 | None (backlog) |
