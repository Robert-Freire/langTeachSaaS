# Dashboard — Screen Reference

> **How to use this file in a future session:**
> Read the Quick Reference first. It tells you what the screen does and what states exist.
> Read Full Behavior only when you need exact render conditions.
> Read Test Scenarios when seeding data or writing e2e tests.

---

## Quick Reference

**What it is:** The teacher's home screen. Four zones, top to bottom.

| Zone | Component | Purpose |
|------|-----------|---------|
| 1 | NextSessionHero | Next upcoming session with urgency countdown, last session briefing, homework status |
| 2a | TodayAgenda | Today's scheduled sessions (time-based list), falls back to this-week, then empty state |
| 2b | PendingFollowups | Teacher's open promises to students, color-coded by age |
| 3 | StudentRoster | All active students: CEFR level, L1, last/next session dates, activity signal |

**Key behaviors to remember:**
- Hero urgency badge only shows when the session is ≤7 days away. No badge = session far out, not a bug.
- Hero briefing block only appears if last-session fields are populated (`lastSessionNotes`, `lastSessionTopicTags`, `lastSessionHomework`, `lastSessionFollowups`). All empty = briefing invisible.
- Roster signals priority (7 levels): "Cancelled 2x" > "EXAM Xw" > "Returning" > "HMWK NOT DONE"/"HMWK PARTIAL" > "Review pending" > "Inactive Xd" > none. Only one per student.
- Followup dot colors: green = today, amber = 1-3 days, red = 4+ days ("OVERDUE").
- Session time not yet enterable in the UI -- all sessions show "00:00", countdown never fires.

**Source files:** `frontend/src/pages/Dashboard.tsx`, `frontend/src/components/dashboard/`, `frontend/src/api/dashboard.ts`

---

## Full Behavior

### Zone 1: NextSessionHero

Data: `data.nextSession` (`NextSession | null`)

**State A — No upcoming sessions** (`nextSession === null`)
Renders "No sessions scheduled" heading. No CTAs.

**State B — Session > 7 days away**
No urgency badge. Shows: day string · time (00:00 if not set) / student name / CEFR badge top-right / "View profile" + "Start session" CTAs.

**State C — Session within 7 days (not today)**
Adds neutral zinc badge: **"IN Xd"**

**State D — Session today, >2h away**
Adds neutral zinc badge: **"TODAY, HH:MM"**

**State E — Session within 2h**
Adds indigo gradient badge: **"IN X MIN"** or **"IN XH"**

**State F — Session now (past)**
Adds indigo gradient badge: **"NOW"**

**Sub-sections inside the hero card:**

*Planned content strip* — renders if `plannedContent` is non-null.

*Last session briefing card* (surface-container-low) — renders if ANY of these has data:
- `lastSessionTopicTags` → "Topics:" row
- `lastSessionNotes` → "How it went:" row
- `lastSessionHomework` → "Homework assigned:" row
- `lastSessionFollowups` → "Promises made:" row

*Homework status card* (amber) — renders if `homeworkAssigned` is non-null.
Status label mapping: Done/"3" → "Completed" (emerald) · Partial/"2" → "Partial" (amber) · NotDone/"1" → "Not done" (red) · null/"0"/Unknown/NotApplicable → "No record" (zinc)

---

### Zone 2a: TodayAgenda

Data: `data.todaySessions` + `data.upcomingThisWeek` + `nextSession.sessionLogId` (for highlight)

**State A — Sessions today** (`todaySessions.length > 0`)
Time-based list. Row: time · student name · CEFR badge · planned content (truncated). Row matching `nextSessionId` → indigo left border + lavender background (visual "NEXT").

**State B — No sessions today, upcoming this week** (`todaySessions` empty, `upcomingThisWeek` non-empty)
Header + "No sessions · This Week" subtitle. Upcoming sessions listed with: day label (Tomorrow / "Fri Apr 18") · time · student · CEFR badge.

