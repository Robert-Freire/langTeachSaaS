# T19 — Dashboard v2 Implementation Plan

## Context

The current dashboard (`Dashboard.tsx`) shows three stat counter cards (students, lessons, published). T19 replaces it with a teacher command center: a weekly schedule strip, a "needs preparation" action list, quick create, and an unscheduled drafts section. The prerequisite is adding a `ScheduledAt` field to the Lesson model, which also improves T17 (PDF date header) and sets up T18/T25.

Full product spec: `plan/langteach-beta/task19-dashboard-v2.md`

---

## Step 1: Backend schema + API changes

### 1a. Add ScheduledAt to Lesson model

**File:** `backend/LangTeach.Api/Data/Models/Lesson.cs`
- Add `public DateTime? ScheduledAt { get; set; }` after `UpdatedAt` (line 18)

### 1b. EF Migration

- Run `dotnet ef migrations add AddScheduledAtToLesson`
- Single nullable column, no data migration needed

### 1c. DTOs

**`backend/LangTeach.Api/DTOs/CreateLessonRequest.cs`**
- Add `public DateTime? ScheduledAt { get; set; }` (no validation, nullable)

**`backend/LangTeach.Api/DTOs/UpdateLessonRequest.cs`**
- Add `public DateTime? ScheduledAt { get; set; }` (nullable, null = clear the date)

**`backend/LangTeach.Api/DTOs/LessonDto.cs`**
- Add `DateTime? ScheduledAt` to the record (after `UpdatedAt`, line 16)
- Add `string? StudentName` to the record (new field, avoids client-side student join on dashboard)

**`backend/LangTeach.Api/DTOs/LessonListQuery.cs`**
- Add `public DateTime? ScheduledFrom { get; set; }` and `public DateTime? ScheduledTo { get; set; }`

### 1d. Service layer

**`backend/LangTeach.Api/Services/LessonService.cs`**

- **All queries that call MapToDto must `.Include(l => l.Student)`** so that `StudentName` is populated:
  - **ListAsync** (line 26): change to `.Include(l => l.Sections).Include(l => l.Student)`
  - **GetByIdAsync** (line 62): change to `.Include(l => l.Sections).Include(l => l.Student)`
  - **UpdateAsync** (line 138): change to `.Include(l => l.Sections).Include(l => l.Student)`
  - **UpdateSectionsAsync** (line 177): change to `.Include(l => l.Sections).Include(l => l.Student)`
  - **CreateAsync** (line 133): Student won't be loaded after insert (acceptable, response will have `studentName: null` for the create response only)
  - **DuplicateAsync** (line 227): same as create, acceptable
- **CreateAsync** (line 86-101): Add `ScheduledAt = request.ScheduledAt` to the Lesson initializer
- **UpdateAsync** (line 159-167): Add `lesson.ScheduledAt = request.ScheduledAt;` (always assign, null clears). This is safe because the frontend always sends all fields in the update request (see `handleMetaSave` at line 219). The `scheduledAt` field in `metaDraft` must always be included in the update payload.
- **ListAsync** (lines 20-58):
  - Add filters after line 42: `if (query.ScheduledFrom.HasValue) q = q.Where(l => l.ScheduledAt >= query.ScheduledFrom.Value);` and same for `ScheduledTo` with `<=`
- **MapToDto** (lines 269-283): Add `l.ScheduledAt` and `l.Student?.Name` to the constructor call
- **DuplicateAsync** (lines 235-259): Do NOT copy ScheduledAt (duplicated lesson gets null, per T24 design). Add a code comment: `// ScheduledAt intentionally not copied: duplicate is for a different class time`

### 1e. PDF export fix

**`backend/LangTeach.Api/Services/PdfExport/PdfLessonData.cs`**
- Change `DateTime CreatedAt` to `DateTime LessonDate` (semantic rename, receives ScheduledAt ?? CreatedAt)

**`backend/LangTeach.Api/Controllers/LessonsController.cs` (line 270)**
- Change `lesson.CreatedAt` to `lesson.ScheduledAt ?? lesson.CreatedAt` when constructing PdfLessonData

**`backend/LangTeach.Api/Services/PdfExport/PdfExportService.cs` (line 46)**
- Change `lesson.CreatedAt.ToString(...)` to `lesson.LessonDate.ToString(...)`

### 1f. Backend tests

**`backend/LangTeach.Api.Tests/Controllers/LessonsControllerTests.cs`**
- Add ScheduledAt to create/update test payloads where needed
- Add one test: create lesson with ScheduledAt, list with ScheduledFrom/ScheduledTo, verify filtered correctly
- Add one test: verify StudentName appears in lesson DTO (create lesson with student linked, GET the lesson, assert `studentName` is populated)

