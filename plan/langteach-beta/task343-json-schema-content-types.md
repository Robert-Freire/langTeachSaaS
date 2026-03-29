# Task 343: Add JSON Schema Definitions for Content Types

## Problem

No formal contract between what Claude generates and what the frontend expects. Each renderer has an ad-hoc `coerce*Content` function. No backend validation. 6 new content types (#269-#274) will add 6 more coercion functions unless we establish a pattern now.

## Approach

Follow the exact pattern of `PedagogyConfigService`: JSON files in `data/`, embedded as assembly resources via `.csproj` `Link` attribute, loaded generically at startup by a typed service, injected via DI. PromptService calls the service inside `BuildRequest()` (the single private assembly point) to append the schema to the user prompt.

**Key constraint**: No content type names, CEFR levels, or template conditions in any C# code. Adding a new content type = adding a JSON file. No C# changes required.

## Content Type Keys

Content types that get schemas (7 files):
- `vocabulary`, `grammar`, `exercises`, `conversation`, `reading`, `homework`, `lesson-plan`

Excluded (prose / no JSON contract):
- `free-text` (PromptService explicitly says "no JSON required")
- `curriculum` (different flow, out of scope)

## Implementation Steps

### 1. Create `data/content-schemas/` with 7 JSON Schema (draft-07) files

Shapes derived from coercion functions in `frontend/src/components/lesson/renderers/` and TypeScript types in `frontend/src/types/contentTypes.ts`:

**vocabulary.json**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["items"],
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["word", "definition"],
        "properties": {
          "word": { "type": "string" },
          "definition": { "type": "string" },
          "exampleSentence": { "type": "string" }
        }
      }
    }
  }
}
```

**grammar.json** - `{ title, explanation, examples: [{sentence, note?}], commonMistakes: string[] }`

**exercises.json** - `{ fillInBlank?: [{sentence, answer, hint?, explanation?}], multipleChoice?: [{question, options[], answer, explanation?}], matching?: [{left, right, explanation?}] }` (all arrays optional, at least one required via `anyOf`)

**conversation.json** - `{ scenarios: [{ setup, roleA, roleB, roleAPhrases[], roleBPhrases[], keyPhrases?[] }] }`

**reading.json** - `{ passage: string, comprehensionQuestions: [{question, answer, type}], vocabularyHighlights: [{word, definition}] }`

**homework.json** - `{ tasks: [{ type, instructions, examples[] }] }`

**lesson-plan.json** - `{ title, objectives: string[], sections: { warmUp, presentation, practice, production, wrapUp } }`

### 2. Create `backend/LangTeach.Api/AI/IContentSchemaService.cs`

```csharp
namespace LangTeach.Api.AI;

public interface IContentSchemaService
{
    string? GetSchema(string contentType);
}
```

### 3. Create `backend/LangTeach.Api/AI/ContentSchemaService.cs`

Loads all files from embedded resources with prefix `LangTeach.Api.ContentSchemas.` at startup. Strips prefix and `.json` suffix to get content type key. Stores in `Dictionary<string, string>`. Returns `null` for unknown keys (not an error).

Pattern mirrors PedagogyConfigService's embedded resource loading:
```csharp
var assembly = typeof(ContentSchemaService).Assembly;
var prefix = "LangTeach.Api.ContentSchemas.";
foreach (var name in assembly.GetManifestResourceNames()
    .Where(n => n.StartsWith(prefix) && n.EndsWith(".json")))
{
    var key = name[prefix.Length..^".json".Length];
    using var stream = assembly.GetManifestResourceStream(name)!;
    using var reader = new StreamReader(stream);
    _schemas[key] = reader.ReadToEnd();
}
```

Include XML doc comment: "To add a new content type schema: (1) create `data/content-schemas/<content-type-key>.json`, (2) add EmbeddedResource entry in .csproj. No C# changes required."

### 4. Update `.csproj`

Add to ItemGroup after existing EmbeddedResource entries:
```xml
<EmbeddedResource Include="..\..\data\content-schemas\*.json"
                  Link="ContentSchemas\%(Filename)%(Extension)" />
```

This produces resource names like `LangTeach.Api.ContentSchemas.vocabulary.json`.

### 5. Inject into `PromptService`

Add `IContentSchemaService` as 4th constructor parameter:
```csharp
public PromptService(ISectionProfileService profiles, IPedagogyConfigService pedagogy,
    ILogger<PromptService> logger, IContentSchemaService schemas)
```

In `BuildRequest()` (private instance method, line ~95), append schema before returning:
```csharp
var schema = _schemas.GetSchema(blockType);
if (schema != null)
    userPrompt += $"\n\nGenerate JSON strictly matching this schema:\n{schema}";
```

No changes to any individual `Build*Prompt()` or `*UserPrompt()` methods.

### 6. DI Registration

In `Program.cs` (near line 123 where PedagogyConfigService is registered):
```csharp
services.AddSingleton<IContentSchemaService, ContentSchemaService>();
```

### 7. Unit Tests

**`ContentSchemaServiceTests.cs`** (new file):
- All 7 schema files load successfully
- Returns `null` for unknown content type key
- All loaded schemas are valid JSON
- Schema keys match expected content type names

**`PromptServiceTests.cs`** (update existing):
- Add mock `IContentSchemaService` as 4th constructor arg in test setup
- Add test: schema text appears in user prompt when service returns a schema
- Add test: no schema appended when service returns null

**`PromptServiceIntegrationTests.cs`** (update existing):
- Add `IContentSchemaService` as 4th constructor arg (use real `ContentSchemaService` instance or mock returning null)

## What This Does NOT Do

- Phase 2 (validate stored content against schema on backend): future task
- Phase 3 (generate TypeScript types from schemas): future task
- Remove existing frontend coercion functions: they remain as defense-in-depth
- Frontend type changes: none

## Sophy Review Required (per issue label and comments)

Three specific questions Sophy must answer:
1. Is `data/content-schemas/` the right home vs extending existing section profile JSONs?
2. Do any C# model changes add constrained fields that belong in config rather than enum/const?
3. Is the PromptService `BuildRequest` injection approach architecturally consistent with other config-driven data injection?

## E2E

No new e2e test. Existing tests must still pass. The qa-verify agent will confirm.
