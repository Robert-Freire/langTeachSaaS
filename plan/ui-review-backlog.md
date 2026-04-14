# UI Review Backlog

Non-blocking findings from review-ui runs. Periodically review this file and batch related items into polish GitHub issues.

---

*Cleared 2026-04-08 during Adaptive Replanning sprint close. 1 entry (weakness chip rendering) resolved via DemoSeeder fix; tracked in #603.*

## 2026-04-12 (task #640 review-ui)

| Severity | Screen | Finding |
|----------|--------|---------|
| Low | Sessions list | Demo seeder creates sessions at now-7 and now-14 days at seeding time. By the time review-ui runs days later, sessions fall outside the 7-day Recent window, so the visual spec only verifies empty state. Row layout (CefrBadge, Label-SM headers, no-divider rows) cannot be visually verified until seeder is updated to use -1/-3 day offsets or a fresh seed is done close to review time. |

## 2026-04-14 (task #718 review-ui)

| Severity | Screen | Finding |
|----------|--------|---------|
| Low | Students list | Alert badge color variants (amber BEHIND, purple REVIEW PENDING, dark badge) cannot be visually verified because demo seed students are all in NEW state. Unit tests verify all badge color classes. Would need seed students with `pace=behind` or `hasPendingLessonPlan=true` to show these in review. |

## 2026-04-12 (task #663 review-ui)

| Severity | Screen | Finding |
|----------|--------|---------|
| Low | Student edit / Languages card | NativeLanguages combobox shows "N selected" summary text -- no visible hint which language. Consider showing first selected name. Pre-existing combobox behavior, not introduced in #663. |
| Low | Student detail / Overview tab | When student has no native languages, the section is absent entirely with no "None specified" fallback. Tab jumps from title to Learning Goals. Arguably correct but could feel like missing data. |
