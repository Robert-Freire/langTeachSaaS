# Task 671: TeacherFollowup Entity and All UI Surfaces

**Issue:** #671
**Sprint:** sprint/ui-redesign-student-polish
**Labels:** area:backend, area:frontend, area:design, P1:must

## Goal

Create a dedicated `TeacherFollowup` entity (new table, CRUD endpoints, service) and wire it into 5 UI surfaces: Dashboard panel, Student Profile tab right column, StudentForm below Notes, Log Session context panel, Log Session new-followup quick-add.

## Descoped (with reasons)

- **Overview tab surface** -> deferred to #682 (Overview tab doesn't exist yet; #682 will add it with the Pending Followups card).
- **Edit form right sidebar surface** -> deferred to #681 (StudentForm has no sidebar layout; #681 will restructure the form with a right sidebar and add both Teaching Todos and Pending Followups there). For now, followups appear below the Notes section in the single-column form.

## Current State

- `PendingFollowups.tsx` dashboard component exists but shows `TeachingTodo` items from `ActiveStudent.pendingTodos`. This is a placeholder that needs to be replaced with real `TeacherFollowup` data.
- `TeachingTodosCard.tsx` exists for the student-level todo list (indigo convention). Followups use amber convention.
- No `TeacherFollowup` model, migration, service, controller, or API client exists yet.
- Dashboard endpoint (`GET /api/dashboard`) returns `ActiveStudent.PendingTodos` (TeachingTodos) but no followups.
- `StudentProfileTab.tsx` has a right column with sections: Learning Goals, Objectives, Difficulties, Teaching Todos, Commercial. Followups card goes below Teaching Todos in this column.
- `StudentForm.tsx` is single-column. Followups go below the Notes section.

## Data Model

```csharp
public class TeacherFollowup
{
    public Guid Id { get; set; }
    public Guid TeacherId { get; set; }
    public Guid? StudentId { get; set; }
    public string Text { get; set; } = "";       // max 500
    public string Status { get; set; } = "pending"; // pending | done
    public DateTime CreatedAt { get; set; }
    public DateOnly? DueDate { get; set; }
    public DateTime? CompletedAt { get; set; }
    public Guid? SourceSessionLogId { get; set; }

    // Navigations
    public Teacher Teacher { get; set; } = null!;
    public Student? Student { get; set; }
    public SessionLog? SourceSessionLog { get; set; }
}
```

FK constraints: TeacherId -> Teacher (cascade delete), StudentId -> Student (NoAction, nullable), SourceSessionLogId -> SessionLog (NoAction, nullable).

## Backend Plan

### Step 1: Model + Migration

1. Create `backend/LangTeach.Api/Data/Models/TeacherFollowup.cs`
2. Add `DbSet<TeacherFollowup> TeacherFollowups` to `AppDbContext` with Fluent API config (HasMaxLength(500) on Text, NoAction delete for Student/SessionLog FKs)
3. `dotnet ef migrations add AddTeacherFollowups --project backend/LangTeach.Api --startup-project backend/LangTeach.Api`

### Step 2: DTOs

File: `backend/LangTeach.Api/DTOs/TeacherFollowupDto.cs`

```csharp
public record TeacherFollowupDto(
    string Id,
    string? StudentId,
    string? StudentName,      // denormalized for dashboard display
    string Text,
    string Status,
    DateTime CreatedAt,
    DateOnly? DueDate,
    DateTime? CompletedAt,
    string? SourceSessionLogId);

public record CreateTeacherFollowupRequest(
    [MaxLength(500)] string Text,
    string? StudentId,
    DateOnly? DueDate,
    string? SourceSessionLogId);

public record UpdateTeacherFollowupRequest(
    [Required] string Status);  // pending | done
```

### Step 3: Service

Interface: `ITeacherFollowupService`
- `GetAllAsync(Guid teacherId, CancellationToken)` -> `List<TeacherFollowupDto>`
- `GetByStudentAsync(Guid teacherId, Guid studentId, CancellationToken)` -> `List<TeacherFollowupDto>`
- `CreateAsync(Guid teacherId, CreateTeacherFollowupRequest, CancellationToken)` -> `TeacherFollowupDto`
- `UpdateStatusAsync(Guid teacherId, Guid followupId, UpdateTeacherFollowupRequest, CancellationToken)` -> `TeacherFollowupDto`
- `DeleteAsync(Guid teacherId, Guid followupId, CancellationToken)` -> `bool`

Implementation: `TeacherFollowupService`
- All queries filter by `teacherId` for multi-tenant isolation.
- `GetAllAsync` returns all followups ordered by `CreatedAt` ascending (oldest first = most urgent).
- `GetByStudentAsync` filters by `studentId` additionally.
- `CreateAsync` sets `CreatedAt = DateTime.UtcNow`, `Status = "pending"`.
- `UpdateStatusAsync` sets `CompletedAt = UtcNow` when transitioning to "done", clears it on "pending".

Register in `Program.cs`.

### Step 4: Controller

