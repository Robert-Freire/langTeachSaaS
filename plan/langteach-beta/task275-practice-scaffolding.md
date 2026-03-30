# Task 275 — Practice Scaffolding: Stage Field + CEFR-Calibrated Exercise Progression

**GitHub issue:** #275
**Sprint branch:** sprint/pedagogical-quality
**Branch:** task/t275-practice-scaffolding

## Context

Practice sections currently generate 1-2 mechanical exercises with no progression. Real ELE textbooks scaffold Practice through three stages: Controlada (controlled/mechanical), Significativa (meaningful/form+meaning), and Libre guiada (guided free/open-ended). This task adds config-driven stage scaffolding so the AI generates exercises that progress through these stages at the appropriate CEFR levels.

## Approach

Stage definitions and CEFR-band requirements live in a new JSON config file. The existing `PedagogyConfigService` loads it. `ExercisesUserPrompt` reads the stage config generically (no level conditionals in C#) and injects it into the prompt. Each exercise item gets an optional `stage` field in the JSON schema. The frontend groups items by stage with visual separators in the teacher view.

This keeps the single-exercises-block-per-section architecture unchanged. All stage logic is in JSON.

## Implementation Steps

### Step 1: Create `practice-stages.json`

Create `data/pedagogy/practice-stages.json`:

```json
{
  "stages": [
    {
      "id": "controlled",
      "nameEs": "Controlada",
      "nameLong": "Controlled Practice",
      "description": "Mechanical, one correct answer, form-focused. Student has no productive choice.",
      "allowedExerciseCategories": ["GR-01", "GR-02", "GR-06", "GR-07", "GR-09", "VOC-05", "LUD-06"]
    },
    {
      "id": "meaningful",
      "nameLong": "Meaningful Practice",
      "nameEs": "Significativa",
      "description": "Limited choices, meaning matters alongside form. Student selects from constrained options.",
      "allowedExerciseCategories": ["GR-04", "CE-03", "GR-02", "GR-07", "VOC-07", "CE-01", "CE-02"]
    },
    {
      "id": "guided_free",
      "nameLong": "Guided Free Practice",
      "nameEs": "Libre guiada",
      "description": "Open-ended but scaffolded. Bridges toward Production. Student produces language with support.",
      "allowedExerciseCategories": ["GR-03", "EE-01", "EE-03", "EE-09"]
    }
  ],
  "cefrStageRequirements": {
    "A1": {
      "stages": ["controlled", "meaningful"],
      "itemsPerStage": { "controlled": [3, 5], "meaningful": [2, 4] }
    },
    "A2": {
      "stages": ["controlled", "meaningful"],
      "itemsPerStage": { "controlled": [3, 5], "meaningful": [2, 4] }
    },
    "B1": {
      "stages": ["controlled", "meaningful", "guided_free"],
      "itemsPerStage": { "controlled": [3, 4], "meaningful": [3, 4], "guided_free": [2, 3] }
    },
    "B2": {
      "stages": ["controlled", "meaningful", "guided_free"],
      "itemsPerStage": { "controlled": [3, 4], "meaningful": [3, 4], "guided_free": [2, 3] }
    },
    "C1": {
      "stages": ["meaningful", "guided_free"],
      "itemsPerStage": { "meaningful": [3, 4], "guided_free": [3, 4] },
      "optionalStages": ["controlled"]
    },
    "C2": {
      "stages": ["meaningful", "guided_free"],
      "itemsPerStage": { "meaningful": [3, 4], "guided_free": [3, 4] },
      "optionalStages": ["controlled"]
    }
  }
}
```

Register as an EmbeddedResource in `LangTeach.Api.csproj` alongside the other pedagogy files.

### Step 2: C# records in `PedagogyConfig.cs`

Add:

```csharp
// Practice stages (practice-stages.json)
public record PracticeStagesFile(
    PracticeStageDefinition[] Stages,
    Dictionary<string, CefrStageRequirement> CefrStageRequirements
);

public record PracticeStageDefinition(
    string Id,
    string NameEs,
    string NameLong,
    string Description,
    string[] AllowedExerciseCategories
);

public record CefrStageRequirement(
    string[] Stages,
    Dictionary<string, int[]> ItemsPerStage,
    string[]? OptionalStages = null
);
```

### Step 3: Load in `PedagogyConfigService`

- Add `private readonly PracticeStagesFile _practiceStages;` field
- In constructor: `_practiceStages = LoadJson<PracticeStagesFile>(assembly, "LangTeach.Api.Pedagogy.practice-stages.json");`
- In `ValidateCrossLayerRefs()`: validate that stage IDs referenced in `cefrStageRequirements` exist in `stages` array; validate that all `allowedExerciseCategories` IDs exist in `_catalogIds`

### Step 4: Add method to interface + implementation

In `IPedagogyConfigService`:
```csharp
/// <summary>
/// Returns practice stage requirements for the CEFR level.
/// Returns null if the level is not found. Never returns an empty list of stages.
/// </summary>
CefrStageRequirement? GetPracticeStageRequirements(string level);

/// <summary>
/// Returns all practice stage definitions. Used by PromptService to look up
/// stage descriptions by ID.
/// </summary>
IReadOnlyList<PracticeStageDefinition> GetPracticeStageDefinitions();
```

In `PedagogyConfigService`:
```csharp
public CefrStageRequirement? GetPracticeStageRequirements(string level)
{
    var normalLevel = NormalizeLevel(level);
    return _practiceStages.CefrStageRequirements.TryGetValue(normalLevel, out var req) ? req : null;
}

public IReadOnlyList<PracticeStageDefinition> GetPracticeStageDefinitions()
    => _practiceStages.Stages;
```

### Step 5: Update exercises.json schema

Add an optional `stage` field to each exercise item type in `data/content-schemas/exercises.json`:

```json
"stage": {
  "type": "string",
  "enum": ["controlled", "meaningful", "guided_free"],
  "description": "Practice scaffolding stage for this exercise item"
}
```

Add it to `fillInBlank`, `multipleChoice`, and `matching` item properties (optional — do not add to `required` arrays).

### Step 6: Update `ExercisesUserPrompt` in `PromptService.cs`

After building existing guidance, call:
```csharp
var stageGuidance = BuildPracticeStageBlock(level); // use sanitized level, same as rest of ExercisesUserPrompt
if (!string.IsNullOrEmpty(stageGuidance))
    prompt += "\n\n" + stageGuidance;
```

Implement `BuildPracticeStageBlock(string level)`:
- Call `_pedagogy.GetPracticeStageRequirements(level)` — if null, return empty string
- Get stage definitions for the required stages
- Build a text block like:
  ```
  PRACTICE SCAFFOLDING STAGES:
  Generate exercises in the following stage progression. Add a "stage" field to each exercise item.
  - controlled (Controlada): [description]. Items: 3-5. Exercise types: GR-01, GR-02, GR-06...
  - meaningful (Significativa): [description]. Items: 2-4. Exercise types: GR-04, CE-03...
  Each stage MUST use a different exercise format. Do not repeat the same format across stages.
  ```
- This method reads all data from the config objects with no hardcoded level names in C#

### Step 7: Update frontend types

In `frontend/src/types/contentTypes.ts` (or wherever `ExercisesFillInBlank` etc. are defined), add optional `stage` field:

```ts
stage?: 'controlled' | 'meaningful' | 'guided_free'
```

to `ExercisesFillInBlank`, `ExercisesMultipleChoice`, and `ExercisesMatching`.

### Step 8: Update `ExercisesRenderer.tsx`

**Preview view (teacher only):** Group items by stage before rendering. If any item has a `stage` field:
- Render a subtle stage separator heading (`<p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mt-5 mb-1 border-t border-indigo-100 pt-3">Stage name</p>`) before the first item of each stage group within each format section
- Stage label shows the English name (Controlled / Meaningful / Guided Free)

**Editor view:** Show a read-only stage badge next to each item row (only when `stage` is present). Uses a small colored pill: controlled=indigo, meaningful=amber, guided_free=emerald.

**Student view:** No stage labels shown. Exercises render in the normal flat order so the progression feels natural.

**Grouping logic (Preview/Editor):** Items without a `stage` field are rendered ungrouped, to maintain backwards compatibility with existing content blocks.

### Step 9: Backend unit tests

In `PedagogyConfigServiceTests.cs`:
1. `GetPracticeStageRequirements_A1_ReturnsTwoStages` — verifies A1 has controlled + meaningful
2. `GetPracticeStageRequirements_B1_ReturnsThreeStages` — verifies B1 has all three stages
3. `GetPracticeStageRequirements_C1_HasOptionalControlled` — verifies C1 optionalStages contains "controlled"
4. `GetPracticeStageRequirements_UnknownLevel_ReturnsNull`
5. `GetPracticeStageDefinitions_ReturnsAllThreeStages`

In `PromptServiceTests.cs`:
6. `ExercisesPrompt_A1_IncludesStageGuidanceBlock` — exercises prompt for A1 contains "PRACTICE SCAFFOLDING STAGES"
7. `ExercisesPrompt_A1_DoesNotIncludeGuidedFreeStage` — A1 prompt does not mention "guided_free"
8. `ExercisesPrompt_B1_IncludesAllThreeStages`

### Step 10: Frontend unit tests

In `ExercisesRenderer.test.tsx`, add:
1. Test that Preview renders stage labels when items have `stage` fields
2. Test that items without `stage` render without labels (backwards compat)

## Files Changed

| File | Change |
|------|--------|
| `data/pedagogy/practice-stages.json` | NEW — stage definitions + CEFR requirements |
| `data/content-schemas/exercises.json` | Add optional `stage` field to all item types |
| `backend/LangTeach.Api/AI/PedagogyConfig.cs` | Add 3 records |
| `backend/LangTeach.Api/Services/IPedagogyConfigService.cs` | Add 2 methods |
| `backend/LangTeach.Api/Services/PedagogyConfigService.cs` | Load + expose + validate |
| `backend/LangTeach.Api/AI/PromptService.cs` | Inject stage guidance into ExercisesUserPrompt |
| `backend/LangTeach.Api.csproj` | Register embedded resource |
| `frontend/src/types/contentTypes.ts` | Add `stage?` field to exercise item types |
| `frontend/src/components/lesson/renderers/ExercisesRenderer.tsx` | Stage groupings + labels |
| `backend/LangTeach.Api.Tests/Services/PedagogyConfigServiceTests.cs` | 5 new tests |
| `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` | 3 new tests |
| `frontend/src/components/lesson/renderers/ExercisesRenderer.test.tsx` | 2 new tests |

## Acceptance Criteria Mapping

| AC | Covered by |
|----|-----------|
| practice-stages.json defines stages, allowed types, CEFR requirements | Step 1 |
| `stage` field in exercise block schema | Step 5 |
| PromptService reads stage config generically (no if/switch on level) | Step 6 — BuildPracticeStageBlock reads from objects only |
| Stage-to-exercise-type mapping in config only | Step 1 |
| Each stage uses different exercise format | Step 6 — prompt explicitly requires it |
| Frontend displays stage separation in teacher view | Step 8 |
| Edit JSON to change stage requirements | Step 1 + 3 — config-first |
| Unit tests for config loading and prompt structure | Steps 9-10 |
| Teacher QA confirms scaffolding (post-implementation) | Run after merge |

## Out of Scope

- New exercise formats (#269, #270, #271, #272, #273) — those are separate issues. The stage config references their IDs (e.g. GR-03 for guided_free) but those types may not be `available: true` yet, so they won't appear in GetValidExerciseTypes results. The stage guidance will reference them in the prompt text only.
- Student view stage visibility — issue says "exercises flow naturally without visible stage labels" in student view, so we only show labels in teacher (Preview/Editor) views.
