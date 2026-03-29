# Task 375: FullLessonGenerateButton missing sectionType

## Problem
`FullLessonGenerateButton.tsx` omits `sectionType` from the `streamText` call and `generationParams`, so all conversation blocks (WarmUp, Production, WrapUp) receive the generic conversation prompt instead of section-specific prompts.

## Fix (2 lines + 1 test)

### 1. `streamText` call (~line 107)
Add `sectionType` to the request body object.
- The loop variable is `sectionType` (values: 'WarmUp', 'Production', 'WrapUp')
- Backend uses `OrdinalIgnoreCase` comparison, so PascalCase is fine

### 2. `generationParams` (~line 123)
Add `sectionType` to the JSON.stringify object so regeneration also has section identity.

### 3. Unit test in `FullLessonGenerateButton.test.tsx`
Add test: "streamText receives correct sectionType for each section"
- Mock streamText, assert each call received the expected sectionType
- WarmUp → 'WarmUp', Production → 'Production', WrapUp → 'WrapUp'
- Presentation → sectionType not required (grammar, not conversation) but still passed
- Verify via `streamText.mock.calls`

## Files changed
- `frontend/src/components/lesson/FullLessonGenerateButton.tsx` (2-line fix)
- `frontend/src/components/lesson/FullLessonGenerateButton.test.tsx` (1 new test)

## No backend changes needed
Backend already reads `SectionType` from `GenerateRequest` and routes to section-specific prompts. The fix is purely on the frontend payload.
