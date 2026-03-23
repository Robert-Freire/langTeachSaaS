# Task 151: CEFR Mismatch Warning

**Issue:** #151 — Warn teacher when lesson/course CEFR level mismatches assigned student level
**Branch:** `worktree-task-t151-cefr-mismatch-warning`
**Sprint:** Curriculum & Personalization

## Problem

No feedback when a teacher assigns a student to a lesson/course with a very different CEFR level (e.g., A1 student on a C1 lesson). The system should warn, not block.

## Scope

Three surfaces need the warning:
1. **LessonEditor** - shown when `lesson.cefrLevel` and student's `cefrLevel` diverge by 2+ levels
2. **LessonEditor (metadata edit form)** - shown while editing the CEFR level field (live feedback)
3. **CourseNew** - shown when `studentId` and `targetCefrLevel` are both set and diverge by 2+ levels

Warning threshold: gap >= 2 (e.g., B1 student + C2 lesson = gap 3, warn; B1 + B2 = gap 1, no warn)

## Implementation Plan

### 1. CEFR utility (`frontend/src/lib/cefr-colors.ts`)

Add two exports:
```ts
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export function getCefrGap(level1: string, level2: string): number
```
`getCefrGap` returns the absolute index difference, or 0 if either level is unknown or `undefined`.

> Note: `CEFR_LEVELS` is already defined locally in LessonEditor.tsx. Check if it's exported from cefr-colors.ts or needs to be moved.

### 2. `CefrMismatchWarning` component (`frontend/src/components/CefrMismatchWarning.tsx`)

Props:
```ts
interface CefrMismatchWarningProps {
  studentName: string;
  studentLevel: string;
  lessonLevel: string;
}
```

Renders:
- Amber inline banner (Tailwind: `bg-amber-50 border border-amber-200 text-amber-800`)
- Text: "**{studentName}** is currently {studentLevel}. This lesson is set to {lessonLevel}, which is {N} levels {above/below} their current level. Is this intentional?"
- Dismissable with an X button (local `useState` for dismissed state, resets if props change via `useEffect`)

Only renders when `getCefrGap(studentLevel, lessonLevel) >= 2`.

### 3. LessonEditor.tsx

Two places to add the warning:

**A. Context bar (view mode)** - after the student slot, when lesson has both `studentId` and `cefrLevel`:
- Look up student from `studentsData` by `lesson.studentId` to get `student.cefrLevel`
- If `lesson.studentName` is known and `getCefrGap >= 2`, render `<CefrMismatchWarning>`

**B. Metadata edit form** - when editing the CEFR level dropdown (`metaDraft.cefrLevel` state, note: the edit draft state is `metaDraft` not `editForm`), show warning live if student is assigned:
- The edit draft has no `studentId` field. Use `lesson.studentId` (the saved lesson value) to look up the student in `studentsData`
- Render `<CefrMismatchWarning>` below the CEFR select in the metadata panel

### 4. CourseNew.tsx

After the student selector and the CEFR level selector, look up the selected student's `cefrLevel` from the students query and compare with `targetCefrLevel`. If gap >= 2, render `<CefrMismatchWarning>`.

## Tests

### Unit tests (Vitest + RTL)

**`CefrMismatchWarning.test.tsx`** (next to component):
- Shows warning when gap >= 2
- Does not show when gap < 2
- Warning text includes student name, both levels, and direction
- Dismissable (X button hides banner)
- Re-shows after level change (useEffect reset)

**`cefr-colors.test.ts`** (or extend existing if there is one):
- `getCefrGap('A1', 'C1')` = 4
- `getCefrGap('B1', 'B2')` = 1
- `getCefrGap('C2', 'A1')` = 5
- `getCefrGap('A1', '')` = 0 (unknown level)

**LessonEditor.test.tsx** (extend if exists, else create):
- Renders warning when student cefrLevel and lesson cefrLevel diverge by 2+
- Does not render warning for adjacent levels

**CourseNew.test.tsx** (new or extend):
- Renders warning when student and target level diverge by 2+

### 5. E2E test (`e2e/tests/cefr-mismatch-warning.spec.ts`)

Happy-path test for CourseNew (simplest flow to verify the warning renders):
- Create a student with a known CEFR level (e.g., A1)
- Navigate to course creation, select that student
- Set `targetCefrLevel` to C1 (gap = 4)
- Assert the amber warning banner is visible and contains the student's level and the course level
- Dismiss the banner and assert it disappears

## Out of scope

- Backend validation (issue says soft warning only, frontend-only is sufficient)
- Course editing (only course *creation* via CourseNew.tsx is mentioned)
- No warning for gap = 1 (B1+B2 is normal stretching)

## Notes

- `CEFR_LEVELS` is currently duplicated in both LessonEditor.tsx (line 53) and CourseNew.tsx (line 17). After adding the export to `cefr-colors.ts`, replace both local definitions with the import to eliminate the duplication.
- `student.cefrLevel` is typed as `string | undefined` in the Student interface. `getCefrGap` must handle `undefined` inputs, not just empty string.

## File list

| File | Action |
|------|--------|
| `frontend/src/lib/cefr-colors.ts` | Add `getCefrGap()` and export `CEFR_LEVELS` |
| `frontend/src/components/CefrMismatchWarning.tsx` | Create |
| `frontend/src/components/CefrMismatchWarning.test.tsx` | Create |
| `frontend/src/lib/cefr-colors.test.ts` | Create or extend |
| `frontend/src/pages/LessonEditor.tsx` | Add warning in context bar + metadata edit form |
| `frontend/src/pages/LessonEditor.test.tsx` | Extend (add CEFR warning cases) |
| `frontend/src/pages/CourseNew.tsx` | Add warning |
| `frontend/src/pages/CourseNew.test.tsx` | Extend (add CEFR warning cases) |
| `e2e/tests/cefr-mismatch-warning.spec.ts` | Create (happy-path: CourseNew warning appears + dismissable) |
