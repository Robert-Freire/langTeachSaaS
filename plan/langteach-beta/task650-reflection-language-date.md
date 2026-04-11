# Task 650: Reflection Extraction - Preserve Language & Add Session Date

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/650

## Type
Hotfix. Branch from `main`, PR to `main`.

## Problem
1. Extraction prompt has no instruction to preserve the teacher's original language, so Claude translates Spanish reflections to English.
2. No `sessionDate` field in `ExtractedReflectionDto` or the prompt schema, so temporal references ("ayer", "el martes") are discarded.

## Files Changed
- `backend/LangTeach.Api/DTOs/ReflectionExtractionDtos.cs`
- `backend/LangTeach.Api/Services/ReflectionExtractionService.cs`
- `backend/LangTeach.Api.Tests/Services/ReflectionExtractionServiceTests.cs`

## Changes

### 1. `ExtractedReflectionDto` (DTOs file)
Add `string? SessionDate` as the last positional field before `SuggestedDifficulties`.

### 2. System prompt (ReflectionExtractionService.cs)
- Add explicit instruction: "Preserve the original language of the teacher's text. Do not translate any field value."
- Add `sessionDate` to the JSON schema: `string or null - ISO 8601 date (YYYY-MM-DD) if the teacher mentions a specific session date or a resolvable relative reference ("ayer", "el martes pasado", "last Tuesday") relative to today; null if no date is mentioned or cannot be resolved. Today's date is not injected — use null if the reference is ambiguous.`

Note: We do NOT inject today's date into the prompt at runtime. The instruction tells Claude to resolve relative references where it can, but unresolvable ones return null. This is acceptable for now.

### 3. `ParseResponse` (ReflectionExtractionService.cs)
- Extract `sessionDate` from the JSON element.
- Add to the `ExtractedReflectionDto` constructor call.
- Update the fallback return (both in `ExtractAsync` error path and `ParseResponse` exception path) to include `null` for `SessionDate`.

### 4. Tests (ReflectionExtractionServiceTests.cs)
- All existing tests: add `.SessionDate.Should().BeNull()` where appropriate (fields not set = null).
- New test `ParseResponse_PreservesOriginalLanguageInPrompt`: verifies the system prompt contains the word "language" and "translate" (smoke check that the instruction is present).
- New test `ParseResponse_ExtractsSessionDate`: JSON with `sessionDate: "2026-04-08"` is parsed correctly.
- New test `ParseResponse_SessionDateIsNullWhenAbsent`: JSON without `sessionDate` field returns null.
- New test `ParseResponse_SessionDateIsNullWhenExplicitlyNull`: JSON with `sessionDate: null` returns null.

## Acceptance Criteria Coverage
- [x] Prompt includes explicit preserve-language instruction
- [x] `sessionDate` field added to `ExtractedReflectionDto`
- [x] Prompt instructs Claude to parse relative date references into ISO 8601, null when none
- [x] Existing unit tests updated; new test cases for both behaviors
- [x] No changes to Azure Speech transcription layer
