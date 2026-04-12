# Task 665: Teaching Todos Inline UI

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/665

## Context
Backend is complete (#627 + #688):
- `POST /api/students/{id}/teaching-todos` — create
- `PATCH /api/students/{id}/teaching-todos/{todoId}` — update status and/or text
- `DELETE /api/students/{id}/teaching-todos/{todoId}` — delete

The `StudentOverviewTab` (added by #688) exists with a read-only `TeachingTodosCard`.
`StudentProfileTab` also has a read-only card. Sessions tab has a stray read-only card
(to be removed — todos live in Overview per field mapping). `StudentForm` has no todos.

## Design decisions
- `studentId` derived from `student.id` inside Overview/Profile tab components (not an extra prop).
- Only `onStudentChange` added to those Props interfaces.
- Sessions tab `TeachingTodosCard` removed (it was a placeholder; Overview is the correct location).
- `allowEdit` prop enables delete + inline text edit (edit form sidebar only).
- Reorder deferred — no backend endpoint. Todos displayed pending-first, then covered/dismissed.
- `StudentForm` sidebar uses separate query key `['student', id]` to avoid resetting form fields.
- `StudentFollowupsCard` moves from below the form to the sidebar (same data, same query).

## Files to change

### 1. `frontend/src/api/students.ts`
Add:
```ts
appendTeachingTodo(studentId: string, text: string): Promise<Student>
updateTeachingTodo(studentId: string, todoId: string, update: { status: string; text?: string }): Promise<Student>
deleteTeachingTodo(studentId: string, todoId: string): Promise<Student>
```

### 2. `frontend/src/components/student/TeachingTodosCard.tsx`
Full rewrite. Props:
```ts
interface TeachingTodosCardProps {
  todos: TeachingTodo[]
  studentId: string
  onStudentChange: () => void
  allowEdit?: boolean   // enables delete + inline text edit; default false
}
```
- Local `localTodos` state for optimistic updates.
- On add: POST, optimistically append temp todo, on success onStudentChange + sync.
- On toggle: PATCH status, optimistically flip status.
- On delete (allowEdit): DELETE, optimistically remove.
- On text edit (allowEdit): PATCH text, optimistically update text.
- Sort: pending first, covered/dismissed after (stable within group by createdAt).
- Relative time: "2d ago", "just now", etc.
- Indigo convention: indigo ring checkbox for pending, green filled for covered.
- Empty state: "No ideas yet. Add one below." with input visible.

### 3. `frontend/src/components/student/TeachingTodosCard.test.tsx`
Full rewrite (all render calls need new required props). Cover:
- Empty state renders add prompt
- Renders list of todos with correct status styling
- Add mutation called on Enter / button click
- Toggle mutation called on checkbox click
- Delete mutation called (allowEdit=true)
- Pending todos sorted before covered ones

### 4. `frontend/src/components/student/StudentOverviewTab.tsx`
- Add `onStudentChange?: () => void` to Props.
- Pass `studentId={student.id}` and `onStudentChange={onStudentChange ?? (() => {})}` to TeachingTodosCard.

### 5. `frontend/src/components/student/StudentOverviewTab.test.tsx`
- Add `onStudentChange` where TeachingTodosCard renders (mock-mutation friendly).

### 6. `frontend/src/components/student/StudentProfileTab.tsx`
- Add `onStudentChange?: () => void` to Props.
- Pass `studentId={student.id}` and `onStudentChange` to TeachingTodosCard.

### 7. `frontend/src/components/student/StudentProfileTab.test.tsx`
- Update TeachingTodosCard test helpers to include new props.

### 8. `frontend/src/pages/StudentDetail.tsx`
- Add `onStudentChange = useCallback(() => { queryClient.invalidateQueries({ queryKey: ['student', id] }) }, [queryClient, id])`.
- Pass `onStudentChange` to `StudentOverviewTab` and `StudentProfileTab`.
- **Remove** `TeachingTodosCard` from sessions tab (the sessions tab renders session history; todos live in overview).

### 9. `frontend/src/pages/StudentForm.tsx`
Layout change for edit mode:
- Outer container: `isEdit ? 'grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start' : 'max-w-2xl space-y-6'`
- Left column: PageHeader + `<form>` + StudentCoursesCard (existing content).
- Right column (edit only, sticky): TeachingTodosCard (allowEdit=true) + StudentFollowupsCard.
  - Remove the existing StudentFollowupsCard below the form.
  - Add separate query: `queryKey: ['student', id]` → `studentSidebar`.
  - `onStudentChange` for todos: `() => queryClient.invalidateQueries({ queryKey: ['student', id] })`.
  - Followups remain on existing `['followups', id]` query.

### 10. `frontend/src/pages/StudentForm.test.tsx`
Add tests for teaching todos sidebar appearance in edit mode.

### 11. `e2e/tests/students.spec.ts`
E2E happy path:
1. Navigate to /students, click into a student with existing todos (from DemoSeeder).
2. Confirm overview tab is default; todos card is visible.
3. Add a new todo via the input.
4. Verify it appears in the list as pending.
5. Click its checkbox to mark as covered.
6. Verify strikethrough applied.
7. Verify the order: pending todos come before covered ones (use a student with mixed statuses from seeder).

## Acceptance criteria traceability
| AC | Covered by |
|----|-----------|
| Add inline (Overview + Profile) | Step 2 mutations + Steps 4, 6, 8 |
| Toggle status one click | Step 2 toggle + optimistic |
| Pending before covered | Step 2 sort |
| Covered = strikethrough + green | Step 2 styling |
| Relative time | Step 2 createdAt format |
| Edit form manageable (add/toggle/text/delete) | Step 9, allowEdit=true |
| Empty state with add prompt | Step 2 empty state |
| Optimistic UI | Step 2 local state |
| Indigo convention | Step 2 styling |
| Stitch design | Steps 2, 4, 6, 9 |
