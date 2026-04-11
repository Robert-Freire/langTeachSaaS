# Task 653 - Refactor: move prompt construction to PromptService

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/653

## Problem summary
Three services build prompts inline and call `IClaudeClient` directly:
- `ReflectionExtractionService` - `BuildSystemPrompt` static method, `_claude.CompleteAsync` direct
- `ReplanSuggestionService` - `SystemPrompt` const + `BuildUserPrompt` method, `_claude.CompleteAsync` direct
- `CurriculumValidationService` - inline system/user strings, `_claude.CompleteAsync` direct, inline fence stripping

`DifficultyConstants.cs` also hardcodes pedagogical vocabulary in C#.

Reference correct pattern: `CurriculumGenerationService` calls `_prompts.BuildCurriculumPrompt(ctx)` to get a `ClaudeRequest`, then calls `_claude.CompleteAsync(request, ct)`.

## Acceptance criteria (from issue)
- [x] `ReflectionExtractionService` prompt assembly moves to PromptService
- [x] `ReplanSuggestionService` prompt assembly moves to PromptService
- [x] `CurriculumValidationService` prompt assembly moves to PromptService; fence-stripping uses `ContentJsonHelper.StripFences`
- [x] Services call `_prompts.BuildXxxPrompt(...)` then `_claude.CompleteAsync(request, ct)` (same pattern as CurriculumGenerationService)
- [x] `DifficultyConstants` values extracted to `data/pedagogy/difficulty-taxonomy.json`, loaded via PedagogyConfigService
- [x] Existing unit tests updated to reflect new structure
- [x] Architecture model updated if boundary clarifications needed

## Implementation plan

### Step 1 - Add context records to IPromptService

In `backend/LangTeach.Api/AI/IPromptService.cs`, add:

```csharp
public record ReplanSuggestionContext(
    string CourseName,
    string Language,
    string? TargetCefrLevel,
    string? StudentName,
    IReadOnlyList<TaughtEntryContext> TaughtEntries,
    IReadOnlyList<PlannedEntryContext> PlannedEntries,
    IReadOnlyList<string> Difficulties,
    int MaxSuggestions
);

public record CurriculumValidationContext(
    string TargetLevel,
    IReadOnlyList<string> AllowedGrammar,
    IReadOnlyList<(int OrderIndex, string GrammarFocus)> EntriesWithGrammar
);
```

Note: `TaughtEntryContext` and `PlannedEntryContext` are currently `internal` records in `ReplanSuggestionService.cs`. Move them to `IPromptService.cs` (or a shared AI types file) with `public` visibility.

Add three new methods to `IPromptService`:
```csharp
ClaudeRequest BuildReflectionExtractionPrompt(DateOnly today, string teacherText);
ClaudeRequest BuildReplanSuggestionPrompt(ReplanSuggestionContext ctx);
ClaudeRequest BuildCurriculumValidationPrompt(CurriculumValidationContext ctx);
```

### Step 2 - Implement in PromptService.cs

Move the prompt text from the three services into `PromptService.cs`:

**BuildReflectionExtractionPrompt**: Move the system prompt string from `ReflectionExtractionService.BuildSystemPrompt(today)`. The teacher's raw text is the user prompt - it varies per call, so pass it as a parameter. Signature:
```csharp
ClaudeRequest BuildReflectionExtractionPrompt(DateOnly today, string teacherText);
```

For Replan and CurriculumValidation, all data needed to build both system and user prompts comes from the context record:
```csharp
ClaudeRequest BuildReplanSuggestionPrompt(ReplanSuggestionContext ctx);
ClaudeRequest BuildCurriculumValidationPrompt(CurriculumValidationContext ctx);
```

**PromptService implementations:**
- `BuildReflectionExtractionPrompt`: system = the moved string from `ReflectionExtractionService.BuildSystemPrompt`, user = `teacherText`, model = Haiku, maxTokens = 1024
- `BuildReplanSuggestionPrompt`: system = moved `SystemPrompt` const, user = logic from `BuildUserPrompt`, model = Haiku, maxTokens = 2048
- `BuildCurriculumValidationPrompt`: system = the CEFR grammar expert string, user = assembled from context fields, model = Sonnet, maxTokens = 1000

### Step 3 - Update ReflectionExtractionService

