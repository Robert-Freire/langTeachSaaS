# T19 — Dashboard v2: The Teacher's Command Center

## Product Vision

The dashboard is the first screen a teacher sees every day. It should answer three questions instantly:

1. **"What's coming up?"** (my schedule this week)
2. **"Am I ready?"** (which lessons still need prep)
3. **"What should I do next?"** (actionable next step)

The current dashboard shows three stat counters (students, lessons, active plans). That's a report, not a tool. A Preply teacher juggling 5-8 daily lessons across different students and levels needs a **command center**, not a spreadsheet summary.

---

## Prerequisite: ScheduledAt on Lessons

### The gap

The `Lesson` entity has `CreatedAt` and `UpdatedAt` but no field for **when the class actually happens**. Without this, any time-based dashboard view is impossible.

This is not just a T19 problem. It's a data model gap that weakens multiple features:

| Feature | Impact without ScheduledAt |
|---------|---------------------------|
| T19 Dashboard | Can't show upcoming classes or weekly schedule |
| T17 PDF Export | Uses `CreatedAt` as date header (misleading, a lesson created Monday for a Thursday class shows Monday) |
| T18 Lesson Notes | "Add notes after the lesson" has no temporal anchor |
| T23 Demo Script | "This is your teaching hub" rings hollow without a schedule |
| T25 Suggest Next Topic | Can't factor in "Maria's next class is in 2 days" |

### The change

Add `ScheduledAt` (nullable `DateTime?`) to the `Lesson` model. Nullable because:
- Lessons can exist without a scheduled date (templates, drafts, exploratory prep)
- Existing lessons get null by default (no data migration needed beyond the column)
- The teacher sets it when they know when the class is

This is a single EF migration + adding the field to Create/Update DTOs + a date picker in the lesson editor form.

---

## Dashboard Layout

### Section 1: Week at a Glance (top, full width)

A horizontal 7-day strip showing the current week (Monday through Sunday).

```
  Mon 17       Tue 18       Wed 19       Thu 20         Fri 21       Sat 22   Sun 23
 +-----------+-----------+-----------+---------------+-----------+-----------+------+
 | Maria B1  | Pedro A2  |           | Maria B1      | New stud. |           |      |
 | [Ready]   | [Draft]   |           | [Ready]       | [Draft]   |           |      |
 |           | Yuki B2   |           | Pedro A2      |           |           |      |
 |           | [Ready]   |           | [Draft]       |           |           |      |
 +-----------+-----------+-----------+---------------+-----------+-----------+------+
              ^orange                today^bold
```

**Behavior:**
- Each day column stacks all lessons for that day vertically (a teacher may have 1-5+ lessons per day)
- Color coding: green = Published (ready), orange = Draft (needs prep)
- Today is visually highlighted (bold border, subtle background)
- Clicking a lesson pill opens the lesson editor
- Empty days show nothing (clean, not cluttered)
- Navigation: left/right arrows to shift the week window
- Lessons without `ScheduledAt` do NOT appear here (they live in the "Unscheduled" section below)

**Data source:** `GET /api/lessons?scheduledFrom={weekStart}&scheduledTo={weekEnd}` (new query params)

**Why not a full calendar?** A month-view calendar is overkill for beta. Teachers think in weeks, not months. The strip is lightweight (no calendar library needed), scannable, and directly answers "what's my week look like?"

### Section 2: Needs Preparation (left column, below week strip)

A focused list of lessons that are **scheduled in the next 7 days** but still in **Draft** status.

```
  Needs Preparation
  +-------------------------------------------------+
  | [!] Pedro: Restaurant vocabulary    Wed Mar 19  |
  |     A2 Spanish - Draft              [Open ->]   |
  +-------------------------------------------------+
  | [!] New student: First lesson       Fri Mar 21  |
  |     A1 English - Draft              [Open ->]   |
  +-------------------------------------------------+
```

