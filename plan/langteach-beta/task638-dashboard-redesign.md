# Task 638 — Dashboard Redesign (session-first, 4 zones)

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/638

## Context
Replace the current lesson-centric `Dashboard.tsx` with a session-first 4-zone layout using the Stitch
"Academic Atelier" design language. Dependencies #635 (sidebar) and #636 (dashboard endpoint) are both
merged into `sprint/ui-redesign-student-polish`.

Reference files:
- Design spec: `plan/langteach-beta/stitch-design-system/DESIGN.md`
- Isaac zone mapping: `plan/langteach-beta/dashboard-redesign-isaac-notes.md`
- Backend DTOs: `backend/LangTeach.Api/DTOs/DashboardDtos.cs`
- Endpoint: `GET /api/dashboard` → `DashboardDto { NextSession?, TodaySessions[], ActiveStudents[] }`

## Data Model Summary

```ts
// Backend DTOs (C#) already exist
DashboardDto {
  nextSession: NextSessionDto | null   // Zone 1
  todaySessions: TodaySessionDto[]     // Zone 2 left
  activeStudents: ActiveStudentDto[]   // Zone 2 right (count only) + Zone 3
}

NextSessionDto { sessionLogId, studentId, studentName, studentCefrLevel, sessionDate,
                 plannedContent?, lastSessionNotes?, lastSessionDate?, homeworkAssigned?,
                 previousHomeworkStatus? }

TodaySessionDto { sessionLogId, studentId, studentName, studentCefrLevel, sessionDate,
                  plannedContent?, status }

ActiveStudentDto { studentId, name, cefrLevel, nativeLanguages, isActive,
                   lastSessionDate?, nextSessionDate?, totalSessions, teachingTodosCount }
```

### Backend gap: pending todo text for Zone 2 right column

`ActiveStudentDto` has `teachingTodosCount` but not the actual todo text. The issue notes
"expand from student detail if needed." Resolution: **extend `ActiveStudentDto` to include
`List<TeachingTodoDto> PendingTodos` filtered to `Status == "pending"`**.

`TeachingTodoDto` already exists in `backend/LangTeach.Api/DTOs/TeachingTodoDto.cs`:
```csharp
public record TeachingTodoDto(string Id, string Text, DateTime CreatedAt,
    string? SourceSessionLogId, string Status, string? CoveredInSessionLogId);
```

`ActiveStudentDto` gains one new field: `List<TeachingTodoDto> PendingTodos`.
No new DTO type needed.

## Plan

### Step 1 — Backend: extend ActiveStudentDto with pending todos

Files:
- `backend/LangTeach.Api/DTOs/DashboardDtos.cs` — add `List<TeachingTodoDto> PendingTodos` field to `ActiveStudentDto`
- `backend/LangTeach.Api/Services/DashboardService.cs` — in `GetActiveStudentsAsync`, deserialize the JSON `TeachingTodos` column and filter to pending

`TeachingTodos` is stored as a JSON column on the `Student` entity (not a navigation property).
The correct pattern mirrors `StudentService` — deserialize in memory:

```csharp
var rawTodos = JsonStorageHelper.DeserializeList<TeachingTodoDto>(student.TeachingTodos);
var pendingTodos = rawTodos.Where(t => t.Status == "pending").ToList();
```

`GetActiveStudentsAsync` already selects `Student` rows with their `TeachingTodosCount`
(computed from the same JSON column). Extend the mapping to also pass `PendingTodos`.

Also update backend test `DashboardServiceTests.cs` to assert pending todos are returned
when the student has pending teaching todos seeded.

### Step 2 — Frontend: API client for dashboard

Create `frontend/src/api/dashboard.ts`:
```ts
export interface PendingTodo {
  id: string; text: string; createdAt: string;
  sourceSessionLogId: string | null; status: string; coveredInSessionLogId: string | null
}
export interface NextSession { ... }  // mirrors NextSessionDto
export interface TodaySession { ... } // mirrors TodaySessionDto
export interface ActiveStudent { ... } // mirrors ActiveStudentDto + pendingTodos: PendingTodo[]
export interface DashboardData { nextSession: NextSession | null; todaySessions: TodaySession[]; activeStudents: ActiveStudent[] }
export async function getDashboard(): Promise<DashboardData>
```

### Step 3 — Zone components

Create `frontend/src/components/dashboard/` sub-components (new files):