**`backend/LangTeach.Api.Tests/Controllers/ExportEndpointTests.cs`**
- Update `PdfLessonData` construction after renaming `CreatedAt` to `LessonDate` (compile-breaking change)

---

## Step 2: Frontend API types + date picker

### 2a. API types

**`frontend/src/api/lessons.ts`**
- Add `scheduledAt: string | null` to `Lesson` interface (after `updatedAt`)
- Add `studentName: string | null` to `Lesson` interface
- Add `scheduledAt?: string | null` to `CreateLessonRequest` and `UpdateLessonRequest`
- Add `scheduledFrom?: string` and `scheduledTo?: string` to `LessonListQuery`

### 2b. Date picker in LessonNew.tsx

**`frontend/src/pages/LessonNew.tsx`**
- Add state: `const [scheduledAt, setScheduledAt] = useState<string>('')`
- Add date input field after Duration select (after line 212), using native `<input type="datetime-local">` wrapped in Label/Input pattern
- In the `doCreate` function (where the `createLesson(request)` call is assembled), include `scheduledAt: scheduledAt || undefined`
- Date values must be sent as ISO 8601 strings (e.g., `2026-03-19T10:00:00`) for ASP.NET `DateTime?` query/body binding

### 2c. Date picker in LessonEditor.tsx

