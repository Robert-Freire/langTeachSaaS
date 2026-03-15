# T15.1 — Typed Content Model Foundation

## Context

Content blocks are currently untyped strings across the entire stack. `BlockType` is a free-form `nvarchar(50)` with no validation, `GeneratedContent` is stored and served as a raw string, and the frontend renders everything in a textarea. This blocks all downstream features: vocabulary tables, interactive exercises, student views, PDF export.

T15.1 introduces the foundational architecture: a C# enum for block types, backend JSON parsing with a computed `ParsedContent` DTO field, a frontend type registry that dispatches rendering by type, and a student preview route.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| BlockType enforcement | C# enum + EF `.HasConversion<string>()` | Compile-time safety, no migration needed |
| parsedContent | Computed DTO field (no new column) | Backend parses `EditedContent ?? GeneratedContent` as JSON |
| Student view auth | Teacher auth only (preview mode) | No student login exists yet |
| Edit/preview toggle | Button group (no new shadcn dep) | Simpler than installing Tabs |

## Implementation Phases

### Phase 1: Backend Enum + Model (no migration)

**New file: `backend/LangTeach.Api/Data/Models/ContentBlockType.cs`**

Contains three things:
1. The enum with 7 values
2. `ContentBlockTypeExtensions` static class with `ToApiString()` and `FromApiString()` methods using a two-way dictionary
3. `ContentBlockTypeConverter : JsonConverter<ContentBlockType>` for System.Text.Json (delegates to extension methods)

```csharp
public enum ContentBlockType { LessonPlan, Vocabulary, Grammar, Exercises, Conversation, Reading, Homework }

public static class ContentBlockTypeExtensions
{
    private static readonly Dictionary<ContentBlockType, string> ToStr = new()
    {
        [ContentBlockType.LessonPlan]   = "lesson-plan",
        [ContentBlockType.Vocabulary]   = "vocabulary",
        [ContentBlockType.Grammar]      = "grammar",
        [ContentBlockType.Exercises]    = "exercises",
        [ContentBlockType.Conversation] = "conversation",
        [ContentBlockType.Reading]      = "reading",
        [ContentBlockType.Homework]     = "homework",
    };
    private static readonly Dictionary<string, ContentBlockType> FromStr =
        ToStr.ToDictionary(kv => kv.Value, kv => kv.Key);

    public static string ToApiString(this ContentBlockType t) => ToStr[t];
    public static bool TryParse(string s, out ContentBlockType t) => FromStr.TryGetValue(s, out t);
}
```

**Modify:**
- `Data/Models/LessonContentBlock.cs` — change `string BlockType` to `ContentBlockType BlockType`
- `Data/AppDbContext.cs` — replace `.HasMaxLength(50)` line with:
  ```csharp
  .HasConversion(v => v.ToApiString(), v => ContentBlockTypeExtensions.TryParse(v, out var t) ? t : ContentBlockType.FreeText)
  .HasMaxLength(50)
  ```
  Note: add `FreeText` as a fallback value to the enum for unknown/legacy DB values
- `DTOs/ContentBlockDto.cs` — change `string BlockType` to `ContentBlockType BlockType`, add `object? ParsedContent` as the **last** parameter (preserves existing consumer code)
- `DTOs/SaveContentBlockRequest.cs` — change `string BlockType` to `ContentBlockType BlockType`, remove `[MinLength(1)]`, keep `[Required]` (model binder returns 400 for unknown strings automatically via the JSON converter throwing)
- `Controllers/LessonContentBlocksController.cs` — update `ToDto` to compute `ParsedContent`:
  ```csharp
  object? parsedContent = null;
  try { parsedContent = JsonSerializer.Deserialize<JsonElement>(block.EditedContent ?? block.GeneratedContent); }
  catch { /* leave null */ }
  ```
- `Controllers/GenerateController.cs` — change `PromptBuilders` to `IReadOnlyDictionary<ContentBlockType, Func<...>>` with enum keys. In `Stream(string taskType, ...)`: parse the route param first using `ContentBlockTypeExtensions.TryParse(taskType, out var blockType)`, return 404 if parse fails, then call `PromptBuilders.TryGetValue(blockType, ...)`. URL routes stay unchanged.
- `Program.cs` — chain `.AddJsonOptions()` on the existing `AddControllers()` call at line 65:
  ```csharp
  builder.Services.AddControllers(options =>
      options.Filters.Add(new AuthorizeFilter()))
      .AddJsonOptions(options =>
          options.JsonSerializerOptions.Converters.Add(new ContentBlockTypeConverter()));
  ```

**Enum values** (must match existing DB data exactly):
```
LessonPlan   -> "lesson-plan"
Vocabulary   -> "vocabulary"
Grammar      -> "grammar"
Exercises    -> "exercises"
Conversation -> "conversation"
Reading      -> "reading"
Homework     -> "homework"
FreeText     -> "free-text"   (new, used as fallback for unknown legacy values)
```

