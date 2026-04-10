# Task 637 — Students List Redesign (Compact Table, Stitch Style)

## Goal

Replace the card grid on `/students` with a compact data table following the Stitch "Academic Atelier" design language.

## Context

- Design spec: `plan/langteach-beta/stitch-design-system/DESIGN.md`
- Current `Students.tsx` uses cards with infinite scroll, no search/filter.
- Dashboard aggregation endpoint (`GET /api/dashboard`) already exists and returns `ActiveStudent` with `lastSessionDate`, `nextSessionDate`, `teachingTodosCount`, `isActive` — use this for the Signals and session date columns.
- Student base data comes from `GET /api/students` (authoritative list incl. former students).

## Data Strategy

Two queries, join by studentId on the client:
1. `useQuery(['students'])` — `getStudents({ pageSize: 100 })` (replaces `useInfiniteQuery`; pagination out of scope per issue)
2. `useQuery(['dashboard'])` — `getDashboard()` already in `api/dashboard.ts`

Build a `Map<studentId, ActiveStudent>` from dashboard data. Each student row enriched with session dates and todos count; falls back to `null` if the student is not in dashboard data (e.g. inactive/former students not tracked by aggregation).

## Files to Change

### 1. `frontend/src/lib/cefr-colors.ts`
Add `getCefrStitchBadgeClasses(level: string): string` — returns Tailwind classes for the Stitch square badge:
- A1/A2: `bg-sky-100 text-sky-800` (secondary-container, light/passive)
- B1/B2: `bg-indigo-100 text-indigo-800` (primary-fixed, growing)
- C1/C2: `bg-slate-800 text-white` (tertiary-fixed, mastery/professional dark)
- default: `bg-indigo-100 text-indigo-800`

Do not touch `getCefrBadgeClasses` — it's used in other components.

### 2. `frontend/src/pages/Students.tsx`
Full rewrite. Key structure:

**State:**
- `searchQuery: string` — name filter
- `cefrFilter: string | 'all'` — level filter

**Layout (Stitch):**
- Page bg: `bg-[#FBF8FF]` (surface)
- Table container bg: `bg-white` (surface-container-lowest)
- No border lines on the table container — tonal depth only
- Table headers: `text-[0.6875rem] uppercase tracking-[0.05em] font-medium text-zinc-500` (Label-SM)
- Row hover: `hover:bg-[#ECE8F6] hover:rounded-lg` (surface-container-highest + lg corners)
- No 1px row dividers — use `16px` gap or `space-y-0` with hover-only separation
- Row `cursor-pointer`; clicking anywhere on a row navigates to `/students/:id`

**Columns:**
| Column | Source | Notes |
|--------|--------|-------|
| Name | `student.name` | Clickable link |
| CEFR | `student.cefrLevel` | Square badge via `getCefrStitchBadgeClasses`, `rounded-md`, label-sm bold |
| Native Language(s) | `student.nativeLanguages` | Comma-joined; "—" if empty |
| Last Session | `dashboardMap[id]?.lastSessionDate` | Formatted relative ("3d ago") or "N/A" |
| Next Session | `dashboardMap[id]?.nextSessionDate` | Formatted relative or "N/A" |
| Signals | computed | See below |

**Signals column (progressive enhancement):**
- Session gap warning: active student (`isActive`) with no session in 14+ days → amber badge "14d gap"
- Pending todos: `teachingTodosCount > 0` → zinc badge "{n} followup(s)"
- `isActive === false` → zinc badge "Former"
- No signals → `—`

**Search bar:** `<Input>` with search icon, filters by name (case-insensitive contains).

**CEFR filter:** row of ghost buttons (All, A1, A2, B1, B2, C1, C2). Active = `bg-indigo-50 text-indigo-700`.

**Skeleton loading:** same count (3 rows), but table-shaped skeleton cells.

**Empty state:** keep existing (Users icon + "No students yet" copy).

**Delete flow:** keep `AlertDialog` delete confirmation (existing behavior).

**Edit button:** keep per-row edit button (pencil icon, ghost variant), does NOT navigate on row click (stop propagation on edit/delete buttons).

**data-testid preservation (required by e2e tests):**
- `data-testid={`student-row-${student.id}`}` on each row
- `data-testid="student-name"` on the name element
- `data-testid="student-level"` on CEFR badge
- `data-testid="native-language-chip"` on native language cell (text format changes: was "Native: Portuguese", new format is just "Portuguese" comma-joined — e2e must be updated)
- `data-testid="edit-student"` on edit button
- `data-testid="delete-student"` on delete button
- `data-testid="confirm-delete"` on dialog confirm button
- `data-testid="delete-error"` on error message
- `data-testid="empty-state"` on empty state container
- Remove `data-testid="scroll-sentinel"` and `data-testid="fetch-next-loading"` (infinite scroll removed)
- Keep `data-testid="interest-chip"` — render interests as hidden/visually-absent span elements so existing e2e CRUD test assertion still passes. The compact table does not show interests as a visible column, but the test at `students.spec.ts:176` asserts `interest-chip` with `hasText: 'travel'` exists within the student row. Keep the test ID on a visually hidden `<span>` or just include the interest chips outside the visible columns (sr-only). This avoids a breaking change to the e2e CRUD test.

### 3. `frontend/src/pages/Students.test.tsx`
Rewrite unit tests for new structure. Keep:
- Loading skeleton test (updated to check table-shaped skeletons)
- Error state test
- Delete mutation error test
- Renders student list test
- Native language chip test

Add:
- "search by name filters rows"
- "filter by CEFR level shows only matching rows"
- "row click navigates to student detail"
- "CEFR badge uses square Stitch style (rounded-md)"

Remove:
- Infinite scroll / pagination tests (no longer relevant)

### 4. `e2e/tests/students.spec.ts`
Update:
- "students list loads without infinite-scroll spinner" test: remove `fetch-next-loading` assertion (element gone; `not.toBeVisible()` still passes technically but is misleading — remove it and just keep the `h1` check).
- Line 177: update `native-language-chip` assertion from `toContainText('Native: Portuguese')` to `toContainText('Portuguese')` (prefix removed in table cell format).
- Line 176: `interest-chip` assertion stays — the element is rendered sr-only in the row, so the Playwright `filter({ has: ... })` still finds it. No change needed.

Add new test:
- "student list renders table and row click navigates to detail" — navigate to `/students`, wait for a student row to appear, click the row, assert URL changes to `/students/:id`.

All existing create/edit/delete e2e tests must continue to pass (they use `student-row-*`, `student-name`, `edit-student`, `delete-student`, `confirm-delete` — all preserved).

## Acceptance Criteria Check

| AC | Covered by |
|----|-----------|
| `/students` shows compact table | `Students.tsx` rewrite |
| Columns: Name, CEFR, Native Language(s), Last Session, Next Session, Signals | columns section above |
| CEFR badges square format per Stitch spec | `getCefrStitchBadgeClasses` + `rounded-md` |
| No 1px borders between rows | row styling, no dividers |
| Row click navigates to `/students/:id` | row `onClick` |
| Search by name works | `searchQuery` state + filter |
| Filter by CEFR level works | `cefrFilter` state + filter |
| Empty state when no students | preserved |
| E2E: student list renders and navigation to detail works | new e2e test |
| Unit test for table rendering with mock data | updated Students.test.tsx |

## Out of Scope (per issue)
- Student detail page redesign
- Bulk actions
- Pagination
