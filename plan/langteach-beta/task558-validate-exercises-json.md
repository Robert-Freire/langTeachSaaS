# Task 558: ValidateExercisesContent - Return error on malformed JSON

## Problem

`ContentValidationService.ValidateExercisesContent` catches `JsonException` and returns `null` (treated as valid). This means a save request with `exercises` blockType and malformed JSON content is persisted without validation. Observed in code review of #422.

## Fix

**`ContentValidationService.cs`** - change the `catch (JsonException)` block to return `"Exercises content is not valid JSON"` instead of `null`.

**`LessonContentBlocksControllerTests.cs`** - add `Post_ExercisesWithMalformedJson_Returns400` integration test.

## Acceptance Criteria

- [x] `ValidateExercisesContent` returns `"Exercises content is not valid JSON"` when `JsonException` is thrown
- [x] Controller returns `400 Bad Request` with that error message instead of persisting malformed content
- [x] Unit test covers the `JsonException` path: malformed JSON input -> `400` response
- [x] Valid exercises JSON still passes validation and is persisted normally (pre-existing test covers this)

## Files Changed

- `backend/LangTeach.Api/Services/ContentValidationService.cs` - line 30: `null` -> error string
- `backend/LangTeach.Api.Tests/Controllers/LessonContentBlocksControllerTests.cs` - new test added
