# UI Review Backlog

Non-blocking findings from review-ui runs. Periodically review this file and batch related items into polish GitHub issues.

---

*Cleared 2026-04-22 during UI Redesign & Student Profile Polish sprint close. Seeder coverage gaps batched into #834. UX polish items (combobox summary, Focus Areas description) batched into #840. Remaining entries deleted (intentional per Stitch spec, covered by unit tests, or pre-existing infrastructure).*

## #856 (2026-04-23)

| Screen | Finding | Severity |
|--------|---------|---------|
| Student overview > TeachingTodosCard | "Show N completed / Hide completed (N)" toggle is plain muted text with no explicit button shape. Hover changes color but no background/border affordance. DS ghost-button treatment may be more appropriate for list-level expand/collapse actions. | Minor |
