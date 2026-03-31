# Review Routing

Run all reviewers **sequentially** (never as parallel background agents; notifications are unreliable and cause lost results).

## Step 1: Determine the full reviewer list

**Always run:** `review`, then `architecture-reviewer`.

**Then check the issue labels and diff to add conditional reviewers:**

```bash
gh issue view <N> --json labels --jq '.labels[].name'
```

| Trigger | Reviewer | `subagent_type` |
|---|---|---|
| Issue has `review:sophy` label | Sophy | `sophy` |
| Diff touches `**/Models/*.cs`, `**/Dtos/*.cs`, `**/Data/*.cs`, `**/Migrations/*.cs`, `data/**/*.json`, `**/contentTypes.ts`, or adds new entities/tables/FKs | Sophy | `sophy` |
| Diff touches `**/PromptService.cs`, prompt builders, or generation services (including hardcoded conditionals on language/level/template) | Sophy | `sophy` |
| Diff touches `data/pedagogy/*.json`, `data/section-profiles/*.json`, `data/pedagogy/cefr-level-rules/*.json` | Isaac | `pedagogy-reviewer` |

**IMPORTANT: Sophy and Arch are different agents.** Do not confuse them.
- **Sophy** (`subagent_type: "sophy"`): data model design, config vs code drift, prompt architecture
- **Arch** (`subagent_type: "architecture-reviewer"`): pattern violations, duplicated logic, convention breaks

## Reviewer prompts

### Sophy prompt

> Review this PR diff for data model soundness and prompt architecture: <paste relevant diff>. Check for: unstated assumptions, missing entity relationships, config-vs-code violations, over-engineering, conflicts with existing patterns, redundant or contradictory prompt instructions, negative bloat. Verdict: APPROVE / NEEDS CLARIFICATION. Final response under 1500 characters.

### Isaac prompt

> Review the pedagogy config changes in this PR. Changed files: <list>. Diff: <paste>. Read `data/pedagogy/AUTHORING.md` first for additive model rules. Verify: override strings follow authoring guide (focus not format, specific, 1-3 sentences), exercise type references valid, CEFR boundaries respected, no contradictions between section profiles and template overrides. Verdict: SOUND / ADJUST / RETHINK.

## Verdict handling

| Reviewer | Verdict | Action |
|---|---|---|
| `review` | FAIL | Fix critical issues, re-commit, re-run checks and review |
| `review` | PASS WITH NOTES | Address important items. Log unfixed notes to `plan/code-review-backlog.md` (PR#, date, severity, description) |
| `architecture-reviewer` | NEEDS REVISION | Fix violations, re-commit, re-run checks and architecture review |
| `architecture-reviewer` | PASS WITH NOTES | Address where reasonable. Log minor notes to `plan/code-review-backlog.md` |
| Sophy | NEEDS CLARIFICATION | Address her questions before pushing |
| Sophy | APPROVE | Proceed |
| Isaac | RETHINK | Fix pedagogical issues before pushing |
| Isaac | ADJUST | Fix corrections, re-commit, re-run Isaac |
| Isaac | SOUND | Proceed |

All reviewers at PASS or equivalent (after addressing/logging notes): proceed to UI review (or push if not applicable).
