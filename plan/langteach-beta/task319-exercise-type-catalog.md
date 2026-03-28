# Task 319: Create Exercise Type Catalog JSON

**Issue:** #319
**Branch:** worktree-task-t319-exercise-type-catalog
**Sprint:** Student-Aware Curriculum

## Goal

Transcribe all 72 exercise types from Isaac's pedagogy spec (Section 1.1) into `data/pedagogy/exercise-types.json`, following Sophy's Layer 1 schema from `pedagogy-config-architecture.md`.

## Source Documents

- Isaac's spec: `plan/pedagogy-specification/pedagogy-model-spec.md` (Section 1.1 tables)
- Sophy's architecture: `plan/pedagogy-specification/pedagogy-config-architecture.md` (Layer 1 schema)

## Schema (from Sophy's architecture)

```json
{
  "exerciseTypes": [
    {
      "id": "string",                      // e.g. "GR-01"
      "name": "string",                    // English name
      "nameEs": "string",                  // Spanish name from spec
      "category": "string",               // CE|CO|EE|EO|GR|VOC|PRAG|LUD
      "secondaryCompetencies": ["string"], // e.g. ["EE", "VOC"] — only category codes
      "description": "string",             // One-sentence English description
      "cefrRange": ["string", "string"],   // e.g. ["A1", "C2"]
      "specialResources": ["string"],      // e.g. ["audio"] — empty array if none
      "uiRenderer": "string|null"          // kebab-case ContentBlockType or null
    }
  ]
}
```

## uiRenderer Mapping Rules

ContentBlockType values (kebab-case): `lesson-plan`, `vocabulary`, `grammar`, `exercises`, `conversation`, `reading`, `homework`, `free-text`

| Category | Rule |
|----------|------|
| CE | `"reading"` — all 9 types involve reading and comprehending text |
| CO | `null` — all 8 require audio playback (not yet supported) |
| EE | `"exercises"` for guided/structured writing (EE-01, EE-02, EE-03, EE-09); `"homework"` for extended writing (EE-04 to EE-08, EE-11); `"free-text"` for EE-10 (creative/literary) |
| EO | `"conversation"` for EO-01 to EO-09; `null` for EO-10 (requires audio recording) |
| GR | `"exercises"` for drill-based types (GR-01 to GR-07, GR-09, GR-10); `"grammar"` for GR-08 (noticing/inductive discovery — about the rule, not a drill) |
| VOC | `"vocabulary"` for VOC-01 to VOC-07, VOC-10, VOC-11; `null` for VOC-08 (visual map tool) and VOC-09 (flashcard system) |
| PRAG | `"conversation"` for PRAG-01 and PRAG-05 (speaking/simulation); `"exercises"` for PRAG-02 (register rewriting); `null` for PRAG-03 and PRAG-04 (cultural discussion — no single renderer fits) |
| LUD | `null` — all 8 require external tools (crossword generator, board, Kahoot, etc.) |

## secondaryCompetencies Mapping

Only use the 8 category codes (CE, CO, EE, EO, GR, VOC, PRAG, LUD). Non-category terms from the spec (Pronunciacion, Ortografia, Metalenguaje, Sintaxis, Cultura, Interaccion, Mediacion) are discarded since they have no corresponding category code.

## File Location

`data/pedagogy/exercise-types.json` (new directory `data/pedagogy/` to be created)

## Implementation Steps

1. Create `data/pedagogy/` directory
2. Write `exercise-types.json` with all 72 entries
3. Verify count by category: CE:9 + CO:8 + EE:11 + EO:10 + GR:10 + VOC:11 + PRAG:5 + LUD:8 = 72
4. Validate JSON is parseable

## No Code Changes

This task is pure data. No backend or frontend changes needed. The JSON file is a foundation for subsequent issues (#320-#326) that will add C# model classes, service methods, and prompt integration.

## Out of Scope

- C# model classes for ExerciseType (separate issue)
- Loading the file at startup (separate issue)
- Updating section profiles with validExerciseTypes (separate issue)
- Any uiRenderer validation logic (separate issue)
