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
