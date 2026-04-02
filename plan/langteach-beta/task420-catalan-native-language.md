# Task 420: Fix Catalan missing from AllowedNativeLanguages

## Problem
`NATIVE_LANGUAGES` in `frontend/src/lib/languages.ts` includes "Catalan" but the backend
`AllowedNativeLanguages` HashSet in `StudentService.cs` does not. Selecting Catalan as
native language during onboarding throws a `ValidationException`.

## Acceptance Criteria
- Add "Catalan" to `AllowedNativeLanguages` in `StudentService.cs`
- Update comment to reference `frontend/src/lib/languages.ts` `NATIVE_LANGUAGES` as source of truth
- Verify all NATIVE_LANGUAGES entries exist in AllowedNativeLanguages (they match after fix)
- At least one unit test confirms Catalan is accepted
- E2E test verifies onboarding with Catalan native language completes successfully

## Changes

### 1. `backend/LangTeach.Api/Services/StudentService.cs`
- Add `"Catalan"` to `AllowedNativeLanguages` HashSet
- Update comment: reference `frontend/src/lib/languages.ts` `NATIVE_LANGUAGES`

### 2. `backend/LangTeach.Api.Tests/Services/StudentServiceTests.cs` (new file)
- Test: Catalan is accepted as native language (creates student without ValidationException)
- Test: Unknown language is rejected with ValidationException
- Test: null native language is accepted
- Uses in-memory DB + NullLogger, same pattern as CourseServiceTests

### 3. `e2e/tests/onboarding.spec.ts`
- Add new test: onboarding step 2 with Catalan as native language completes successfully
- Uses `data-testid="onboarding-native-language"` selector already in place

## Impact
- No schema changes, no migrations
- No frontend changes (frontend already has Catalan)
- Low blast radius: single HashSet change + tests
