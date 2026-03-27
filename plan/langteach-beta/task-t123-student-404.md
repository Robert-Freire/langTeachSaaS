# Task T123: Invalid student URL shows blank page instead of 404

## Problem
Two gaps cause blank pages on invalid student URLs:
1. `/students/<invalid-id>` (no `/edit`) has no route, so React Router renders nothing
2. `/students/<invalid-id>/edit` doesn't check `isError` from `useQuery`, so a failed fetch shows loading indefinitely

## Solution

### 1. Add not-found handling in StudentForm (`frontend/src/pages/StudentForm.tsx`)
- Destructure `isError` from the `useQuery` call (line 155)
- After the loading skeleton block (line 260), add an error check:
  ```tsx
  if (isEdit && (isError || (!isLoading && !existing))) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-sm text-red-600 font-medium">
          Student not found. <button onClick={() => navigate('/students')} className="underline">Go back</button>
        </span>
      </div>
    )
  }
  ```
  This matches the LessonEditor pattern (lines 392-398).

### 2. Add catch-all route for `/students/:id` (`frontend/src/App.tsx`)
- Add `<Route path="/students/:id" element={<Navigate to="/students" replace />} />` after the edit route
- This redirects `/students/some-id` to `/students` since there's no student detail view page

### 3. Unit test (`frontend/src/pages/StudentForm.test.tsx`)
- Test that when `getStudent` rejects, the "Student not found" message is displayed
- Test that the "Go back" button navigates to `/students`

### 4. E2E test
- Add a test case in the students e2e spec navigating to `/students/nonexistent/edit` and asserting the not-found message appears

## Files to modify
- `frontend/src/pages/StudentForm.tsx` (add isError handling)
- `frontend/src/App.tsx` (add redirect route)
- `frontend/src/pages/StudentForm.test.tsx` (new or update, unit tests)
- `e2e/tests/students.spec.ts` (add 404 e2e test)