1. Inject `IPromptService` (add to constructor)
2. In `ExtractAsync`, replace:
   ```csharp
   var request = new ClaudeRequest(BuildSystemPrompt(...), text, ...);
   ```
   with:
   ```csharp
   var request = _prompts.BuildReflectionExtractionPrompt(DateOnly.FromDateTime(DateTime.UtcNow), text);
   ```
3. Remove `BuildSystemPrompt` static method (it moves to PromptService)
4. Keep `IClaudeClient` injection - service still calls `_claude.CompleteAsync(request, ct)`

### Step 4 - Update ReplanSuggestionService

1. Inject `IPromptService` (add to constructor)
2. In `GenerateSuggestionsAsync`, replace the `ClaudeRequest` construction with:
   ```csharp
   var context = new ReplanSuggestionContext(
       course.Name, course.Language, course.TargetCefrLevel, course.Student?.Name,
       taughtEntries, plannedEntries, difficulties, MaxSuggestions);
   var request = _prompts.BuildReplanSuggestionPrompt(context);
   ```
3. Remove `SystemPrompt` const and `BuildUserPrompt` static method
4. `TaughtEntryContext` and `PlannedEntryContext` become public records in `IPromptService.cs`
5. Keep `IClaudeClient` injection

### Step 5 - Update CurriculumValidationService

1. Inject `IPromptService` (add to constructor, remove `IClaudeClient` direct import in favor of going through it)

   Wait - `CurriculumValidationService` currently only has `IClaudeClient`. After refactor it will have both `IClaudeClient` and `IPromptService`. This matches `CurriculumGenerationService`.

2. In `ValidateAsync`, replace the inline `const string system` + `var user = ...` + `_claude.CompleteAsync` with:
   ```csharp
   var ctx = new CurriculumValidationContext(targetLevel, allowedGrammar,
       entriesWithGrammar.Select(e => (e.OrderIndex, e.GrammarFocus!)).ToList());
   var request = _prompts.BuildCurriculumValidationPrompt(ctx);
   var response = await _claude.CompleteAsync(request, ct);
   var content = ContentJsonHelper.StripFences(response.Content) ?? string.Empty;
   ```
