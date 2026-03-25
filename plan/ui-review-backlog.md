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
