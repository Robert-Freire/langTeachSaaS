# Review Routing

Run the `review` and `architecture-reviewer` agents **in parallel** (always). Conditionally add more reviewers in the same parallel batch based on the diff.

## Conditional reviewers

| Diff matches | Reviewer | `subagent_type` |
|---|---|---|
| `**/PromptService.cs` | Prompt Health | `prompt-health-reviewer` |
| `**/Models/*.cs`, `**/Dtos/*.cs`, `**/*Dto.cs`, `**/Data/*.cs`, `**/Migrations/*.cs`, `data/**/*.json`, `**/contentTypes.ts`, or new entities/tables/FKs | Sophy | `sophy` |
| Any diff that adds hardcoded conditional logic (if/else, switch) based on language, level, template, or student properties in `**/PromptService.cs`, prompt builders, generation services, or validation services — i.e. logic that belongs in config rather than code. Includes hardcoded regex patterns or rule lists for language-specific validation. | Sophy | `sophy` |
| `data/pedagogy/*.json`, `data/section-profiles/*.json`, `data/pedagogy/cefr-level-rules/*.json` | Isaac | `pedagogy-reviewer` |

### Prompt Health prompt

> Review the prompt template changes in this PR. Diff: <paste PromptService.cs diff>. Check for redundant constraints, contradictions, negative bloat, stale patches, and duplication. Cross-reference against structural enforcement in the codebase.

### Sophy prompt

> Review this PR diff for data model soundness: <paste relevant diff>. Check for: unstated assumptions, missing entity relationships, config-vs-code violations, over-engineering, conflicts with existing patterns. Verdict: APPROVE / NEEDS CLARIFICATION. Final response under 1500 characters.

### Isaac prompt

> Review the pedagogy config changes in this PR. Changed files: <list>. Diff: <paste>. Read `data/pedagogy/AUTHORING.md` first for additive model rules. Verify: override strings follow authoring guide (focus not format, specific, 1-3 sentences), exercise type references valid, CEFR boundaries respected, no contradictions between section profiles and template overrides. Verdict: SOUND / ADJUST / RETHINK.

## Verdict handling

| Reviewer | Verdict | Action |
|---|---|---|
| `review` | FAIL | Fix critical issues, re-commit, re-run checks and review |
| `review` | PASS WITH NOTES | Address important items. Log unfixed notes to `plan/code-review-backlog.md` (PR#, date, severity, description) |
| `architecture-reviewer` | NEEDS REVISION | Fix violations, re-commit, re-run checks and architecture review |
| `architecture-reviewer` | PASS WITH NOTES | Address where reasonable. Log minor notes to `plan/code-review-backlog.md` |
| Prompt Health | URGENT / critical | Fix before pushing. Contradictory instructions must not ship |
| Prompt Health | NEEDS CLEANUP (no critical) | Fix important items. Log rest to `plan/code-review-backlog.md` |
| Prompt Health | CLEAN | Proceed |
| Sophy | NEEDS CLARIFICATION | Address her questions before pushing |
| Sophy | APPROVE | Proceed |
| Isaac | RETHINK | Fix pedagogical issues before pushing |
| Isaac | ADJUST | Fix corrections, re-commit, re-run Isaac |
| Isaac | SOUND | Proceed |

All reviewers at PASS or equivalent (after addressing/logging notes): proceed to UI review (or push if not applicable).
