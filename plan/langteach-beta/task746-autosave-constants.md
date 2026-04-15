# Task 746: Extract shared autosave constants and SaveStatus type

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/746

## Approach
- Create `frontend/src/hooks/autosaveConstants.ts` exporting `SaveStatus` type and the four timing constants
- Update `useStudentAutosave.ts` and `useSessionAutosave.ts` to import from this shared file
- No behavior change; tests unchanged

## Files changed
- `frontend/src/hooks/autosaveConstants.ts` (new)
- `frontend/src/hooks/useStudentAutosave.ts` (import updated)
- `frontend/src/hooks/useSessionAutosave.ts` (import updated)