### Phase 2: Backend Study Endpoint

**New file:**
- `DTOs/StudyLessonDto.cs` — `StudyLessonDto`, `StudySectionDto`, `StudyBlockDto` records

**New file: `backend/LangTeach.Api/Helpers/ContentBlockHelper.cs`**
```csharp
public static class ContentBlockHelper
{
    public static object? TryParseContent(string? content)
    {
        if (string.IsNullOrWhiteSpace(content)) return null;
        try { return JsonSerializer.Deserialize<JsonElement>(content); }
        catch { return null; }
    }
}
```
Use this in both `LessonContentBlocksController.ToDto` and the new study endpoint to avoid duplication.

**Modify:**
- `Controllers/LessonsController.cs` — add `GET /api/lessons/{lessonId:guid}/study`; returns lesson + sections (ordered by `OrderIndex`) + content blocks (ordered by `CreatedAt`) nested. Same teacher-ownership guard as existing endpoints. Use `ContentBlockHelper.TryParseContent()` for `ParsedContent`.

**Backward compatibility**: Existing DB rows with `BlockType = "vocabulary"` etc. will read correctly via `TryParse`. Any unknown string values fall back to `FreeText`.

### Phase 3: Frontend TypeScript Types

**New file:**
- `frontend/src/types/contentTypes.ts`:
  - `ContentBlockType` union: `'lesson-plan' | 'vocabulary' | 'grammar' | 'exercises' | 'conversation' | 'reading' | 'homework'`
  - Per-type interfaces: `VocabularyContent`, `ExercisesContent`, `ConversationContent`, `ReadingContent`, `GrammarContent`, `HomeworkContent`, `LessonPlanContent`
  - Type guards for each (lenient: check key fields exist, not every field)

**Modify:**
- `frontend/src/api/generate.ts` — update `ContentBlockDto`: change `blockType: string` to `blockType: ContentBlockType`, add `parsedContent: unknown | null` at the end of the interface

### Phase 4: Frontend Content Registry + Renderers

**New files:**
- `frontend/src/components/lesson/contentRegistry.tsx` — registry `Record<ContentBlockType, { EditorComponent, PreviewComponent, StudentComponent }>` with shared prop interfaces
- `frontend/src/components/lesson/renderers/FreeTextRenderer.tsx` — fallback for all non-vocabulary types (textarea editor, preformatted preview)
- `frontend/src/components/lesson/renderers/VocabularyRenderer.tsx`:
  - `VocabularyEditor`: editable table (word / definition / example / translation columns), serializes back to JSON on change
  - `VocabularyPreview`: read-only formatted table
  - `VocabularyStudent`: same as preview (flashcards deferred to T15.2)

**Registry for T15.1:**
- `vocabulary` -> VocabularyRenderer
- All others -> FreeTextRenderer

### Phase 5: Frontend ContentBlock Refactor

**Modify `frontend/src/components/lesson/ContentBlock.tsx`:**
- Add `mode` state: `'edit' | 'preview' | 'raw'`
- Look up `{ EditorComponent, PreviewComponent }` from registry by `block.blockType`
- Edit mode: render `EditorComponent` (parsedContent + rawContent + onChange)
- Preview mode: render `PreviewComponent`
- Raw mode: existing textarea (escape hatch for power users)
- Button group for mode switching (no new dependency)
- Keep existing Regenerate / Reset / Discard actions and blur-save logic

### Phase 6: Frontend Study View

**New file:**
- `frontend/src/pages/StudyView.tsx` — fetches study endpoint, renders lesson title + metadata, then each section's blocks via `StudentComponent` from registry. Read-only, no edit controls.

**Modify:**
- `frontend/src/api/generate.ts` — add study DTO interfaces and `getStudyLesson()` (co-located with content block types):
  ```typescript
  interface StudyBlock   { id: string; blockType: ContentBlockType; parsedContent: unknown | null }
  interface StudySection { id: string; sectionType: string; orderIndex: number; blocks: StudyBlock[] }
  interface StudyLesson  { id: string; title: string; language: string; cefrLevel: string; topic: string; durationMinutes: number; objectives: string | null; sections: StudySection[] }
  export async function getStudyLesson(id: string): Promise<StudyLesson>
  ```
- `frontend/src/App.tsx` — add protected route `/lessons/:id/study` -> `<StudyView />` (same pattern as existing `/lessons/:id` route)
- `frontend/src/pages/LessonEditor.tsx` — add "Preview as Student" link button pointing to `/lessons/:id/study`

### Phase 7: Backend Tests

**Modify `LessonContentBlocksControllerTests.cs`:**
- Update existing tests: requests still send `"vocabulary"` string, JSON converter handles it
- Add: POST with unknown BlockType string returns 400
- Add: GET returns `parsedContent` as parsed JSON object for valid JSON content
- Add: GET returns `parsedContent: null` for plain-text content (graceful degradation)

