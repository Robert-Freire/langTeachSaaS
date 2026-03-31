# Task 270 - Error Correction Exercise (correccion de errores)

**Issue:** #270
**Sprint:** sprint/pedagogical-quality
**Status:** In progress

---

## Summary

Add a dedicated `error-correction` content type with its own renderer. GR-04 already exists in `exercise-types.json` (uiRenderer: "exercises") but the exercises renderer has no concept of errorSpan/errorType/correction fields. This task:
- Updates GR-04 to use a new dedicated renderer
- Widens its CEFR range from B1-C2 to A2-C2
- Adds A2 support to section profiles with appropriate notes
- Builds the full frontend renderer (Editor + Preview + Student with two modes)
- Adds the backend prompt builder

---

## Data structure

```json
{
  "mode": "identify-and-correct",
  "items": [
    {
      "sentence": "Yo soy muy calor",
      "errorSpan": [3, 11],
      "correction": "tengo mucho calor",
      "errorType": "grammar",
      "explanation": "In Spanish, 'tener calor' (to have heat), not 'ser calor'."
    }
  ]
}
```

`mode` is top-level: `"identify-only"` | `"identify-and-correct"`. Drives student view behavior.
`errorType` is one of: `grammar | vocabulary | spelling | verbForm | agreement | wordOrder`.

---

## Files to Change

### 1. Data / Config (no code)

**`data/pedagogy/exercise-types.json`** - Update GR-04:
- `cefrRange`: `["A2", "C2"]` (was `["B1", "C2"]`)
- `uiRenderer`: `"error-correction"` (was `"exercises"`)
- Add `"categories": ["grammar", "vocabulary", "spelling", "verbForm", "agreement", "wordOrder"]`

**`data/pedagogy/cefr-levels/a2.json`** - Move GR-04:
- Remove from `inappropriateExerciseTypes`
- Add to `appropriateExerciseTypes`

**`data/section-profiles/practice.json`** - Update A2 level:
- Remove `{"id": "GR-04", ...}` from `forbiddenExerciseTypes`
- Add `"GR-04"` to `validExerciseTypes`
- Add `"error-correction"` to A2 `contentTypes` array (currently `["exercises", "conversation"]`)
- Add `levelSpecificNote`: `"Simple agreement/gender errors only. Single-clause sentences."`

  B1-C2 already have GR-04 in validExerciseTypes. Also add `"error-correction"` to their `contentTypes` arrays (required by GenerateController `IsAllowed` check).
  B1 has existing levelSpecificNote for GR-04 - keep it.
  B2 has existing levelSpecificNote for GR-04 - update to: "Register errors, subjunctive/indicative confusion, false cognates. Discourse-level corrections permitted."

**`data/content-schemas/error-correction.json`** - New schema:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["mode", "items"],
  "additionalProperties": false,
  "properties": {
    "mode": { "type": "string", "enum": ["identify-only", "identify-and-correct"] },
    "items": {
      "type": "array", "minItems": 1,
      "items": {
        "type": "object",
        "required": ["sentence", "errorSpan", "correction", "errorType"],
        "additionalProperties": false,
        "properties": {
          "sentence": { "type": "string" },
          "errorSpan": { "type": "array", "items": { "type": "number" }, "minItems": 2, "maxItems": 2 },
          "correction": { "type": "string" },
          "errorType": { "type": "string", "enum": ["grammar", "vocabulary", "spelling", "verbForm", "agreement", "wordOrder"] },
          "explanation": { "type": "string" }
        }
      }
    }
  }
}
```

### 2. Backend

**`ContentBlockType.cs`**:
- Add `ErrorCorrection` to enum
- Add `[ContentBlockType.ErrorCorrection] = "error-correction"` to both maps

**`IPromptService.cs`**:
- Add `ClaudeRequest BuildErrorCorrectionPrompt(GenerationContext ctx);`

**`PromptService.cs`**:
- Add `BuildErrorCorrectionPrompt` that calls `BuildRequest("error-correction", "practice", ...)`
- Add `ErrorCorrectionUserPrompt(ctx)` private method similar to ExercisesUserPrompt:
  - Reads level guidance from section profile
  - Reads level-specific notes for GR-04 using `_profiles.GetLevelSpecificNotes("practice", level)` and filtering by `exerciseTypeId == "GR-04"` (matches existing pattern at PromptService line 225-227)
  - Reads L1 influence notes from `_pedagogy`
  - Instructs Claude to generate `{ "mode": "identify-and-correct", "items": [...] }` with errorSpan as character indices
  - Includes scope constraint injection

**`GenerateController.cs`**:
- Add `[ContentBlockType.ErrorCorrection] = (svc, ctx) => svc.BuildErrorCorrectionPrompt(ctx)` to dispatch map

### 3. Frontend

**`frontend/src/types/contentTypes.ts`**:
- Add `'error-correction'` to `ContentBlockType` union
- Add interfaces: `ErrorCorrectionItem`, `ErrorCorrectionContent`
- Add `isErrorCorrectionContent(v): v is ErrorCorrectionContent`
- Add `coerceErrorCorrectionContent(v): ErrorCorrectionContent | null`

**`frontend/src/components/lesson/renderers/ErrorCorrectionRenderer.tsx`**:
- Editor: table with columns Sentence, Error Span (start/end), Correction, Error Type, Explanation. Mode selector at top.
- Preview (teacher): shows sentences with error span highlighted, correction and explanation visible
- Student:
  - "identify-only" mode: student clicks words to select the error span, then checks
  - "identify-and-correct" mode: student clicks to select span + types correction
  - Check Answers shows green/red per item with explanation
  - Score summary + Try Again

**`frontend/src/components/lesson/renderers/ErrorCorrectionRenderer.test.tsx`**:
- isErrorCorrectionContent type guard tests
- coerceErrorCorrectionContent tests
- Editor render test
- Student: check answers (correct/incorrect), both modes

**`frontend/src/components/lesson/contentRegistry.tsx`**:
- Add `'error-correction': ErrorCorrectionRenderer`

---

## Tests required (backend)

- `PromptServiceTests.cs`: add `BuildErrorCorrectionPrompt` test (level, topic, L1 notes in prompt)
- `ContentSchemaServiceTests.cs`: add schema load test for `error-correction`

## Tests required (frontend)

- `frontend/src/types/contentTypes.test.ts`: add `isErrorCorrectionContent` and `coerceErrorCorrectionContent` tests (valid content, missing fields, wrapper unwrap)
- `frontend/src/components/lesson/renderers/ErrorCorrectionRenderer.test.tsx`: Editor render, Student check-answers (correct/incorrect), both modes (identify-only, identify-and-correct)

## E2E test required

Per project rules, new student-facing screens need a happy-path e2e test. Add to `ErrorCorrectionRenderer.test.tsx` or a separate spec: renders student view, user selects error span, types correction, checks answers, sees score.

---

## Implementation Order

1. Data files (exercise-types, cefr, practice.json, schema)
2. Backend (ContentBlockType, IPromptService, PromptService, GenerateController)
3. Backend unit tests
4. Frontend types + coerce + type guards
5. Frontend renderer (Editor/Preview/Student)
6. Frontend tests
7. Register in contentRegistry

---

## Constraints

- No `if (level == "A2")` or `if (nativeLang == "italian")` in PromptService
- L1-targeted errors come from existing `l1-influence.json` pipeline
- Mode field drives student view, NOT separate code paths per level
- Section profile `levelSpecificNotes` for GR-04 drive level complexity (config, not code)