**`frontend/src/pages/LessonEditor.tsx`**
- Add `scheduledAt` to `metaDraft` state type (line 81): `{ language: '', cefrLevel: '', topic: '', durationMinutes: 60, objectives: '', scheduledAt: '' }`
- Initialize from lesson data (line 106-112): add `scheduledAt: lesson.scheduledAt ?? ''`
- Add date input after Duration select (after line 429) in the editing form
- In read-only view (line 440-444), display scheduled date if present
- In `handleMetaSave` (line 219-231): include `scheduledAt: metaDraft.scheduledAt || null` in the update request (source from `metaDraft`, not `lesson`, so the user's edits are sent)
- Show scheduled date badge in the collapsed header (line 390-394) next to duration

### 2d. Frontend unit tests

**`frontend/src/pages/LessonNew.test.tsx`** (new or extend existing)
- Test that the date picker renders and its value is included in the create request

**`frontend/src/pages/LessonEditor.test.tsx`** (new or extend existing)
- Test that scheduledAt is shown in metadata, editable, and saved

---

## Step 3: Dashboard v2

### 3a. New Dashboard component

**`frontend/src/pages/Dashboard.tsx`** (full rewrite)

**Data fetching:**
- `useQuery(['students'])` to get all students (for count stat)
- `useQuery(['lessons', { scheduledFrom, scheduledTo }])` with current week boundaries to get scheduled lessons
- `useQuery(['lessons', { status: 'Draft', pageSize: 100 }])` for unscheduled drafts (filter client-side for `scheduledAt === null`). Using `pageSize: 100` to avoid missing drafts for teachers with many lessons. If this becomes insufficient, a backend `scheduledAt=null` filter can be added later.
- `useQuery(['lessons', { pageSize: 1 }])` for total count stat (uses `totalCount` from response, minimal payload)

**Week calculation utility:**
- `getWeekBounds(offset: number)`: returns `{ start: Date, end: Date }` for Mon-Sun of current week + offset
- State: `weekOffset` (default 0), prev/next buttons shift it

**Layout (4 sections):**

1. **WeekStrip component** (new file: `frontend/src/components/dashboard/WeekStrip.tsx`)
   - 7 columns (Mon-Sun), responsive
   - Each column: day label + date number, lesson pills stacked vertically
   - Pill: student name (or "No student"), CEFR badge, colored border (green = Published, amber = Draft)
   - Click pill: `navigate(/lessons/${id})`
   - Today column gets highlighted background
   - Nav arrows at edges to shift week

2. **NeedsPreparation component** (new file: `frontend/src/components/dashboard/NeedsPreparation.tsx`)
   - Filter: `scheduledAt` within next 7 days AND `status === 'Draft'`
   - Sorted by scheduledAt ascending (most urgent first)
   - Each row: student name, topic, date, CEFR badge, "Open" link
   - Empty state: "All caught up!" message

3. **QuickActions component** (new file: `frontend/src/components/dashboard/QuickActions.tsx`)
   - "New Lesson" button linking to `/lessons/new`
   - Stats: student count, lessons this week, total lessons
   - Recent activity: last 5 lessons by updatedAt

4. **UnscheduledDrafts component** (new file: `frontend/src/components/dashboard/UnscheduledDrafts.tsx`)
   - Filter: `status === 'Draft'` AND `scheduledAt === null`
   - Collapsible section (default collapsed if empty, expanded if has items)
   - Each row: title, student name, CEFR, "Open" link

### 3b. Dashboard unit tests

**`frontend/src/pages/Dashboard.test.tsx`** (new file)
- Test: week strip renders 7 days with correct labels
- Test: scheduled lessons appear as pills in correct day columns
- Test: draft lessons appear in "Needs Preparation" section
- Test: unscheduled drafts appear in collapsible section
- Test: clicking a lesson pill navigates to editor
- Test: week navigation shifts the displayed week
- Use `vi.mock('../api/lessons')` and `vi.mock('../api/students')` pattern (matching existing test convention, see `Students.test.tsx`)

### 3c. Helper utility

**`frontend/src/lib/weekUtils.ts`** (new file)
- `getWeekBounds(offset: number): { start: Date, end: Date }` (Monday-based weeks, ISO 8601). Note: JS `Date.getDay()` returns 0 for Sunday, so Monday offset = `(day + 6) % 7`
- `formatWeekDay(date: Date): string` (e.g., "Mon 17")
- `isToday(date: Date): boolean`
- `getDayOfWeek(date: Date): number` (0=Mon, 6=Sun)
- `toISODateString(date: Date): string` (formats as `YYYY-MM-DDTHH:mm:ss` for API query params)

**`frontend/src/lib/weekUtils.test.ts`** (new file)
- Unit tests for week boundary calculation, especially edge cases (year boundaries, DST)

---

## Step 4: E2E tests

**`e2e/tests/dashboard.spec.ts`** (rewrite existing)

The existing test checks three stat tiles and navigation. Replace with:

- Test 1: "dashboard shows week strip with scheduled lessons"
  - Create a lesson via API with `scheduledAt` set to today
  - Navigate to dashboard
  - Verify the lesson appears as a pill in today's column
  - Click the pill, verify navigation to lesson editor

- Test 2: "needs preparation shows draft lessons"
  - Create a draft lesson with `scheduledAt` in the next 7 days
  - Navigate to dashboard
  - Verify it appears in the "Needs Preparation" section

- Test 3: "sidebar navigation still works" (keep existing test 3, it tests sidebar nav not dashboard tiles)

---

## Step 5: Pre-push checks + review

1. `dotnet build` (zero warnings)
2. `dotnet test` (all pass)
3. `npm run build` (zero errors)
4. `npm test` (all unit tests pass)
5. Restart docker frontend (`docker compose restart frontend`) after new files
6. `npx playwright test` (all e2e pass)
7. `/review` against main

---

## File change summary

| Layer | File | Action |
|-------|------|--------|
| Backend Model | `Data/Models/Lesson.cs` | Add ScheduledAt field |
| Backend Migration | `Data/Migrations/...AddScheduledAtToLesson.cs` | New migration |
| Backend DTO | `DTOs/CreateLessonRequest.cs` | Add ScheduledAt |
| Backend DTO | `DTOs/UpdateLessonRequest.cs` | Add ScheduledAt |
| Backend DTO | `DTOs/LessonDto.cs` | Add ScheduledAt + StudentName |
| Backend DTO | `DTOs/LessonListQuery.cs` | Add ScheduledFrom/ScheduledTo |
| Backend Service | `Services/LessonService.cs` | Map ScheduledAt in CRUD + date filters in List + Include Student |
| Backend PDF | `Services/PdfExport/PdfLessonData.cs` | Rename CreatedAt to LessonDate |
| Backend PDF | `Services/PdfExport/PdfExportService.cs` | Use LessonDate |
| Backend Controller | `Controllers/LessonsController.cs` | Pass ScheduledAt ?? CreatedAt to PDF |
| Backend Tests | `LessonsControllerTests.cs` | Add ScheduledAt + date filter + StudentName tests |
| Backend Tests | `ExportEndpointTests.cs` | Update PdfLessonData construction (CreatedAt renamed to LessonDate) |
| Frontend API | `api/lessons.ts` | Add ScheduledAt, StudentName, query params |
| Frontend Page | `pages/LessonNew.tsx` | Add date picker |
| Frontend Page | `pages/LessonEditor.tsx` | Add date picker in metadata |
| Frontend Page | `pages/Dashboard.tsx` | Full rewrite |
| Frontend Component | `components/dashboard/WeekStrip.tsx` | New |
| Frontend Component | `components/dashboard/NeedsPreparation.tsx` | New |
| Frontend Component | `components/dashboard/QuickActions.tsx` | New |
| Frontend Component | `components/dashboard/UnscheduledDrafts.tsx` | New |
| Frontend Util | `lib/weekUtils.ts` | New |
| Frontend Tests | `pages/Dashboard.test.tsx` | New |
| Frontend Tests | `lib/weekUtils.test.ts` | New |
| E2E | `e2e/tests/dashboard.spec.ts` | Rewrite |
