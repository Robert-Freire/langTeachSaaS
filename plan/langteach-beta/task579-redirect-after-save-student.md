# Task 579: Redirect to student profile after save

## Issue
After creating or updating a student, the app redirects to `/students` (the list).
Jordi expects to land on the student's profile page (`/students/:id`).

## Acceptance Criteria
- After creating a new student: redirect to the new student's profile page
- After updating an existing student: redirect back to that student's profile page

## Implementation Plan

### 1. `frontend/src/pages/StudentForm.tsx`
- In the `useMutation` `onSuccess` callback, use the returned `Student` object's `id` to navigate to `/students/${student.id}` instead of `/students`.
- Both `createStudent` and `updateStudent` return `Promise<Student>`.

### 2. `frontend/src/pages/StudentForm.test.tsx`
- Add `mockUpdateStudent.mockResolvedValue({ id: 'stu-1' })` to beforeEach.
- Add test: create redirects to `/students/new-id`.
- Add test: update redirects to `/students/stu-1`.

### 3. `e2e/tests/students.spec.ts`
- Update all `toHaveURL('/students', ...)` assertions that follow a Save Student or Update Student click to instead assert `toHaveURL(/\/students\/[^/]+$/, ...)`.
- Leave the Cancel-button assertions pointing to `/students` unchanged.

## E2E Coverage
The existing e2e tests cover create and update flows; update URL assertions to match new redirect destination.
