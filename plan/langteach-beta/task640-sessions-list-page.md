# Task 640 — Cross-Student Sessions List Page (`/sessions`)

## Goal

Build a `/sessions` page that shows all sessions across all students, grouped by Upcoming / Today / Recent (past 7 days), with student filter and nav integration.

## Acceptance Criteria (from issue)

- [ ] `/sessions` page renders with sessions across all students
- [ ] Sections: upcoming, today, recent
- [ ] Filter by student works
- [ ] Row click navigates to session context
- [ ] "Sessions" nav item visible in sidebar
- [ ] Stitch visual language applied
- [ ] Empty state when no sessions
- [ ] E2E: page renders, filtering works

## Backend

### New endpoint: `GET /api/dashboard/sessions`

Added as a new action on `DashboardController` (reuses the same auth pattern).

**Query params:**
- `studentId` (optional Guid): filter to one student

**Response DTO (`SessionsListDto`):**
```csharp
public record SessionListItemDto(
    Guid SessionLogId,
    Guid StudentId,
    string StudentName,
    string StudentCefrLevel,
    DateTime SessionDate,
    string? PlannedContent,
    string Status  // "Confirmed", "Draft", "Cancelled"
);

public record SessionFilterStudentDto(Guid StudentId, string Name, string CefrLevel);

public record SessionsListDto(
    List<SessionListItemDto> Upcoming,    // SessionDate > now, not cancelled
    List<SessionListItemDto> Today,       // SessionDate.Date == today
    List<SessionListItemDto> Recent,      // past 7 days, not cancelled
    List<SessionFilterStudentDto> Students  // all active students (for filter dropdown)
);
```

**Service method** added to `IDashboardService` and `DashboardService`:
```
Task<SessionsListDto> GetSessionsListAsync(Guid teacherId, Guid? studentId, CancellationToken ct)
```

Logic:
- All queries must null-check `SessionDate` (`sl.SessionDate.HasValue`) before comparing.
- `Today`: `sl.SessionDate.HasValue && sl.SessionDate.Value.Date == today`, `!IsDeleted` (all statuses, including cancelled — so teacher sees cancelled today sessions too)
- `Upcoming`: `sl.SessionDate.HasValue && sl.SessionDate.Value > now`, `!IsCancelled`, `!IsDeleted`, ordered by SessionDate ASC
- `Recent`: `sl.SessionDate.HasValue && sl.SessionDate.Value >= today.AddDays(-7) && sl.SessionDate.Value.Date < today`, `!IsCancelled`, `!IsDeleted`, ordered by SessionDate DESC
- Note: `today.AddDays(-7)` boundary edge case — a session exactly 7 days ago at midnight will be included; this is intentional.
- `Students`: all active (non-deleted) students for the teacher — joins not needed, query Students table directly
- If `studentId` filter passed: apply `sl.StudentId == studentId` to Upcoming, Today, Recent queries

**Status mapping in DTO** — `SessionLogStatus` enum only has `Confirmed` and `Draft`. Cancelled sessions are represented by the boolean `IsCancelled` flag (not an enum value). Derive the display status as:
```csharp
Status: sl.IsCancelled ? "Cancelled" : sl.Status.ToString()
```

**StudentCefrLevel join** — `SessionLog` has no direct CEFR field. Queries must `.Include(sl => sl.Student)` and map `sl.Student.CefrLevel`.

### Files changed (backend)
- `DTOs/DashboardDtos.cs` — add `SessionListItemDto`, `SessionFilterStudentDto`, `SessionsListDto`
- `Services/IDashboardService.cs` — add `GetSessionsListAsync`
- `Services/DashboardService.cs` — implement
- `Controllers/DashboardController.cs` — add `GET /api/dashboard/sessions`
- `Tests/Services/DashboardServiceTests.cs` — add tests for the new method

### Backend test cases (new file: `Tests/Services/SessionsListServiceTests.cs`)
- No sessions returns empty sections + student list
- Upcoming includes only future non-cancelled sessions
- Today includes all today's sessions regardless of status
- Recent includes past-7-days non-cancelled sessions
- StudentId filter narrows all three sections
- Sessions outside the 7-day window excluded from Recent

