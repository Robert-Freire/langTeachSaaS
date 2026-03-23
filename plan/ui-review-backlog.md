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

### PR (2026-03-21) — Dashboard loading skeletons (#111)

| Severity | Finding |
|----------|---------|
| Minor | Skeleton title bars (h-7 w-40, h-4 w-56) may produce a small vertical shift when real h1 content loads; consider matching PageHeader dimensions exactly |

---

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

### PR (2026-03-21) — Structured Difficulty Management (#156)

| Severity | Finding |
|----------|---------|
| Minor | Difficulty section "Specific Difficulties" label uses `<Label>` element (renders as `<label>`) but is not associated with any input; semantically should be a heading or `<span>` for accessibility |

### PR #TBD (2026-03-21) — Custom free-text entries (#161)

| Severity | Finding |
|----------|---------|
| Important | Edit form skeleton only covers 2 cards (Basic Info + Interests), does not match the full 4-card layout (missing AI Personalization, Notes); causes layout shift on load (pre-existing) |
| Minor | MultiSelect trigger is a custom-styled button, not shadcn SelectTrigger; slight hover behavior difference (hover:bg-zinc-50 vs ring-based focus) |
| Minor | Placeholder text inconsistency between combo box ("Search or type custom...") and trigger ("Select or type goals...") and Interests ("Type and press Enter") |
| Minor | Chip remove X button (h-3 w-3 / 12x12px) is below 44x44px touch target guideline on mobile |
| Minor | "Add" option uses typographic curly quotes while the rest of the app may use straight quotes |

## PR #157 - 2026-03-21

- **Important** - Lesson editor mobile: header action buttons may overflow at 375px width (pre-existing, not introduced by this PR)
- **Important** - Difficulty badge text could clip at narrow content widths; consider adding `title` attribute for hover tooltip
- **Minor** - No hover state on difficulty badges; could add subtle hover effect or tooltip
- **Minor** - `[category]` bracket formatting is functional but slightly technical; could use uppercase label or dot prefix

## PR #TBD (task-t150-difficulty-areas-filter) - 2026-03-21

- **Important** | Student Form: weaknesses dropdown overlaps Interests card above (z-index layering)
- **Important** | Student Form: selected chips not visible without scrolling when multiple weaknesses chosen
- **Important** | Student Form: language-specific weaknesses persist silently when language is switched (user may not notice stale selections)
- **Minor** | Student Form: no hint text in dropdown when no language selected ("Select a language to see more options")
- **Minor** | Student Form: Save button hover state is very subtle (indigo-600 to indigo-700)
- **Minor** | Student Form: Native Language shows "none" instead of "Not specified" in trigger

### PR #TBD (2026-03-22) — Auto-fill lesson language/level (#154)

| Severity | Finding |
|----------|---------|
| Important | Student selector has no hint that selecting a student auto-fills Language/CEFR; add hint text below the field to make the feature discoverable |
| Minor | Auto-fill ring (ring-2 ring-indigo-400) uses same style as focus ring; may cause brief ambiguity — consider ring-indigo-300 or animation to differentiate |
| Minor | Step 2 header uses hand-rolled flex layout instead of shared PageHeader component (pre-existing) |
| Minor | Dashboard mobile — "Needs Preparation" heading renders in orange-red on mobile (pre-existing, not introduced by this PR) |

### PR #TBD (2026-03-22) — Fix raw JSON in editor (#192)

| Severity | Finding |
|----------|---------|
| Important | Duplicate "Regenerate" labels: the amber error box shows a primary Regenerate button and the block action row below shows a second ghost Regenerate button. A teacher sees two identical labels. Fix: hide the block-level Regenerate when parsedContent is null, or relabel the error box button (e.g. "Fix with AI") |

### PR #TBD (2026-03-21) — Usage Limits (#105)

| Severity | Finding |
|----------|---------|
| Minor | UsageIndicator progress bar at 0% is invisible (width: 0%); consider minimum 2% fill for affordance |
| Minor | UsageIndicator progress bar track `h-1.5` (6px) is very thin on high-DPI; consider `h-2` (8px) |
| Minor | No visual separator between UsageIndicator and user avatar section in sidebar footer |
| Minor | Lesson editor mobile header action buttons crowd at 375px (pre-existing, not introduced by this PR) |

| #215 (PR TBD) | 2026-03-22 | Minor | logo-icon.svg back bubble overlap (x=14-44) may be hard to read at 16px favicon size |
| #215 (PR TBD) | 2026-03-22 | Minor | logo.svg wordmark falls back to system-ui in static contexts (emails, OG images) — no external font loaded |

| #213 | 2026-03-22 | Important | [I2] Step 3 loading skeleton has no context label — "Preparing your student..." would reduce confusion; pre-existing but newly exposed by skip flow |
| #213 | 2026-03-22 | Minor | [M2] Step 2 validation error shows below all fields rather than adjacent to the student name field — pre-existing |
| #213 | 2026-03-22 | Minor | [U1] Required fields not marked with asterisks in onboarding forms — pre-existing pattern |

### PR #247 (2026-03-23) — Fix duplicate Regenerate + auto-fill hint (#242)

| Severity | Finding |
|----------|---------|
| Important | Lesson editor mobile (375px): "Preview as Student" button clips off screen due to action toolbar overflow — pre-existing, not introduced by #242 |
| Minor | LessonNew student hint text uses text-zinc-500 with no icon; a small info icon would make it feel more like an intentional tip |
| Minor | LessonNew step 1: "Blank" template card uses faint dashed border vs. solid on other cards — low contrast on light background |
| Minor | Dashboard mobile: week strip clips to 3 days with no scroll affordance visible — pre-existing |
