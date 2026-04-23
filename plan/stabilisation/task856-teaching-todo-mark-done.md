# Task 856 — Add timestamp and mark-done to "ideas para próximas clases"

## Summary
Add hide-by-default and "show N completed" toggle to TeachingTodosCard. Backend already has all required fields (CreatedAt, Status with done/covered/dismissed). Frontend already renders timestamps.

## What's already done
- `TeachingTodoDto` has `CreatedAt` and `Status` (accepts `done`)
- `TeachingTodosCard` renders relative timestamps
- Toggle exists but uses `covered` (session-auto) — change to `done` for manual marking

## Changes

### Frontend only

**`TeachingTodosCard.tsx`**
- Change `handleToggle`: pending → done, done/covered → pending
- Add `showCompleted` state (default false)
- Filter displayedTodos: hide done/covered/dismissed when !showCompleted
- Compute completedCount from all todos (server + optimistic)
- Render "Show N completed" button below list when completedCount > 0

**`TeachingTodosCard.test.tsx`**
- Update toggle test: expect `{ status: 'done' }` not `{ status: 'covered' }`
- Add DONE_TODO fixture
- Add tests: completed hidden by default, toggle shows them, count label

## Acceptance criteria mapping
- [x] Timestamp visible — already done
- [ ] Mark done toggle → done status, pending hidden → done, done → pending
- [ ] Done hidden by default
- [ ] "show N completed" toggle
- [x] New ideas default to pending
