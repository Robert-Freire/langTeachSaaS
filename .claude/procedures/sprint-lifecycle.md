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

Five stages (Stage 0 is the gate; do not proceed to Stage 1 if it produces open fails):

**Stage 0 (Smoke Test) — run before anything else:**

This stage exists because per-PR review and unit tests catch isolated correctness but miss complete teacher flows. Two steps.

**Stage 0A: Issue Coverage Audit**

The sprint story written at sprint start covers the planned scenarios. Mid-sprint additions (discovered bugs, incoming requests merged into the sprint) are often not reflected in those scenarios. Before testing anything, close this gap.

1. Pull every closed issue from the sprint milestone:
   ```bash
   gh issue list --milestone "<milestone-name>" --state closed --json number,title,labels --limit 100
   ```
2. Read the sprint story at `plan/sprints/<slug>.md`.
3. For each closed issue, decide: is this issue's behaviour fully covered by a scenario already in the sprint story? Use this rule: if a teacher doing the story walkthrough would naturally exercise this issue's fix or feature, it is covered. If not, it is a gap.
4. Append a `## Smoke Test Appendix` section to the sprint story file listing every gap as a numbered scenario. Write each scenario as a short user action + expected result (same style as the main story). Do not rewrite the main story; only add the appendix.
5. If the appendix is empty, note that explicitly in the story file so it is clear the audit was done.

**Stage 0B: Chrome Extension Walkthrough**

Invoke the `smoke-test` skill (via the Skill tool). The skill starts the visual stack if needed, builds the prompt from the live sprint story content, writes it to a temp file, and tells the user the exact `claude --chrome` command to run. The user runs one command; the chrome session does the walkthrough and reports back. No copy-paste required.

The chrome session records a one-line result for each scenario:

- PASS: behaviour matches expectation
- FAIL: describe what went wrong (one sentence)
- SKIP: could not test (explain why)

Produce a smoke test result table:

| Scenario | Source | Result | Notes |
|----------|--------|--------|-------|
| (scenario title) | Story / Appendix | PASS / FAIL / SKIP | (one line if FAIL or SKIP) |

**Before flagging any FAIL, run this two-check guard.** Smoke-test FAILs trigger fix issues and block Stage 1, so a false positive is expensive. Do NOT mark a scenario FAIL until both checks pass:

1. **Scope check.** Read the original issue body for the AC you are testing. If it has an `## Out of scope` (or `Out of scope:`) section, confirm the screen / component you tested is not listed there. A regression flagged on an out-of-scope screen is invalid — the issue never governed it. Common trap: testing `SessionHistoryTab.tsx` against an AC scoped to `StudentOverviewTab.tsx`, or vice versa. When in doubt, grep the AC for the exact file path.
2. **Spec check.** When the FAIL claims a design-system violation ("not a ghost button", "wrong border", "missing ring"), open `docs/design-system.md` and quote the actual rule before flagging. Do not infer DS conventions from prior projects or general web design intuition. Specifically: per §2 (No-Line Rule) and §6, Ghost = transparent bg + tonal hover, **no border or ring**; outlined buttons are not in our DS. If the shipped code matches the DS literal text, it is not a regression.

If either check invalidates the FAIL, log it under the appendix as PASS with a one-line note explaining the guard (e.g., "PASS: scope check — issue out-of-scope for this screen") rather than as a FAIL. If a real concern remains (e.g., the screen looks off even though the AC was satisfied), record it as an opportunistic observation, not a regression.

**If a FAIL survives both guards:** open a fix issue, assign it to the current sprint milestone, implement via normal worktree flow, re-run that scenario only. Do not proceed to Stage 1 until all FAILs are resolved or explicitly accepted by the user with a reason.

**Opportunistic observations:** While walking through scenarios, log anything that looks broken, confusing, or improvable but is unrelated to the scenario under test. Append each to `plan/observed-issues.md` using the standard format:

```
| #smoke-<slug> | <date> | <severity: critical/major/minor> | <one-line description> |
```

Use `#smoke-<sprint-slug>` as a placeholder issue number (no GitHub issue yet). These feed directly into the Stage 1 backlog triage — do not create issues for them now, just log them.

Stop the e2e stack after the walkthrough.

---

Four remaining stages:

**Stage 1 (PM, main conversation):** Read `plan/code-review-backlog.md`, `plan/ui-review-backlog.md`, `plan/observed-issues.md`, and `plan/ui-review-skipped.md`. Triage each entry as FIX NOW / NEXT SPRINT / DELETE. Present to user. Implement FIX NOW items via normal worktree flow. Batch NEXT SPRINT items into themed GitHub issues. Clear triaged entries.

