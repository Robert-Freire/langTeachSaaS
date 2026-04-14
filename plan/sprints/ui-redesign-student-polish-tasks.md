# Sprint Tasks: UI Redesign & Student Profile Polish

> **Sprint started:** 2026-04-08
> **Branch:** `sprint/ui-redesign-student-polish`
> **Milestone:** #16
> **Last updated:** 2026-04-12

## Progress: 36 closed / 7 open

---

## Done

| # | Title | Area |
|---|-------|------|
| 603 | fix: add student with difficulties to DemoSeeder | backend |
| 612 | fix: session log dialog UX polish | frontend | (closed as not_planned, superseded by #672)
| 620 | fix: Telegram bot URL scheme bug | backend |
| 625 | feat: student profile additive scalar fields (backend prep) | backend |
| 626 | refactor: student notes split + native languages plural + learning goals (backend prep) | backend |
| 627 | feat: student teaching todos field (backend prep) | backend |
| 630 | feat: multi-native language picker UI | frontend |
| 633 | Field tooltip system for student profile | frontend |
| 635 | feat: adopt Stitch sidebar design | frontend |
| 636 | feat: teacher dashboard aggregation endpoint | backend |
| 637 | feat: students list redesign (compact table, Stitch style) | frontend |
| 638 | feat: dashboard redesign (session-first layout, Stitch style) | frontend |
| 639 | feat: student detail redesign (3-tab layout, Stitch style) | frontend |
| 644 | refactor: CEFR badge unification | frontend |
| 650 | fix: reflection extraction preserves original language and extracts session date | backend |
| 653 | refactor: move prompt construction from service layer to PromptService | backend |
| 656 | Add voice note traceability via VoiceNoteApplication table | backend |
| 657 | Pedagogy: align difficulty taxonomy with CEFR 2020 | content |
| 662 | feat: identity fields (BirthYear, Profession, Country, City) | frontend |
| 663 | feat: language context (SpokenLanguages, OfficialCefrLevel, SkillLevelOverrides) | frontend |
| 664 | feat: motivation fields (ReasonForStudying, ShortTermObjectives) | frontend |
| 665 | feat: teaching todos inline UI | frontend |
| 667 | fix: profile view display gaps for existing fields | frontend |
| 671 | feat: TeacherFollowup entity and dashboard integration | backend+frontend |
| 676 | feat: SessionLog Duration + Title fields | backend |
| 683 | fix: DemoSeeder "Reading" competency not in taxonomy | backend |
| 669 | chore: script to copy Jordi's data to local dev | infra |
| 672 | feat: Log Session redesign (full page, context panel, quick-add) | frontend |
| 673 | feat: voice extraction prompt expansion (topicTags, todos, followups, homework) | backend+frontend |
| 675 | feat: students list redesign v2 (signal badges, avatars, sort) | frontend |
| 681 | feat: Edit Student form layout redesign (section nav, grouping) | frontend |
| 682 | feat: student detail Overview tab (three-card layout) | frontend |
| 666 | feat: commercial fields in edit form (IsActive, IsCorporate, Rate) | frontend |
| 668 | feat: wire new student profile fields into PromptService GenerationContext | backend |
| 699 | feat: move student delete action to edit page | frontend |
| 688 | feat: teaching todos delete + text-edit backend endpoints | backend |

---

## Implementation order (open issues)

### Waves 1-2: DONE

All backend prep (676, 671) and profile field issues (662, 663, 664, 665, 667, 644)
are merged. All dependencies for remaining work are satisfied.

### Remaining work: Execution plan

**Two parallel lanes.** Only one `area:frontend` task can run at a time (Docker port).
Backend/infra tasks run in a second lane with zero conflict.

**Lane A (frontend, sequential):**

| Order | # | Title | P | Effort | Notes |
|-------|---|-------|---|--------|-------|
D | A1 | 682 | Overview tab (three-card layout) | P1 | high | Done |
D | A2 | 675 | Students list v2 (badges, avatars, sort) | P1 | high | Done |
D | A3 | 666 + 681 + 699 | Commercial fields + Edit form layout + Move delete to edit page | P1+P2 | small+medium | Done (PR #702) |
D | A4 | 677 | Sessions tab (timeline + filters) | P1 | high | In progress |
D | A5 | 672 | Log Session redesign (full page) | P1 | high | Done |
D | A6 | 674 | Voice duplicate drafts fix | P2 | medium | Unblocked (672 done) |
D | A7 | 678 | Progress tab (skill imbalance, pacing) | P2 | medium | Unblocked (663 done) |

**Lane B: DONE** (668 and 673 both merged)

### Vera walkthrough

A1, A2, A3, A5 are all merged. Vera review of all screens is now due before A6-A8 implementation.

## Backlog (P3, if time allows)

| # | Title | Notes |
|---|-------|-------|
| 604 | fix: StudentForm validate partial difficulty rows | Small bug fix |
| 613 | fix: tooltip for progress dashboard pacing badge | Tiny, dashboard was replaced |
D | 628 | feat: hierarchical learning goals (categories + sub-goals) | Backend + frontend |
P| 640 | feat: cross-student sessions list page (/sessions) | New page, large scope |

---

## Deferred (not in sprint)

None currently.

---

## Design assets

All Stitch screens live in `plan/langteach-beta/stitch-design-system/`:

| Screen | Path | Status |
|--------|------|--------|
| Students list | `students-list/screen.png` | Reviewed, approved |
| Student detail: Overview | `student-detail/1. overview/screen.png` | Reviewed, approved |
| Student detail: Profile | `student-detail/2. profile/screen.png` | Reviewed, approved (3 iterations) |
| Student detail: Sessions | `student-detail/3. sessions/screen.png` | Reviewed, approved |
| Student detail: Progress | `student-detail/4. progress/screen.png` | Reviewed, approved |
| Student edit form | `students-edit/screen.png` | Reviewed, approved (2 iterations) |
| Log Session (full page) | `session-edit/screen.png` | Reviewed, approved (2 iterations) |

Each folder contains `screen.png` (visual), `code.html` (Stitch reference), and `DESIGN.md` (notes).

**Field mapping:** `plan/langteach-beta/student-screen-field-mapping.md` is the
single source of truth for which fields appear on which screen.

**Vera review prompts:** `plan/langteach-beta/dashboard-redesign-v1-open-prompts.md`
contains all iteration prompts from the Vera + Isaac review session (2026-04-11).
Each screen has "already generated, iterate" prompts with specific fixes.

---

## Key decisions (PM + Isaac + Vera, 2026-04-10 and 2026-04-11)

1. **TeacherFollowup is a separate entity from TeachingTodos.** Pedagogical (indigo) vs operational (amber), different lifecycle, different surfaces.
2. **Log Session becomes a full page** at `/students/:id/log-session`.
3. **4 tabs on student detail:** Overview (daily glance), Profile (deep reference), Sessions (timeline), Progress (analytics + placeholders).
4. **Voice extraction stays on Haiku.** Upgrade to Sonnet only if testing shows unreliable classification.
5. **Voice merge strategy:** append for narrative fields, union for list fields. No merge UI.
6. **Voice on confirmed sessions:** auto-confirm the merged version.
7. **Duration field:** dropdown (30/45/60/90 min) with "Other" option.
8. **Session number:** excludes cancelled sessions.
9. **Session title:** AI-generated from content, stored on SessionLog. Fallback: "Session, Apr 5."
10. **Two separate quick-add sections** in Log Session (not a type toggle).
11. **Pending followups in context panel:** checkable directly.
12. **No "65% Ready"** on objectives. Text + deadline + days remaining only.
13. **No trend labels** on skill badges for v1. CEFR level only.
14. **UI label "Teacher's Working Memory"** for notes section. DB fields unchanged.
15. **PersonalNotes and TeachingNotes:** two subsections ("Sensitivities / Life Context" + "Pedagogical Observations").
16. **SpokenLanguages:** flat list, no proficiency per language.
17. **CEFR labels:** "Teacher's Assessment" and "Official" (not "Praxis").
18. **Rate:** free text only. No billing frequency or method.
19. **Difficulty labels:** Trend = Stable/Improving/Regressing. Status = Working/Covered.
20. **ReasonForStudying:** inline edit affordance (ghost pencil on hover) on Profile tab.
21. **Sessions tab:** drop Streak counter. Keep Total Hours. Homework card distinguishes assigned vs previous status.
22. **Progress tab:** baseline label = "GENERAL" or "BASELINE" (not "TARGET"). Three "coming soon" placeholders as Jordi conversation starters.
23. **#612 (session log dialog polish):** superseded by #672, closed as not_planned (2026-04-11).
24. **#667 scoped down:** NativeLanguages absorbed by #663, LearningGoals + Interests absorbed by #664. Only Weaknesses + Difficulties display remain.
25. **Edit Student layout:** keep app sidebar, add sticky horizontal section nav (pill-style scrollspy). Stitch's form sidebar nav rejected (breaks spatial memory). See #681.
26. **Log Session layout:** single content area with compact context card alongside form (not rigid two-column split). Context scrolls away as teacher writes. See #672.
27. **Interests:** dedicated editable section on Profile tab right column (below Identity Details), in addition to tags beside the motivation quote.
28. **Past-due objectives:** visually distinct from upcoming (red "OVERDUE" vs red-border "Critical").