**Behavior:**
- Sorted by scheduled date (most urgent first)
- Each row: student name (or "No student"), topic, date, CEFR badge, "Open" link
- If empty: "All caught up! No upcoming lessons need preparation." (positive reinforcement)
- Only shows lessons with a `ScheduledAt` in the next 7 days AND `Status == Draft`

**Why this matters:** This is the "to-do list" a teacher actually needs. Not "recent lessons" (backwards-looking), but "what's coming that I haven't finished" (forward-looking, actionable).

### Section 3: Quick Actions + Stats (right column, below week strip)

**Quick Create card:**
- "New Lesson" button prominently placed
- Optional: student pre-selector dropdown so the teacher can start with context

**Activity summary (secondary, compact):**
- Students: {count}
- Lessons this week: {count} (scheduled, not created)
- Total lessons: {count}

**Recent activity (compact list):**
- Last 5 lessons created or edited, with student name and status
- Serves as a quick access list for ongoing work regardless of scheduling

### Section 4: Unscheduled Lessons (below main content, collapsible)

Lessons in Draft status that have no `ScheduledAt`. These are "in progress" work that hasn't been tied to a date yet.

```
  Unscheduled Drafts (3)  [collapse ^]
  +-------------------------------------------------+
  | Grammar review for Maria    B1 Spanish  [Open]  |
  | Exam prep template          C1 English  [Open]  |
  | Travel vocabulary           B2 French   [Open]  |
  +-------------------------------------------------+
```

**Why:** Teachers often start drafting lessons before knowing the exact date. These shouldn't be invisible, but they also shouldn't clutter the scheduled view.

---

## Impact on Completed Tasks

These are changes needed in already-shipped code to support `ScheduledAt`.

### Backend (schema + API)

| File / Area | Change | Effort |
|-------------|--------|--------|
| `Data/Models/Lesson.cs` | Add `public DateTime? ScheduledAt { get; set; }` | Trivial |
| EF Migration | `AddColumn("ScheduledAt", nullable: true)` | Trivial |
| `DTOs/CreateLessonRequest.cs` | Add `public DateTime? ScheduledAt { get; set; }` | Trivial |
| `DTOs/UpdateLessonRequest.cs` | Add `public DateTime? ScheduledAt { get; set; }` | Trivial |
| `Services/LessonService.cs` | Map `ScheduledAt` in Create and Update flows | Trivial |
| `Controllers/LessonsController.cs` (GET list) | Add `scheduledFrom` and `scheduledTo` query params for date-range filtering | Small |
| Lesson response DTO / mapping | Include `ScheduledAt` in JSON response | Trivial |

### Frontend (lesson form + API types)

| File / Area | Change | Effort |
|-------------|--------|--------|
| `api/lessons.ts` (types) | Add `scheduledAt?: string` to `Lesson`, `CreateLessonRequest`, `UpdateLessonRequest`, `LessonListQuery` | Trivial |
| `LessonEditor.tsx` (or lesson form component) | Add a date/time picker for `ScheduledAt` in the lesson metadata section | Small |

### T17 PDF Export (already shipped)

| File / Area | Change | Effort |
|-------------|--------|--------|
| `PdfLessonData.cs` | Change `CreatedAt` to `ScheduledAt` (with `CreatedAt` as fallback if null) | Trivial |
| PDF header rendering | Display `ScheduledAt` as the lesson date, falling back to `CreatedAt` if unscheduled | Trivial |

### Existing Tests

| Area | Change |
|------|--------|
| `LessonsControllerTests` | Add `ScheduledAt` to test payloads where needed; add one test for date-range query |
| e2e lesson tests | Update lesson creation payloads if they validate all fields |
| PDF export tests | Verify `ScheduledAt` appears in header |

---

## Impact on Pending Tasks

### T18 (Student Lesson Notes)

**Current spec:** Notes attached to the student-lesson relationship. No temporal awareness.

**Enhancement:** When displaying lesson history on a student profile, sort by `ScheduledAt` (not `CreatedAt`). The "Add Notes" prompt can say "Notes for [date] lesson" when `ScheduledAt` is set, giving temporal context to the notes.