**State C — Nothing this week** (both arrays empty)
"No sessions this week" centered text.

---

### Zone 2b: PendingFollowups

Data: `data.pendingFollowups` (`TeacherFollowup[]`)

**State A — Empty:** "All caught up" centered.

**State B — Has items:** Each row: colored dot (click to mark done, optimistic hide) · student name chip (if set) · followup text · age badge.

Age badge logic:
- 0 days → green dot + green **"TODAY"**
- 1-3 days → amber dot + amber **"Xd OLD"**
- 4+ days → red dot + red **"Xd OVERDUE"**

Mark done: optimistic (hides on click, reappears on API error).

---

### Zone 3: StudentRoster

Data: `data.activeStudents` (`ActiveStudent[]`)

**State A — No students:** "No students yet" + "Add your first student" CTA → `/students/new`

**State B — Has students:** Table with columns: Name · Level · L1 · Last · Next · Signal

L1 column: `student.nativeLanguages[0]` or "—"
Dates (Last, Next): absolute format "Apr 13", "17 May" -- NOT relative.

Sort options (custom dropdown, not a native `<select>`):
- Last Session (default): most recent first, nulls last
- Next Session: soonest first, nulls last
- Name: alphabetical

Signal logic — one signal per student, priority order:

| Priority | Condition | Label | Style |
|----------|-----------|-------|-------|
| 1 | `cancelledSessionsLast30Days >= 2` | **"Cancelled 2x"** + red dot | dark (#1A1B22) |
| 2 | `nearestObjectiveDeadline` within 6 weeks AND in future | **"EXAM Xw"** (e.g. "EXAM 3W") — if < 1 week: **"EXAM <1W"** | indigo; red when < 1 week |
| 3 | gap since last session > 21 days AND `nextSessionDate` is set | **"Returning"** | violet |
| 4a | `lastHomeworkStatus === "NotDone"` | **"HMWK NOT DONE"** | red |
| 4b | `lastHomeworkStatus === "Partial"` | **"HMWK PARTIAL"** | amber |
| 5 | `pendingTodos.length > 0` | **"Review pending"** | indigo |
| 6 | last session ≥14 days ago AND no `nextSessionDate` | **"Inactive Xd"** | amber |
| 7 | none | — | — |

Backend fields powering the new signals:
- `nearestObjectiveDeadline` (`DateTime?`): earliest future `targetDate` from student's `ShortTermObjectives` JSON.
- `lastHomeworkStatus` (`string?`): `PreviousHomeworkStatus` ("Done"/"Partial"/"NotDone") from the most recent past session where that value is set (not NotApplicable).

The "Returning" signal is pure frontend: computed from `lastSessionDate` gap and `nextSessionDate`.

---

### Global states

**Loading:** Three skeletons. After 5s still loading: amber "Still connecting..." banner.
**Error:** "Could not load dashboard" + retry instruction.

---

## Test Scenarios

Each scenario maps to a named seed student. Use these when seeding, writing e2e tests, or doing UI reviews.

### Scenario 1 — "Class in 20 minutes" (student: Ana Visual)
**Covers:** Hero urgency badge + full briefing + homework card + today's agenda with three rows.

Seed requirements:
- Session TODAY at `now + 20 min`, status NEXT
- A second session earlier today (past), status COMPLETED
- A third session later today, status SCHEDULED
- `plannedContent`: "Review homework + introduce imperfecto"
- `lastSessionTopicTags`: ["Pretérito indefinido", "Verbos reflexivos"]
- `lastSessionNotes`: "Good session, student struggled with reflexive verbs in past tense"
- `lastSessionHomework`: "Write 10 sentences using reflexive verbs in past tense"
- `lastSessionFollowups`: ["Send link to reflexive verb exercises"]
- `homeworkAssigned`: "Complete exercises 3.1-3.4 in workbook"
- `previousHomeworkStatus`: "Partial"
- `nativeLanguages`: ["Ukrainian"]

Visible states: "IN 20 MIN" badge · planned strip · full briefing card · "Partial" amber homework card · agenda 3 rows with NEXT highlight.

---

### Scenario 2 — "Session this week, quiet day" (student: Marco B1)
**Covers:** "IN Xd" badge · planned strip only (no briefing) · agenda this-week fallback · non-urgent followup.

Seed requirements:
- Session in 3 days, no sessions today
- `plannedContent`: "Subjuntivo en oraciones temporales"
- No last-session fields (briefing must NOT render)
- `homeworkAssigned`: null
- One other student with a session later this week (populates the this-week list)
- One pending followup created 2 days ago
- `nativeLanguages`: ["Italian"]

Visible states: zinc "IN 3D" · planned strip only · this-week agenda · "2D OLD" followup.

---

### Scenario 3 — "Nothing scheduled" (student: Carmen C1)
**Covers:** All empty states simultaneously.

Seed requirements:
- `nextSession`: null, no sessions today, none this week, no pending followups

Visible states: "No sessions scheduled" hero · "No sessions this week" agenda · "All caught up" followups.

---

### Scenario 4 — "Overdue followups" (student: Nadia B2)
**Covers:** All three followup age styles in one view.

Seed requirements:
- 3 followups: created today / created 2 days ago / created 7 days ago

Visible states: green "TODAY" · amber "2D OLD" · red "7D OVERDUE".

---

### Scenario 5 — "Roster signals" (7 students)
**Covers:** All seven signal states in the roster simultaneously.

Seed requirements:
- Student A: `cancelledSessionsLast30Days >= 2` → dark "Cancelled 2x" + red dot
- Student B: `nearestObjectiveDeadline` within ~4 weeks → indigo "EXAM 4W" (Eva Seed)
- Student C: last session 25 days ago, next session set → violet "Returning" (Petra Seed)
- Student D: most recent past session has `PreviousHomeworkStatus = NotDone` → red "HMWK NOT DONE" (Hugo Seed)
- Student E: `pendingTodos.length >= 1` → indigo "Review pending"
- Student F: last session 20 days ago, no `nextSessionDate` → amber "Inactive 20d"
- Student G: seen recently, next session set, no todos, no flags → no signal
- All: `nativeLanguages` populated (fills L1 column)

---

### Scenario 6 — "Full hero briefing" (student: Hans B1)
**Covers:** Every hero sub-section visible at once.

Seed requirements:
- Session in 5 days
- `plannedContent`: set
- `lastSessionTopicTags`: ["Ser vs estar", "Subjuntivo"]
- `lastSessionNotes`: "Strong session, needs more practice with subjunctive triggers"
- `lastSessionHomework`: "Read article and summarize in Spanish"
- `lastSessionFollowups`: ["Find recording of native speaker conversation", "Prepare vocabulary list on travel"]
- `homeworkAssigned`: "Complete workbook p.45-47"
- `previousHomeworkStatus`: "Done"

Visible states: zinc "IN 5D" · planned strip · full briefing (all 4 sub-sections) · green "Completed" homework card.

---

### Scenario 7 — Slow connection (no seed needed)
Throttle network in browser dev tools to "Slow 3G". After 5s the amber "Still connecting..." banner appears above skeletons.

---

## Known Data Gaps (as of 2026-04-16)

| Field | Problem | Visible impact |
|-------|---------|----------------|
| Session time | Not enterable in Log Session UI | Hero shows "00:00", no countdown fires |
| `lastSessionNotes` | Not populated from real session logs | Briefing "How it went" never renders |
| `lastSessionTopicTags` | Only set if teacher uses Topics field (rare) | Briefing "Topics" never renders |
| `lastSessionHomework` / `lastSessionFollowups` | Available but rarely populated | Briefing sub-sections mostly empty |
| `nativeLanguages` | Not seeded for most students | L1 column all dashes |
| `cancelledSessionsLast30Days` | Needs actual cancelled sessions | "Cancelled 2x" signal never shows |
