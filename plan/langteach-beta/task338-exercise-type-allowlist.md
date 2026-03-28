# Task 338: Exercise Type Allowlist

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/338

## Problem
The pedagogy model defines 72 exercise types, but the frontend can only render a subset. AI can generate unavailable types, causing parse errors or content in the wrong format.

## Solution
Add `available: true/false` to each exercise type in the catalog. Filter `GetValidExerciseTypes` to only return available types. This constrains AI generation to renderable types.

PRAG-02 deletion is an explicit acceptance criterion (AC4 in the issue), not bundled logic. It is a deduplication of a catalog entry that is identical in function to EE-09.

---

## Step 1: Update `data/pedagogy/exercise-types.json`

### 1a. Add `"available"` property to all entries

Rules:
- `uiRenderer: null` → `"available": false` (21 entries: CO-01 to CO-08, EO-10, VOC-08, VOC-09, PRAG-03, PRAG-04, LUD-01 to LUD-08)
- All other renderers (`reading`, `vocabulary`, `conversation`, `grammar`, `homework`, `free-text`, `exercises`) → `"available": true`

The `exercises` renderer (ExercisesRenderer.tsx) renders fillInBlank, multipleChoice, and matching sub-formats. All types using this renderer are marked available since the renderer handles the mix of sub-formats.

### 1b. Delete PRAG-02 entry

PRAG-02 ("Register adaptation") is a duplicate of EE-09 ("Register transformation"). Delete the PRAG-02 object from the `exerciseTypes` array.

### 1c. Do NOT change EE-09 cefrRange

EE-09 stays at `["B2","C2"]`. Although PRAG-02 had `["A2","C2"]` in the catalog, PRAG-02 was never included in A2 or B1 appropriateExerciseTypes (only B2, C1, C2). EE-09 is explicitly listed in b1.json's `inappropriateExerciseTypes` ("requires full register command introduced at B2"). Expanding to A2 would create a contradiction with b1.json's pedagogical intent, and no A2-level coverage is actually lost by keeping B2-C2.

### 1d. Replace all PRAG-02 references in data files

Deleting PRAG-02 from the catalog will fail startup cross-layer validation unless CEFR rules, L1 adjustments, and template overrides are updated (`ValidateCrossLayerRefs` validates these against `_catalogIds`).

**CEFR files (b2.json, c1.json, c2.json):**
- EE-09 is already present in all three `appropriateExerciseTypes` arrays
- Just remove PRAG-02 from each — no replacement needed

**l1-influence.json:**
- Germanic family `increaseEmphasis` contains PRAG-02
- Replace with EE-09

**template-overrides.json:**
- Some template's `priorityExerciseTypes` contains PRAG-02
- Replace with EE-09 if EE-09 not already there; otherwise just remove

**section-profiles/practice.json:**
- Several level blocks have PRAG-02 in `validExerciseTypes` — EE-09 is already present at B2+
- At B2 level: EE-09 already present; remove PRAG-02
- Any level where PRAG-02 is listed but EE-09 is not: replace PRAG-02 with EE-09
- Also: line 83 has a `pedagogyNotes` entry with `"exerciseTypeId": "PRAG-02"` — update to `"EE-09"` (or remove the note if it duplicates an existing EE-09 note)