| File | Purpose |
|---|---|
| `NextSessionHero.tsx` | Zone 1: next session card, briefing, homework status |
| `TodayAgenda.tsx` | Zone 2 left: ordered list of today's sessions |
| `PendingFollowups.tsx` | Zone 2 right: pending teaching todos across students |
| `StudentRoster.tsx` | Zone 3: compact student table |
| `CefrBadge.tsx` | Shared: square CEFR badge (A=secondary-container, B=primary-fixed, C=tertiary-fixed) |

Each component receives typed props derived from `DashboardData`. No API calls inside components.

### Step 4 — Rewrite Dashboard.tsx

Replace `frontend/src/pages/Dashboard.tsx`:
- Single `useQuery` for `getDashboard()`
- Page background: `bg-[#FBF8FF]`
- Loading: skeleton placeholders matching the 4-zone layout
- 4-zone layout stacked vertically, Zone 2 is a 2-column grid

Keep `data-testid="dashboard-skeleton"` on the loading state for backward compat with existing e2e test assertions.

### Step 5 — Visual treatment

Apply Stitch design language throughout:
- Page canvas: `bg-[#FBF8FF]` (surface)
- Cards: `bg-white` (surface-container-lowest) on `bg-[#F4F2FD]` (surface-container-low) sections
- No `border` classes except `border-l-[3px] border-l-indigo-600` for active session highlight
- Section headers: `font-manrope text-[1.75rem] font-bold` (Headline-MD)
- Metadata labels: `font-inter text-[0.6875rem] font-bold uppercase tracking-[0.05em]` (Label-SM)
- CEFR badges: square format, `rounded-[0.375rem]`, A=blue, B=indigo, C=dark
- Hero card shadow: `shadow-[0_12px_40px_rgba(26,27,34,0.06)]`
- Primary buttons: `bg-gradient-to-br from-[#3525CD] to-indigo-500` (no plain `bg-indigo-600`)
- No pure black — use `text-[#1A1B22]`

### Step 6 — Empty states

- Zone 1: "No sessions scheduled" with a subtle empty-state card
- Zone 2 left: "No sessions today"
- Zone 2 right: "All caught up"
- Zone 3: always shows if there are active students (fallback to "No students yet" + link to `/students/new`)

### Step 7 — Update unit tests

Rewrite `frontend/src/pages/Dashboard.test.tsx`:
- Mock `getDashboard()` instead of lessons/students/courses
- Test: renders skeleton while loading
- Test: Zone 1 shows next session hero with student name and CEFR badge
- Test: Zone 1 shows empty state when no nextSession
- Test: Zone 2 left shows today's sessions
- Test: Zone 2 left shows empty state when no today sessions
- Test: Zone 2 right shows pending followup todo text
- Test: Zone 2 right shows "All caught up" when no pending todos
- Test: Zone 3 shows student rows with link to student detail
- Test: Zone 3 shows "VIEW ENTIRE STUDENT BASE" link to `/students`

Add unit test files for each sub-component (NextSessionHero.test.tsx, TodayAgenda.test.tsx,
PendingFollowups.test.tsx, StudentRoster.test.tsx).

### Step 8 — Update e2e tests

Update `e2e/tests/dashboard.spec.ts`:
- **Remove** the 4 existing lesson-based tests (week strip with scheduled lesson, needs prep,
  schedule from dashboard, assign draft) — they test UI that no longer exists.
- **Remove** the `createStudentViaApi`, `deleteStudentViaApi`, `createLessonViaApi`,
  `deleteLessonViaApi` helper functions at the top of the file — they are only used by the deleted tests.
- **Add** new test: `dashboard renders with seeded data` — navigates to `/`, asserts `h1` contains
  "Dashboard", asserts the next session hero or empty state is visible
  (`data-testid="zone1-next-session"` or `data-testid="zone1-empty"`),
  asserts student roster is present (`data-testid="zone3-student-roster"`).
- **Add** new test: `clicking student in roster navigates to student detail` — from the dashboard,
  clicks the first student row link and verifies navigation to `/students/:id`.
- **Keep** the sidebar nav test (`sidebar nav links navigate to correct routes`) — tests AppShell nav.

The seeded data from `DemoSeeder` provides students + session logs, so the dashboard will have
real data in the E2E testing environment.

### Step 9 — Cleanup

