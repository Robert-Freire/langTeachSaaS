# Task 682: Student Detail Overview Tab

**Issue:** feat: student detail Overview tab (daily glance, three-card layout)
**Branch:** worktree-task-t682-overview-tab
**Sprint:** ui-redesign-student-polish

---

## Current state (sprint branch)

Already implemented in the sprint branch by earlier tasks:
- 4-tab structure (Overview, Profile, Sessions, Progress) in `StudentDetail.tsx`
- Overview as default tab (`?tab=overview` query param or default)
- Student header: avatar, name, CEFR badge, profession, origin/residence, Edit + Log Session
- `StudentOverviewTab.tsx`: PrimaryObjectiveCard (left 3/5) + TeachingTodosCard + StudentFollowupsCard (right 2/5)
- `TeachingTodosCard.tsx`: full CRUD, optimistic UI, toggle covered/pending
- `StudentFollowupsCard.tsx`: pending followups checkable

## What is missing (ACs not yet met)

| AC | Status |
|----|--------|
| Student header: Active + Private/Corporate badges | Missing |
| Student header: Next session pill | Missing (data from listSessions, future dates) |
| Three-card row: Pedagogical Profile card | Missing |
| Recent sessions (2-3) with link to Sessions tab | Missing |
| Teacher's Working Memory panel | Missing |
| SessionLog.title exposed in frontend type | Missing (backend has it, frontend TS interface does not) |

## Infrastructure notes

- `SessionLog.title: string | null` exists in backend (migration `AddSessionLogDurationTitle`) but is not in the frontend `SessionLog` interface in `sessionLogs.ts`. Must be added.
- "Next session" is computed from session logs with a future `sessionDate`. No dedicated endpoint needed -- use `listSessions` filtered to future dates.
- `student.skillLevelOverrides: Record<string, string>` is available -- maps skill name to CEFR level string.
- `student.teachingNotes: string | null` and `student.createdAt: string` are available.

---

## Implementation plan

### Step 1 - Fix SessionLog type in frontend API

**File:** `frontend/src/api/sessionLogs.ts`

Add `title: string | null` to the `SessionLog` interface (after `duration`).

### Step 2 - Load sessions at StudentDetail level + add header badges

**File:** `frontend/src/pages/StudentDetail.tsx`

1. Add `listSessions` query:
   ```ts
   const { data: sessions = [] } = useQuery({
     queryKey: ['sessions', id],
     queryFn: () => listSessions(id!),
     enabled: !!id,
   })
   ```

2. Derive next session in render:
   ```ts
   const now = new Date()
   const nextSession = sessions
     .filter(s => s.sessionDate && new Date(s.sessionDate) > now && !s.isCancelled)
     .sort((a, b) => new Date(a.sessionDate!).getTime() - new Date(b.sessionDate!).getTime())[0] ?? null
   ```

3. In the student header, after the name/profession block, add:
   - Active/Corporate badges: one combined badge "Active • Private" or "Active • Corporate" or just "Active" when no corporate distinction matters. Use `bg-[#E8E7F1] text-[#464455]` pill style.
   - Next session pill: if `nextSession` exists, show formatted date + duration.

4. Pass `sessions` to `StudentOverviewTab`:
   ```tsx
   <StudentOverviewTab
     student={student}
     sessions={sessions}
     followups={followups}
     onFollowupChange={onFollowupChange}
     onStudentChange={onStudentChange}
   />
   ```

### Step 3 - Restructure StudentOverviewTab layout

**File:** `frontend/src/components/student/StudentOverviewTab.tsx`

New layout (top to bottom):
1. Primary Objective card (full width or right-aligned - keep as is but full row)
2. Three-card row (3 equal cols): Teaching Todos | Pending Followups | Pedagogical Profile
3. Recent Sessions section
4. Teacher's Working Memory dark panel

**Props change:**
```ts
interface Props {
  student: Student
  sessions?: SessionLog[]
  followups?: TeacherFollowup[]
  onFollowupChange?: () => void
  onStudentChange: () => void
}
```

**New internal components:**

#### PedagogicalProfileCard

Shows `student.skillLevelOverrides` as labeled bars with CEFR badge, and `student.nativeLanguages` as tags at the bottom.

CEFR level -> bar width mapping:
- A1: 16%, A2: 33%, B1: 50%, B2: 66%, C1: 83%, C2: 100%

