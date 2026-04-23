# Task #853: Extract createStudentViaUI e2e Helper

## Summary

Extract repeated student-creation logic from e2e spec files into shared helpers in `e2e/helpers/students.ts`.

## Helpers Created

### `createStudentViaUI(page, options)`
- Navigates to `/students/new`, fills name + language + CEFR + optional native language, saves.
- Used by `followups.spec.ts` (1 occurrence) and `students.spec.ts` (9 occurrences).

### `createStudentViaApi(page, options)`
- POSTs to `/api/students` with defaults (Spanish, B1).
- Used by `session-log.spec.ts` (20 of 21 API creation blocks; 1 kept inline due to non-empty `difficulties`).

## Not Replaced

- `students.spec.ts` occurrences that add extra fields (weakness, goals, identity, skill overrides) before save: left inline as they test the creation form itself.
- `session-log.spec.ts` line ~467: creates student with pre-seeded difficulty; kept inline since the helper always uses empty arrays.