`backend/LangTeach.Api/Controllers/TeacherFollowupsController.cs`

```
GET    /api/teacher-followups              -> GetAll (all teacher's followups)
GET    /api/teacher-followups?studentId=X  -> filtered by student (optional query param)
POST   /api/teacher-followups              -> Create
PATCH  /api/teacher-followups/{id}         -> UpdateStatus
DELETE /api/teacher-followups/{id}         -> Delete
```

All endpoints require `[Authorize]` and resolve `teacherId` from `IProfileService.UpsertTeacherAsync`.

### Step 5: Dashboard DTO update

Add `List<TeacherFollowupDto> PendingFollowups` to `DashboardDto`.

In `DashboardService.GetAsync`: call `_teacherFollowupService.GetAllAsync(teacherId, ct)`, filter to `Status == "pending"`, pass as `PendingFollowups`. Order: oldest first.

Also update `DashboardServiceTests.cs` to include `PendingFollowups = []` in the `DashboardDto` assertions.

### Step 6: Backend tests

File: `backend/LangTeach.Api.Tests/Services/TeacherFollowupServiceTests.cs`

Tests:
- Create followup and retrieve it via GetAll
- GetByStudent returns only that student's followups (not unrelated student's)
- UpdateStatus to done sets CompletedAt, status = "done"
- UpdateStatus back to pending clears CompletedAt
- Delete removes the followup
- Teacher isolation: teacher A cannot see teacher B's followups

## Frontend Plan

### Step 7: API client

File: `frontend/src/api/followups.ts`

```typescript
export interface TeacherFollowup {
  id: string
  studentId: string | null
  studentName: string | null
  text: string
  status: 'pending' | 'done'
  createdAt: string
  dueDate: string | null
  completedAt: string | null
  sourceSessionLogId: string | null
}

export interface CreateFollowupRequest {
  text: string
  studentId?: string | null
  dueDate?: string | null
  sourceSessionLogId?: string | null
}

export async function getFollowups(studentId?: string): Promise<TeacherFollowup[]>
export async function createFollowup(data: CreateFollowupRequest): Promise<TeacherFollowup>
export async function updateFollowupStatus(id: string, status: 'pending' | 'done'): Promise<TeacherFollowup>
export async function deleteFollowup(id: string): Promise<void>
```

Also add `pendingFollowups: TeacherFollowup[]` to `DashboardData` interface in `dashboard.ts`.

### Step 8: Dashboard followups panel

Update `PendingFollowups.tsx`:
- Change prop from `students: ActiveStudent[]` to `followups: TeacherFollowup[]`
- Each row: amber dot, student name (small uppercase), followup text, age badge
- Age badge: emerald if <= 3d, amber if 4-7d, red if > 7d
- One-click toggle: clicking the dot calls `updateFollowupStatus(id, 'done')`, removes row optimistically
- Empty state: "All caught up"

Update `Dashboard.tsx` to pass `dashboardData.pendingFollowups` to `<PendingFollowups>`.

Update `PendingFollowups.test.tsx` to use new props shape (mock `TeacherFollowup[]`).
Update `Dashboard.test.tsx` to include `pendingFollowups: []` in mock data.

### Step 9: StudentFollowupsCard component

New file: `frontend/src/components/student/StudentFollowupsCard.tsx`

Amber convention (distinct from indigo `TeachingTodosCard`):
- Section header: "Pending Followups"
- Pending items: amber-500 dot, text, relative time, "Done" button
- Done items: emerald-500 dot, strikethrough text (show last 3 done items grayed, collapsible)
- Overdue indicator: red "Overdue (N days)" if `createdAt` > 7 days ago and status still pending
- Inline add: text input at bottom, press Enter or click "Add" -> calls `createFollowup({ text, studentId })`
- Props: `followups: TeacherFollowup[]`, `studentId: string`, `onFollowupChange: () => void`
- On status toggle: calls `updateFollowupStatus`, then `onFollowupChange()` to refetch

Test file: `frontend/src/components/student/StudentFollowupsCard.test.tsx`

### Step 10: Wire into Student Profile tab

In `StudentProfileTab.tsx` right column, add `<section data-testid="profile-followups">` below `profile-teaching-todos`:
- `StudentProfileTab` receives `followups: TeacherFollowup[]` and `onFollowupChange: () => void` as new props
- Render `<StudentFollowupsCard followups={followups} studentId={student.id} onFollowupChange={onFollowupChange} />`

In `StudentDetail.tsx`:
- Add `const [followups, setFollowups] = useState<TeacherFollowup[]>([])` (or useQuery pattern)
- Fetch on mount: `getFollowups(student.id)`
- Pass `followups` and `onFollowupChange={() => getFollowups(student.id).then(setFollowups)}` to `StudentProfileTab`

Update `StudentProfileTab.test.tsx` with new props.
Update `StudentDetail.test.tsx` to mock `GET /api/teacher-followups?studentId=X`.

### Step 11: Wire into StudentForm (below Notes section)

