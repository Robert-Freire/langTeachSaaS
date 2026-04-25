# Sprint Branch Lifecycle

## Start

1. Create `sprint/<slug>` from `main`.
2. **Write the sprint story** at `plan/sprints/<slug>.md`. This file grounds every task plan, reviewer, and PM conversation for the sprint. It must include:
   - The teacher's narrative (what does their day look like after this sprint?)
   - What changes for them (before/after)
   - What this sprint delivers (concrete deliverables)
   - What we're NOT building (scope fence)
3. Update "Current milestone" view filter on the Roadmap board in GitHub UI.
4. Run the full milestone sync to add all pre-created sprint issues to the board:
   ```bash
   ./scripts/sync-board-milestone.sh "<milestone-name>"
   ```
   After that, new issues added to the milestone are synced automatically by the `sync-board.yml` GitHub Actions workflow (requires `GH_PROJECT_TOKEN` secret).

## During sprint

Agents open PRs against the sprint branch. Robert periodically triggers the `merge-sprint-to-main` GitHub Action to sync sprint work into main (unless frozen).

Deploy freeze = Robert does not trigger the merge action. Sprint branch keeps receiving work, main stays stable, Azure stays on last good state.

## Sprint close

Four stages:

**Stage 1 (PM, main conversation):** Read `plan/code-review-backlog.md`, `plan/ui-review-backlog.md`, `plan/observed-issues.md`, and `plan/ui-review-skipped.md`. Triage each entry as FIX NOW / NEXT SPRINT / DELETE. Present to user. Implement FIX NOW items via normal worktree flow. Batch NEXT SPRINT items into themed GitHub issues. Clear triaged entries.

**Audit `plan/ui-review-skipped.md` specifically:** every row is a task that bypassed `review-ui` under the trivial-frontend exemption. For each, verify the skip was justified (truly CSS-only, <20 lines, single file). If any look risky in retrospect, add the affected screen(s) to the `review-ui-sprint` scope in Stage 2. Clear the log after audit.

**Stage 1b (branch-level review):** Review the full sprint branch diff against `main` for cross-cutting issues that per-PR reviews miss. This catches architectural drift, duplicated patterns, and inconsistencies across all tasks merged during the sprint.

Run these three reviewers sequentially (not in background), each against the full diff:

1. **Sophy** (`subagent_type: "sophy"`): model drift, duplicated logic, over-engineering, KISS/SOLID violations across the aggregate changes.
2. **Architecture reviewer** (`subagent_type: "architecture-reviewer"`): pattern violations, convention breaks, missed reuse of shared utilities.
3. **Prompt health reviewer** (`subagent_type: "prompt-health-reviewer"`): stale instructions, contradictions, or redundancy in AI generation prompt templates (especially after sprints that change student fields or content types).

Each reviewer prompt must include:
- Instruction to focus on **cross-cutting concerns** (duplication, drift, inconsistency), not line-level nits (CodeRabbit already covers those per-PR).
- **Consistency sweep instruction (mandatory):** "Scan the full sprint diff for parallel implementations of the same behavior — validation rules, labels for domain concepts (CEFR level, lesson status, etc.), error message formats, default values, permission checks, empty/loading/error state conventions, and UI patterns for the same concept. When the same conceptual rule appears with two different implementations across tasks in this sprint, flag it as Inconsistency. This is the highest-value finding at sprint level — it catches 'screen A was polished but screen B still uses the old pattern' issues that per-PR review misses entirely."
- A summary of known deferred items from the Stage 1 backlog triage, so reviewers do not re-flag them.
- The sprint story file path so reviewers understand the intent behind the changes.

**Stage 2 (agent):** After user approves backlogs and branch review findings, run the `sprint-close` agent (`subagent_type: "sprint-close"`). It verifies board/issues, runs the comprehensive UI/UX sprint review (`review-ui-sprint`), Teacher QA, prompt health review, and pedagogy review. Returns READY / NOT READY.

**Stage 2b (issue filing, mandatory):** After Stage 2 completes, review all findings from every reviewer (Stage 1b branch reviewers, Isaac pedagogy review, prompt health review, Teacher QA triage, UI/UX review). Every finding with severity >= minor that is not fixed in the current sprint **must** be filed as a GitHub issue (batch related findings into one issue) and assigned to the next sprint milestone. Findings without a GitHub issue are considered lost. The sprint cannot move to Stage 3 until all findings are filed.

**Stage 3 (cleanup, after user triggers merge action):** Close the milestone, delete the sprint branch, update memory (task status, sprint overviews), clear remaining backlog entries.

## Next sprint

New `sprint/<slug>` from `main`. Update milestone view filter.
