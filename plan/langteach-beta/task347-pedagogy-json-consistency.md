# Task 347: Fix pedagogy JSON data consistency issues

## Status: PLAN

## Summary

All 4 data consistency issues are already handled in the existing C# code. The task
is to add unit tests that lock in the correct behavior before Pedagogical Quality
sprint consumers are built.

## Issue Analysis

### 1. Persian `family: null` (already null-guarded in code)
- `SpecificLanguage.Family` is `string?` in PedagogyConfig.cs
- `ResolveLang` line 326: `if (specific.Family is not null && ...)`
- Persian returns `(null, specific)` -- no NullReferenceException
- **Missing: no test for Persian specifically**

### 2. vocabularyPerLesson vs vocabularyApproach (already handled)
- Both fields are nullable in `CefrLevelRules`
- `GetVocabularyGuidance` already handles both cases
- Tests `GetVocabularyGuidance_UpperLevels_ReturnsApproachString` and `_LowerLevels_ReturnsNumericFields` already cover this
- **No new test needed**

### 3. warmUp vs warmup casing (already handled)
- Template sections dict uses `StringComparer.OrdinalIgnoreCase`
- `NormalizeSection` maps "warmup" -> "warmUp" for template lookups
- **Missing: no test for cross-file key lookup with lowercase "warmup"**

### 4. neverSubstituteWith glob patterns (already handled for current consumer)
- PromptService uses `string.Join(", ", sub.NeverSubstituteWith)` - passes "EE-*" as text to AI
- `ValidateCrossLayerRefs` skips wildcard entries (`Where(id => !id.Contains('*'))`)
- **Missing: no test verifying glob pattern is preserved (not incorrectly expanded or stripped)**

## Implementation

### File to modify
`backend/LangTeach.Api.Tests/Services/PedagogyConfigServiceTests.cs`

### Tests to add (3 new tests)

1. **Persian null family** - `GetL1Adjustments_Persian_DoesNotThrowAndReturnsSpecificNotes`
   - Call `GetL1Adjustments("persian")`
   - Assert: not null (Persian has additionalNotes)
   - Assert: Notes contains Persian-specific content
   - Assert: AdditionalExerciseTypes is empty (no family adjustments)

2. **warmUp/warmup cross-file casing** - `GetValidExerciseTypes_WarmUp_ConversationTemplate_LowercaseKeyFindsWarmUpSection`
   - Call `GetValidExerciseTypes("warmup", "B1", templateId: "conversation")`
   - Assert: contains EO-08 (Conversation template's warmUp priorityExerciseTypes includes EO-08)
   - Assert: EO-08 is first (priority re-ordering worked via case-insensitive lookup)

3. **NeverSubstituteWith glob preserved** - `GetAllStyleSubstitutions_RolePlay_NeverSubstituteWithPreservesGlobPattern`
   - Call `GetAllStyleSubstitutions()`
   - Find "role-play" substitution
   - Assert: NeverSubstituteWith contains "EE-*" (raw pattern preserved, not expanded)
   - This also confirms ValidateCrossLayerRefs skipped the wildcard entry (service constructed without throwing)

## No other file changes needed
The C# code and JSON files are already correct. No data changes, no service changes.
