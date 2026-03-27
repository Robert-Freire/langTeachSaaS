# Task 167: AI Generation Quality Guardrails

## Issue
#167 - AI generation quality guardrails: validate content matches target level

## Problem
When the AI generates a curriculum in "free" mode, Claude freely chooses grammar focuses. These may accidentally exceed the target CEFR level (e.g., B1 text uses C1 pluperfect subjunctive). Teachers must manually proofread every output. The platform should eliminate that work by automatically flagging out-of-level grammar structures.

## Spike outcome: chosen approach
**Post-generation LLM validation call.** Rule-based string matching is unreliable because grammar labels are free-form strings (e.g., "Present Perfect Simple" vs "Present Perfect" vs "il Passato Prossimo"). A second Claude call with the target level's allowed grammar list as context produces specific, human-readable flags (e.g., "Subjunctive mood — expected max B1, this is C1"). The extra API call only runs for free-generation mode where the risk exists; template-based curricula are inherently level-correct by construction.

## What changes

### Backend

**1. New `CurriculumValidationService`**
- Interface: `ICurriculumValidationService`
- Method: `ValidateAsync(List<CurriculumEntry> entries, string targetLevel, IReadOnlyList<string> allowedGrammar)`
- Builds a prompt that includes:
  - Target CEFR level
  - The grammar structures expected at that level (from `allowedGrammar[].Grammar`)
  - The generated entries (session index + grammarFocus)
- Asks Claude to return a JSON array of flags: `[{ sessionIndex, grammarFocus, flagReason, suggestedLevel }]`
- If Claude returns no flags, returns empty list (all content passes)
- Model: use existing `IClaudeClient` (same pattern as `PromptService`)

**2. New `CurriculumWarning` record (DTOs)**
```csharp
record CurriculumWarning(int SessionIndex, string GrammarFocus, string FlagReason, string? SuggestedLevel);
```

**3. `CourseDto` update**
- `CourseDto` is a positional record. Append `List<CurriculumWarning>? Warnings` and `List<string>? DismissedWarningKeys` at the **end** of the constructor parameter list (after the last existing parameter). Update `MapToDto` in `CoursesController` accordingly, passing `warnings` and `dismissedWarningKeys` in the same terminal positions.

**4. `Course` entity update**
- Add two nullable string columns: `GenerationWarnings` and `DismissedWarnings` (both `string?`, JSON-serialized)
- New EF migration

**5. `CoursesController` changes**
- After `GenerateAsync` (which now returns the tuple), store `warnings` serialized to JSON into `course.GenerationWarnings`, then call `SaveChangesAsync` (one save covers both course creation and warnings)
- Include deserialized warnings in `CourseDto` response from `POST /api/courses`
- New endpoint: `POST /api/courses/{id}/warnings/dismiss`
  - Requires `Auth0Id` check + teacher ownership verification (same pattern as other mutating endpoints)
  - Body: `{ "warningKey": "session:2:Subjunctive mood" }`
  - Deserializes `DismissedWarnings`, appends key if not already present, re-serializes, saves, returns 204
- `GET /api/courses/{id}` deserializes and includes both `GenerationWarnings` and `DismissedWarningKeys` in response (no re-validation on read)

**Warning storage**: generation warnings are stored on the Course entity after the single `SaveChangesAsync` call at course creation. This avoids re-running the LLM check on GET requests.

**6. Updated `Course` entity**
```csharp
public string? GenerationWarnings { get; set; }   // JSON: List<CurriculumWarning>
public string? DismissedWarnings { get; set; }     // JSON: List<string> (warning keys)
```

**7. `ICurriculumGenerationService` interface update**
- Change `GenerateAsync` return type from `Task<List<CurriculumEntry>>` to `Task<(List<CurriculumEntry> Entries, List<CurriculumWarning> Warnings)>`
- Update both the interface file and implementation

**8. `CurriculumGenerationService` orchestration**
- After free generation + optional personalization: call `_templateService.GetGrammarForCefrPrefix(ctx.TargetCefrLevel)` to get `allowedGrammar`, then call `_validationService.ValidateAsync(entries, ctx.TargetCefrLevel, allowedGrammar)`
- For template mode: skip validation, return empty warnings list
- `ICurriculumTemplateService.GetGrammarForCefrPrefix(string cefrLevel)` already exists; use it to obtain the grammar list for the target level in free-mode

### Frontend

**8. `CourseDetail.tsx` — warning display**
- After generation, if `course.warnings` is non-empty, show a collapsible warning panel
- Each warning entry: session number, grammar focus, flag reason, suggested level
- "Dismiss" button per warning — calls `POST /api/courses/{id}/warnings/dismiss`
- Dismissed warnings are filtered from the displayed list
- If all warnings dismissed or no warnings: show a "Level-appropriate" confirmation badge

