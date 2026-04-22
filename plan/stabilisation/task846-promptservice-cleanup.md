# Task 846: PromptService Cleanup

## Issue
Fix 5 prompt-health issues in `BuildSystemPrompt` introduced with new student fields.

## Files Changed
- `backend/LangTeach.Api/Data/Models/Student.cs` - add `GetAge()`
- `backend/LangTeach.Api/AI/IPromptService.cs` - replace `StudentBirthYear` with `StudentAge` in `GenerationContext`
- `backend/LangTeach.Api/Controllers/GenerateController.cs` - use `StudentAge: student?.GetAge()` (2 places)
- `backend/LangTeach.Api/AI/PromptService.cs` - 5 fixes in `BuildSystemPrompt`
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` - update 2 tests

## Changes

### Finding 1: SpokenLanguages computed once
In `BuildSystemPrompt`, compute `spokenLangs` before the profile data block. Reuse for both the `- Also speaks:` data line (currently lines 460-464) and the cross-language instruction (currently lines 476-481). Remove the second `spokenForPrompt` computation.

### Finding 2: Merge overlapping personalization directives
Replace lines 471-474:
```
Personalize content for this student. Reference their interests in examples.
[if reasonForStudying]: Anchor vocabulary, topics, and examples to the student's stated study motivation.
```
With one conditional line:
```csharp
var motivationSuffix = reasonForStudying.Length > 0
    ? $", and anchor vocabulary to their stated study motivation: {reasonForStudying}"
    : string.Empty;
sb.AppendLine($"Personalize content for this student. Reference their interests in examples{motivationSuffix}.");
```

### Finding 3: Remove duplicate native language heading
Remove `sb.AppendLine($"The student's native language is {nativeLang}.");` (line 488). The three sub-bullets remain; they open directly without the now-redundant heading.

### Finding 4: Add CEFR priority cue
Add after the native language sub-bullets block (before `StudentDifficulties`), conditional on `officialCefr.Length > 0`:
```csharp
if (officialCefr.Length > 0)
    sb.AppendLine("Use the teacher assessment level for content difficulty decisions; the official level is for reference only.");
```

### Finding 5: Move age computation to Student.GetAge()
- `Student.cs`: Add `public int? GetAge() { ... }` with bounds check (birth year between `currentYear - 120` and `currentYear`).
- `GenerationContext`: Replace `int? StudentBirthYear` with `int? StudentAge`.
- `GenerateController.cs`: Replace `StudentBirthYear: student?.BirthYear` with `StudentAge: student?.GetAge()` (2 locations: lines ~203 and ~370).
- `PromptService.cs`: Replace inline age calculation with `ctx.StudentAge` directly (no computation in prompt builder).

## Tests
- `BirthYear_AgeComputedInSystemPrompt`: rename to `Age_IncludedInSystemPrompt`, use `StudentAge = DateTime.UtcNow.Year - 1990` instead of `StudentBirthYear = 1990`, drop the manual age calculation in the test.
- `OfficialCefrLevel_IncludedWithTeacherLevelWhenSet`: add assertion for `"teacher assessment level"` priority cue sentence.

## Acceptance Criteria Coverage
- [x] SpokenLanguages filtered array computed once and reused
- [x] Single personalization directive covers both interests and study motivation
- [x] Native language appears once as data fact; sub-bullets follow without repeating the declaration
- [x] CEFR priority cue present when both levels in the prompt
- [x] Age calculation in Student.GetAge(); PromptService calls the computed value