## Frontend

### API layer
**`frontend/src/api/sessions.ts`** (new file):
```ts
export interface SessionListItem {
  sessionLogId: string
  studentId: string
  studentName: string
  studentCefrLevel: string
  sessionDate: string
  plannedContent: string | null
  status: string
}

export interface SessionFilterStudent {
  studentId: string
  name: string
  cefrLevel: string
}

export interface SessionsListData {
  upcoming: SessionListItem[]
  today: SessionListItem[]
  recent: SessionListItem[]
  students: SessionFilterStudent[]
}

export async function getSessionsList(studentId?: string): Promise<SessionsListData>
```

Calls `GET /api/dashboard/sessions?studentId=<id>` (omit param if undefined).

### Page: `frontend/src/pages/Sessions.tsx`

Using `useQuery` from react-query (key: `['sessions', studentId]`).

**Layout:**
- Page header: "Sessions" (Headline-MD, Manrope)
- Student filter: select/combobox "All students" + student options
- Three sections: Upcoming, Today, Recent
- Each section: date-group header in Label-SM (uppercase, tracked), rows below
- Row: time (HH:MM) | student name | CefrBadge | planned content snippet | status chip | arrow icon
- Row click: navigate to `/students/:studentId` (session context — opens sessions tab)
- Empty state per section: muted text "No sessions"
- Global empty state (all three empty): centered message with CalendarDays icon

**Visual (Stitch):**
- Background `#FBF8FF`, section area on `#FFFFFF` card
- No 1px dividers between rows — 16px gap
- Date group headers: Label-SM (Inter 0.6875rem, uppercase, tracking-[0.05em], zinc-400)
- Row hover: `bg-[#F4F2FD]` with `rounded-lg`
- CefrBadge: existing component from `@/components/dashboard/CefrBadge`
- Status chip: small, muted — "Confirmed" (zinc), "Draft" (amber), "Cancelled" (red/strikethrough row)

**Student filter implementation:**
- Controlled state `selectedStudentId: string | undefined`
- On change: update query key (refetches with filter param)
- Uses shadcn Select component

### AppShell: add Sessions nav item
In `frontend/src/components/AppShell.tsx`, current nav order is: Dashboard, Students, Courses, Lessons, Settings. Insert Sessions between Students (index 1) and Courses (index 2):
```ts
{ to: '/sessions', label: 'Sessions', icon: CalendarDays }
```
Import `CalendarDays` from `lucide-react`.

### Route
In `frontend/src/App.tsx`, add:
```tsx
import Sessions from './pages/Sessions'
// ...
<Route path="/sessions" element={<Sessions />} />
```

### Unit tests
**`frontend/src/pages/Sessions.test.tsx`** (new):
- Renders all three sections with mock data
- Shows empty state when all sections empty
- Student filter triggers new query
- Row click navigates to student detail

**`frontend/src/components/AppShell.test.tsx`** (existing): verify Sessions item appears in nav.

### E2E tests
**`e2e/tests/sessions.spec.ts`** (new):
- Navigate to `/sessions` — page renders with sections
- Filter by student — list narrows correctly
- Row click — navigates to student detail

E2E uses demo seeder data. Check `backend/LangTeach.Api/Data/DemoSeeder.cs` for actual student names and session dates. "Diego Seed" has sessions at -14 and -7 days (Recent). "Ana Visual" has a session at -7 days. Use these exact names (not "Ana Soria"/"Marco Bianchi" which don't exist in the seeder).

## Implementation Order

1. Backend DTOs + service method + controller action + unit tests
2. Frontend API layer (`sessions.ts`)
3. `Sessions.tsx` page + unit tests
4. AppShell nav item + update AppShell test
5. App.tsx route
6. E2E tests

## Notes

- Row click navigates to `/students/:studentId` (student detail page, Sessions tab). There is no dedicated session-detail route. This is consistent with the issue AC ("navigates to session context").
- The sessions endpoint lives under `/api/dashboard/sessions` to reuse the DashboardController auth/profile pattern rather than adding a standalone SessionsController.
- Date group headers in Upcoming section: group by date (Mon Apr 14, Tue Apr 15, etc.). Today section: single group. Recent: group by date descending.
