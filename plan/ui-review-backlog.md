# UI Review Backlog

Non-blocking findings from review-ui runs. Periodically review this file and batch related items into polish GitHub issues.

---

*Cleared 2026-04-22 during UI Redesign & Student Profile Polish sprint close. Seeder coverage gaps batched into #834. UX polish items (combobox summary, Focus Areas description) batched into #840. Remaining entries deleted (intentional per Stitch spec, covered by unit tests, or pre-existing infrastructure).*

## #904 (2026-04-24)

| Screen | Finding | Severity |
|--------|---------|---------|
| Progress tab > Skill Imbalance Analysis | Visual spec only covers Diego Seed (has overrides). Consider adding an empty-state visual test using Clara Seed (no overrides) for regression coverage. | Minor |

## #906 (2026-04-24)

| Screen | Finding | Severity |
|--------|---------|---------|
| Log Session left panel (difficulties, todos, followups) | review-ui agent ran against main repo Docker image (build cache), not worktree branch. Code is verified correct by qa-verify + architecture-reviewer + unit tests. UI review blocked by environment, not code. | Environment |

## #856 (2026-04-23)

| Screen | Finding | Severity |
|--------|---------|---------|
| Student overview > TeachingTodosCard | "Show N completed / Hide completed (N)" toggle is plain muted text with no explicit button shape. Hover changes color but no background/border affordance. DS ghost-button treatment may be more appropriate for list-level expand/collapse actions. | Minor |
