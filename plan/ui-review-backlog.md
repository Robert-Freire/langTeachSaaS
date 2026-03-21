# UI Review Backlog

Non-blocking findings from review-ui runs. Periodically review this file and batch related items into polish GitHub issues.

**Last batched:** 2026-03-20 into #139 (PRs #117, #128, #130, #116)

---

### PR #TBD (2026-03-20) — Parallel Generate All (#121)

| Severity | Finding |
|----------|---------|
| Important | Section ordering in lesson editor is wrong when API returns all orderIndex: 0 (data issue, not this PR) |
| Important | "Generate Full Lesson" button has no visible hover state change (pre-existing) |
| Important | "Preview as Student" button pushed off-screen on mobile by header action density (pre-existing) |
| Minor | Progress counter "X / Y complete" in text-xs is hard to read; consider text-sm or "X of Y sections complete" |
| Minor | Pending section dots (centered dot in text-zinc-400) are subtle; consider a light gray circle icon |
| Minor | Cancel link in progress dialog is understated text link; consider a ghost button |
| Minor | Generate and Preview buttons in header have inconsistent border-radius (rounded-md vs rounded-full) |
| Minor | Dashboard mobile week strip doesn't auto-scroll to current day |

### PR #144 (2026-03-21) — Exercise explanation (#127)

| Severity | Finding |
|----------|---------|
| Important | FIB explanation text (gray, no container) is easy to miss below the inline result; consider a subtle left-border accent or bg-blue-50 note container to distinguish from exercise content |
| Minor | Explanation column header uses text-zinc-400 (one step lighter than text-zinc-500); consider text-zinc-500 to avoid appearing ghosted while keeping read-only feel |
| Minor | FIB correct-answer uses plain ✓ glyph; MC uses green "✓ Correct" label — inconsistent visual vocabulary for same concept; unify to green "✓ Correct" for FIB |
| Minor | Study view lesson title has no truncation/max-w on mobile; long titles wrap and push PREVIEW badge to second line |
| Minor | Dashboard lesson title list items lack truncate; long test/real titles will word-wrap |
| Minor | Matching right-column chip order is spatially misaligned from left-column labels after shuffling (pre-existing, not introduced by this PR) |

### PR #TBD (2026-03-20) — Student 404 not-found (#123)

| Severity | Finding |
|----------|---------|
| Minor | Not-found empty state (StudentForm and LessonEditor) has no icon or illustration, feels sparse. A subtle lucide icon above the text would improve polish. Pre-existing pattern. |
| Minor | "Go back" button in not-found state has no visible hover color change. Consider adding hover:text-red-700 for clearer feedback. Pre-existing pattern. |

## PR #TBD — Course/Curriculum Planner (2026-03-21)

| Severity | Description |
|----------|-------------|
| Important | CourseNew — action buttons should be top-right per UX guidelines; moved to justify-end but still at bottom of form (not top-right header area) |
| Important | Dashboard Courses widget not visible in initial mobile viewport; widget appears below fold |
| Important | CourseNew mobile — mode card descriptions wrap unevenly at 375px |
| Minor | Courses list — progress bar for 0/N sessions is all-gray; could show "Not started" badge instead |
| Minor | CourseDetail — "Planned" badge repeated on all entries when all are same status adds visual noise |
| Minor | CourseDetail — tight spacing between progress bar and metadata subtitle |
| Minor | Courses list — mode badge casing inconsistent ("General" vs "exam") — fix label mapping |
| Minor | CourseNew — required fields not marked with asterisk |

### PR #148 (2026-03-21) — Material Upload

| Severity | Finding |
|----------|---------|
| Important | Mobile (375px) top bar wraps to two lines due to action button density (pre-existing, not introduced by this PR) |
| Minor | Material preview row uses bg-muted/30 with subtle differentiation; download/delete icons have no tooltips |
| Minor | No "Materials" or "Attachments" label above the upload button area; purpose unclear when section has no materials |
| Minor | On mobile, 48x48px thumbnail takes significant horizontal space; consider 32x32 on small viewports |