**Audit `plan/ui-review-skipped.md` specifically:** every row is a task that bypassed `review-ui` under the trivial-frontend exemption. For each, verify the skip was justified (truly CSS-only, <20 lines, single file). If any look risky in retrospect, add the affected screen(s) to the `review-ui-sprint` scope in Stage 2. Clear the log after audit.

**Stage 1b (branch-level review):** Review the full sprint branch diff against `main` for cross-cutting issues that per-PR reviews miss. This catches architectural drift, duplicated patterns, and inconsistencies across all tasks merged during the sprint.

Run these four reviewers sequentially (not in background), each against the full diff:

1. **Sophy** (`subagent_type: "sophy"`): model drift, duplicated logic, over-engineering, KISS/SOLID violations across the aggregate changes.
2. **Architecture reviewer** (`subagent_type: "architecture-reviewer"`): pattern violations, convention breaks, missed reuse of shared utilities.
3. **Prompt health reviewer** (`subagent_type: "prompt-health-reviewer"`): stale instructions, contradictions, or redundancy in AI generation prompt templates (especially after sprints that change student fields or content types).
4. **Security reviewer** (`subagent_type: "security-reviewer"`): secrets in code, missing auth, injection paths, PII in logs, prompt-injection vectors, CORS/TLS misconfig, dependency hygiene. NEEDS FIXES blocks the sprint from moving to Stage 2.

Each reviewer prompt must include:
- Instruction to focus on **cross-cutting concerns** (duplication, drift, inconsistency), not line-level nits (CodeRabbit already covers those per-PR).
- **Consistency sweep instruction (mandatory):** "Scan the full sprint diff for parallel implementations of the same behavior — validation rules, labels for domain concepts (CEFR level, lesson status, etc.), error message formats, default values, permission checks, empty/loading/error state conventions, and UI patterns for the same concept. When the same conceptual rule appears with two different implementations across tasks in this sprint, flag it as Inconsistency. This is the highest-value finding at sprint level — it catches 'screen A was polished but screen B still uses the old pattern' issues that per-PR review misses entirely."
- A summary of known deferred items from the Stage 1 backlog triage, so reviewers do not re-flag them.
- The sprint story file path so reviewers understand the intent behind the changes.

**Stage 2 (agent):** After user approves backlogs and branch review findings, run the `sprint-close` agent (`subagent_type: "sprint-close"`). It verifies board/issues, runs the comprehensive UI/UX sprint review (`review-ui-sprint`), Teacher QA, prompt health review, and pedagogy review. Returns READY / NOT READY.

**Stage 2 UI finding verification (mandatory, runs in main conversation after sprint-close returns):**

Background: during the Unified Voice & Chat sprint close (2026-05-03), `review-ui-sprint` produced findings about UI state that did not match the live app. Root cause: the visual stack was running with a broken API URL (VITE_API_URL not set at build time), so screenshots showed the app in a broken/empty state rather than the real working state. The underlying stack bug was fixed in #1059. Even so, vision-model misreading is a separate risk that cannot be eliminated by the stack fix alone.

Every **Critical or Important** finding from `review-ui-sprint` must be chrome-verified before it affects the sprint gate verdict. Minor findings do not require verification and go directly to `plan/ui-review-backlog.md`.

**Verification steps:**
1. Collect all Critical and Important findings from the sprint-close report's UI/UX Review section.
2. Group findings by route. For each route with findings, run one chrome session:
   ```
   claude --chrome
   ```
   Prompt the chrome agent: "Navigate to `<route>`. Verify each of the following claims one by one and report CONFIRMED, REFUTED, or PARTIAL with a one-line observation for each: [paste finding descriptions]."
3. Triage results:
   - **CONFIRMED**: keep the finding at its original severity.
   - **REFUTED**: remove from the verdict. Log to `plan/observed-issues.md` as `| #review-ui-sprint-<sprint-slug> | <date> | minor | REFUTED: agent claimed <X> but chrome showed <Y> |`.
   - **PARTIAL**: keep but downgrade severity by one level (Critical to Important, Important to Minor).
4. Rebuild the finding list from surviving findings only. The READY / NOT READY verdict is based on this verified list, not the raw agent output.

**Stage 2b (issue filing, mandatory):** After Stage 2 completes, review all findings from every reviewer (Stage 1b branch reviewers, Isaac pedagogy review, prompt health review, Teacher QA triage, UI/UX review). Every finding with severity >= minor that is not fixed in the current sprint **must** be filed as a GitHub issue (batch related findings into one issue) and assigned to the next sprint milestone. Findings without a GitHub issue are considered lost. The sprint cannot move to Stage 3 until all findings are filed.

**Stage 3 (cleanup, after user triggers merge action):** Close the milestone, delete the sprint branch, update memory (task status, sprint overviews), clear remaining backlog entries.

## Next sprint

New `sprint/<slug>` from `main`. Update milestone view filter.
