# Task 309 - Extract Section Guidance to JSON Profiles

## Issue
#309 - Extract section guidance to JSON profiles (fix prompt bloat architecture)

## Problem
`PromptService.cs` has 4 hardcoded `CefrXxxGuidance()` switch methods and `SectionContentTypeAllowlist.cs` has a hardcoded dictionary. Every Teacher QA fix adds more inline strings. The pedagogy reviewer can't evaluate guidance without reading C# code.

## Current State

**PromptService.cs:**
- `CefrWarmUpGuidance(cefrLevel)` - 3-band switch (A1-A2/B1-B2/C1-C2)
- `CefrPracticeGuidance(cefrLevel)` - 3-band switch
- `CefrProductionGuidance(cefrLevel)` - 3-band switch
- `CefrExerciseGuidance(cefrLevel)` - 3-band switch (used in ExercisesUserPrompt)
- Template overrides (R&C, Exam Prep) as inline string concatenation
- `PromptService` is a class (DI), not static

**SectionContentTypeAllowlist.cs:**
- Static class with hardcoded dictionary
- Called statically in `GenerateController` (both `Stream()` and `Generate()` methods)
- Existing tests test it as a static class

**sectionContentTypes.ts (frontend):**
- 3-band switch (startsWith A / everything else)
- WarmUp: A1/A2 = `['free-text']`, B1+ = `['free-text', 'conversation']`
- WrapUp: all levels = `['free-text']`
- Existing tests check these values

**FullLessonGenerateButton.tsx:**
- `SECTION_TASK_MAP.WarmUp = 'free-text'`
- `SECTION_TASK_MAP.WrapUp = 'free-text'`

**E2E test (warmup-content-type-allowlist.spec.ts):**
- Checks WarmUp at B1 shows "Free activity" - this WILL FAIL after this task and must be updated

## Target State

**Data files:**
```
data/section-profiles/
  warmup.json        (all levels: conversation only)
  presentation.json  (all levels: grammar, vocabulary, reading, conversation)
  practice.json      (all levels: exercises, conversation)
  production.json    (A1-B1: conversation; B2-C2: conversation + reading)
  wrapup.json        (all levels: conversation only)
```

**Backend:**
- `SectionProfile` model (C# record)
- `ISectionProfileService` + `SectionProfileService` singleton (loaded from embedded JSON)
- `SectionProfileService.GetGuidance(sectionType, cefrLevel)` - returns guidance string
- `SectionProfileService.IsAllowed(sectionType, contentType)` - union check across all levels
- `PromptService` injected with `ISectionProfileService`
- `CefrWarmUpGuidance/CefrPracticeGuidance/CefrProductionGuidance/CefrExerciseGuidance` methods removed
- `SectionContentTypeAllowlist` becomes a thin static wrapper delegating to `SectionProfileService` (keeps static API for GenerateController, avoids DI change there)
- `GenerationContext` gets optional `SectionType?` to enable section-aware conversation prompts

**Frontend:**
- `sectionContentTypes.ts`: 6 CEFR levels, WarmUp = `['conversation']`, WrapUp = `['conversation']`
- New exported `getContentTypeLabel(sectionType, contentType)` returning section-specific labels
  - WarmUp + conversation = "Conversation starter"
  - WrapUp + conversation = "Reflection"
  - All others = existing label
- `GeneratePanel.tsx`: use `getContentTypeLabel` when building `filteredTaskTypes`
- `FullLessonGenerateButton.tsx`: WarmUp and WrapUp use `'conversation'`

## Architecture Decisions

### SectionContentTypeAllowlist approach
Keep `SectionContentTypeAllowlist` as a static class but back it by the singleton `SectionProfileService`:
```csharp
public static class SectionContentTypeAllowlist
{
    private static ISectionProfileService? _service;

    public static void Initialize(ISectionProfileService service) => _service = service;

    public static bool IsAllowed(string sectionType, string contentType) =>
        _service?.IsAllowed(sectionType, contentType) ?? FallbackAllowlist.IsAllowed(sectionType, contentType);
}
```
Initialized at startup in `Program.cs`. This avoids changing `GenerateController`'s constructor and keeps all existing call sites working.

However, it's cleaner to just inject `ISectionProfileService` into `GenerateController` directly and replace the static calls. The constructor is already long (9 params) but this is more testable.

**Decision: Inject `ISectionProfileService` into `GenerateController` and delete `SectionContentTypeAllowlist.cs`.**
Reason: cleaner, avoids static mutable state, aligns with existing DI pattern in the codebase.

### Allowlist IsAllowed logic
Backend uses union of all levels: if `contentType` appears in ANY level's `contentTypes` for that section, it's allowed.
Reason: the backend check is a safety guard; level-specific enforcement is handled on the frontend.

### GenerationContext SectionType
Add `string? SectionType = null` optional parameter to `GenerationContext`.
Update `GenerateController.Stream()` to pass `request.SectionType`.
The non-streaming `Generate()` endpoints don't have section context (they're global content block endpoints), so they pass null.
`BuildConversationPrompt` uses section profile guidance when `SectionType` is "WarmUp" or "WrapUp".

