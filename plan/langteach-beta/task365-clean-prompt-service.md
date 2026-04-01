# Task 365: Clean PromptService.cs minor duplication

## Problem

Two prompt bloat issues in `PromptService.cs`:

1. **Line 920**: "All five sections (warmUp, presentation, practice, production, wrapUp) are required in every lesson plan." -- structurally enforced by `SectionOrder` array iteration.

2. **Lines 929-931**: Template restrictions emit `Do not use [X] exercises in this lesson.` (negative framing). `GetValidExerciseTypes()` handles structural enforcement via section profile forbidden types. The `TemplateRestriction` record already has a `Reason` field with a human-readable explanation that is positive/contextual and more useful to the model.

## Changes

### `backend/LangTeach.Api/AI/PromptService.cs`

1. Remove the "All five sections" sentence from the lesson plan prompt (line 920).

2. Replace negative restriction framing with the restriction's `Reason` field:
   - Old: `$"Do not use [{r.Value}] exercises in this lesson."`
   - New: `r.Reason`

## Test plan

- All existing backend tests pass (`dotnet test`)
- No new tests needed: this is pure prompt text change with no behavioral logic change
- Teacher QA spot-check (via `/teacher-qa sprint`) confirms no regression in generated lesson quality
