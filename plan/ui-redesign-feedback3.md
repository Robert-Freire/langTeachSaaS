# UI Redesign Feedback 3 -- Dashboard Scenario Testing

Vera, 2026-04-18. Scenario-based review using `scripts/seed-scenario.sh` (PR #792) against Stitch mockup.

---

## 1. Scenario Results

| Scenario | Seed cmd | Status | Notes |
|----------|----------|--------|-------|
| 1: Class in 20 min (Ana Visual) | `seed-scenario.sh 1` | **PASS** | "NOW" badge (time elapsed), full briefing, Partial homework card, 3 agenda rows with DONE/NEXT SESSION/SCHEDULED, green TODAY followup |
| 2: Session this week (Marco B1) | `seed-scenario.sh 2` | **PASS** | "IN 3D" zinc badge, planned strip only (no briefing, correct), this-week fallback with 2 rows, "2 DAYS AGO" amber followup |
| 3: Nothing scheduled (Carmen C1) | `seed-scenario.sh 3` | **PARTIAL** | Agenda "No sessions this week" + Followups "All caught up" both correct. Hero shows Nataliya (original student with May 17 session) instead of empty state, because seeder only wipes scenario students. |
| 4: Overdue followups (Nadia B2) | `seed-scenario.sh 4` | **PASS** | All 3 age colors: green TODAY, amber 2 DAYS AGO, red 7 DAYS OVERDUE. Dot colors match badges. |
| 5: Roster signals | `seed-scenario.sh 5` | **PASS (4/7 signals)** | "Cancelled 2x" (dark+red dot), "Inactive 20d" (amber), "Review pending" (indigo), no signal. Missing from seeder: EXAM Xw, Returning, HMWK PARTIAL. |
| 6: Full hero briefing (Hans B1) | `seed-scenario.sh 6` | **PASS** | "IN 5D" badge, all 4 briefing sections, "COMPLETED" green homework card, 2 overdue followups |

**Seeder note:** must pass teacher email explicitly: `seed-scenario.sh N robert.freire@gmail.com`. Default pulls from E2E_TEST_EMAIL which creates students under the e2e bot teacher, invisible to the logged-in user.

---

## 2. What Works Well

1. **Hero urgency badge system.** NOW (indigo gradient), IN Xd (zinc neutral), no badge >7 days. The gradient on NOW feels premium.
2. **Last Session Briefing card.** Lavender tonal card with labeled sub-sections (TOPICS, HOW IT WENT, HOMEWORK ASSIGNED, PROMISES MADE). More structured than Stitch's bullet points; easier to scan.
3. **Homework status card.** Color-coded status text (COMPLETED in green, PARTIAL in amber). Clear at a glance.
4. **Today's Agenda status labels.** DONE, NEXT SESSION, SCHEDULED render correctly. NEXT SESSION row has indigo left border + lavender highlight. Matches Stitch.
5. **Followup 3-color system.** Green/amber/red with matching dots and badges. More informative than Stitch's 2-color. Natural language labels read cleanly.
6. **Roster signal badges.** Cancelled 2x (dark+red dot), Review pending (indigo), Inactive Xd (amber), HMWK NOT DONE (red). Visually distinct and scannable.
7. **Merged LAST / NEXT column.** "Yesterday -> 17 May" with arrow notation. Smart space optimization vs Stitch's separate columns.
8. **Agenda rows are full-row links.** Clicking anywhere on the row navigates to the student. Correct interaction.

---

## 3. Stitch Gaps

### S1. (MEDIUM) Hero missing student identity subtitle

Stitch shows "Italian . Session #14" under the student name. Live shows nothing under the name. The teacher needs language context and relationship length at a glance.

**Where:** `NextSessionHero.tsx`, below the student name heading (line 105-107).

### S2. (MEDIUM) Hero time shows "00:00" for sessions without time

Nataliya's hero card shows "SUNDAY 17 MAY . 00:00". The 00:00 is because sessions don't have a time picker in Log Session. Already flagged HIGH in feedback2 section 1. The hero is a downstream victim.

### S3. (MEDIUM) Today's Agenda missing "CALENDAR VIEW" link

Stitch shows "CALENDAR VIEW" right-aligned in the card header. Not implemented. Already flagged MEDIUM in feedback2 section 1.

### S4. (MEDIUM) Pending Followups missing "SEE ALL (X)" link

Stitch shows "SEE ALL (12)" in the followups card header when there are many items. Not implemented. With 15+ followups the card grows unbounded with no pagination or cap.

### S5. (LOW) Hero CTA labels and styling differ from Stitch

| Element | Stitch | Live |
|---------|--------|------|
| Profile CTA | "Open profile" (outlined secondary button) | "VIEW PROFILE" (ghost text link, uppercase) |
| Session CTA | "Start session" (gradient primary with play icon) | "START SESSION" (gradient primary, no icon) |

The ghost text link for "VIEW PROFILE" is visually invisible next to the loud gradient primary. Should be a secondary button to feel like it belongs to the same button family.

### S6. (LOW) Homework status card has visible border

Code at `NextSessionHero.tsx:175`: `border border-amber-100`. Violates the no-line rule. The amber-50 background on white already provides tonal separation.

---

## 4. Navigation & Interaction Issues

### N1. (HIGH) Dashboard roster rows are not clickable

The `<tr>` has `hover:bg-[#F4F2FD]` which signals "this entire row is clickable", but there is no `onClick` handler on the row. Only the student name text is a `<Link>`. Clicking on Level, L1, dates, or signal columns does nothing.

A teacher sees the hover highlight, moves to click the row, and nothing happens if they don't hit the exact name text. Fitts' law: the target should be the full row area, not just the name string.

**Fix:** Make the entire `<tr>` clickable via `onClick={() => navigate(`/students/${student.studentId}`)}` with `cursor-pointer`, or wrap the entire row content in a `<Link>`. Keep the hover effect.

**Where:** `StudentRoster.tsx:210-244` (the `<tr>` element).

### N2. (MEDIUM) Followup items don't link to student profile

The student name chip ("NADIA B2") in each followup is a plain `<p>`, not a link. When a teacher reads "Prepare a mock exam" for Nadia, they want to click through to Nadia's profile to check context. Currently there is no way to navigate to the student from the followup card.

**Fix:** Make the student name chip a `<Link to={`/students/${f.studentId}`}>`. Requires `studentId` in the followup API response (check if available).

**Where:** `PendingFollowups.tsx:79-82` (the student name `<p>`).

### N3. (MEDIUM) Followup dot has no hover affordance or tooltip

The colored dot is a `<button>` (has cursor:pointer) but has no tooltip, no scale-on-hover, no visual hint that clicking it marks the followup as done. A teacher who accidentally clicks the dot will see the item vanish with no explanation and no undo.

**Fix:** Add `title="Mark as done"` and `hover:scale-125` on the dot button. Consider a brief "Undo" toast (2-3 seconds) after marking done.

**Where:** `PendingFollowups.tsx:72-76` (the dot `<button>`).

### N4. (MEDIUM) Followup student name chips create visual noise

"NADIA B2" repeated 3 times above 3 followups from the same student (Scenario 4). Stitch doesn't show student name chips. When a teacher has 10 followups from 3 students, the chips dominate the visual space and reduce scan speed.

**Options:** (a) Remove chips entirely (match Stitch), (b) show chip only when student differs from the previous item (grouping), (c) show chips but use a lighter style (zinc-300, not uppercase).

**Where:** `PendingFollowups.tsx:79-82`.

### N5. (LOW) Roster row hover too subtle

The warm-lavender hover exists but is barely perceptible at the current opacity. Stitch implies a stronger surface-container-highest shift. Rows don't feel interactive even with the hover.

**Where:** `StudentRoster.tsx:212` (hover class).

---

## 5. Seed Data Gaps

### SD1. (HIGH) L1 column empty for all 35 original students

Scenario students show L1 correctly (Ukrainian, Italian, German, etc.), but the original 35 students all show dashes. The column is useless for 80% of students. Already flagged HIGH in feedback2.

### SD2. (MEDIUM) 3 of 7 roster signal types not seeded

The scenario seeder covers Cancelled 2x, Inactive, Review pending, and no-signal. Missing: EXAM Xw (needs nearestObjectiveDeadline), Returning (needs 21d gap + nextSessionDate), HMWK PARTIAL (needs lastHomeworkStatus=Partial). The roster can't demonstrate its full 7-level triage capability.

### SD3. (LOW) "Today -> Today" display looks odd

Ana Visual (Scenario 1) shows "Today -> Today" in the LAST/NEXT column when both last session and next session are today. Technically correct but reads as a UI glitch. Consider showing just "Today" when both dates are the same day.

**Where:** `StudentRoster.tsx:230-232` (date formatting logic).

---

## 6. Summary Priority Table

| Priority | # | Finding | Screen |
|----------|---|---------|--------|
| HIGH | N1 | Dashboard roster rows not clickable (only name is a link) | Dashboard Roster |
| HIGH | SD1 | L1 column empty for all 35 original students | Dashboard Roster |
| MEDIUM | S1 | Hero missing student identity subtitle | Dashboard Hero |
| MEDIUM | S2 | Hero time shows "00:00" (cascading from missing time picker) | Dashboard Hero |
| MEDIUM | S3 | Today's Agenda missing CALENDAR VIEW link | Dashboard Agenda |
| MEDIUM | S4 | Pending Followups missing SEE ALL link | Dashboard Followups |
| MEDIUM | N2 | Followup items don't link to student profile | Dashboard Followups |
| MEDIUM | N3 | Followup dot has no hover affordance or tooltip | Dashboard Followups |
| MEDIUM | N4 | Followup student name chips create visual noise | Dashboard Followups |
| MEDIUM | SD2 | 3 of 7 signal types not seeded (EXAM, Returning, HMWK PARTIAL) | Dashboard Roster |
| LOW | S5 | Hero CTA styling differs from Stitch (ghost vs secondary) | Dashboard Hero |
| LOW | S6 | Homework card has visible border (no-line violation) | Dashboard Hero |
| LOW | N5 | Roster row hover too subtle | Dashboard Roster |
| LOW | SD3 | "Today -> Today" display looks odd | Dashboard Roster |

---

## 7. Suggested Issues

### Issue A: Dashboard roster rows should navigate to student on click

**Scope:** Make `<tr>` in StudentRoster.tsx clickable (full row, not just name). Fix "Today -> Today" same-day display. Strengthen row hover. Already confirmed: agenda rows use full `<Link>` wrapping (correct pattern to follow).

**Labels:** area:frontend, area:design, size:S

### Issue B: Dashboard followup improvements (navigation, affordance, noise)

**Scope:** (1) Make student name chip a link to student profile (requires studentId in followup API response). (2) Add tooltip and hover scale on mark-done dot. (3) Reduce student name chip noise (group or remove per Stitch). (4) Add "SEE ALL" link in card header.

**Labels:** area:frontend, area:design, size:M

### Issue C: Dashboard hero Stitch polish

**Scope:** (1) Add student identity subtitle (language + session count). (2) Align CTA styling to Stitch (secondary button for profile, icon on primary). (3) Remove visible border from homework card. (4) Add CALENDAR VIEW link to Today's Agenda header.

**Labels:** area:frontend, area:design, size:M

### Issue D: Seed original 35 students with nativeLanguages

**Scope:** Update the main seeder to populate nativeLanguages for all 35 existing students. The L1 column is one of the most valuable pieces of teacher context and it's empty for every non-scenario student.

**Labels:** area:backend, size:S

### Issue E: Complete roster signal seed coverage

**Scope:** Add EXAM Xw, Returning, and HMWK PARTIAL signal students to the scenario 5 seeder. Requires: nearestObjectiveDeadline (EXAM), 21d gap + nextSessionDate (Returning), lastHomeworkStatus=Partial (HMWK PARTIAL).

**Labels:** area:backend, size:S

---
---

# UI Redesign Feedback 3B -- Students List Screen

Vera, 2026-04-18. Visual and interaction review of `/students` page against Stitch mockup.

---

## 1. What Works Well

1. **Full-row click navigation.** `onClick={() => navigate(...)}` with `cursor-pointer` on the entire `<div>`. Teachers can click anywhere on the row. Name text turns indigo on hover, reinforcing interactivity.
2. **Row hover state.** Lavender `#ECEAFD` is perceptible and consistent. Stronger than the dashboard roster's `#F4F2FD`.
3. **CEFR filter pills.** URL-synced, instant filtering, active state uses `indigo-50` + `indigo-700`. Subtitle updates dynamically ("Managing 4 B2 learners").
4. **Sort dropdown.** Custom component (not native `<select>`), matches Academic Atelier. Active option highlighted in indigo. `ChevronsUpDown` icon is correct.
5. **Search with debounce.** URL-synced via `?q=`, subtitle updates to "Showing X results for 'query'". Responsive.
6. **Avatar circles.** Color-coded by student ID hash, 8 palette options. Initials are clean. Matches Stitch.
7. **Add Student CTA.** Gradient primary with `UserPlus` icon. Matches Stitch.

---

## 2. Findings

### F1. (HIGH) Load More button is broken

Clicking "Load more" sets `?count=24` in the URL but the parameter is immediately wiped, keeping the list at 12 rows. Reproducible every time.

Root cause: the search debounce `useEffect` (lines 217-231) always calls `next.delete('count')`. When `setSearchParams` identity changes after `updateParam` fires, the effect re-fires and deletes the count parameter.

A teacher with 44 students cannot see students 13-44 unless they use search or CEFR filter. This is a data access blocker.

**Where:** `Students.tsx:217-231` (debounce effect) conflicting with `Students.tsx:577` (Load More handler).

### F2. (MEDIUM) Column headers differ from Stitch

| Column | Stitch | Live |
|--------|--------|------|
| 3 | CEFR LEVEL | LEVEL |
| 4 | LANGUAGE | NATIVE LANGUAGE |
| 7 | SIGNALS | ALERTS |

"CEFR LEVEL" is more descriptive. "LANGUAGE" is more concise (native is implied). "SIGNALS" is the term used in the behavior docs and dashboard.

**Where:** `Students.tsx:193` (`TABLE_HEADERS` constant).

### F3. (MEDIUM) No-line rule violations (3 instances)

| Location | Class | Line |
|----------|-------|------|
| Pagination footer | `border-t border-zinc-50` | 569 |
| Sort dropdown | `border border-zinc-100` | 410 |
| Skeleton header | `border-b border-zinc-100` | 313 |

The Academic Atelier prohibits 1px borders. Use tonal shifts or shadow instead.

### F4. (MEDIUM) RETURNING signal threshold mismatch

Code at `Students.tsx:100` uses `lastSessionGapDays >= 30` for RETURNING. The behavior doc at `dashboard-behavior.md:126` specifies 21 days. Teachers returning after 3 weeks show "Inactive 21d" instead of "RETURNING".

**Where:** `Students.tsx:100`.

### F5. (MEDIUM) Multiple signals can render per student

`buildSignals()` returns an array and all matching signals render simultaneously. A student could show "RETURNING", "Cancelled 2x", and "Review pending" at once. Stitch shows one signal per student (highest priority). The behavior doc specifies priority-based single-signal. Multiple badges create visual noise and break scan rhythm.

**Where:** `Students.tsx:82-140` (`buildSignals` returns array, not single highest-priority).

### F6. (LOW) Subtitle missing "active" qualifier

Stitch: "Managing 24 **active** language learners in your atelier"
Live: "Managing 44 language learners in your atelier"

The qualifier matters because the page may include inactive/former students.

**Where:** `Students.tsx:297`.

### F7. (LOW) Load More button missing chevron icon

Stitch shows "Load more" with a downward chevron. Live has plain text only.

**Where:** `Students.tsx:579`.

### F8. (LOW) Next session shows relative format for distant dates

Live: "in 29d" for Nataliya's next session. Stitch: absolute format like "Thu 15:00", "Sat 11:30". Future sessions should show the actual day and time so the teacher can plan.

**Where:** `Students.tsx:41-72` (`formatRelativeDate` function).

---

## 3. Summary Priority Table

| Priority | # | Finding | Screen |
|----------|---|---------|--------|
| HIGH | F1 | Load More button broken (pagination doesn't expand) | Students List |
| MEDIUM | F2 | Column headers differ from Stitch (LEVEL/LANGUAGE/ALERTS) | Students List |
| MEDIUM | F3 | No-line rule violations (3 borders) | Students List |
| MEDIUM | F4 | RETURNING signal threshold 30d vs spec 21d | Students List |
| MEDIUM | F5 | Multiple signals per student (should be single, priority-based) | Students List |
| LOW | F6 | Subtitle missing "active" qualifier | Students List |
| LOW | F7 | Load More missing chevron icon | Students List |
| LOW | F8 | Next session uses relative format for distant future | Students List |

---

## 4. Suggested Issues

### Issue F+G (bundled): #795 — Students List: fix Load More, signal logic, and Stitch alignment

**Scope:** (1) Fix Load More button (debounce effect wipes `count` param). (2) Align column headers to Stitch (CEFR LEVEL, LANGUAGE, SIGNALS). (3) Remove 3 no-line rule violations. (4) Change RETURNING threshold from 30d to 21d. (5) Refactor `buildSignals()` to single highest-priority signal. (6) Minor polish: "active" subtitle, chevron icon, next-session date format.

**Labels:** area:frontend, area:design, size:M

---
---

# UI Redesign Feedback 3C -- Student Detail Screen

Vera, 2026-04-18. Review of `/students/:id` (all 4 tabs: Overview, Profile, Sessions, Progress) against Stitch mockups.

---

## 1. What Works Well

1. **Tab system.** URL-synced via `?tab=`, active tab has white bg + shadow lift, inactive tabs have hover state. Clean, matches Academic Atelier.
2. **Header card.** Ambient shadow (`0 12px 40px rgba(26,27,34,0.06)`) creates proper tonal lift. Back arrow, avatar, name, and CTAs are well-placed.
3. **Identity subtitle.** "German speaker" under the name is a good addition (Stitch shows "Architect & Language Curator, Lisbon/Madrid"). The `buildIdentitySubtitle()` function intelligently combines L1, profession, and city.
4. **Session frequency indicator.** "12 sessions in 7 weeks, avg. every 5 days" is genuinely useful context not in Stitch. Nice progressive enhancement.
5. **Overview: 3-card layout.** Pending Followups, Pedagogical Profile, and Ideas para Clases in a 3-column grid. Clean, scannable.
6. **Teacher's Working Memory.** Dark `#1A1B22` card with Lifecycle badge matches Stitch's premium feel. "Add Memory" CTA is discoverable.
7. **Progress: Pacing Analytics.** Total sessions, frequency, start date, and cancellation rate. Matches Stitch's card layout.
8. **Progress: Coming Soon placeholders.** Identical to Stitch (Curriculum Progress, Topic Analysis, Engagement Trends). Professional.
9. **Edit Student + Log Session CTAs.** Edit uses `indigo-50` secondary style, Log Session uses gradient primary. Correct button family hierarchy.
10. **Sessions tab.** Total Hours stat card, date calendar icons, status filter pills (All/Completed/Cancelled/Draft), expandable session cards. Solid foundation.

---

## 2. Findings

### F1. (MEDIUM) Header metadata density creates visual noise

The header stacks 5 lines of metadata vertically:
1. Name
2. Identity subtitle ("German speaker")
3. Badges (ACTIVE PRIVATE) + Next session pill
4. Session frequency
5. CEFR badge + ENGLISH + NATIVE: GERMAN + city

Stitch spreads this differently: photo on left, name + subtitle + badges center, objective card on right. The live header reads like a metadata dump. The CEFR badge, language labels, and native language all compete for attention at the same visual weight.

**Suggestion:** Move CEFR badge inline with the name (like Stitch). Collapse "ENGLISH" and "NATIVE: GERMAN" into the identity subtitle as "German speaker, learning English". Remove the redundancy.

**Where:** `StudentDetail.tsx:320-415` (header layout).

### F2. (MEDIUM) Status badges differ from Stitch

| Element | Stitch | Live |
|---------|--------|------|
| Active status | Green "ACTIVE" pill | Combined "ACTIVE . PRIVATE" zinc pill |
| Student type | Separate indigo "PRIVATE" pill | Part of combined badge |

Stitch uses separate color-coded pills (green for status, indigo for type). The combined badge loses the color-coded meaning. A teacher scanning for "which students are corporate?" can't spot the difference visually.

**Where:** `StudentDetail.tsx:339-354` (badge rendering).

### F3. (MEDIUM) Session cards show date-based titles, not descriptive

Live: "Session, Apr 23" and "Session, Apr 11"
Stitch: "Subjunctive Usage in Time Clauses", "Introduction to Business Spanish"

Sessions lack descriptive titles. The session narrative exists (expandable) but the collapsed row shows only the date. When a teacher scans 15 sessions, "Session, Apr 23" is useless for finding a specific one.

**Root cause:** The API returns sessions with a `notes` field but no `title` or `topicTags` surfaced in the collapsed card. The SessionHistoryTab renders the title from session data, but scenario-seeded sessions only have notes, not structured topic titles.

**Where:** `SessionHistoryTab.tsx` (collapsed card title rendering). Partly a seed data gap: scenario 6 sessions need `topicTags` and a proper title derived from topics.

### F4. (LOW) Overview: "Pedagogical Profile" card shows raw text, not skill bars

Stitch shows READING B2 / WRITING A2 with indigo progress bars. Live shows bullet text ("fluidez, confianza", "conversation") and a language chip.

This is data-dependent: the card shows whatever `skillLevelOverrides` and `learningGoals` exist. Hans has no skill overrides, so no bars render. The skill bar implementation exists in the Progress tab. The Overview card correctly falls back to text display.

**Where:** `StudentOverviewTab.tsx` (Pedagogical Profile card). Not a bug, but the card could show a "Set up skill levels" CTA when empty, linking to Edit Student.

### F5. (LOW) No-line violations across student components

Notable violations (content-separation borders, not form inputs):

| Component | Class | Line |
|-----------|-------|------|
| LessonHistoryCard | `border border-zinc-100` on lesson entries | 44, 62 |
| ProgressDashboard | `border-y border-zinc-200/60` on frequency row | 260 |
| ProgressDashboard | `border-b border-zinc-50` on difficulty items | 356 |
| StudentCoursesCard | `border border-zinc-100` on course cards | 38, 63 |
| StudentProfileOverview | `border-zinc-200` on profile card | 49 |

Form input borders (allowed by Ghost Border Fallback) are not listed.

### F6. (LOW) Missing Stitch elements (aspirational, not blockers)

These exist in Stitch but are not yet implemented. Not polish issues, they are feature gaps:

| Stitch element | Status | Notes |
|----------------|--------|-------|
| Student photo | Not implemented | Avatar initials used instead |
| Rate in header ("€45/hr") | Not shown in header | Exists in Profile sidebar |
| PRIMARY OBJECTIVE card (top-right) | Inline compact version exists | Stitch has a separate prominent card |
| Sessions: Topic filter | Not implemented | Date Range + status filters exist |
| Sessions: "Load earlier sessions" button | "Showing X of Y sessions" exists | No separate load-earlier CTA |

These are out of scope for polish but documented for roadmap.

---

## 3. Summary Priority Table

| Priority | # | Finding | Tab |
|----------|---|---------|-----|
| MEDIUM | F1 | Header metadata density creates visual noise | All tabs (header) |
| MEDIUM | F2 | Status badges differ from Stitch (combined vs separate) | All tabs (header) |
| MEDIUM | F3 | Session cards show date-based titles, not descriptive | Sessions |
| LOW | F4 | Pedagogical Profile shows text fallback, no "set up" CTA | Overview |
| LOW | F5 | No-line violations in student components (5 files) | Profile, Progress, Overview |
| LOW | F6 | Missing Stitch elements (photo, rate in header, topic filter) | Various |

---

## 4. Suggested Issue

### Issue H: #797 — Student Detail header polish and session card titles

**Scope:** (1) Reduce header density: move CEFR badge inline with name, collapse language labels into subtitle, remove redundant native language label. (2) Separate ACTIVE and PRIVATE into individual color-coded badges per Stitch (green + indigo). (3) If session has topic tags, use first tag as collapsed title instead of "Session, Apr 23". (4) Remove content-separation borders in LessonHistoryCard, ProgressDashboard, StudentCoursesCard, StudentProfileOverview.

**Labels:** area:frontend, area:design, size:M

---

## 3D. Edit Student Screen (`/students/:id/edit`)

**Vera's verdict: ALMOST (revised 2026-04-18, second pass with Chrome)**

The Edit Student form is well-structured: autosave works, scrollspy section nav is excellent UX, the sidebar with Teaching Todos + Pending Followups provides great context. The form sections are logically grouped and the progressive disclosure via scrollspy keeps the long form navigable. A few divergences from Stitch and no-line violations need attention.

### Findings

**F1 (MEDIUM): Skill Overrides presentation differs from Stitch**
Stitch mockup shows Skill Overrides as four distinct colored CEFR badge pills in a horizontal row (`Reading B2`, `Writing A2`, `Speaking B1`, `Listening B1`), each color-coded by proficiency band. The live implementation uses four plain Select dropdowns showing "--" in a 2x2 grid within a separate card below Basic Info. The pill layout communicates at a glance "where is this student strong/weak" much more effectively than dropdown menus.

*Files:* `StudentForm.tsx` (skill overrides section, around line 760-810)

**F2 (LOW): Section separator borders violate no-line rule**
Content-separation `border-t border-zinc-100` appears at:
- Line 840: Languages sub-section separator within Basic Info
- Line 1113: Short-Term Objectives separator within Teaching Goals
- Line 1228: Structured Difficulties separator within Teaching Goals
- Line 1465: Danger zone separator

These are intra-card section dividers. Per Academic Atelier, use tonal contrast (bg shift or whitespace) instead.

*Files:* `StudentForm.tsx:840,1113,1228,1465`

**F3 (LOW): Scrollspy nav bar has bottom border**
Line 656: `border-b border-zinc-100` on the sticky section nav bar. Should use shadow or tonal bg shift per no-line rule.

*Files:* `StudentForm.tsx:656`

**F4 (LOW): Inactive badge uses border**
Line 646: `border border-zinc-200` on the inactive student badge. Should be tonal-only (bg-zinc-100 text-zinc-500, no border).

*Files:* `StudentForm.tsx:646`

**F5 (INFO): "Done" button label vs Stitch "Save Profile"**
Stitch shows "Save Profile" (indigo filled) in the header. The live version shows "Done" (zinc outlined) because the form autosaves. "Done" is actually the correct label for autosave UX (it means "I'm finished editing, take me back"), so this is a good divergence from Stitch. No action needed.

**F6 (INFO): "Create Course" button in edit form header**
The live form has "Create Course" in the top-right header area. Stitch puts "Linked Courses" at the bottom alongside Commercial. The header placement provides faster access. No concern.

**F7 (INFO): Reason for Studying matches Stitch well**
The italic quote with large quote marks icon matches Stitch's editorial treatment.

**F8 (INFO): Teaching Goals + Difficulties 2-col layout matches Stitch**
The side-by-side layout for Teaching Goals (left) and Difficulties (right) matches the Stitch mockup pattern.

### Stitch elements not yet implemented (roadmap)

| Stitch element | Live status | Notes |
|----------------|-------------|-------|
| Photo upload with avatar | Not implemented | Initials avatar only |
| Difficulties as structured table (Competency, Severity, Trend, Status columns) | Live has "Areas to Improve" (free text) + "Specific Difficulties" (structured) as separate sub-sections | Different but functional |

---

## 3E. Log Session Screen (`/students/:id/log-session`)

**Vera's verdict: POLISHED (revised 2026-04-18, second pass with Chrome)**

This is the most complex interaction in the app, and it's handled impressively well. Revised upward from ALMOST after verifying that several features I initially marked as missing are actually implemented but hidden due to empty seed data.

### Sidebar features (all implemented, data-dependent visibility)

All major Stitch sidebar sections exist in the code and render conditionally:

| Section | Code location | Condition | Hans B1 seed status |
|---------|---------------|-----------|---------------------|
| Student identity (avatar, name, CEFR, L1) | Lines 530-545 | Always | Shows correctly |
| Short-Term Objectives | Lines 568-591 | `sortedObjectives.length > 0` | No objectives seeded, hidden |
| Teaching Todos | Lines 596-621 | `pendingTodos.length > 0` | No todos seeded, hidden |
| Open Followups | Lines 624-651 | `pendingFollowups.length > 0` | 2 followups show correctly |
| Last Session card | Lines 654-709 | `prevSession` exists | Shows correctly |
| Planned for Today | Lines 714-721 | `plannedForToday` truthy | Previous session has no `nextSessionTopics`, hidden |
| Active Difficulties | Lines 723-760 | `activeDifficulties.length > 0` | No difficulties seeded, hidden |
| Suggested Difficulties | Lines 762-790 | `suggestedDifficulties.length > 0` | No suggestions, hidden |

**Note:** "Planned for Today" also has a secondary inline `Reference:` hint in the main area (line 1008-1012) for when the sidebar scrolls out of view. Both placements exist. Good UX redundancy.

### Findings

**F1 (LOW): Topic tag chip border violates no-line rule**
Line 1050: `border border-indigo-200` on suggested topic tag chips. Should use tonal-only styling (bg-indigo-100 text-indigo-700, no border).

*Files:* `LogSession.tsx:1050`

**F2 (LOW): Discard button uses border**
Line 881: `border-red-200` on the discard confirmation button. Minor no-line violation.

*Files:* `LogSession.tsx:881`

**F3 (INFO): Progressive disclosure of secondary sections is excellent**
The collapsible "Show homework, cultural notes, error patterns..." (line 1162-1169) is great UX. Keeps the primary flow clean while making advanced fields accessible. The chevron rotation animation (150ms) communicates state change well. This is better than Stitch's flat layout for this section.

**F4 (INFO): Side-by-side Todo/Followup cards with distinct colors are well done**
Indigo `#F0EFFF` for Teaching Todos and amber `#FFFBEB` for Followups (lines 1099, 1130) create clear visual separation. The enter-to-add interaction is efficient. Good pattern.

**F5 (INFO): Metadata bar (Date/Time/Duration/Status) is well designed**
The compact 2x2 grid at line 891 with lavender background `#F4F2FD` groups session metadata cleanly. Border-none inputs with zinc-100 background follow Academic Atelier tonal approach. Good.

**F6 (INFO): Field order differs from Stitch but is arguably better**
Stitch pairs Previous HW + Next Plan side-by-side, and Topics + Context side-by-side. Live stacks them vertically in workflow order: Previous HW > Narrative > Audio > Topics > HW Assigned > Next Plan > Todos/Followups. The vertical flow matches how a teacher naturally reflects on a session (check old homework, describe what happened, record topics, assign new homework, plan ahead). No change needed.

**F7 (INFO): Open Followups in sidebar (not main area) is a good divergence**
Stitch puts "Pending Followups" in the main area as an add-capable section. Live separates concerns: existing followups from previous sessions appear as checkboxes in the sidebar (resolve them), while new followups are created in the main area's amber card. This is cleaner than Stitch's single list.

### Stitch elements not yet implemented (roadmap)

| Stitch element | Live status | Notes |
|----------------|-------------|-------|
| Voice note waveform visualization | Audio recorder exists, no waveform | Functional, visual polish deferred |
| "Transcription Ready" indicator | Not shown | Minor, deferred |

---

## 5. Summary: Edit Student + Log Session (revised)

| Priority | # | Finding | Screen |
|----------|---|---------|--------|
| MEDIUM | F1 | Skill overrides as plain dropdowns vs Stitch colored CEFR pills | Edit Student |
| LOW | F2 | Section separator borders (4 instances) | Edit Student |
| LOW | F3 | Scrollspy nav bar bottom border | Edit Student |
| LOW | F4 | Inactive badge border | Edit Student |
| LOW | F1 | Topic tag chip border | Log Session |
| LOW | F2 | Discard button border | Log Session |

**Corrections from first pass:**
- ~~"Planned for Today" missing from sidebar~~: Already implemented as PanelSection at `LogSession.tsx:714-721`. Hidden because Hans B1's previous session has no `nextSessionTopics`. Also has inline reference hint at line 1008 for redundancy.
- ~~"Active Difficulties" checklist missing~~: Already implemented at `LogSession.tsx:723-760`. Hidden because Hans B1 has no active difficulties. Includes checkbox toggling and "worked on today" hint text.
- ~~Short-Term Objectives missing from sidebar~~: Already implemented at `LogSession.tsx:568-591` with urgency indicators.
- Log Session verdict upgraded from ALMOST to POLISHED. All Stitch sidebar sections are implemented; the seed data for Hans B1 just didn't populate them.

---

## 6. Suggested Issue

### Issue I: #799 — Edit Student + Log Session polish (Stitch alignment)

**Scope (revised, reduced to size:M):** (1) Skill overrides: replace 4 inline Select dropdowns with colored CEFR pill presentation matching Stitch (each pill shows skill name + CEFR level, color-coded by proficiency band). Data source: existing `readingLevel`, `writingLevel`, `listeningLevel`, `speakingLevel` fields in `StudentForm.tsx`. (2) Remove content-separation borders: `StudentForm.tsx:840,1113,1228,1465,656,646` and `LogSession.tsx:1050,881` (replace with tonal contrast or remove).

**Removed from scope:** "Planned for Today" sidebar promotion and "Active Difficulties" checklist, both already implemented correctly.

**Labels:** area:frontend, area:design, size:M

---

## 7. Missing: "Edit Session" navigation from Sessions tab

**Reported by:** Robert (manual testing, 2026-04-18)

Session rows in the Sessions tab (Student Detail) expand inline to show editable title, narrative, and next-session-plan fields. But there is no way to navigate to the full Log Session page in edit mode (`/students/:id/log-session?sessionId=X`). The inline edit only covers 3 of ~12 session fields.

**Impact:** If a teacher needs to change homework status, topics covered, duration, followups, teaching todos, or any secondary field after logging, there is no path to do so. The full edit mode exists (LogSession.tsx supports `?sessionId=` for edit), but no UI element links to it.

**Recommendation:** Add an "Edit full session" link/button in the expanded session row (next to the delete button at `SessionHistoryTab.tsx:494`) that navigates to `/students/:id/log-session?sessionId=:sessionLogId`.
