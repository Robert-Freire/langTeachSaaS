# Task 675 — Redesign Students List to match Stitch design

## Issue
[#675](https://github.com/Robert-Freire/langTeachSaaS/issues/675)

## Scope decision
`Cancelled 2x` badge requires `CancelledSessionsLast30Days` not currently in `ActiveStudentDto`. Approved to add it in this task (option c).

**Delete button deferral:** The issue asks to remove the inline trash icon and move delete to the student detail/edit page. However, 10+ e2e tests use `data-testid="delete-student"` as their only cleanup mechanism, and the student edit page has no delete functionality yet. Implementing the removal without updating e2e tests would break AC#8. Resolution: keep the trash button in the row for this task. File a follow-up issue to move delete to the edit page (and update e2e tests then). This satisfies AC#8 and avoids scope creep.

## Acceptance criteria
1. Students list matches the Stitch design reference (layout, typography, colors, density)
2. 10-12 students visible without scrolling on 1440x900
3. Initials avatars render with deterministic colors
4. Sort dropdown works (Next Session, Last Session, Name, CEFR Level)
5. Signal badges show all 7 states listed
6. Pagination footer shows count and "Load more" works
7. Next Session shows time for today/this-week sessions
8. All existing e2e tests for `/students` still pass
9. No visual regressions on other pages

---

## Part 1: Backend — Add `CancelledSessionsLast30Days` to `ActiveStudentDto`

### 1a. `DashboardDtos.cs`
Add field to `ActiveStudentDto` record:
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
    int CancelledSessionsLast30Days   // NEW
);
```

### 1b. `DashboardService.cs` — `GetActiveStudentsAsync`
In the EF projection (the anonymous `Select`), add:
```csharp
CancelledSessionsLast30Days = s.SessionLogs
    .Count(sl => !sl.IsDeleted
              && sl.IsCancelled
              && sl.SessionDate.HasValue
              && sl.SessionDate.Value >= cutoff30Days)
