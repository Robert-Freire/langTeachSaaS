# UI Review Backlog

Non-blocking findings from review-ui runs. Periodically review this file and batch related items into polish GitHub issues.

**Last batched:** 2026-03-22 into #241 (student form UX), #242 (editor clarity), #243 (visual polish batch), #246 (mobile header overflow)

---

### Promoted to issues (2026-03-22)

- **Theme D** (student form z-index, stale weaknesses, chip visibility): -> #241
- **Theme E** (duplicate Regenerate labels, auto-fill hint): -> #242
- **Theme F** (onboarding/course UX items): absorbed into #243
- **Theme G** (all minor visual polish): -> #243
- **Mobile header overflow** (recurring, 4+ PRs): -> #246
- **Logo minor items**: absorbed into #243

All items from the previous backlog have been triaged. The backlog is now clean.

---

*New findings from future UI reviews go below this line.*

### PR #243 (2026-03-23)

- **[Minor]** CourseNew (/courses/new): Name, Language, Target CEFR Level fields have no required asterisks. StudentForm and OnboardingStep2 got asterisks in this batch but CourseNew was deferred (out of scope).
- **[Minor]** Study View back link: Default state uses `text-muted-foreground` (borderline contrast at small sizes). Hover color added but resting state is still low contrast.
- **[Minor]** Student Form mobile (375px): Page h1 truncates to "Add Stud..." when Save/Cancel buttons are in the same row -- could be addressed with a smaller font or a stacked header layout on mobile.

### PR #256 (2026-03-24)

- **[Important]** CourseNew desktop (1280x800): StudentProfileSummary card + Generate button still require slight scroll at 1280x800 even after compaction. Card adds ~120px to a long form. Future fix: consider a collapsible card or sticky action bar.
- **[Important]** CourseNew mobile (375px): Profile card adds ~120px to an already long form; Generate button well below fold. Same mitigation as above.
- **[Important]** CourseNew: "Student (optional)" label appears visually lighter than sibling labels (Language, Target CEFR level). All use the same `<Label>` component; may be a font rendering artifact from "(optional)" suffix. Investigate in a dedicated polish pass.
- **[Minor]** CourseNew: "Profile completeness for curriculum planning" label wraps on sub-tablet widths. Consider shortening to "Curriculum completeness".
- **[Minor]** Courses list mobile (375px): page subtitle wraps to two lines next to "New Course" button, creating uneven header height. Pre-existing issue exposed during regression check.

### PR TBD — #262 (2026-03-25)

- **[Important]** CourseNew desktop: Session count selector has no visual grouping with `SessionMappingPreview` card. Teacher doesn't see the cause-effect link between changing sessions and the preview updating. Could use a wrapper div or a helper label ("Sessions determine the mapping below").
- **[Important]** CourseNew: Native `<input type="checkbox">` for "Use structured curriculum template" is inconsistent with the shadcn Select components elsewhere on the form. Pre-existing pattern.
- **[Important]** CourseNew mobile (375px): Course type button cards create a jagged 2-column grid because description text wraps asymmetrically. Pre-existing pattern.

### PR #258 (2026-03-25) — Curriculum walkthrough UI

- **[Important I3]** CourseDetail expanded entries: expand/collapse toggle stays at the top of tall expanded cards; users must scroll back to top to close. Consider a "Collapse" link at the bottom of the expanded section.
- **[Minor M1]** CourseDetail expanded: "Personalization rationale" and "Personalized context" section labels are visually identical (`text-xs font-medium text-zinc-500`). Semantic distinction could be reinforced by different font weight or color.
- **[Minor M3]** CourseDetail expanded: `CompetencyBadge` (`bg-zinc-100`, no border) and lesson-type badge (`bg-zinc-50 border-zinc-200`) in the same row are too similar visually. Lesson type badge could use a distinct color (e.g. purple-50 border-purple-200).

### PR #261 (2026-03-25) — Lesson objectives summary

- **[Important I2]** LessonEditor mobile: "Preview as Student" button not visible in mobile action bar (pre-existing, not introduced by this PR)
- **[Minor M1]** LessonEditor: Objective pills have no hover cursor or title tooltip for accessibility
- **[Minor M2]** LessonEditor: Summary sentence is long with 4+ objectives, consider "and N more" truncation
- **[Minor M3]** LessonEditor mobile: Pills visually dominate the summary text on mobile since each takes a full row

### PR for #151 (2026-03-25) — Competency Gap Warning

| Severity | Finding |
|----------|---------|
| Important | /courses/new: CEFR mismatch + competency gap warnings appear below the fold when a student is selected; form is long, warnings require scrolling to see |
| Important | /courses/new (tablet/mobile): Both warnings pushed off-screen when both conditions are active; form scroll depth is very long |
| Minor | /courses/new: Warning banner `bg-amber-50 border-amber-200` is very light; `bg-amber-100` would improve visual distinctiveness |
| Minor | /courses/new: Dismiss button hit target is 16x16px, below 44px guideline (same issue in CefrMismatchWarning) |
| Minor | /courses/new: Two adjacent amber banners look like one block; small gap or separator would help differentiate |

### PR #284 (2026-03-25) — Course view improvements (#259)

- **[Important I2]** CourseDetail mobile (375px): "Generate Lesson" button drops to icon-only with no text label. Pre-existing behavior (`hidden sm:inline` pattern used throughout); not introduced by this PR.
- **[Important I4]** CourseDetail desktop: Mode chip appears to have a slightly thicker border than sibling chips due to wider content. May be rendering artifact; investigate in a polish pass.
- **[Minor M1]** CourseDetail: "+ Add session" dashed-border button blends with bottom edge of last session card due to very light border. Consider `border-zinc-300` or adding top margin.
- **[Minor M3]** CourseDetail mobile: Breadcrumb and page title are compressed together (~4px gap). Pre-existing layout.
- **[Minor M5]** CourseDetail: Delete dialog Cancel button (outlined) looks faint at default zoom; `variant="secondary"` would improve presence.
- **[Minor M6]** Courses list: Progress bar track nearly invisible (`bg-zinc-100` on white). Fixed on detail view (changed to `bg-zinc-200`); list view not updated.

### PR TBD (2026-03-25) — Regenerate button toggle (#142)

All findings are pre-existing, unrelated to this PR's change:

- **[Important I1]** LessonEditor mobile (375px): "Generate Full Lesson" button text clips off the right edge of the header.
- **[Important I2]** LessonEditor tablet (768px): Title wraps to two lines, "Preview as Student" clips off screen. Pre-existing.
- **[Important I3]** LessonEditor mobile: Metadata edit pencil icon sits below metadata chips instead of inline.
- **[Minor M1]** LessonEditor: Empty sections area has no empty-state guidance copy.
- **[Minor M2]** LessonEditor desktop: Tab focus order starts in sidebar nav before editor content.
- **[Minor M3]** Dashboard mobile: Quick Actions panel requires scroll to reach below empty "Needs Preparation" card.
