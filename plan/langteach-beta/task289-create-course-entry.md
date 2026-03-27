# Task #289 — "Create Course" Entry Point on Student Detail Page

## Goal
Add a "Create Course" button to the student detail page (`StudentForm.tsx` in edit mode) that navigates to `CourseNew` with the student pre-selected and locked.

## Current State
- Student detail/edit page: `/students/:id/edit` → `StudentForm.tsx`
- Course creation: `/courses/new` → `CourseNew.tsx`
- `CourseNew` has a student selector (`studentId` state, populated from `getStudents()` list)
- No link exists between the student detail view and course creation

## Approach

### 1. StudentForm.tsx — Add "Create Course" button
- In edit mode (`isEdit === true`), add a "Create Course" button to the `PageHeader` actions area (alongside Cancel/Save buttons)
- Button is a `<Link>` to `/courses/new?studentId={id}` when enabled
- Enabled when `language` (learningLanguage) AND `cefrLevel` are both non-empty (minimum viable profile for curriculum generation)
- When disabled: use Shadcn `Tooltip` component wrapping the button with text "Complete student profile (language and CEFR level required) to create a course."
- Button variant: secondary/outline, rendered left of the Cancel button
- Tooltip: use `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` from `@/components/ui/tooltip`. Wrap the disabled button in `TooltipProvider > Tooltip > TooltipTrigger (asChild) > Button`. In tests, `TooltipProvider` must be included in the render wrapper.

### 2. CourseNew.tsx — Accept ?studentId param and lock selector
- Read `useSearchParams()` to get `studentId` query param on mount
- Derive `lockedStudentId` as a const (not state): `const [searchParams] = useSearchParams(); const lockedStudentId = searchParams.get('studentId') ?? undefined`
- Initialize `studentId` state with `lockedStudentId ?? undefined`
- When `lockedStudentId` is set:
  - Replace the student `<Select>` with a read-only display: find student in the loaded list and show their name. While the students query is loading OR if the student isn't found yet, show a skeleton placeholder (`<Skeleton className="h-9 w-full" />`).
  - The existing `students.length > 0` guard on the selector block is replaced entirely with a `lockedStudentId ? <locked view> : students.length > 0 ? <select> : null` structure
- Auto-fill `language` and `targetCefrLevel` from the pre-selected student via a `useEffect` triggered on `[students, lockedStudentId]`: when `lockedStudentId` is set and `students` array is populated, find the matching student and set `language` (if still empty) and `targetCefrLevel` (if still empty) from the student's `learningLanguage` and `cefrLevel`

### 3. Unit tests — StudentForm.test.tsx
- "Create Course button is present and links correctly for a complete profile" — mock student with language+cefrLevel, render in edit mode, assert button exists with correct href
- "Create Course button is disabled when profile is incomplete" — mock student without cefrLevel or language, assert button is disabled

### 4. Unit tests — CourseNew.test.tsx
- "student is pre-selected and locked when ?studentId param is present" — render with `initialEntries={['/courses/new?studentId=abc']}`, mock students list including the pre-selected student, assert student name appears as static text (not a dropdown)
- "student selector is normal dropdown without ?studentId param" — existing behavior unchanged

### 5. E2E test — add to students.spec.ts or courses.spec.ts
- Navigate to `/students/:id/edit` for a student with full profile
- Click "Create Course"
- Assert navigation to `/courses/new?studentId={id}`
- Assert the student name is shown locked (not a dropdown)

## Files to touch
- `frontend/src/pages/StudentForm.tsx`
- `frontend/src/pages/StudentForm.test.tsx`
- `frontend/src/pages/CourseNew.tsx`
- `frontend/src/pages/CourseNew.test.tsx`
- `e2e/tests/students.spec.ts` (or new spec)

## No backend changes needed
The CourseNew form already handles `studentId` in the `CreateCourseRequest`. Only the URL-param pre-fill and selector lock are new.

## Acceptance Criteria Mapping
- [x] AC1: "Create Course" button on student detail page in prominent location (header actions)
- [x] AC2: Clicking navigates to CourseNew with student pre-selected (via ?studentId param)
- [x] AC3: Student selector in CourseNew is pre-filled and not editable
- [x] AC4: Button disabled with tooltip when target language or CEFR level missing
- [x] AC5: Unit test — button renders and links correctly for complete profile
- [x] AC6: Unit test — button disabled when language or CEFR level missing
- [x] AC7: E2E test — clicking "Create Course" from student detail pre-selects student in CourseNew