- No `DashboardV2Mockup.tsx` exists in the sprint branch (it was not committed), so no deletion needed.
- Remove now-unused dashboard sub-components from `frontend/src/components/dashboard/`:
  - `WeekStrip.tsx` + `WeekStrip.test.tsx` (delete)
  - `NeedsPreparation.tsx` (delete — no test file exists)
  - `QuickActions.tsx` + `QuickActions.test.tsx` (delete)
  - `UnscheduledDrafts.tsx` + `UnscheduledDrafts.test.tsx` (delete)
  - `SchedulePopover.tsx` + `SchedulePopover.test.tsx` (delete — only used by WeekStrip)
  - `CoursesOverview.tsx` + `CoursesOverview.test.tsx` (delete if not imported anywhere else)
- Verify no other files import the deleted components before deleting.

## Acceptance Criteria Mapping

| AC | Implementation |
|---|---|
| Dashboard shows 4-zone layout with real data from GET /api/dashboard | Steps 2+4 |
| Zone 1: next session hero with name, CEFR, briefing, homework | Step 3 NextSessionHero |
| Zone 2: today's agenda + pending followups | Steps 3+4 |
| Zone 3: student roster with signal badges, link to /students | Step 3 StudentRoster |
| All zones handle empty state | Step 6 |
| Stitch visual language | Step 5 |
| Loading skeleton | Step 4 |
| E2E: dashboard renders with seeded data, nav to student detail | Step 8 |
| Unit tests for each zone component | Step 7 |

## Key testids

| testid | Element |
|---|---|
| `dashboard-skeleton` | loading skeleton root |
| `zone1-next-session` | next session hero card |
| `zone1-empty` | empty state for zone 1 |
| `zone2-today-agenda` | today's agenda column |
| `zone2-pending-followups` | pending followups column |
| `zone3-student-roster` | student roster table |
| `zone3-student-row` | individual student row |

## Files to modify

**Backend:**
- `backend/LangTeach.Api/DTOs/DashboardDtos.cs` (extend `ActiveStudentDto` with `List<TeachingTodoDto> PendingTodos`)
- `backend/LangTeach.Api/Services/DashboardService.cs` (include pending todos in student query)
- `backend/LangTeach.Api.Tests/Services/DashboardServiceTests.cs` (assert pending todos)

**Frontend:**
- `frontend/src/api/dashboard.ts` (new — API client)
- `frontend/src/pages/Dashboard.tsx` (rewrite)
- `frontend/src/pages/Dashboard.test.tsx` (rewrite)
- `frontend/src/components/dashboard/NextSessionHero.tsx` (new)
- `frontend/src/components/dashboard/NextSessionHero.test.tsx` (new)
- `frontend/src/components/dashboard/TodayAgenda.tsx` (new)
- `frontend/src/components/dashboard/TodayAgenda.test.tsx` (new)
- `frontend/src/components/dashboard/PendingFollowups.tsx` (new)
- `frontend/src/components/dashboard/PendingFollowups.test.tsx` (new)
- `frontend/src/components/dashboard/StudentRoster.tsx` (new)
- `frontend/src/components/dashboard/StudentRoster.test.tsx` (new)
- `frontend/src/components/dashboard/CefrBadge.tsx` (new — shared)
- `frontend/src/components/dashboard/CefrBadge.test.tsx` (new)
- `frontend/src/components/dashboard/WeekStrip.tsx` (delete)
- `frontend/src/components/dashboard/WeekStrip.test.tsx` (delete)
- `frontend/src/components/dashboard/NeedsPreparation.tsx` (delete — no test file exists)
- `frontend/src/components/dashboard/QuickActions.tsx` (delete)
- `frontend/src/components/dashboard/QuickActions.test.tsx` (delete)
- `frontend/src/components/dashboard/UnscheduledDrafts.tsx` (delete)
- `frontend/src/components/dashboard/UnscheduledDrafts.test.tsx` (delete)
- `frontend/src/components/dashboard/SchedulePopover.tsx` (delete)
- `frontend/src/components/dashboard/SchedulePopover.test.tsx` (delete)
- `frontend/src/components/dashboard/CoursesOverview.tsx` (delete if unused)
- `frontend/src/components/dashboard/CoursesOverview.test.tsx` (delete if unused)
- `e2e/tests/dashboard.spec.ts` (update)

## Out of scope
- Sidebar: already done in #635
- Backend endpoint base: already done in #636
- Time-of-day picker on session form
- Sessions list screen