### CEFR level normalization in SectionProfileService
Profile keys are "A1", "A2", "B1", "B2", "C1", "C2".
Input levels from `GenerationContext.CefrLevel` are the same format (based on current switch patterns).
If an unknown level is passed, fall back to the closest known level or return empty string.

## Files to Create/Modify

### New files
1. `data/section-profiles/warmup.json`
2. `data/section-profiles/presentation.json`
3. `data/section-profiles/practice.json`
4. `data/section-profiles/production.json`
5. `data/section-profiles/wrapup.json`
6. `backend/LangTeach.Api/AI/SectionProfile.cs` (model record)
7. `backend/LangTeach.Api/Services/ISectionProfileService.cs` + `SectionProfileService.cs`
8. `backend/LangTeach.Api.Tests/Services/SectionProfileServiceTests.cs`

### Modified files
9. `backend/LangTeach.Api/LangTeach.Api.csproj` - add EmbeddedResource for section profiles
10. `backend/LangTeach.Api/AI/IPromptService.cs` - add `SectionType?` to `GenerationContext`
11. `backend/LangTeach.Api/AI/PromptService.cs` - inject service, remove switch methods
12. `backend/LangTeach.Api/AI/SectionContentTypeAllowlist.cs` - DELETE (replaced by service)
13. `backend/LangTeach.Api/Controllers/GenerateController.cs` - inject service, update allowlist calls
14. `backend/LangTeach.Api/Program.cs` - register singleton
15. `backend/LangTeach.Api.Tests/AI/SectionContentTypeAllowlistTests.cs` - repurpose/delete, new tests in SectionProfileServiceTests
16. `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` - update to inject mock service, fix affected tests
17. `frontend/src/utils/sectionContentTypes.ts` - 6 levels, WarmUp/WrapUp = conversation, getContentTypeLabel
18. `frontend/src/utils/sectionContentTypes.test.ts` - update for new behavior
19. `frontend/src/components/lesson/GeneratePanel.tsx` - use getContentTypeLabel
20. `frontend/src/components/lesson/GeneratePanel.test.tsx` - update
21. `frontend/src/components/lesson/FullLessonGenerateButton.tsx` - update SECTION_TASK_MAP
22. `frontend/src/components/lesson/FullLessonGenerateButton.test.tsx` - update
23. `e2e/tests/warmup-content-type-allowlist.spec.ts` - update for "Conversation starter" label

## JSON Schema

```json
{
  "sectionType": "warmup",
  "hardConstraints": ["..."],
  "levels": {
    "A1": {
      "contentTypes": ["conversation"],
      "guidance": "...",
      "duration": { "min": 2, "max": 3 },
      "competencies": ["interaction"],
      "scaffolding": "high",
      "interactionPattern": "teacher-led"
    },
    ... (A2, B1, B2, C1, C2)
  }
}
```

## Test Plan

**Backend unit tests (new/updated):**
- `SectionProfileServiceTests`: profile loading, GetGuidance per section+level, IsAllowed from profiles, A1/A2 distinct guidance
- `PromptServiceTests`: update `new PromptService()` to inject mock `ISectionProfileService`; fix tests for guidance content that now comes from profiles
- `SectionContentTypeAllowlistTests`: DELETE file (functionality moved to SectionProfileServiceTests)

**Frontend unit tests:**
- `sectionContentTypes.test.ts`: update for 6 levels, conversation-only for WarmUp/WrapUp, getContentTypeLabel
- `GeneratePanel.test.tsx`: verify WarmUp shows "Conversation starter", WrapUp shows "Reflection"
- `FullLessonGenerateButton.test.tsx`: verify WarmUp/WrapUp use conversation type

**E2E (must update, not add):**
- `warmup-content-type-allowlist.spec.ts`: update to check "Conversation starter" not "Free activity"

## Acceptance Criteria Mapping

- AC1: JSON files in data/section-profiles/ for 5 sections x 6 levels ✓
- AC2: SectionProfileService loads and caches at startup ✓
- AC3: PromptService.cs uses profile data, Cefr*Guidance methods removed ✓
- AC4: SectionContentTypeAllowlist.cs replaced by SectionProfileService ✓
- AC5: A1/A2 distinct guidance in Practice and Production (in JSON data) ✓
- AC6: WarmUp generates conversation at all levels ✓
- AC7: WrapUp generates conversation at all levels ✓
- AC8: Frontend 6 levels ✓
- AC9: WarmUp dropdown shows "Conversation starter" ✓
- AC10: WrapUp dropdown shows "Reflection" ✓
- AC11: Backend unit tests ✓
- AC12: Frontend unit tests ✓
- AC13: JSON-only change for new level/section ✓

## Out of Scope
- Template-specific overrides (R&C, Exam Prep) stay as inline code
- L1 adaptation hooks
- Frontend fetching profiles from API
- freeText content type removal (evaluate during implementation; WarmUp/WrapUp change to conversation but freeText may remain for Production)
