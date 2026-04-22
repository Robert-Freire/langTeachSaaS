# Task 769: Roster Signals — Deadline near, Returning after gap, Homework not done

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/769

## Scope

Three new roster signals (EXAM Xw, Returning, HMWK NOT DONE/PARTIAL) plus backend fields to support them.

---

## Files to Change

| File | Change |
|------|--------|
| `backend/LangTeach.Api/DTOs/DashboardDtos.cs` | Add 2 new fields to `ActiveStudentDto` |
| `backend/LangTeach.Api/Services/DashboardService.cs` | Populate new fields in `GetActiveStudentsAsync` |
| `backend/LangTeach.Api.Tests/Services/DashboardServiceTests.cs` | Add unit tests for new fields |
| `backend/LangTeach.Api/Data/DemoSeeder.cs` | Update `SeedScenarioStudentsAsync` with new signal students |
| `frontend/src/api/dashboard.ts` | Extend `ActiveStudent` interface |
| `frontend/src/components/dashboard/StudentRoster.tsx` | Update `buildRosterSignal` |
| `frontend/src/components/dashboard/StudentRoster.test.tsx` | Add tests for 3 new signals |
| `plan/langteach-beta/scenarios-by-screen.vera/dashboard-behavior.md` | Update Zone 3 signal priority table (create file if missing) |

---

## Backend

### 1. `ActiveStudentDto` (`DashboardDtos.cs`)

Add two fields to the record:

```csharp
public record ActiveStudentDto(
    Guid StudentId,
    string Name,
    string CefrLevel,
    List<string> NativeLanguages,
    bool IsActive,
    DateTime? LastSessionDate,
    DateTime? NextSessionDate,
    int TotalSessions,
    int TeachingTodosCount,
    List<TeachingTodoDto> PendingTodos,
    int CancelledSessionsLast30Days,
    DateTime? NearestObjectiveDeadline,   // NEW
    string? LastHomeworkStatus            // NEW: "Done" | "Partial" | "NotDone" | null
);
```

### 2. `DashboardService.GetActiveStudentsAsync`

Both new fields are added to the same `.Select()` anonymous type that already projects `LastSessionDate`, `NextSessionDate`, etc. They are NOT computed in a separate pass.

**Add to the EF `.Select()` anonymous type** (same block as `CancelledSessionsLast30Days`):
```csharp
ShortTermObjectivesJson = s.ShortTermObjectives,
LastHomeworkStatusRaw = s.SessionLogs
    .Where(sl => !sl.IsDeleted
              && sl.SessionDate.HasValue
              && sl.SessionDate.Value < now
              && sl.PreviousHomeworkStatus != HomeworkStatus.NotApplicable)
    .OrderByDescending(sl => sl.SessionDate)
    .Select(sl => (int?)sl.PreviousHomeworkStatus)
    .FirstOrDefault()
```

The `SessionLogs` subquery is a correlated subquery inside the existing `.Select()`. EF Core supports this on SQL Server and on the in-memory test DB (it translates to LINQ evaluation).

**In-memory mapping** (inside the `rows.Select(r => ...)` lambda):
```csharp
// NearestObjectiveDeadline
// DefaultIfEmpty() on empty sequence returns DateTime.MinValue — treat as null
var objectives = JsonStorageHelper.DeserializeList<ShortTermObjectiveDto>(r.ShortTermObjectivesJson);
var nearestDeadline = objectives
    .Where(o => o.TargetDate.HasValue && o.TargetDate.Value > DateOnly.FromDateTime(now))
    .Select(o => o.TargetDate!.Value.ToDateTime(TimeOnly.MinValue))
    .DefaultIfEmpty()
    .Min();
DateTime? nearestObjectiveDeadline = nearestDeadline == DateTime.MinValue ? null : nearestDeadline;

// LastHomeworkStatus
string? lastHomeworkStatus = r.LastHomeworkStatusRaw switch
{
    (int)HomeworkStatus.NotDone  => "NotDone",
    (int)HomeworkStatus.Partial  => "Partial",
    (int)HomeworkStatus.Done     => "Done",
    _ => null
};
```