Use `cefrBarColor(level)` helper:
- A-levels: indigo bar (lighter)
- B-levels: indigo bar (primary)
- C-levels: tertiary (#7E3000) bar

Empty state: "No skill overrides set" italic text.

Native language tags at bottom: each tag as `bg-primary-fixed text-[#3323CC] rounded-md px-2 py-0.5 text-[10px] font-bold uppercase` (following Stitch design).

`data-testid="pedagogical-profile-card"`

#### RecentSessions

Takes `sessions: SessionLog[]` (already loaded by parent).

Logic: take last 2-3 sessions sorted by `sessionDate` descending, `statusName === 'Confirmed'` preferred but show drafts if no confirmed. Show at most 3.

Each session shows:
- Date: formatted as "Thursday, March 21" 
- Title: `session.title` or fallback to `session.plannedContent` first 60 chars, or "Session" if neither
- Narrative: `session.actualContent` first 120 chars snippet, or `session.generalNotes` snippet, or null (don't show empty)
- Homework: `session.homeworkAssigned` if set
- Topic chips: from `parseTopicTags(session.topicTags)` first 3 tags
- Duration: `session.duration` in minutes if set

At the bottom: "View all sessions" link that calls `onShowSessions()` prop (or navigates to `?tab=sessions`). Actually, use a simple `<button onClick={() => setActiveTab('sessions')}>` pattern -- but that's in StudentDetail. Better: pass `onViewAllSessions` callback from StudentDetail that sets `setActiveTab('sessions')`.

Wait -- this creates a callback prop chain. Simpler: just render a `<button onClick={() => onShowSessions()}>` in RecentSessions and pass the callback from StudentOverviewTab to StudentDetail.

Actually simplest: use a Link with `?tab=sessions` -- but that reloads the page. Instead, pass `onViewAllSessions` as a prop all the way down.

Simplest viable: add `onViewAllSessions?: () => void` to StudentOverviewTab Props and pass from StudentDetail. StudentDetail already has `setActiveTab`.

`data-testid="recent-sessions"`, `data-testid="recent-session-item"` on each entry.

Empty state: "No sessions logged yet." if no sessions.

#### TeachingNotesPanel

Dark panel (bg `#1A1B22`, text white) at the very bottom.

Shows:
- Section header "Teacher's Working Memory" with edit_note icon style (use `Brain` or `Pencil` from lucide)
- Body: `student.teachingNotes` text if set, else italic empty state "No notes yet."
- "Add Memory" button: opens inline textarea to edit/append teachingNotes, saves via `updateStudent`
- Right column: "Student Since" derived from `student.createdAt` formatted as "Jan 2026"

The "Add Memory" inline flow:
- Button click -> show `<textarea>` pre-populated with current `teachingNotes`
- Save button calls mutation: `updateStudent(student.id, fullPayload)` where `fullPayload` is the complete StudentFormData built from all student fields (same pattern as `buildStudentPayload()` already in `StudentDetail.tsx`). Pass the builder function or build the payload inline -- all required fields must be present or backend will fail.
- Cancel button hides textarea

Uses `onStudentChange` to refresh after save.

`data-testid="teaching-notes-panel"`, `data-testid="teaching-notes-text"`, `data-testid="add-memory-btn"`, `data-testid="teaching-notes-textarea"`.

### Step 4 - Update tests

**`StudentOverviewTab.test.tsx`** - Add:
- Test: renders pedagogical profile card (empty state and with data)
- Test: shows CEFR bars for skillLevelOverrides
- Test: renders native language tags
- Test: shows recent sessions (mock sessions, shows date + title)
- Test: shows "No sessions logged yet" empty state
- Test: shows teaching notes panel, shows "No notes yet" empty state
- Test: shows teaching notes text when set

Mock `listSessions` is NOT needed here -- sessions are passed as a prop, not fetched in this component.

**`StudentDetail.test.tsx`** - Add:
- Test: shows "Active • Private" badge for active non-corporate student
- Test: shows "Active • Corporate" badge for active corporate student
- Test: hides or shows "Inactive" badge

---

## Layout sketch

```
[Primary Objective card - full width]

[Teaching Todos    ] [Pending Followups ] [Pedagogical Profile]
  (indigo tint)       (amber tint)          (surface-container-low)

[Recent Sessions - Session History (last 2-3)]
  [Session 1]  [Session 2]
  [View all sessions ->]

[Teacher's Working Memory - dark panel]
  [teachingNotes text]            [Student Since: Jan 2026]
  [Add Memory btn]
```

---

## Files changed

| File | Change |
|------|--------|
| `frontend/src/api/sessionLogs.ts` | Add `title: string | null` to SessionLog |
| `frontend/src/pages/StudentDetail.tsx` | Add sessions query, header badges, next session pill, pass sessions to tab |
| `frontend/src/components/student/StudentOverviewTab.tsx` | Restructure layout, add PedagogicalProfileCard, RecentSessions, TeachingNotesPanel |
| `frontend/src/components/student/StudentOverviewTab.test.tsx` | New tests for new sections |
| `frontend/src/pages/StudentDetail.test.tsx` | Tests for active/corporate badges + next session pill |
| `e2e/tests/students.spec.ts` | Add happy-path assertions for new Overview sections |

No new files needed.

---

## Acceptance criteria checklist

- [ ] Overview is the default tab
- [ ] Tab bar: Overview (active), Profile, Sessions, Progress
- [ ] Student header: Active + Private/Corporate badges
- [ ] Student header: Next session pill (shows if future session log exists)
- [ ] Primary Objective card: first objective + days remaining (or empty state)
- [ ] Three-card row: Teaching Todos, Pending Followups, Pedagogical Profile
- [ ] Teaching Todos checkable inline
- [ ] Pedagogical Profile: skill bars with CEFR badges, no trend labels, native language tags
- [ ] Recent sessions (2-3) with link to Sessions tab
- [ ] Teacher's Working Memory: teachingNotes text + Add Memory + Student Since
- [ ] Header identical across all 4 tabs
- [ ] Follows Stitch design visual language