**section-profiles/production.json:**
- Remove PRAG-02 from all `validExerciseTypes` arrays (add EE-09 where it's not already present)

**Section profiles are NOT validated against `_catalogIds` in `ValidateCrossLayerRefs`**, so leaving stale PRAG-02 references there would not fail startup. But we clean them up for data consistency.

---

## Step 2: Update `ExerciseTypeEntry` record

**File:** `backend/LangTeach.Api/AI/PedagogyConfig.cs`

Change:
```csharp
public record ExerciseTypeEntry(string Id, string Name, string Category);
```
To:
```csharp
public record ExerciseTypeEntry(string Id, string Name, string Category, bool Available = false);
```

Default `false` ensures backwards-compat if `available` is ever missing from a JSON entry.

---

## Step 3: Update `PedagogyConfigService`

**File:** `backend/LangTeach.Api/Services/PedagogyConfigService.cs`

### 3a. Build `_availableIds` set during construction

Declare after `_catalogIds`:
```csharp
private readonly HashSet<string> _availableIds;
```

After building `_exerciseNames`:
```csharp
_availableIds = catalog.ExerciseTypes
    .Where(e => e.Available)
    .Select(e => e.Id)
    .ToHashSet(StringComparer.OrdinalIgnoreCase);
_log.LogInformation("PedagogyConfigService: {Count} available exercise types (of {Total})",
    _availableIds.Count, _catalogIds.Count);
```

### 3b. Add available filter as final step in `GetValidExerciseTypes`

After step 8 (re-filter forbidden), before `return`:
```csharp
// Step 9: Filter to available types only (must have a working UI renderer)
base_ = base_.Where(t => _availableIds.Contains(t)).ToList();
_log.LogDebug("PedagogyConfigService: After available filter={Count}", base_.Count);

return base_.ToArray();
```

No interface change needed — the behavior change is internal.

---

## Step 4: Backend Unit Tests

### 4a. In `PedagogyConfigServiceTests`

Add 2 tests using `[Fact]` (consistent with existing file pattern, not `[Theory]`):

**Test 1:** `GetValidExerciseTypes_Practice_B1_DoesNotReturnAudioTypes`
- Call `GetValidExerciseTypes("practice", "B1")`
- Assert result does not contain CO-01 (audio type, uiRenderer null)
- Assert result does not contain LUD-01 (ludic type, uiRenderer null)
- Assert result does not contain EO-10 (no renderer, uiRenderer null)

**Test 2:** `GetValidExerciseTypes_Production_C1_ReturnsEE09_NotPRAG02`
- Call `GetValidExerciseTypes("production", "C1")`
- Assert EE-09 is included (available, B2-C2 range, should be in C1 production)
- Assert result does not contain PRAG-02 (deleted from catalog)

### 4b. In `PromptServiceTests`

Add 1 test:

**Test:** `BuildExercisesPrompt_ExerciseGuidance_DoesNotContainUnavailableTypeIds`
- Build exercises prompt for B1 (`BuildExercisesPrompt(BaseCtx())`)
- Assert user prompt does not contain "CO-01" (audio type that should be blocked)
- Assert user prompt does not contain "LUD-01" (ludic type that should be blocked)

Note: These IDs would only appear in the prompt if `GetValidExerciseTypes` returned them AND the guidance block serialized them. The assertion is on the prompt string, which is what the issue's AC checks ("AI-generated exercises only contain types marked as available").

---

## Step 5: Verify e2e tests

No changes to e2e tests expected. The available filter restricts types at the prompt level; existing tests use mock AI responses and don't assert specific exercise type IDs in prompts.

Run `task-build-verify` agent after implementation.

---

## File Summary

| File | Change |
|------|--------|
| `data/pedagogy/exercise-types.json` | Add `available` to all 72 entries, delete PRAG-02 (leaves 71) |
| `data/pedagogy/cefr-levels/b2.json` | Remove PRAG-02 from appropriateExerciseTypes |
| `data/pedagogy/cefr-levels/c1.json` | Remove PRAG-02 from appropriateExerciseTypes |
| `data/pedagogy/cefr-levels/c2.json` | Remove PRAG-02 from appropriateExerciseTypes |
| `data/pedagogy/l1-influence.json` | Replace PRAG-02 with EE-09 in increaseEmphasis |
| `data/pedagogy/template-overrides.json` | Replace/remove PRAG-02 in priorityExerciseTypes |
| `data/section-profiles/practice.json` | Remove PRAG-02 from validExerciseTypes; update pedagogyNotes ref (line 83) |
| `data/section-profiles/production.json` | Remove PRAG-02 from validExerciseTypes (add EE-09 where missing) |
| `backend/LangTeach.Api/AI/PedagogyConfig.cs` | Add `Available` to `ExerciseTypeEntry` record |
| `backend/LangTeach.Api/Services/PedagogyConfigService.cs` | Build `_availableIds`, add step 9 filter |
| `backend/LangTeach.Api.Tests/Services/PedagogyConfigServiceTests.cs` | 2 new tests |
| `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` | 1 new test |

No frontend changes. `sectionContentTypes.ts` already reads available types from the API endpoint (added in #326). Filtering happens server-side.