```
Where `cutoff30Days = now.AddDays(-30)`. Define it as a local variable at the top of `GetActiveStudentsAsync` alongside `now`.

In the `rows.Select(r => ...)` mapping block (lines 116-132), add `CancelledSessionsLast30Days: r.CancelledSessionsLast30Days` to the `new ActiveStudentDto(...)` constructor call.

### 1c. `dashboard.ts` (frontend)
Add `cancelledSessionsLast30Days: number` to the `ActiveStudent` interface.

### 1d. Backend unit test
In `DashboardServiceTests`, add test: one student with 2 cancelled sessions in the last 30 days plus 1 cancelled session older than 30 days. Assert `CancelledSessionsLast30Days == 2`.

---

## Part 2: Frontend redesign — `Students.tsx`

### 2a. Header
- Title: `"Student Roster"` (was `"Students"`)
- Subtitle: `"Managing N active language learners in your atelier."` where N = count of active students from dashboard data (students where `dash?.isActive !== false`)
- "Add Student" button: indigo gradient (`bg-gradient-to-br from-[#3525CD] to-[#4F46E5]`), white text, `UserPlus` icon — same as current but with the gradient class

### 2b. Toolbar layout
Order: CEFR pills (left) | search (center) | sort dropdown (right)

Sort dropdown — native `<select>` or a small shadcn `Select` component:
- "Sort by: Next Session" (default)
- "Last Session"
- "Name"
- "CEFR Level"

State: `const [sortBy, setSortBy] = useState<'nextSession' | 'lastSession' | 'name' | 'cefrLevel'>('nextSession')`

### 2c. Sort logic
After filtering, sort `filteredStudents` before pagination slice. Reference `CEFR_LEVELS` array for ordering.

- **Next Session**: Students with `nextSessionDate` ascending (soonest first); null nextSessionDate last
- **Last Session**: Students with `lastSessionDate` descending (most recent first); null last
- **Name**: `student.name` alphabetical A-Z
- **CEFR Level**: index in `CEFR_LEVELS` array ascending (A1 first, C2 last)

Sort reads dashboard data for nextSessionDate/lastSessionDate (from `dashboardMap`).

Reset `visibleCount` to 12 whenever `searchQuery`, `cefrFilter`, or `sortBy` changes (use `useEffect`).

### 2d. Initials avatar
```ts
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  return words.slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

const AVATAR_PALETTES = [
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-teal-100 text-teal-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-orange-100 text-orange-700',
]

function getAvatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length]
}
```

Render before name cell:
```tsx
<div className={cn('flex-none w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold', getAvatarColor(student.id))}>
  {getInitials(student.name)}
</div>
```

### 2e. Row layout changes
Grid columns:
```
grid-cols-[32px_minmax(160px,2fr)_80px_120px_140px_1fr_56px]
```
(avatar | name | level | native lang | next session | signals | actions)

Last session column is removed from the visible grid (it was column 4). Sort by last session still works via `dashboardMap`. The column header row must match.

Hover: `hover:bg-[#E3E1EC]` (surface-container-highest per design spec; was `#ECE8F6`)
Name hover color: `group-hover:text-indigo-700` (unchanged)
Vertical padding: `py-2` (was `py-2.5`) — tighter for density

**Delete button**: Keep `data-testid="delete-student"` and the `Trash2` icon. This satisfies AC#8 (e2e compat). See scope deferral note above.

### 2f. Next Session column formatting
Add optional `showTime` parameter to `formatRelativeDate`:

```ts
function formatRelativeDate(dateStr: string | null | undefined, showTime = false): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((today.getTime() - targetDay.getTime()) / (1000 * 60 * 60 * 24))
  
  if (showTime && diffDays < 0) {
    const futureDays = Math.abs(diffDays)
    const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    if (diffDays === -1) return `Tomorrow ${timeStr}`         // "Tomorrow 09:30"
    if (futureDays <= 6) {
      const dayAbbr = date.toLocaleDateString('en-GB', { weekday: 'short' })  // "Mon", "Thu"
      return `${dayAbbr} ${timeStr}`                          // "Thu 15:00"
    }
  }
  if (diffDays === 0) {
    if (showTime) {
      const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      return `Today ${timeStr}`                               // "Today 14:30"
    }
    return 'Today'
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays > 0) return `${diffDays}d ago`
  const futureDays = Math.abs(diffDays)
  if (futureDays === 1) return 'Tomorrow'
  return `in ${futureDays}d`
}
```

Pass `showTime: true` for Next Session column only. Last session column (now removed from view) is unaffected.

### 2g. Signal badges — full 7 states
Variant CSS classes:
- `indigo`: `bg-indigo-50 text-indigo-700`
- `amber`: `bg-amber-50 text-amber-700`
- `zinc`: `bg-zinc-100 text-zinc-600`
- `red`: `bg-red-50 text-red-700`

Updated `buildSignals` signature: `buildSignals(student: Student, dash: ActiveStudent | undefined): Signal[]`

Logic (in priority order):
1. If `dash && !dash.isActive` → `[{ label: 'Former', variant: 'zinc' }]` (return immediately, exclusive)
2. Otherwise build array:
   - **`RETURNING`**: `dash.isActive && lastSessionGapDays >= 30 && dash.nextSessionDate != null` → `{ label: 'RETURNING', variant: 'zinc' }` (exclusive with `Inactive Xd`)
   - **`Inactive Xd`**: `dash.isActive && lastSessionDate && lastSessionGapDays >= 14 && !(RETURNING condition)` → `{ label: 'Inactive ${lastSessionGapDays}d', variant: 'red' }` — replaces old `Xd gap` amber
   - **`Cancelled 2x`**: `dash.cancelledSessionsLast30Days >= 2` → `{ label: 'Cancelled 2x', variant: 'amber' }`
   - **`NEW`**: `student.createdAt && daysSince(student.createdAt) <= 14 && dash.totalSessions < 3` → `{ label: 'NEW', variant: 'indigo' }`
   - **`Exam prep`**: `student.shortTermObjectives.some(o => o.targetDate && weeksUntil(o.targetDate) <= 6 && weeksUntil(o.targetDate) >= 0)` → `{ label: 'Exam prep', variant: 'indigo' }`
   - **`Review pending`**: `dash.teachingTodosCount > 0` → `{ label: 'Review pending', variant: 'indigo' }` — replaces old `N followup(s)` zinc

**Threshold clarification:**
- `Inactive Xd` threshold: 14 days (matches existing behavior — just changes color from amber to red)
- `RETURNING` threshold: 30 days (as per issue spec) — if lastSessionGapDays >= 30 but student now has nextSessionDate, show RETURNING instead of Inactive
- These are not mutually exclusive at 14-29 days: at 14d gap with next session → show both? No — per issue spec, RETURNING overrides Inactive when next session exists. Rule: if `nextSessionDate != null && lastSessionGapDays >= 30` → RETURNING (no Inactive). If `lastSessionGapDays >= 14` without RETURNING condition → Inactive.

**TeachingTodosCount clarification:** The backend currently sets `TeachingTodosCount = allTodos.Count` (line 129 of DashboardService), counting ALL todos including covered ones. The badge condition `dash.teachingTodosCount > 0` should actually use `dash.pendingTodos.length > 0` (the filtered pending list). No backend change needed — use `dash.pendingTodos.length` in the frontend badge logic.

### 2h. Pagination — client-side "Load more"
State: `const [visibleCount, setVisibleCount] = useState(12)`

```ts
const visibleStudents = sortedStudents.slice(0, visibleCount)
```

Render `visibleStudents` in the row loop. Footer inside the white card, below rows:
```tsx
<div className="px-4 py-3 flex items-center justify-between">
  <span className="text-xs text-zinc-400">
    Showing {Math.min(visibleCount, sortedStudents.length)} of {sortedStudents.length} students
  </span>
  {visibleCount < sortedStudents.length && (
    <Button variant="ghost" size="sm" onClick={() => setVisibleCount(v => v + 12)}>
      Load more
    </Button>
  )}
</div>
```

Reset on filter/sort/search change (via `useEffect` watching those three state values).

---

## Part 3: Unit tests — `Students.test.tsx`

### Factory updates
`makeStudent`: set `createdAt` default to `new Date().toISOString()` (was `''`). Tests that don't want the NEW badge should pass `createdAt: new Date(Date.now() - 20 * 86400000).toISOString()` (20 days ago).

Add `makeActiveStudent` factory:
```ts
function makeActiveStudent(overrides: Partial<ActiveStudent> = {}): ActiveStudent {
  return {
    studentId: 'abc-123',
    name: 'Ana García',
    cefrLevel: 'B2',
    nativeLanguages: [],
    isActive: true,
    lastSessionDate: null,
    nextSessionDate: null,
    totalSessions: 5,
    teachingTodosCount: 0,
    pendingTodos: [],
    cancelledSessionsLast30Days: 0,
    ...overrides,
  }
}
```

### New test cases (add to existing describe block)
1. **Avatar initials**: student named "Ana García" shows `AG` in avatar circle
2. **Sort by Name**: two students "Zara" and "Ana" — sort by Name → "Ana" appears first in DOM
3. **Sort by CEFR Level**: students B2 and A1 — sort by CEFR → A1 row precedes B2
4. **Signal `Inactive Xd`** (red): `lastSessionDate = 20d ago, nextSessionDate = null` → shows red `Inactive 20d` badge
5. **Signal `Cancelled 2x`** (amber): `cancelledSessionsLast30Days = 2` → shows amber `Cancelled 2x` badge
6. **Signal `NEW`** (indigo): `createdAt = 5d ago, totalSessions = 1` → shows indigo `NEW` badge
7. **Signal `Exam prep`** (indigo): student with `shortTermObjectives = [{ id: '1', text: 'Exam', targetDate: <3 weeks from now> }]` → shows `Exam prep` badge
8. **Signal `RETURNING`** (zinc): `lastSessionDate = 35d ago, nextSessionDate = <future>` → shows `RETURNING` (no Inactive)
9. **Signal `Review pending`** (indigo): `pendingTodos = [{ ... }]`, `teachingTodosCount = 1` → shows `Review pending` (not `1 followups`)
10. **No NEW badge** for old student: `createdAt = 20d ago` → no NEW badge
11. **Load more**: 13 students → 12 rows visible + "Load more" button; click → all 13 visible
12. **Next session today with time**: `nextSessionDate = today at 14:30 UTC` → shows "Today 14:30"
13. **Pagination count text**: "Showing 12 of 13 students" visible when 13 students loaded

---

## Part 4: Follow-up issue to file at task completion
Create GitHub issue: "Move student delete action to edit page" — currently deferred from #675 due to e2e dependency. Should add a Delete button to `StudentForm.tsx` (edit mode) and then update the 10 e2e cleanup sequences.

---

## Files changed
| File | Change |
|------|--------|
| `backend/LangTeach.Api/DTOs/DashboardDtos.cs` | Add `CancelledSessionsLast30Days` field to record |
| `backend/LangTeach.Api/Services/DashboardService.cs` | Add `cutoff30Days` local + projection field + constructor call |
| `backend/LangTeach.Api.Tests/Services/DashboardServiceTests.cs` | Add cancelled count test |
| `frontend/src/api/dashboard.ts` | Add `cancelledSessionsLast30Days` to `ActiveStudent` |
| `frontend/src/pages/Students.tsx` | Full redesign (header, toolbar, sort, avatars, signals, pagination, Next Session time) |
| `frontend/src/pages/Students.test.tsx` | Factory updates + 13 new unit tests |