In `StudentForm.tsx`, after the Notes section (personalNotes/teachingNotes fields):
- Add a `StudentFollowupsCard` section visible when editing an existing student (not on create)
- Fetch followups for `studentId` when `mode === 'edit'`
- `onFollowupChange` refetches the followup list

Update `StudentForm.test.tsx` to mock the followups endpoint.

### Step 12: Log Session context panel + quick-add

In `SessionLogDialog.tsx`:

**Left context panel** - add "Pending Followups" section:
- Fetch `getFollowups(studentId)` on dialog open
- Show pending followups for this student, amber dots, checkable
- On check: `updateFollowupStatus(id, 'done')`, remove from list optimistically

**Right form** - add "New Followups" quick-add section with `bg-amber-50` tint:
- Text input + "Add" button
- On submit: `createFollowup({ text, studentId, sourceSessionLogId: draftSessionId ?? undefined })`
- `sourceSessionLogId` is passed only if `draftSessionId` is non-null (draft already saved); otherwise omitted
- New items appear in the context panel's list immediately (shared local state)

### Step 13: E2E test

File: `e2e/tests/followups.spec.ts`

Happy path:
1. Log in as test teacher, navigate to student detail (Ewan McLeod)
2. On Profile tab, add a new followup via `StudentFollowupsCard`
3. Navigate to Dashboard, verify the followup appears in the Pending Followups panel with Ewan's name
4. Mark it as done from the Dashboard panel
5. Verify it disappears from the dashboard pending list

## Amber Visual Convention

Consistent across all surfaces:
- Pending dot: `bg-amber-500` circle (6x6)
- Done dot: `bg-emerald-500` circle (6x6)
- Card quick-add tint: `bg-amber-50`
- Age badge colors: emerald (fresh), amber (aging), red (overdue)
- Overdue label: `text-red-600 font-semibold text-xs`
- Distinct from TeachingTodos (indigo-600 convention)

## Implementation Order

1. Backend model + migration (Steps 1-2)
2. Backend service + controller (Steps 3-4)
3. Dashboard DTO update (Step 5)
4. Backend tests (Step 6)
5. Frontend API client (Step 7)
6. Dashboard panel update (Step 8)
7. StudentFollowupsCard component (Step 9)
8. Profile tab + StudentDetail fetch (Step 10)
9. StudentForm below Notes (Step 11)
10. SessionLogDialog (Step 12)
11. E2E test (Step 13)

## E2E Test Student

Use "Ewan McLeod" (A1.2) from the demo seeder cohort for E2E scenarios.

## Files to Create

- `backend/LangTeach.Api/Data/Models/TeacherFollowup.cs`
- `backend/LangTeach.Api/DTOs/TeacherFollowupDto.cs`
- `backend/LangTeach.Api/Services/ITeacherFollowupService.cs`
- `backend/LangTeach.Api/Services/TeacherFollowupService.cs`
- `backend/LangTeach.Api/Controllers/TeacherFollowupsController.cs`
- `backend/LangTeach.Api.Tests/Services/TeacherFollowupServiceTests.cs`
- `frontend/src/api/followups.ts`
- `frontend/src/components/student/StudentFollowupsCard.tsx`
- `frontend/src/components/student/StudentFollowupsCard.test.tsx`
- `e2e/tests/followups.spec.ts`

## Files to Modify

- `backend/LangTeach.Api/Data/AppDbContext.cs` (DbSet + Fluent config)
- `backend/LangTeach.Api/DTOs/DashboardDtos.cs` (add PendingFollowups to DashboardDto)
- `backend/LangTeach.Api/Services/DashboardService.cs` (populate PendingFollowups)
- `backend/LangTeach.Api/Program.cs` (register ITeacherFollowupService)
- `backend/LangTeach.Api.Tests/Services/DashboardServiceTests.cs` (add PendingFollowups = [] to assertions)
- `frontend/src/api/dashboard.ts` (add pendingFollowups to DashboardData)
- `frontend/src/components/dashboard/PendingFollowups.tsx` (new props, real data, toggle)
- `frontend/src/components/dashboard/PendingFollowups.test.tsx` (update to TeacherFollowup[])
- `frontend/src/pages/Dashboard.tsx` (pass pendingFollowups)
- `frontend/src/pages/Dashboard.test.tsx` (add pendingFollowups to mock)
- `frontend/src/components/student/StudentProfileTab.tsx` (add followups section, new props)
- `frontend/src/components/student/StudentProfileTab.test.tsx` (update props)
- `frontend/src/pages/StudentDetail.tsx` (fetch followups, pass to ProfileTab)
- `frontend/src/pages/StudentDetail.test.tsx` (mock followups endpoint)
- `frontend/src/pages/StudentForm.tsx` (add followups below Notes for edit mode)
- `frontend/src/pages/StudentForm.test.tsx` (mock followups endpoint)
- `frontend/src/components/session/SessionLogDialog.tsx` (context panel + quick-add)
- `frontend/src/components/session/SessionLogDialog.test.tsx` (mock followups)
