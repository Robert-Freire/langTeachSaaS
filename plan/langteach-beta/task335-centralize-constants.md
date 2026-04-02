# Task 335: Centralize LANGUAGES and CEFR_LEVELS Constants

## Goal
Remove 8 inline copies of LANGUAGES and 6 inline copies of CEFR_LEVELS, replacing them with imports from canonical sources.

## Canonical Sources
- `CEFR_LEVELS`: already exists in `frontend/src/lib/cefr-colors.ts` (line 1)
- `LANGUAGES` + `NATIVE_LANGUAGES`: create `frontend/src/lib/languages.ts`

## Files to Change

### New file
- `frontend/src/lib/languages.ts` — export LANGUAGES and NATIVE_LANGUAGES

### Remove inline LANGUAGES + add import from @/lib/languages
- `frontend/src/pages/Lessons.tsx` (line 28)
- `frontend/src/pages/LessonNew.tsx` (line 19)
- `frontend/src/pages/LessonEditor.tsx` (line 54)
- `frontend/src/pages/CourseNew.tsx` (line 23)
- `frontend/src/pages/Settings.tsx` (line 13)
- `frontend/src/pages/StudentForm.tsx` (line 40)
- `frontend/src/pages/onboarding/OnboardingStep1.tsx` (line 10)
- `frontend/src/pages/onboarding/OnboardingStep2.tsx` (lines 15-17, also NATIVE_LANGUAGES)

### Remove inline CEFR_LEVELS + add import from @/lib/cefr-colors (if not already imported)
- `frontend/src/pages/Lessons.tsx` (line 29) — already imports getCefrBadgeClasses, add CEFR_LEVELS
- `frontend/src/pages/LessonNew.tsx` (line 20) — no existing cefr-colors import
- `frontend/src/pages/Settings.tsx` (line 14) — no existing cefr-colors import
- `frontend/src/pages/StudentForm.tsx` (line 41) — no existing cefr-colors import
- `frontend/src/pages/onboarding/OnboardingStep1.tsx` (line 11) — no existing cefr-colors import
- `frontend/src/pages/onboarding/OnboardingStep2.tsx` (line 16) — no existing cefr-colors import
- Note: CourseNew.tsx (line 17) already imports CEFR_LEVELS correctly; just remove the stale inline LANGUAGES
- Note: LessonEditor.tsx (line 39) already imports CEFR_LEVELS correctly; just remove inline LANGUAGES

## Implementation Steps
1. Create `frontend/src/lib/languages.ts`
2. Update all 8 pages (remove inline consts, add imports)
3. Run frontend tests: `npm test -- --run`

## No behavior change
Pure import refactoring. NATIVE_LANGUAGES (adds Catalan) is preserved as a named export.