**New file `StudyEndpointTests.cs`:**
- GET study returns nested lesson + sections + blocks
- Wrong teacher gets 404
- Nonexistent lesson gets 404

### Phase 8: E2E Test

**New file `e2e/tests/typed-content-view.spec.ts`:**
- Generate vocabulary for a lesson section
- After insert: verify block renders as a table (`data-testid="vocabulary-table"`), not a plain textarea
- Click "Preview as Student" button
- Verify URL is `/lessons/:id/study`
- Verify vocabulary content is visible in the student layout

### Phase 9: Prompt Service Fix

**Modify `backend/LangTeach.Api/AI/PromptService.cs`:**
- Add the following instruction to the user-facing prompt text in all 7 build methods where activities are suggested (`BuildLessonPlanPrompt`, `BuildVocabularyPrompt`, `BuildGrammarPrompt`, `BuildExercisesPrompt`, `BuildConversationPrompt`, `BuildReadingPrompt`, `BuildHomeworkPrompt`): "Focus on activities suitable for one-on-one online tutoring. Do not reference physical classroom resources like whiteboards, projectors, or video players."

## Files Summary

| Action | File |
|--------|------|
| NEW | `backend/LangTeach.Api/Data/Models/ContentBlockType.cs` |
| NEW | `backend/LangTeach.Api/Helpers/ContentBlockHelper.cs` |
| NEW | `backend/LangTeach.Api/DTOs/StudyLessonDto.cs` |
| NEW | `frontend/src/types/contentTypes.ts` |
| NEW | `frontend/src/components/lesson/contentRegistry.tsx` |
| NEW | `frontend/src/components/lesson/renderers/FreeTextRenderer.tsx` |
| NEW | `frontend/src/components/lesson/renderers/VocabularyRenderer.tsx` |
| NEW | `frontend/src/pages/StudyView.tsx` |
| NEW | `e2e/tests/typed-content-view.spec.ts` |
| NEW | `backend/LangTeach.Api.Tests/Controllers/StudyEndpointTests.cs` |
| MODIFY | `backend/LangTeach.Api/Data/Models/LessonContentBlock.cs` |
| MODIFY | `backend/LangTeach.Api/Data/AppDbContext.cs` |
| MODIFY | `backend/LangTeach.Api/DTOs/ContentBlockDto.cs` |
| MODIFY | `backend/LangTeach.Api/DTOs/SaveContentBlockRequest.cs` |
| MODIFY | `backend/LangTeach.Api/Controllers/LessonContentBlocksController.cs` |
| MODIFY | `backend/LangTeach.Api/Controllers/GenerateController.cs` |
| MODIFY | `backend/LangTeach.Api/Controllers/LessonsController.cs` |
| MODIFY | `backend/LangTeach.Api/Program.cs` |
| MODIFY | `backend/LangTeach.Api/AI/PromptService.cs` |
| MODIFY | `backend/LangTeach.Api.Tests/Controllers/LessonContentBlocksControllerTests.cs` |
| MODIFY | `frontend/src/api/generate.ts` |
| MODIFY | `frontend/src/components/lesson/ContentBlock.tsx` |
| MODIFY | `frontend/src/pages/LessonEditor.tsx` |
| MODIFY | `frontend/src/App.tsx` |

## Sequencing

1. Phase 1 (backend enum) — everything depends on this
2. Phase 2 (study endpoint) + Phase 3 (TS types) — parallel
3. Phase 4 (registry + renderers) — depends on Phase 3
4. Phase 5 (ContentBlock refactor) — depends on Phase 4
5. Phase 6 (study view) — depends on Phases 2 and 4
6. Phase 7 (backend tests) — depends on Phases 1 and 2
7. Phase 8 (E2E) — depends on all frontend phases
8. Phase 9 (prompt fix) — independent, any time

## Verification

1. `cd backend && dotnet build` — zero warnings
2. `cd backend && dotnet test` — all pass (existing + new)
3. `cd frontend && npm run build` — zero errors
4. Manual: generate vocabulary block, verify table rendering, toggle edit/preview/raw modes
5. Manual: click "Preview as Student", verify study view renders correctly
6. `cd e2e && npx playwright test typed-content-view.spec.ts` — passes against running stack

## Risks

- **Kebab-case enum mapping**: `"lesson-plan"` does not map to a clean C# enum name. A custom `JsonConverter` and EF `ValueConverter` with a static string-to-enum dictionary is required. This is the trickiest part of Phase 1.
- **Existing non-JSON content**: Some blocks may have plain text in `GeneratedContent`. `ParsedContent` will be `null` for these; `FreeTextRenderer` handles this gracefully.
- **Vocabulary schema variance**: AI output may not perfectly match the TypeScript interfaces. Type guards must be lenient (check `items` array exists, not every field).
