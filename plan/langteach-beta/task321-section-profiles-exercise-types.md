# Task 321: Enhance Section Profiles with Exercise Type References

## Issue
[#321](https://github.com/Robert-Freire/langTeachSaaS/issues/321) — Enhance section profiles with exercise type references (valid/forbidden per section/level)

## Objective
Add 4 new fields per level entry to the 5 section profile JSON files:
- `validExerciseTypes`: curated list of appropriate exercise type IDs for this section/level
- `forbiddenExerciseTypes`: explicit forbidden entries (by exact ID or glob pattern) with reasons
- `levelSpecificNotes`: pedagogical notes for specific exercise types at this level
- `minExerciseVariety`: minimum number of distinct exercise formats required

Backward compatible: all existing fields unchanged.

## Scope
- Data only: 5 JSON files + C# model extension
- No service methods added (fields are config for AI generation; consumed in a later task)
- No API controller changes
- No frontend changes

## Files Modified
1. `data/section-profiles/warmup.json`
2. `data/section-profiles/presentation.json`
3. `data/section-profiles/practice.json`
4. `data/section-profiles/production.json`
5. `data/section-profiles/wrapup.json`
6. `backend/LangTeach.Api/AI/SectionProfile.cs` — add 3 new records + 4 new fields to SectionLevelProfile
7. `backend/LangTeach.Api/LangTeach.Api.csproj` — add exercise-types.json as embedded resource
8. `backend/LangTeach.Api.Tests/Services/SectionProfileServiceTests.cs` — add validation tests

## Schema Design

Added to each level entry in section profile JSON:

```json
{
  "validExerciseTypes": ["EO-01", "EO-08", "PRAG-01"],
  "forbiddenExerciseTypes": [
    {"id": null, "pattern": "GR-*", "reason": "Grammar drills contradict warm-up purpose"},
    {"id": "EE-07", "pattern": null, "reason": "Opinion essays are production tasks, not warm-up"}
  ],
  "levelSpecificNotes": [
    {"exerciseTypeId": "EO-01", "note": "Keep to 1-2 exchanges only; scripted turns"}
  ],
  "minExerciseVariety": 1
}
```

## C# Model Changes (SectionProfile.cs)

```csharp
public record SectionLevelProfile(
    string[] ContentTypes,
    string Guidance,
    DurationRange? Duration,
    string[] Competencies,
    string Scaffolding,
    string InteractionPattern,
    string[]? ValidExerciseTypes = null,
    ForbiddenExerciseType[]? ForbiddenExerciseTypes = null,
    LevelSpecificNote[]? LevelSpecificNotes = null,
    int? MinExerciseVariety = null   // null means "no constraint"; treat as 1 in consuming code
);

public record ForbiddenExerciseType(string? Id, string? Pattern, string Reason);
public record LevelSpecificNote(string ExerciseTypeId, string Note);
```

New fields are optional with defaults so existing JSON (without these fields) continues to deserialize.
Using `int?` for MinExerciseVariety instead of `int` avoids System.Text.Json defaulting to 0 when
the field is absent from JSON (value-type defaults are not constructor-parameter defaults in some
deserialization paths).

## csproj Change

Add exercise-types.json as embedded resource in `LangTeach.Api.csproj` (NOT the test project):

```xml
<EmbeddedResource Include="..\..\data\pedagogy\exercise-types.json"
                  Link="Pedagogy\exercise-types.json" />
```

The `Link` attribute `Pedagogy\exercise-types.json` produces the resource name:
`LangTeach.Api.Pedagogy.exercise-types.json`

Tests load it via the API assembly, NOT `Assembly.GetExecutingAssembly()`:
```csharp
var stream = typeof(SectionProfileService).Assembly
    .GetManifestResourceStream("LangTeach.Api.Pedagogy.exercise-types.json");
```

## Forbidden Lists per Section (from AC)

### WarmUp (all levels)
Patterns forbidden: `GR-*` (grammar drills), `EE-*` (written production), `CO-*` (listening)
Reasons: WarmUp is conversational engagement only; drills, writing, and audio tasks contradict the anxiety-reduction purpose.

### Presentation (all levels)
Forbidden IDs: GR-01, GR-02, GR-03, EO-02, EO-05, EO-06, EE-04, EE-05, EE-06, EE-07, EE-08, EE-09, EE-10, EE-11
Pattern forbidden: `LUD-*`
Reason: Presentation is input/discovery; production exercises and games are inappropriate here.

### Practice (no section-wide forbidden; level-specific adjustments)
No global forbidden patterns. Level-specific: A1/A2 forbid GR-03, GR-04 (too demanding).

### Production (all levels)
Forbidden IDs: GR-01, GR-02, GR-03, GR-04, GR-05, GR-06, GR-07, VOC-01, VOC-02, VOC-03
Patterns forbidden: `CE-*` (reading comprehension), `LUD-*` (games)
Reason: Production requires free language use; mechanical drills, vocabulary lists, and comprehension tasks replace production with reception.

### WrapUp (all levels)
Derived from Isaac's spec Section 2.6: no new content, no formal exercises, no long writing, no tests.
Patterns forbidden: `LUD-*`, `CO-*`, `CE-*`
Forbidden IDs: GR-01 through GR-09, EE-04 through EE-11, VOC-01 through VOC-07

## Valid Exercise Types by Section/Level

### WarmUp
All levels (conversation only):
- A1: EO-01, EO-03, PRAG-01, LUD-06, LUD-07
- A2: EO-01, EO-08, EO-03, PRAG-01, PRAG-03, LUD-05, LUD-07
- B1: EO-08, PRAG-01, PRAG-03, PRAG-04, PRAG-05
- B2: EO-08, PRAG-01, PRAG-03, PRAG-04, PRAG-05
- C1: EO-08, EO-07, PRAG-01, PRAG-04, PRAG-05
- C2: EO-08, EO-09, PRAG-01, PRAG-04, PRAG-05

### Presentation
- A1: VOC-01, VOC-02, GR-08, GR-09, CE-01, CE-02
- A2: VOC-01, VOC-02, VOC-04, GR-08, GR-09, CE-01, CE-02, CE-06
- B1: VOC-04, VOC-07, GR-08, GR-09, GR-10, CE-01, CE-02, CE-03, CE-04, CE-06
- B2: VOC-04, VOC-07, VOC-10, GR-08, GR-10, CE-01 through CE-08
- C1: VOC-07, VOC-10, VOC-11, GR-08, GR-10, CE-01 through CE-09
- C2: VOC-07, VOC-10, VOC-11, GR-08, GR-10, CE-01 through CE-09

### Practice
- A1: GR-01, GR-02, GR-06, GR-07, GR-09, VOC-05, EO-01
- A2: GR-01, GR-02, GR-06, GR-07, GR-09, VOC-05, VOC-06, EO-01
- B1: GR-01, GR-02, GR-03, GR-04, GR-09, GR-10, VOC-04, VOC-05, VOC-07, CE-01, CE-03, CE-06, EO-01
- B2: GR-01, GR-02, GR-03, GR-04, GR-09, GR-10, VOC-04, VOC-07, VOC-10, CE-01 through CE-07, PRAG-02
- C1: GR-04, GR-10, VOC-04, VOC-07, VOC-10, VOC-11, CE-01 through CE-09, PRAG-02, EE-09
- C2: GR-04, GR-10, VOC-07, VOC-10, VOC-11, CE-01 through CE-09, PRAG-02, EE-09, EE-11

### Production
- A1: EE-01, EE-02, EE-03, EO-01
- A2: EE-01, EE-02, EE-03, EE-04, EO-01, EO-08
- B1: EE-05, EE-06, EE-07, EO-02, EO-05, EO-06, EO-07, PRAG-01, PRAG-05
- B2: EE-06, EE-07, EE-08, EO-02, EO-05, EO-06, EO-07, EO-09, PRAG-01, PRAG-02, PRAG-05
- C1: EE-07, EE-08, EE-09, EE-10, EE-11, EO-05, EO-06, EO-07, EO-09, PRAG-01, PRAG-02, PRAG-05
- C2: EE-07, EE-08, EE-09, EE-10, EE-11, EO-05, EO-06, EO-07, EO-09, PRAG-01, PRAG-02, PRAG-05

### WrapUp
All levels limited to reflection/consolidation conversation:
- A1: EO-08, PRAG-01
- A2: EO-08, PRAG-01, PRAG-03
- B1: EO-08, PRAG-01, PRAG-03, PRAG-04
- B2: EO-08, PRAG-01, PRAG-03, PRAG-04
- C1: EO-08, EO-09, PRAG-01, PRAG-04
- C2: EO-08, EO-09, PRAG-01, PRAG-04

## minExerciseVariety
- Practice A1: 1
- Practice A2: 1
- Practice B1+: 2
- All other sections: 1 (default, omit from JSON and rely on C# default)

## Key levelSpecificNotes (per AC examples)

**Practice A1:**
- GR-01: "Always provide a word bank listing all answer options"
- GR-02: "Maximum 3 options per item"
- GR-07: "Use only 3-4 words per sentence to order"

**Practice A2:**
- GR-02: "Maximum 4 options per item"

**Practice B1:**
- GR-04: "Sentence-level corrections only; discourse-level error correction is B2+"

**Presentation A1:**
- GR-08: "Minimal metalanguage; elicit rule with yes/no questions and pointing"
- VOC-01: "Include L1 translations for all items; max 8-10 new words"

**Presentation B1:**
- GR-10: "Highlight the target forms in the source text before asking students to extract them"

## Validation Tests (new in SectionProfileServiceTests.cs)

1. **Catalog integrity**: All exercise type IDs in `validExerciseTypes` across all 5 profiles and 6 levels exist in `exercise-types.json`.
2. **Forbidden IDs integrity**: All explicit `id` values in `forbiddenExerciseTypes` exist in the catalog (where id is not null).
3. **No conflicts**: No ID appears in both `validExerciseTypes` and `forbiddenExerciseTypes` (pattern-matched) for the same section/level.

Implementation:
- Load exercise-types.json: `typeof(SectionProfileService).Assembly.GetManifestResourceStream("LangTeach.Api.Pedagogy.exercise-types.json")`
- Build a `HashSet<string>` of all IDs from the catalog
- Load section profiles by instantiating `SectionProfileService` (already done in test class)
- For pattern matching in forbidden lists: a `pattern` of `"GR-*"` matches any ID whose prefix before `-` equals `GR` (split on `-`, check `[0]`). General implementation: if pattern ends with `*`, check `id.StartsWith(pattern[..^1])`
- Test 3 conflict check: for each level, build the effective forbidden ID set (expand patterns against catalog), then assert intersection with validExerciseTypes is empty

## Implementation Order
1. C# model (`SectionProfile.cs`) — add new types
2. csproj — add exercise-types.json as embedded resource
3. JSON files — add the 4 new fields to each level (5 files x 6 levels = 30 entries)
4. Tests — add 3 validation test methods

## No E2E Changes Required
These are data/config files. No user-facing behavior changes.
No DB migrations. No API contract changes.
