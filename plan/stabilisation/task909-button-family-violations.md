# Task 909: Button family violations — 4 screens

## Issue
#909 — Button family violations: primary and secondary on same row across 4 screens

## Findings after code investigation

### AC1: Dashboard "Quick Actions" — NextSessionHero.tsx
The issue description names them "New Lesson" and "New Student" (sweep mislabeled), but in code these are **"View profile" + "Start session"** in `frontend/src/components/dashboard/NextSessionHero.tsx` (lines 120-134).
- "View profile": branded outline `border border-[#3525CD] text-[#3525CD]`
- "Start session": gradient fill `bg-gradient-to-br from-[#3525CD] to-indigo-500 text-white`

Fix: change "View profile" from a border-outline style to a soft-fill secondary style (`bg-[#ECEAFD] text-[#3525CD] hover:bg-[#E0DDFA]`). Both remain `rounded-xl` pills in the same visual family.

### AC2: StudentForm create mode — StudentForm.tsx
Create mode shows Cancel + Save Student buttons (lines 642-651). Edit mode correctly uses a single "Done" button.
- Fix: remove Cancel button; rename "Save Student" to "Done" (keeps submit behavior; navigates to student detail on success).
- The `handleSubmit` stays the same — "Done" triggers form submit which calls `createStudent`.
- Large number of tests reference "Save Student" and "Cancel" in create mode.

### AC3: LessonEditor toolbar — LessonEditor.tsx
- "Log session" button (lines 510-519): indigo-tinted pill, conditionally rendered when `lesson.studentId` exists.
- "Preview as Student" (lines 521-529): zinc-tinted pill.
- Remove "Log session" from toolbar. After removal, remaining pills are FullLessonGenerateButton (outline, indigo hover) + Preview as Student (zinc fill pill). Align Preview as Student to match FullLessonGenerateButton's outline pill style.
- Student Detail page already has a "Log Session" button — confirmed entry point exists.
- `session-log-voice.spec.ts` uses `log-session-btn` from LessonEditor; must update to navigate via student detail instead.

### AC4: CourseDetail row actions — CourseDetail.tsx
- "Mark as taught" (lines 297-306): `variant="outline"` + green overrides `text-green-700 border-green-200 hover:bg-green-50`
- "Edit lesson" (lines 319-328): `variant="outline"` default (no color overrides)
- Fix: remove green color overrides from "Mark as taught" so both use identical default outline style.

## Files to change

### Implementation
1. `frontend/src/components/dashboard/NextSessionHero.tsx` — "View profile" styling
2. `frontend/src/pages/StudentForm.tsx` — remove Cancel, rename Save Student to Done
3. `frontend/src/pages/LessonEditor.tsx` — remove Log Session button; align Preview as Student to outline pill
4. `frontend/src/pages/CourseDetail.tsx` — remove green overrides from Mark as taught

### Unit tests
5. `frontend/src/pages/StudentForm.test.tsx` — update all references to "Save Student" → "Done", remove Cancel test, remove "Cancel navigates" test

### E2E tests
6. `e2e/tests/session-log-voice.spec.ts` — "voice recorder is accessible from the Lesson editor" test: replace lesson editor navigation + button click with direct `page.goto(/students/${student.id}/log-session?lessonId=${lesson.id})`. The StudentDetail log-session button does NOT carry lessonId, so we navigate directly to URL to preserve the pre-linking check. Update test name to reflect new entry point.
7. `e2e/tests/students.spec.ts` — "Save Student" → "Done" (8 places)
8. `e2e/tests/student-detail.spec.ts` — "Save Student" → "Done" (4 places)
9. `e2e/tests/cefr-mismatch-warning.spec.ts` — "Save Student" → "Done" (2 places)
10. `e2e/tests/courses.spec.ts` — "Save Student" → "Done" (1 place)
11. `e2e/tests/difficulty-targeting.spec.ts` — "Save Student" → "Done" (1 place)
12. `e2e/tests/lesson-student-autofill.spec.ts` — "Save Student" → "Done" (1 place)
13. `e2e/tests/navigation-flow.spec.ts` — "Save Student" → "Done" (1 place)

## Implementation steps

1. NextSessionHero.tsx: change "View profile" className
2. StudentForm.tsx: remove Cancel button block, change "Save Student" button to "Done"
3. LessonEditor.tsx: delete Log Session button block; update Preview as Student className to match outline pill
4. CourseDetail.tsx: remove green className overrides from "Mark as taught"
5. StudentForm.test.tsx: bulk update "Save Student" → "Done", delete Cancel tests
6. E2E tests: update "Save Student" → "Done" in 7 files, fix session-log-voice.spec.ts

## E2E coverage note
AC says "Visual specs for the four screens pass with updated screenshots" — this requires the review-ui agent after implementation.

The create flow still works identically (done button submits form, navigates to student detail on success). No behavioral regression.
