# Task 630: Multi-Native Language Picker UI

## Problem
StudentForm and OnboardingStep2 use a single-select dropdown for native language. When editing a student with multiple native languages (stored by backend), all but the first are silently dropped. Students.tsx and StudentProfileOverview.tsx already display all native languages correctly.

## Changes

### 1. Extract MultiSelect to shared component
- Move `MultiSelect` from `StudentForm.tsx` to `frontend/src/components/MultiSelect.tsx`
- Add `maxItems` prop (optional) to enforce max 5 for native languages
- Add `allowCustom` prop (default `true`) to disable custom entry for language picker

### 2. Fix StudentForm.tsx
- Line 213: change `[existing.nativeLanguages[0]]` to `existing.nativeLanguages`
- Replace single `<Select>` (lines 501-518) with `MultiSelect` using NATIVE_LANGUAGES options, maxItems=5, allowCustom=false
- Import MultiSelect from shared location instead of inline

### 3. Fix OnboardingStep2.tsx
- Replace single `nativeLanguage` state (string) with `nativeLanguages` (string[])
- Replace single `<Select>` with `MultiSelect`, maxItems=5, allowCustom=false
- Update mutate call to pass `nativeLanguages` array directly

### 4. No changes needed
- Students.tsx: already uses `.join(', ')`
- StudentProfileOverview.tsx: already uses `.join(', ')`

### 5. Tests
- Update StudentForm.test.tsx for multi-select assertions
- Update Onboarding.test.tsx for multi-select assertions
- Update e2e students.spec.ts if native language interactions exist

## AC Coverage
- [x] StudentForm.tsx multi-value UI (step 2)
- [x] OnboardingStep2.tsx multi-value UI (step 3)
- [x] Students.tsx displays all (already done, verified)
- [x] StudentProfileOverview.tsx displays all (already done, verified)
- [x] Round-trip data preservation (step 2, line 213 fix)
- [x] No backend changes
