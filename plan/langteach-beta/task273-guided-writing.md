# Task 273: New Content Type — Guided Writing

**Issue:** #273
**Branch:** worktree-task-t273-guided-writing
**Sprint:** Pedagogical Quality

## Goal

Add `guidedWriting` as a first-class content type: JSON schema, CEFR-level config, backend enum, prompt injection, frontend renderer (Editor/Preview/Student).

---

## Codebase Orientation

### Content type lifecycle (existing pattern)
1. `data/content-schemas/<type>.json` — JSON Schema draft-07 defining the shape
2. `ContentBlockType` enum (C#) — adds enum value + kebab-case mapping
3. `IPromptService.cs` — declares the new build method
4. `PromptService.cs` — implements the method; `BuildRequest()` dispatches via `PromptBuilders` dictionary in `GenerateController.cs`
5. `contentTypes.ts` (TS) — adds union member, interface, type guard, coerce function
6. `usePartialJsonParse.ts` — streaming parser case (otherwise preview is blank during generation)
7. `contentRegistry.tsx` — maps type to `{ Editor, Preview, Student, coerce }` renderer
8. `sectionContentTypes.ts` — `ALL_CONTENT_TYPES` list (used as fallback)
9. `data/section-profiles/*.json` — `contentTypes` arrays controlling allowed types per section/level

### CEFR-level config pattern (PedagogyConfigService)
- Each level file `data/pedagogy/cefr-levels/<level>.json` carries level-specific data
- `PedagogyConfig.cs` has `CefrLevelRules` record — must add new nullable property here
- `PedagogyConfigService` exposes typed getters (`GetGrammarScope`, `GetVocabularyGuidance`)
- `PromptService` calls these getters to build level-aware prompt blocks
- **Rule from issue:** word counts and complexity belong in these JSON files, not in C# or prompt strings

### Schema embedding
The csproj glob `data/content-schemas/*.json` embeds all files automatically. No csproj edit needed.

---

## Data Design

### `data/content-schemas/guided-writing.json`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["situation", "requiredStructures", "wordCount", "evaluationCriteria", "modelAnswer"],
  "additionalProperties": false,
  "properties": {
    "situation": { "type": "string" },
    "requiredStructures": { "type": "array", "items": { "type": "string" } },
    "wordCount": {
      "type": "object",
      "required": ["min", "max"],
      "properties": {
        "min": { "type": "integer" },
        "max": { "type": "integer" }
      }
    },
    "evaluationCriteria": { "type": "array", "items": { "type": "string" } },
    "modelAnswer": { "type": "string" },
    "tips": { "type": "array", "items": { "type": "string" } }
  }
}
```

Note: `sentenceCountMin`/`sentenceCountMax` are prompt-guidance only (in CEFR config) and do NOT appear in the content block schema. The AI uses them to calibrate density, but the output only captures final word count.

### `guidedWriting` section in each CEFR level file
To be added to each of `a1.json`, `a2.json`, `b1.json`, `b2.json`, `c1.json`, `c2.json`:

Word count ranges and guidance by level:
- **A1:** wordCountMin: 30, wordCountMax: 50, sentenceCountMin: 3, sentenceCountMax: 5, structures: "simple sentences, basic connectors (y, pero)", complexity: "Very simple, concrete situations. One main task.", situationGuidance: "Familiar, everyday topics (family, school, routines)"
- **A2:** wordCountMin: 50, wordCountMax: 80, sentenceCountMin: 4, sentenceCountMax: 7, structures: "simple sentences, basic connectors (and, but, because)", complexity: "Concrete everyday situations, two or three tasks.", situationGuidance: "Personal topics (daily life, preferences, simple events)"
- **B1:** wordCountMin: 80, wordCountMax: 130, sentenceCountMin: 6, sentenceCountMax: 10, structures: "compound and complex sentences, causal and temporal connectors", complexity: "Familiar topics with some detail. May require opinion.", situationGuidance: "Semi-formal contexts (letters, messages, brief descriptions)"
- **B2:** wordCountMin: 130, wordCountMax: 200, sentenceCountMin: 8, sentenceCountMax: 14, structures: "full range of complex sentence structures, discourse markers", complexity: "Abstract or formal topics. Argument or extended description.", situationGuidance: "Formal contexts (formal emails, reports, essays)"
- **C1:** wordCountMin: 200, wordCountMax: 300, sentenceCountMin: 12, sentenceCountMax: 20, structures: "wide range including nominalization, relative clauses, passive voice", complexity: "Complex abstract topics. Cohesive multi-paragraph text.", situationGuidance: "Academic or professional registers"
- **C2:** wordCountMin: 250, wordCountMax: 350, sentenceCountMin: 14, sentenceCountMax: 22, structures: "full native-like range, stylistic variation", complexity: "Nuanced, sophisticated topics. Near-native stylistic control.", situationGuidance: "Any register; culturally situated texts"

### Section profiles: which sections allow `guided-writing`
- `production.json`: add `"guided-writing"` to the `contentTypes` array (primary home)
- `practice.json`: add `"guided-writing"` to the `contentTypes` array (Practice Stage 3 per issue)
- Other sections (warmUp, presentation, homework): do NOT add — guided writing is production/practice only

---

## Implementation Steps

### Step 1 — JSON schema
- Create `data/content-schemas/guided-writing.json`

### Step 2 — CEFR level config
- Add `guidedWriting` block to each of the 6 CEFR level files

### Step 3 — Backend enum + mapping
- File: `backend/LangTeach.Api/Data/Models/ContentBlockType.cs`
- Add `GuidedWriting` to the enum
- Add `"guided-writing"` to both the `ToKebabCase` and `FromKebabCase` mapping dictionaries

### Step 4 — `CefrLevelRules` record extension
- File: `backend/LangTeach.Api/AI/PedagogyConfig.cs`
- Add `GuidedWritingConfig? GuidedWriting` property to the `CefrLevelRules` record
- Add a new `GuidedWritingConfig` record with all CEFR config fields (wordCountMin, wordCountMax, sentenceCountMin, sentenceCountMax, structures, complexity, situationGuidance)

### Step 5 — Backend DTO + IPedagogyConfigService + PedagogyConfigService
- Add `GuidedWritingGuidance` record to `backend/LangTeach.Api/AI/PedagogyConfigDtos.cs`:
  ```csharp
  public record GuidedWritingGuidance(
      int WordCountMin, int WordCountMax,
      int SentenceCountMin, int SentenceCountMax,
      string Structures, string Complexity, string SituationGuidance);
  ```
- Add `GuidedWritingGuidance GetGuidedWritingGuidance(string level)` to `IPedagogyConfigService`
- Implement in `PedagogyConfigService` reading from `CefrLevelRules.GuidedWriting`; return safe defaults if null

### Step 6 — IPromptService + PromptService + GenerateController
- `backend/LangTeach.Api/AI/IPromptService.cs`: add method declaration matching existing pattern
- `backend/LangTeach.Api/AI/PromptService.cs`:
  - Add `BuildGuidedWritingPrompt(GenerationContext ctx)` that:
    1. Gets schema from `_schemaService.GetSchema("guided-writing")`
    2. Calls `_pedagogy.GetGuidedWritingGuidance(ctx.CefrLevel)` for word count + complexity
    3. Injects both as explicit constraints (no hardcoded level conditions)
- `backend/LangTeach.Api/Controllers/GenerateController.cs`:
  - Add `ContentBlockType.GuidedWriting` entry to the `PromptBuilders` dictionary pointing to the new method

### Step 7 — Backend tests
- `PedagogyConfigServiceTests`: `GetGuidedWritingGuidance` returns correct values for A1, B1, C1 (spot-check 3 levels)
- `PromptServiceTests`: guided-writing prompt contains level-specific word count from config (not hardcoded)
- `ContentSchemaServiceTests`: `GetSchema("guided-writing")` returns non-null

### Step 8 — Frontend type + coerce
- `frontend/src/types/contentTypes.ts`:
  - Add `'guided-writing'` to `ContentBlockType` union
  - Add `GuidedWritingContent` interface:
    ```ts
    interface GuidedWritingContent {
      situation: string;
      requiredStructures: string[];
      wordCount: { min: number; max: number };
      evaluationCriteria: string[];
      modelAnswer: string;
      tips?: string[];
    }
    ```
  - Add `isGuidedWritingContent()` type guard
  - Add `coerceGuidedWritingContent()` (fills defaults, normalizes arrays)

### Step 9 — Frontend streaming parser
- `frontend/src/hooks/usePartialJsonParse.ts`: add `'guided-writing'` case returning a `GuidedWritingContent` stub so streaming preview renders during generation instead of blank

### Step 10 — Frontend renderer
- `frontend/src/components/lesson/renderers/GuidedWritingRenderer.tsx`:
  - **Editor**: situation (textarea), requiredStructures (tag-style list), wordCount min/max (number inputs), evaluationCriteria (list), modelAnswer (collapsible textarea), tips (list)
  - **Preview**: teacher view with all fields including model answer
  - **Student**: situation + requirements + word count target visible; live word count on textarea; tips expandable; model answer hidden
- Export as `{ Editor, Preview, Student, coerce: coerceGuidedWritingContent }`

### Step 11 — Frontend registry + sectionContentTypes
- `frontend/src/components/lesson/contentRegistry.tsx`: import and add `'guided-writing': GuidedWritingRenderer`
- `frontend/src/utils/sectionContentTypes.ts`: add `'guided-writing'` to `ALL_CONTENT_TYPES`

### Step 12 — Section profiles
- `data/section-profiles/production.json`: add `"guided-writing"` to `contentTypes`
- `data/section-profiles/practice.json`: add `"guided-writing"` to `contentTypes`

### Step 13 — Frontend tests
- `frontend/src/components/lesson/renderers/GuidedWritingRenderer.test.tsx` (new file):
  - Editor renders situation field
  - Student view hides model answer
  - Student view updates word count live
- `frontend/src/types/contentTypes.test.ts` (new file):
  - `isGuidedWritingContent` returns true for valid, false for invalid
  - `coerceGuidedWritingContent` fills missing fields with defaults

---

## Acceptance Criteria Checklist

- [ ] `data/content-schemas/guided-writing.json` exists and is valid JSON Schema draft-07
- [ ] CEFR level JSON files each have `guidedWriting` block (no hardcoded values in C# or prompt strings)
- [ ] `CefrLevelRules` record extended with nullable `GuidedWriting` property
- [ ] `PedagogyConfigService.GetGuidedWritingGuidance()` reads from config
- [ ] `PromptService` injects level-specific guidance via config (no `if (level == "A1")`)
- [ ] `IPromptService` declares the new method
- [ ] `GenerateController.PromptBuilders` includes `GuidedWriting`
- [ ] `ContentBlockType.GuidedWriting` + kebab-case `"guided-writing"` mapping
- [ ] Streaming preview works (usePartialJsonParse case added)
- [ ] Section profiles for production + practice include `"guided-writing"`
- [ ] Teacher Editor for all fields
- [ ] Student view: live word count, tips expandable, model answer hidden
- [ ] No hardcoded level/language/template conditions in C#
- [ ] Backend unit tests pass
- [ ] Frontend unit tests pass