### 3. `DashboardServiceTests` — New Tests

Add a `MakeSession` overload accepting `HomeworkStatus previousHomeworkStatus` and `string? homeworkAssigned = null`. The `SessionLog` model fields are `PreviousHomeworkStatus` (HomeworkStatus enum) and `HomeworkAssigned` (string?). Signature:

```csharp
private SessionLog MakeSession(Guid studentId, DateTime? sessionDate, bool isCancelled = false,
    bool isDeleted = false, string? generalNotes = null, string? plannedContent = null,
    HomeworkStatus previousHomeworkStatus = HomeworkStatus.NotApplicable,
    string? homeworkAssigned = null)
```

Tests to add:

**NearestObjectiveDeadline:**
- `GetAsync_StudentWithNoObjectives_NearestDeadlineIsNull`
- `GetAsync_StudentWithOnlyPastObjectives_NearestDeadlineIsNull` (targetDate yesterday)
- `GetAsync_StudentWithFutureObjective_NearestDeadlineSet` (targetDate +30 days)
- `GetAsync_StudentWithMultipleObjectives_ReturnsEarliest` (two future dates, one nearer)

**LastHomeworkStatus:**
- `GetAsync_NoSessions_LastHomeworkStatusIsNull`
- `GetAsync_AllSessionsNotApplicable_LastHomeworkStatusIsNull`
- `GetAsync_MostRecentSessionHomeworkDone_ReturnsHomeworkDone`
- `GetAsync_MostRecentSessionHomeworkPartial_ReturnsPartial`
- `GetAsync_MostRecentSessionHomeworkNotDone_ReturnsNotDone`

### 4. `DemoSeeder.SeedScenarioStudentsAsync`

Add three students to cover the new signal types. Use relative dates (`now.AddDays(...)`) for sessions so they remain valid after reseeding.

**Eva Seed — EXAM signal** (deadline near):
- `IsActive = true` (required to appear in active roster query)
- `ShortTermObjectives`: built dynamically: `$"""[{{"id":"o1","text":"Pass A2 DELE exam","targetDate":"{now.AddDays(28):yyyy-MM-dd}"}}]"""`
- No recent cancellations, no pending todos
- No sessions needed (the signal comes from ShortTermObjectives alone)
- Signal: EXAM 4W (indigo)

For the date: the seeder has `var now = DateTime.UtcNow`. Use `now.AddDays(28).ToString("yyyy-MM-dd")` to build the JSON string dynamically.

**Petra Seed — Returning signal** (gap > 21 days, next session booked):
- No ShortTermObjectives
- Add one past session at `now.AddDays(-25)` with no HomeworkAssigned
- Add one future session at `now.AddDays(5)` (non-cancelled)
- This satisfies: lastSessionGapDays > 21 AND nextSessionDate set

**Hugo Seed — HMWK NOT DONE signal**:
- No ShortTermObjectives, no >21 day gap
- Sessions:
  - S1 at `now.AddDays(-14)`: HomeworkAssigned = "Write 5 sentences using the imperfect tense", PreviousHomeworkStatus = NotApplicable
  - S2 at `now.AddDays(-5)`: HomeworkAssigned = null, PreviousHomeworkStatus = NotDone (didn't do S1's homework)
- Signal: HMWK NOT DONE (red)

Use the same idempotency pattern as Diego (`AnyAsync` guard before adding sessions).

---

## Frontend

### 5. `ActiveStudent` interface (`frontend/src/api/dashboard.ts`)

```typescript
export interface ActiveStudent {
  // ... existing fields ...
  cancelledSessionsLast30Days: number
  nearestObjectiveDeadline: string | null  // NEW
  lastHomeworkStatus: string | null        // NEW: "Done" | "Partial" | "NotDone" | null
}
```

### 6. `buildRosterSignal` (`StudentRoster.tsx`)

New priority order:

