# T19.1 - Schedule from Dashboard

## Context

T19 delivered a read-only dashboard with WeekStrip, NeedsPreparation, and UnscheduledDrafts. Teachers can see their week but cannot schedule directly from it. The current workflow requires navigating to LessonNew or LessonEditor to set a date, which is backwards from how teachers think: "I have a class with Marco on Thursday at 10am, what should I teach?"

T19.1 adds a "+" button on each day column so teachers can schedule directly from the dashboard, either creating a new lesson or assigning an existing unscheduled draft.

## Implementation

### 1. New file: `frontend/src/components/dashboard/SchedulePopover.tsx`

Popover component anchored to a "+" button in each day column.

**Props:**
```ts
interface SchedulePopoverProps {
  date: Date          // the day column's date
  students: Student[] // teacher's student list
  unscheduledDrafts: Lesson[] // drafts without scheduledAt
}
```

**Internal state:** `studentId`, `time` (HH:mm, default "10:00"), `view: 'main' | 'drafts'`

**State reset:** Reset `studentId`, `time`, and `view` when the popover closes (via `onOpenChange`) so re-opening always starts fresh.

**Main view:**
- Student dropdown (Select component, optional selection)
- Time picker (`<input type="time">`)
- "Create New Lesson" button: navigates to `/lessons/new?studentId=X&scheduledAt=YYYY-MM-DDTHH:mm`. Use clean ISO format with `T` separator (no URL encoding issues).
- "Assign Existing Draft" button: switches to drafts sub-view. Disable/hide this button if there are zero unscheduled drafts.

**Drafts sub-view:**
- Lists unscheduled drafts (filtered by selected student if one is chosen, all if none)
- Clicking a draft calls `updateLesson(draft.id, { title, language, cefrLevel, topic, scheduledAt, studentId })`. The `studentId` in the payload comes from the popover's selected student state, NOT the draft's existing studentId. Other required fields (title, language, cefrLevel, topic) are spread from the Lesson object.
- Show a spinner on the clicked draft item while the mutation is in-flight. On error, show a brief error message in the popover.
- On success: `queryClient.invalidateQueries({ queryKey: ['lessons'] })` to refresh both week view and drafts, then close the popover.
- Back button to return to main view

Uses base-ui Popover (via `@/components/ui/popover`), `PopoverTrigger` with `render` prop for the "+" button. Pattern reference: `ExportButton.tsx` (open/onOpenChange, render prop).

### 2. Modify: `frontend/src/components/dashboard/WeekStrip.tsx`

- Extend props: add `students: Student[]` and `unscheduledDrafts: Lesson[]`
- Import and render `<SchedulePopover date={day} students={students} unscheduledDrafts={unscheduledDrafts} />` inside each day column, in the day header row (next to the day label) for consistent visibility regardless of how many lessons are in the column

### 3. Modify: `frontend/src/pages/Dashboard.tsx`

- Change the existing students query from `pageSize: 1` to `pageSize: 100` (use full list, derive count from `totalCount`). Note: this changes the queryKey from `['students', { pageSize: 1 }]` to `['students', { pageSize: 100 }]`. Nothing else in the app uses the old key, so this is safe.
- Compute `unscheduledDrafts = allDrafts.filter(l => !l.scheduledAt)`
- Pass `students` and `unscheduledDrafts` to WeekStrip

### 4. Modify: `frontend/src/pages/LessonNew.tsx`

- Import `useSearchParams` from react-router-dom
- Read `studentId` and `scheduledAt` from URL query params
- Use as initial values for the respective state variables
- No other changes needed (form already binds to these states)

### 5. Tests

**Unit: `frontend/src/components/dashboard/SchedulePopover.test.tsx`** (new)
- Renders "+" button
- Opens popover on click, shows student select and time input
- "Create New Lesson" navigates with correct query params
- Drafts sub-view shows unscheduled drafts
- Clicking a draft calls updateLesson mutation
- Filters drafts by selected student

**Unit: `frontend/src/pages/Dashboard.test.tsx`** (update)
- Update `mockGetStudents` to return actual student items (not just empty array with count) since SchedulePopover now renders with student data
- Add test: "renders schedule popover trigger in day columns"

**Unit: `frontend/src/pages/LessonNew.test.tsx`** (update)
- Add test: "pre-fills studentId and scheduledAt from URL query params"

**E2E: `e2e/tests/dashboard.spec.ts`** (add 2 tests)
- "schedule from dashboard via create new": create a student via API, click "+", select student + time, click "Create New Lesson", verify LessonNew URL has query params. Add `createStudentViaApi` and `deleteStudentViaApi` helpers (same pattern as `createLessonViaApi`).
- "assign draft from dashboard": create student + unscheduled draft via API, click "+", select student + time, click "Assign Existing Draft", click the draft, verify it moves from unscheduled to week strip

## Implementation Order

1. LessonNew.tsx query param pre-fill
2. SchedulePopover.tsx (new component)
3. WeekStrip.tsx (add new props + render SchedulePopover)
4. Dashboard.tsx (pass students and unscheduled drafts)
5. Unit tests (SchedulePopover, Dashboard, LessonNew)
6. E2E tests

## Key Details

- **UpdateLesson contract**: Backend requires title, language, cefrLevel, topic as required fields. When assigning a draft, spread these from the existing Lesson object and add scheduledAt + studentId.
- **Query invalidation**: Use `queryClient.invalidateQueries({ queryKey: ['lessons'] })` (prefix match) to invalidate all lesson queries at once after draft assignment.
- **Popover positioning**: Use `align="start"` and `side="bottom"` to avoid overflow on narrow day columns. Default `w-72` from PopoverContent is appropriate.
- **No backend changes needed**: existing updateLesson PUT endpoint handles scheduledAt + studentId updates.

## Verification

1. `cd frontend && npm run build` (zero errors)
2. `cd frontend && npm test` (all unit tests pass)
3. `cd backend && dotnet build` (zero warnings)
4. `cd backend && dotnet test` (all tests pass)
5. Run e2e tests: `npx playwright test e2e/tests/dashboard.spec.ts --project=mock-auth`
6. Manual check: open dashboard, click "+" on a day, create new lesson (verify pre-fill), assign draft (verify it moves)