**9. `api/courses.ts` — new dismiss call**
- `dismissWarning(courseId: string, warningKey: string): Promise<void>`

**10. Unit tests**
- `CurriculumValidationService` tests (mock Claude response): valid content, flagged content, empty grammar list
- `CoursesController` tests: dismiss endpoint 204, dismiss adds to list, GET returns merged state
- Frontend: `CourseDetail` warning display renders + dismiss removes item

### Prompt design
```
System: You are a CEFR-level grammar expert. Evaluate whether grammar structures in a generated curriculum match the target level.

User:
Target level: {level}
Grammar structures expected at this level: {grammarList as bullet list}

Generated curriculum entries:
{entries as: "Session N: {grammarFocus}"}

For each entry where the grammar focus EXCEEDS the target level, respond with a JSON array entry:
{
  "sessionIndex": N,
  "grammarFocus": "exact string from above",
  "flagReason": "one-sentence explanation of why this exceeds the level",
  "suggestedLevel": "the CEFR level this structure typically belongs to (or null if uncertain)"
}
If all entries are level-appropriate, respond with [].
```

Parsing the validation response: wrap `JsonSerializer.Deserialize<List<CurriculumWarningDto>>` in a try/catch for `JsonException`. On failure, log a warning and return an empty list (validation is non-blocking; a parse failure must not prevent the course from being created).

## Acceptance criteria coverage

| AC | Implementation |
|----|---------------|
| Generated content validated against curriculum-defined level boundaries | Validation uses `CurriculumTemplateUnit.Grammar` from the level's JSON template |
| Out-of-level grammar structures flagged with specific ID | `flagReason` + `grammarFocus` in each warning |
| Teacher sees validation status per content block | Frontend warning panel per session, "level-appropriate" badge when clean |
| Validation uses curriculum data, not hardcoded level definitions | Prompt is built from actual `allowedGrammar[].Grammar` lists from JSON templates |
| Teacher can dismiss flags | Dismiss endpoint + frontend button; stored in `Course.DismissedWarnings` |

## Files to create/modify

**Backend:**
- `backend/LangTeach.Api/Services/CurriculumValidationService.cs` (new)
- `backend/LangTeach.Api/Services/ICurriculumValidationService.cs` (new)
- `backend/LangTeach.Api/DTOs/CurriculumWarning.cs` (new record)
- `backend/LangTeach.Api/DTOs/CourseDto.cs` (add Warnings, DismissedWarningKeys)
- `backend/LangTeach.Api/Data/Models/Course.cs` (add GenerationWarnings, DismissedWarnings columns)
- `backend/LangTeach.Api/Services/ICurriculumGenerationService.cs` (update GenerateAsync return type)
- `backend/LangTeach.Api/Services/CurriculumGenerationService.cs` (call validation, return warnings tuple)
- `backend/LangTeach.Api/Controllers/CoursesController.cs` (destructure tuple, pass warnings to DTO, add dismiss endpoint with ownership check)
- `backend/LangTeach.Api/Migrations/` (new migration for GenerationWarnings + DismissedWarnings columns)
- `backend/LangTeach.Api/Program.cs` (register ICurriculumValidationService)
- `backend/LangTeach.Api.Tests/Services/CurriculumValidationServiceTests.cs` (new)
- `backend/LangTeach.Api.Tests/Services/CurriculumGenerationServiceTests.cs` (update: all `var entries = await sut.GenerateAsync(ctx)` captures must destructure the tuple)
- `backend/LangTeach.Api.Tests/Controllers/CoursesControllerTemplateTests.cs` (update: `FakeCurriculumGenerationService` must return tuple; all call sites updated)
- `backend/LangTeach.Api.Tests/Controllers/CoursesControllerWarningTests.cs` (new; mock ICurriculumValidationService)

**Frontend:**
- `frontend/src/api/courses.ts` (add dismissWarning, add warnings/dismissedWarningKeys to Course type)
- `frontend/src/pages/CourseDetail.tsx` (add warning panel)
- `frontend/src/pages/CourseDetail.test.tsx` (add warning display + dismiss tests)

**E2E:**
- `e2e/tests/ai-guardrails.spec.ts` (happy path: generate free curriculum, warning panel appears, dismiss a warning, warning disappears)

## Out of scope
- Vocabulary theme level validation (too ambiguous without exact vocabulary lists)
- Re-validation after teacher manually edits grammar focus (validate on generation only)
- Template-mode validation (grammar is inherently level-correct by construction)
- Lesson content (text/activities) validation — that is the lesson editor concern, not curriculum plan