No spec rewrite needed, just a sort order preference and display label.

### T23 (Beta Demo Preparation)

**Current demo script step 1:** "Log in, show dashboard with real student data pre-seeded."

**Revised step 1:** "Log in. The dashboard shows your week: Maria on Tuesday (ready, green), Pedro on Wednesday (needs prep, orange), a new student on Friday (no lesson yet). One draft is unscheduled. This is your teaching hub."

**Seed data change:** Pre-seeded lessons need `ScheduledAt` values spread across the demo week. At least:
- 2 Published lessons with future dates (shows "ready" state)
- 1 Draft lesson with a future date (shows "needs prep" state)
- 1 Draft lesson with no date (shows unscheduled section)

This transforms the demo opening from static tiles into a narrative about a real teaching week.

### T25 (Suggest Next Topic)

**Current spec:** Suggests topics based on student level, goals, weaknesses, and past lesson topics.

**Enhancement opportunity (stretch, not required):** The prompt to Claude could include "The next scheduled lesson with this student is on [date]" to help the AI suggest time-appropriate topics (e.g., if the next class is tomorrow, suggest a lighter review topic; if it's next week, suggest something new).

No spec rewrite required. Just a note that `ScheduledAt` data is available for prompt enrichment.

### T24 (Adapt Lesson for Another Student)

**Minor note:** When adapting a lesson, the cloned lesson should NOT copy `ScheduledAt` (it's a different class at a different time). The teacher sets the date for the new lesson separately.

---

## Changes to the Beta Plan

### Execution order update

Current plan (line 1227): `T18 + T19 + T21 (parallel)`

Revised: T19 should include the `ScheduledAt` migration as its first step (T19 step 0). This means T19 touches the backend, so it cannot run fully in parallel with T18 if T18 also touches lesson-related backend code. Suggested order:

```
11. T17 (PDF export) -- DONE
12. T19 (dashboard v2, includes ScheduledAt migration)
13. T18 + T21 (parallel, after T19 lands the migration)
14. T17 fixup: swap CreatedAt for ScheduledAt in PDF header (tiny, can fold into T19 PR or do separately)
15. T24 + T25 (parallel)
16. T20 (as time allows)
17. T23 (always last, seed data now includes ScheduledAt values)
```

### Effort revision

T19 moves from **0.5 days** to **1 day**:
- ScheduledAt migration + API changes: 0.25 days
- Date picker in lesson editor: 0.15 days
- Dashboard UI (week strip + needs prep + quick actions + unscheduled): 0.5 days
- Tests (unit + e2e): 0.1 days

### T19 "Done when" criteria

1. `ScheduledAt` nullable DateTime field exists on Lesson, accepted in create/update, returned in responses
2. Lesson editor has a date/time picker for scheduling
3. Lessons API supports `scheduledFrom` / `scheduledTo` query parameters
4. Dashboard shows a 7-day week strip with scheduled lessons color-coded by status
5. "Needs Preparation" section lists upcoming Draft lessons sorted by date
6. Quick Create and activity stats are present
7. Unscheduled drafts section shows lessons without a date
8. Clicking any lesson navigates to the editor
9. PDF export uses `ScheduledAt` as the lesson date (falls back to `CreatedAt`)
10. All existing tests still pass; new tests cover date-range queries and dashboard rendering

---

## What This Does NOT Include

- **Recurring lessons** (e.g., "Maria every Tuesday at 3pm"). That's a scheduling system, not a beta feature.
- **Time-of-day display**. The week strip shows the date, not specific hours. Teachers know their own schedule; they just need to see which days have lessons.
- **Drag-and-drop rescheduling**. Moving lessons between days by dragging would be nice but is not worth the effort for beta.
- **Calendar sync** (Google Calendar, iCal). Future feature, not beta scope.
- **Student-facing schedule**. Students don't log in yet. This is teacher-only.

These are all valid post-beta features that `ScheduledAt` enables without any additional schema changes.
