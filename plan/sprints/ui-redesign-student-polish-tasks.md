# Sprint Tasks: UI Redesign & Student Profile Polish

> **Sprint started:** 2026-04-08
> **Branch:** `sprint/ui-redesign-student-polish`
> **Milestone:** #16
> **Last updated:** 2026-04-11

## Progress: 16 closed / 22 open

---

## Done

| # | Title | Area |
|---|-------|------|
| 603 | fix: add student with difficulties to DemoSeeder | backend |
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
| 639 | feat: student detail redesign (4-tab layout, Stitch style) | frontend |
| 650 | fix: reflection extraction preserves original language and extracts session date | backend |
| 653 | refactor: move prompt construction from service layer to PromptService | backend |
| 612 | fix: session log dialog UX polish | frontend | (closed as not_planned, superseded by #672)
| 656 | Add voice note traceability via VoiceNoteApplication table | backend |

---

## Implementation order (open issues)

### Wave 1: Backend prep (no frontend dependencies, unblocks later waves)

| # | Title | P | Area | Effort | Unblocks |
|---|-------|---|------|--------|----------|
D | 676 | feat: SessionLog Duration + Title fields | P1 | backend | small | #677 (Sessions tab), #672 (Log Session) |
| 671 | feat: TeacherFollowup entity (backend: migration, API, service) | P1 | backend | medium | #672 (Log Session), #673 (voice extraction), followup surfaces in Wave 2 |

### Wave 2: All screen builds (parallel, all reference Stitch screenshots)

No dependencies between these issues. All depend on #639 (done).
#671 frontend surfaces depend on Wave 1 backend completing first.
#682 (Overview tab) should be built early in Wave 2 so field issues can populate it.

**Tab infrastructure (must come before field issues):**

| # | Title | P | Area | Effort | Notes |
|---|-------|---|------|--------|-------|
| 682 | feat: student detail Overview tab (daily glance, three-card layout) | P1 | frontend | high | Default tab. Three-card row + Primary Objective + recent sessions + Teacher's Working Memory. Build with empty states, field issues populate. |

**Profile fields (frontend-only, backend done):**

| # | Title | P | Area | Effort | Notes |
|---|-------|---|------|--------|-------|
| 662 | feat: identity fields (BirthYear, Profession, Country, City) | P1 | frontend | medium | Header + Profile Identity Details + Edit form |
| 663 | feat: language context (SpokenLanguages, OfficialCefrLevel, SkillLevelOverrides) | P1 | frontend | medium | **Absorbs NativeLanguages display fix from #667.** Profile Language Ecosystem + Overview Pedagogical Profile + Edit form |
| 664 | feat: motivation fields (ReasonForStudying, ShortTermObjectives) | P1 | frontend | medium | **Absorbs LearningGoals + Interests display fixes from #667.** Profile "The Why" hero + Diagnostic + Overview Primary Objective + Edit form |
| 666 | feat: commercial fields (IsActive, IsCorporate, Rate) | P2 | frontend | small | Header badges + Profile Commercial + Edit form |
| 667 | fix: Weaknesses + Difficulties display in Focus Areas section | P1 | frontend | small | **Scoped down** from 5 fields to 2 (3 absorbed by #663 and #664) |

**Interactive features:**

| # | Title | P | Area | Effort | Notes |
|---|-------|---|------|--------|-------|
| 665 | feat: teaching todos inline UI | P1 | frontend | medium-high | Overview + Profile + Edit sidebar. Indigo convention. No dependency on profile fields. |
| 671 | feat: TeacherFollowup frontend surfaces | P1 | frontend | medium | Dashboard panel + Overview + Profile + Edit sidebar. Amber convention. Depends on Wave 1 backend. |

**Other screens:**

| # | Title | P | Area | Effort | Notes |
|---|-------|---|------|--------|-------|
| 675 | feat: students list Stitch v2 (signal badges, avatars, sort, pagination) | P1 | frontend | high | Independent of profile work |
| 681 | feat: Edit Student form layout (section nav, grouping) | P1 | frontend | medium | Depends on #662-666 (fields must exist to arrange). Or implement as layout foundation in #662. |
| 644 | refactor: CEFR badge unification | P2 | frontend | small | Deps done (#637, #639). Benefits all screens. |

### Wave 3: Voice + new tabs (depends on Wave 1 backend)

| # | Title | P | Area | Effort | Depends on |
|---|-------|---|------|--------|-----------|
| 673 | feat: voice extraction prompt expansion | P1 | backend+frontend | medium | #671 backend (Wave 1) |
| 677 | feat: Sessions tab (full timeline with filters) | P1 | frontend | high | #676 (Wave 1) |
| 678 | feat: Progress tab (skill imbalance, pacing, difficulties evolution) | P2 | frontend | medium | #663 for SkillLevelOverrides display patterns |

### Wave 4: Log Session (depends on Waves 1-2)

| # | Title | P | Area | Effort | Depends on |
|---|-------|---|------|--------|-----------|
| 672 | feat: Log Session redesign (full page, context panel, quick-add) | P1 | frontend | high | #665, #671, #676 |
| 674 | fix: voice duplicate drafts + merge behavior | P2 | frontend+backend | medium | #672 |

### Vera walkthrough

Schedule after Wave 2 is merged (all profile fields, todos, followups,
students list done). Vera reviews all screens including Log Session and
Sessions tab designs before Wave 3-4 implementation.

---

## Independent tasks (no wave dependency)

| # | Title | P | Area | Notes |
|---|-------|---|------|-------|
| 669 | chore: script to copy Jordi's data from Azure SQL to local dev | P2 | infra | Can run anytime |
| 657 | Pedagogy: align difficulty taxonomy with CEFR 2020 | P2 | content | Independent, needs Sophy review |

## Backlog (P3, if time allows)

| # | Title | Notes |
|---|-------|-------|
| 640 | feat: cross-student sessions list page (/sessions) | New page, large scope |
| 628 | feat: hierarchical learning goals (categories + sub-goals) | Backend + frontend |
| 613 | fix: tooltip for progress dashboard pacing badge | Tiny, dashboard was replaced |
| 604 | fix: StudentForm validate partial difficulty rows | Small bug fix |

---

## Deferred (not in sprint)

| # | Title | Notes |
|---|-------|-------|
| 668 | feat: wire new student fields into PromptService GenerationContext | P2, no milestone |

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