```typescript
function buildRosterSignal(student: ActiveStudent): RosterSignal | null {
  // 1. Cancelled 2x (existing, dark)
  if (student.cancelledSessionsLast30Days >= 2) {
    return { label: 'Cancelled 2x', className: 'bg-[#1A1B22] text-white', redDot: true }
  }

  // 2. EXAM Xw — deadline within 6 weeks (new, indigo; red if < 1 week)
  if (student.nearestObjectiveDeadline) {
    const deadlineMs = new Date(student.nearestObjectiveDeadline).getTime()
    const nowMs = Date.now()
    const daysUntil = Math.ceil((deadlineMs - nowMs) / (1000 * 60 * 60 * 24))
    const weeksUntil = Math.ceil(daysUntil / 7)
    if (daysUntil > 0 && weeksUntil <= 6) {
      const label = daysUntil < 7 ? 'EXAM <1W' : `EXAM ${weeksUntil}W`
      const className = daysUntil < 7
        ? 'bg-red-600 text-white'
        : 'bg-[#3525CD] text-white'
      return { label, className }
    }
  }

  // 3. Returning after gap (new, violet)
  const now = Date.now()
  const lastSessionMs = student.lastSessionDate ? new Date(student.lastSessionDate).getTime() : null
  const lastSessionGapDays = lastSessionMs != null
    ? Math.floor((now - lastSessionMs) / (1000 * 60 * 60 * 24))
    : null
  if (lastSessionGapDays != null && lastSessionGapDays > 21 && student.nextSessionDate != null) {
    return { label: 'Returning', className: 'bg-violet-600 text-white' }
  }

  // 4. Homework not done / partial (new)
  if (student.lastHomeworkStatus === 'NotDone') {
    return { label: 'HMWK NOT DONE', className: 'bg-red-600 text-white' }
  }
  if (student.lastHomeworkStatus === 'Partial') {
    return { label: 'HMWK PARTIAL', className: 'bg-amber-500 text-white' }
  }

  // 5. Review pending (existing, indigo)
  if (student.pendingTodos.length > 0) {
    return { label: 'Review pending', className: 'bg-[#3525CD] text-white' }
  }

  // 6. Inactive (existing, amber)
  if (lastSessionGapDays != null && lastSessionGapDays >= 14 && !student.nextSessionDate) {
    return { label: `Inactive ${lastSessionGapDays}d`, className: 'bg-amber-500 text-white' }
  }

  return null
}
```

### 7. `StudentRoster.test.tsx` — New Tests

Add to the existing `makeStudent` default: `nearestObjectiveDeadline: null, lastHomeworkStatus: null`.

New tests:
```
it('shows EXAM 4W signal when deadline within 6 weeks')
it('shows EXAM <1W in red when deadline < 1 week')
it('shows EXAM 1W in indigo when deadline is exactly 7 days away')  // boundary: ceil(7/7)=1, still >=7 days → indigo
it('shows Returning signal when gap > 21 days and next session booked')
it('shows HMWK NOT DONE signal when lastHomeworkStatus is NotDone')
it('shows HMWK PARTIAL signal when lastHomeworkStatus is Partial')
it('EXAM signal takes priority over Returning')
it('Returning signal takes priority over HMWK NOT DONE')
it('does not show EXAM signal when deadline is beyond 6 weeks')
```

Also update existing signal tests to add `nearestObjectiveDeadline: null, lastHomeworkStatus: null` to `makeStudent` if needed (the default will cover this).

### 8. `dashboard-behavior.md` Zone 3 section

Create `plan/langteach-beta/scenarios-by-screen.vera/dashboard-behavior.md` if it doesn't exist, or update the Zone 3 section.

Update the signal priority table to reflect the full 7-step order documented in the issue.

---

## Implementation Order

1. Backend DTO + service changes (compile and unit test locally)
2. Backend unit tests
3. DemoSeeder updates
4. Frontend interface + signal logic
5. Frontend unit tests
6. dashboard-behavior.md update

---

## E2E Impact

`e2e/tests/visual/dashboard.visual.spec.ts` does not assert signal label values (confirmed by grep). No changes needed there.

---

## Out of Scope

- "Stalled difficulty" signal
- Clicking signal badges for navigation
- Hero card or followup zone changes