3. Remove inline fence-stripping code (the `if (content.StartsWith("```"))` block) - replaced by `ContentJsonHelper.StripFences`

### Step 6 - DifficultyConstants: extract to config

**New file:** `data/pedagogy/difficulty-taxonomy.json`
```json
{
  "competencies": ["Grammar", "Vocabulary", "Pronunciation", "Fluency", "Discourse"],
  "severities": ["low", "medium", "high"]
}
```

**Embed in project:** Add to `LangTeach.Api.csproj`:
```xml
<EmbeddedResource Include="..\..\data\pedagogy\difficulty-taxonomy.json"
                  Link="Pedagogy\difficulty-taxonomy.json" />
```

**Load in PedagogyConfigService:**
- Add `_difficultyTaxonomy` field (loaded from embedded resource)
- Add method to `IPedagogyConfigService`:
  ```csharp
  FrozenSet<string> GetValidDifficultyCompetencies();
  FrozenSet<string> GetValidDifficultySeverities();
  ```
- Implement in `PedagogyConfigService` loading from the JSON

**Update callers:**
- `ReflectionExtractionService`: inject `IPedagogyConfigService`, replace `DifficultyConstants.ValidCompetencies` / `DifficultyConstants.ValidSeverities` with `_pedagogy.GetValidDifficultyCompetencies()` / `_pedagogy.GetValidDifficultySeverities()`
- `SessionLogService`: same injection + replacement

**`DifficultyConstants.cs`:** Delete the file (or keep for now if SessionLogService has complex tests - check first).

DifficultyConstants is called from 2 places. `SessionLogService` does NOT currently inject `IPedagogyConfigService` (constructor takes only `AppDbContext`, `IDifficultyTrendService`, `ILogger`). Adding `IPedagogyConfigService` injection is required - add to its constructor and update DI registration in `Program.cs` (if not already there for other reasons). Return type for `GetValidDifficultyCompetencies`/`GetValidDifficultySeverities` must be `FrozenSet<string>` built with `StringComparer.OrdinalIgnoreCase` to preserve existing case-insensitive `.Contains()` behavior.

### Step 7 - Update unit tests

**ReflectionExtractionServiceTests:**
- `CreateSut` (line 40) constructs `ReflectionExtractionService(client, NullLogger...)` with 2 args - update to include `IPromptService` stub as 3rd argument
- Lines 213 and 227 also call `new ReflectionExtractionService(client, NullLogger...)` directly - update both call sites to pass the stub
- Since `BuildSystemPrompt` moves to `PromptService`, the `BuildSystemPrompt_*` tests need to test `PromptService.BuildReflectionExtractionPrompt` instead
- Simplest: create a `FakePromptService : IPromptService` stub in the test file that returns a fixed `ClaudeRequest`
- The `BuildSystemPrompt_ContainsLanguagePreservationInstruction` and `BuildSystemPrompt_InjectsTodayForRelativeDateResolution` tests move to `PromptServiceTests.cs`

**CurriculumValidationServiceTests:**
- Constructor now takes `IPromptService` too
- The `ConfigurableClaudeClient` helper pattern works the same - `IPromptService` stub returns a fixed request
- The `TargetLevel_WithInjectedNewlines_IsStrippedFromPrompt` test now verifies the PromptService builds the right request - this becomes a `PromptServiceTests` test

**ReplanSuggestionServiceTests:**
- Constructor adds `IPromptService` - inject a stub
- Tests for `BuildUserPrompt` (if any are explicit) move to PromptServiceTests

**PromptServiceTests (existing or new):**
- Add tests for `BuildReflectionExtractionPrompt` (contains expected strings, injects date, etc.)
- Add tests for `BuildReplanSuggestionPrompt`
- Add tests for `BuildCurriculumValidationPrompt` (input sanitization, fence handling)

### Step 8 - Architecture model update

Check `docs/architecture-model.md` - confirm or update the AI layer boundary rule to reflect that `PromptService` now also owns reflection, replan, and curriculum validation prompt construction.

## Files changed

| File | Change |
|------|--------|
| `backend/LangTeach.Api/AI/IPromptService.cs` | Add 3 methods + context records; make TaughtEntryContext/PlannedEntryContext public |
| `backend/LangTeach.Api/AI/PromptService.cs` | Implement BuildReflectionExtractionPrompt, BuildReplanSuggestionPrompt, BuildCurriculumValidationPrompt |
| `backend/LangTeach.Api/Services/ReflectionExtractionService.cs` | Inject IPromptService, remove BuildSystemPrompt |
| `backend/LangTeach.Api/Services/ReplanSuggestionService.cs` | Inject IPromptService, remove SystemPrompt const + BuildUserPrompt |
| `backend/LangTeach.Api/Services/CurriculumValidationService.cs` | Inject IPromptService, remove inline prompts, use StripFences |
| `data/pedagogy/difficulty-taxonomy.json` | New config file |
| `backend/LangTeach.Api/LangTeach.Api.csproj` | Embed difficulty-taxonomy.json |
| `backend/LangTeach.Api/Services/IPedagogyConfigService.cs` | Add GetValidDifficultyCompetencies/Severities |
| `backend/LangTeach.Api/Services/PedagogyConfigService.cs` | Load and expose difficulty taxonomy |
| `backend/LangTeach.Api/DTOs/DifficultyConstants.cs` | Delete |
| `backend/LangTeach.Api/Services/SessionLogService.cs` | Add IPedagogyConfigService injection; use it for difficulty validation (was DifficultyConstants) |
| `backend/LangTeach.Api.Tests/Services/ReflectionExtractionServiceTests.cs` | Update for IPromptService injection; move BuildSystemPrompt tests |
| `backend/LangTeach.Api.Tests/Services/CurriculumValidationServiceTests.cs` | Update for IPromptService injection |
| `backend/LangTeach.Api.Tests/Services/ReplanSuggestionServiceTests.cs` | Update for IPromptService injection |
| `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` | Add tests for new methods (check if file exists first) |
| `docs/architecture-model.md` | Update AI layer description if needed |

## E2E impact
None - this is a pure internal refactor. No API contract changes.

## Test approach
Unit tests only - all AI prompt logic is testable without hitting Claude. The 3 affected service test files need stubs for `IPromptService`. The moved prompt construction logic gets coverage in `PromptServiceTests`.
