# Task 348: Input Validation Hardening

## Problem

Two input validation gaps:

1. **Prompt injection in `CurriculumValidationService.cs`** (`targetLevel` parameter, line 42)
   - `targetLevel` is interpolated directly into the Claude API prompt with no sanitization.
   - Current code already sanitizes `grammarFocus` values (strips newlines, line 37-38), but missed `targetLevel`.
   - `PromptService.cs` has a `Sanitize` helper (strips all chars < 0x20 except tab) applied consistently to all user inputs - same approach should be used here.

2. **Unbounded array in `UpdateLearningTargetsRequest`**
   - `LearningTargets` is `string[]?` with no count bound.
   - A `MaxCollectionCountAttribute` already exists in DTOs - just needs to be applied.

## Audit of PromptService.cs

Already well-protected. `PromptService` has a static `Sanitize` method and applies it to all user-sourced fields in `BuildSystemPrompt` and all individual prompt builders. No unsanitized interpolations found.

## Changes

### 1. `backend/LangTeach.Api/Services/CurriculumValidationService.cs`
- Add private static `Sanitize` method (same pattern as `PromptService.Sanitize`)
- Apply `Sanitize(targetLevel)` at line 42 in the user prompt interpolation

### 2. `backend/LangTeach.Api/DTOs/UpdateLearningTargetsRequest.cs`
- Add `[MaxCollectionCount(50)]` attribute on `LearningTargets`

### 3. Extend `ConfigurableClaudeClient` (in `CurriculumGenerationServiceTests.cs`)
Add a `LastRequest` property (type `ClaudeRequest?`) that captures the last request passed to `CompleteAsync`. This lets sanitization tests assert on the actual prompt content.

### 4. Tests: `backend/LangTeach.Api.Tests/Services/CurriculumValidationServiceTests.cs`
New tests:
- `TargetLevel_WithInjectedNewlines_IsStrippedFromPrompt` - captures the ClaudeRequest via `ConfigurableClaudeClient.LastRequest` and asserts the user prompt does not contain the injected newline content
- `TargetLevel_WithControlChars_IsStrippedFromPrompt` - verifies other control chars (< 0x20) are stripped from `targetLevel`

### 4. Tests: `backend/LangTeach.Api.Tests/DTOs/UpdateLearningTargetsRequestTests.cs`
New test file:
- `LearningTargets_With50Items_IsValid` - passes validation
- `LearningTargets_With51Items_FailsValidation` - fails with descriptive error

## No e2e required
These are pure backend validation changes with no observable UI behavior change.
