# Task 290: Course Creation End-to-End Flow

**Issue:** #290 — Course creation end-to-end flow: profile readiness → generation → course detail
**Sprint:** Student-Aware Curriculum
**Branch:** worktree-task-t290-e2e-course-flow

## Current State Analysis

Most of the end-to-end flow already exists and works:

- StudentForm has a "Create Course" button (disabled with tooltip if language/CEFR missing) that navigates to `/courses/new?studentId=<id>`
- CourseNew pre-fills language + CEFR from the locked student, shows StudentProfileSummary and teacher notes, and on generate navigates directly to `/courses/<id>`
- CourseDetail shows personalized `contextDescription` and `personalizationNotes` per session (conditionally, when present)
- Generation failure is shown as an error card in CourseNew; the Generate button stays active so users can retry
- Global Courses page has a generic empty state

## Gaps (Acceptance Criteria not yet met)

### AC 3 - CourseDetail error state lacks retry
Line 535–537 in `CourseDetail.tsx`: when `isError || !course`, renders just `<div>Failed to load course.</div>` — no retry button.

### AC 4 - No student-specific courses list
No component shows a student's linked courses from their profile page. The AC requires: "No courses yet. Create one from the student's profile." empty state. LessonHistoryCard shows lesson history; a StudentCoursesCard needs to show courses.

### AC 6 - Missing E2E: full happy path starting from student edit page
Existing courses.spec.ts starts from `/courses/new` directly. No test covers the student-edit → Create Course → CourseNew → CourseDetail flow.

### AC 7 - Missing E2E: generation failure + retry
No test verifies the error card appears when POST /api/courses fails and that the form stays interactive for retry.

## Implementation Plan

### 1. CourseDetail: add retry to error state
File: `frontend/src/pages/CourseDetail.tsx`

Change the `isError || !course` guard (line 535) to include a "Try again" button that triggers `queryClient.invalidateQueries({ queryKey: ['course', id] })`. Note: the query key is singular `'course'`, not plural.

Add `data-testid="course-load-error"` and `data-testid="course-load-retry-btn"` for testability.

### 2. New StudentCoursesCard component
File: `frontend/src/components/student/StudentCoursesCard.tsx`

- Calls `getCourses()` and filters by `studentId`
- Loading: 2 skeleton rows
- Empty state (`data-testid="student-courses-empty"`): "No courses yet." message + "Create Course" button that navigates to `/courses/new?studentId=${studentId}`. Text matches AC exactly.
- List: each course links to `/courses/<id>`, shows name, mode badge, and session progress (same pattern as Courses.tsx)

File: `frontend/src/components/student/StudentCoursesCard.test.tsx`
- test: renders loading skeletons
- test: renders empty state with correct message and button
- test: renders course list when courses exist
- test: Create Course button navigates correctly

### 3. Add StudentCoursesCard to StudentForm
File: `frontend/src/pages/StudentForm.tsx`

Add `<StudentCoursesCard studentId={id} />` just before `<LessonHistoryCard studentId={id} />` on line 645. Both are inside the `isEdit && id &&` guard.

### 4. E2E tests
File: `e2e/tests/courses.spec.ts` — append two new tests:

**Test A: "full happy path from student edit page"**
- Creates a student with Spanish A1 profile (real DB, no mock)
- Navigates to student edit page, clicks "Create Course"
- Verifies locked student display, auto-filled language + CEFR
- Mocks POST /api/courses and GET /api/courses/:id with fixture including one entry with `contextDescription`
- Submits, verifies navigation to CourseDetail
- Verifies sessions list visible and first entry shows personalized context (expand first entry, check `context-description-0`)

**Test B: "generation failure shows error card and form stays interactive"**
- Navigates to `/courses/new`
- Mocks POST /api/courses to return 500
- Fills required fields
- Clicks "Generate Curriculum"
- Verifies error card appears (red card with error text)
- Verifies form is still visible (not replaced by spinner or blank), Generate button still present
- (Optional) mocks second POST to succeed and verifies retry works

## Unit Tests Added/Modified

| File | Tests |
|------|-------|
| `StudentCoursesCard.test.tsx` | 4 new tests (loading, empty, list, navigation) |
| `CourseDetail.test.tsx` | 1 new test: error state renders retry button |

## No Backend Changes

Courses are filtered client-side by `studentId` from the existing `getCourses()` list. No new endpoint needed.

## Out of Scope

- "Confirm before save" preview step — the AC's "confirm" refers to the Generate button. Adding a separate preview step would be a new feature (the issue explicitly says "not about building new features").
- Student with no profile gracefully degrades already: StudentForm requires language + CEFR before enabling "Create Course" button. No further work needed.
