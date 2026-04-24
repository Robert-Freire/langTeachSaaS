# Task #925 — Dashboard Pending Followups: Kind filter + clickable rows

## Context

`TeacherFollowup` table uses a `Kind` discriminator (`pedagogical` / `operational`) added in task #844.
The dashboard's Pending Followups tile calls `TeacherFollowupService.GetPendingAsync`, which currently omits the Kind filter, so teaching todos (pedagogical) bleed into the operational followup panel.

## Changes

### 1. Backend — `TeacherFollowupService.cs`

Three methods need the `Kind == operational` guard on teacher-facing surfaces:

- `GetPendingAsync`: add `&& f.Kind == TeacherFollowupKinds.Operational`
- `GetAllAsync`: add `&& f.Kind == TeacherFollowupKinds.Operational` (feeds the teacher-wide followup inbox via `GET /api/teacher-followups`)
- `GetByStudentAsync`: add `&& f.Kind == TeacherFollowupKinds.Operational` (feeds the StudentFollowupsCard on the student profile)

Per-student teaching-todo endpoints in `StudentsController` are unaffected (they use a separate service path).

### 2. Frontend — `PendingFollowups.tsx`

Enhancement: wrap the followup text in a clickable `Link` to `/students/{studentId}`:

- Wrap the text `<p>` in a `<Link to={`/students/${f.studentId}`} data-testid={`followup-text-link-${f.id}`}>` when `studentId` is non-null. This is a sibling element to the existing student-name chip `<Link>` (which is conditionally shown above it). Do NOT nest links.
- Keep the dot `<button>` as a separate action outside the Link; call `e.stopPropagation()` on it to prevent navigation.
- Rows with `studentId == null`: render the text as a plain `<p>` (no Link, no `cursor-pointer`).
- Keep the student-name chip unchanged.
- Link wraps only the text `<p>`; the chip and age badge remain outside the Link.

### 3. Backend tests — `TeacherFollowupServiceTests.cs`

New facts:
- `GetPendingAsync_ExcludesPedagogicalKind`: seed one operational+pending and one pedagogical+pending; assert only the operational is returned.
- `GetPendingAsync_IncludesOperationalPendingOnly`: operational+done, pedagogical+pending — assert only the operational+pending is returned.
- `GetAllAsync_ExcludesPedagogicalKind`: seed one operational and one pedagogical; assert `GetAllAsync` returns only the operational.

### 4. Backend tests — `DashboardServiceTests.cs`

- `GetAsync_PendingFollowups_ExcludesTeachingTodos`: seed a pedagogical+pending row; assert `DashboardDto.PendingFollowups` is empty.
- `GetAsync_PendingFollowups_IncludesOperational`: seed operational+pending and pedagogical+pending; assert only the operational row is in the response.

### 5. Backend tests — `DashboardServiceTests.cs` (additional)

Move the cross-service test here (DashboardServiceTests already has both TeacherFollowupService and DashboardService wired together):

- `GetAsync_PendingFollowups_NullKind_ExcludedFromDashboard`: seed a `TeacherFollowup` directly with `Kind = TeacherFollowupKinds.Pedagogical` and `Status = "pending"` (simulating what AppendTeachingTodoAsync writes); call `DashboardService.GetAsync`; assert `PendingFollowups` is empty.

### 6. Frontend tests — `PendingFollowups.test.tsx`

- `row click navigates to student overview`: render followup with `studentId`; query by `data-testid="followup-text-link-f1"`; assert it has `href="/students/student-1"`.
- `dot click does not navigate`: click the dot button (`followup-dot-f1`); assert mark-done handler fires. The dot button is outside the Link element so navigation cannot bubble.
- `row without studentId is not clickable`: render followup with `studentId: null`; assert `queryByTestId("followup-text-link-f1")` is null (no anchor rendered).

### 7. E2E — new spec in `e2e/tests/followups.spec.ts`

**Test: teaching todo does not appear on dashboard**
- Login → create student → open student profile → add teaching todo via TeachingTodosCard → assert todo text IS visible in `[data-testid="teaching-todos-card"]` (still on student profile page) → navigate to dashboard → assert todo text is NOT inside `[data-testid="zone2-pending-followups"]`.

**Test: clickable followup row navigates to student**
- Login → create student → open student profile → add operational followup via student-followups-card → navigate to dashboard → click the followup text link (`data-testid="followup-text-link-{id}"`) → assert URL matches `/students/{studentId}`.

## Files touched

| File | Change |
|------|--------|
| `backend/LangTeach.Api/Services/TeacherFollowupService.cs` | Add Kind filter to 3 methods |
| `backend/LangTeach.Api.Tests/Services/TeacherFollowupServiceTests.cs` | 3 new tests |
| `backend/LangTeach.Api.Tests/Services/DashboardServiceTests.cs` | 2 new tests |
| `backend/LangTeach.Api.Tests/Services/DashboardServiceTests.cs` | 3 new tests (2 from section 4 + 1 from section 5) |
| `frontend/src/components/dashboard/PendingFollowups.tsx` | Clickable row enhancement |
| `frontend/src/components/dashboard/PendingFollowups.test.tsx` | 3 new tests |
| `e2e/tests/followups.spec.ts` | 2 new test cases |
