# Task 367: Fix section profile pedagogical accuracy (Isaac review P1 findings)

## Source
Isaac (pedagogy reviewer) P1 findings on 5 section profiles during sprint close.

## What was already done (task362)
- production.json A1/A2: "speaking" added to competencies
- warmup.json A2: note "preterite only after introduction in A2.1+" appended
- warmup.json B1 scaffolding: "low" -> "medium"

## Remaining changes

### 1. practice.json: LUD-* ban at A1-B2 (Finding 1)

Remove the `{"id": null, "pattern": "LUD-*", ...}` entry from forbiddenExerciseTypes at A1, A2, B1, B2.
Add ludic types to validExerciseTypes, respecting catalog cefrRange:
- A1: add LUD-06 (A1-B1), LUD-07 (A1-B1). Skip LUD-05 (starts at A2).
- A2: add LUD-05 (A2-C2), LUD-06, LUD-07
- B1: add LUD-05, LUD-06, LUD-07 (LUD-06/07 max B1 — this is their last valid level)
- B2: add LUD-05 only (LUD-06/07 cap at B1)
Keep LUD-* ban at C1 and C2 — mechanical games don't match discourse-level practice.

All three have available: false, uiRenderer: null (no renderer built yet). Adding to JSON is correct
pedagogical intent; runtime filtering by `available` field handles exclusion until renderer ships.

### 2. practice.json: CE-* ban at A2 (Finding 2)

Remove `{"id": null, "pattern": "CE-*", ...}` from A2 forbiddenExerciseTypes.
Add CE-01 and CE-02 to A2 validExerciseTypes.
Keep CE-* ban at A1 (reading practice extremely limited at A1 per Isaac).

### 3. production.json: guidance text A1/A2 (Finding 3)

Competencies already fixed in task362 ("speaking" present). Only guidance text needs update.

A1 current: "Production MUST be a guided writing task with sentence frames provided.
Ask the student to write 3-5 sentences using new vocabulary or structures from this lesson.
Guided writing is appropriate and achievable even at A1."

A1 fix: append "Alternatively, a guided dialogue (EO-01) with fully scripted turns and 2 pre-given
options per turn is appropriate when the session focus is oral production."

A2 current: "Guided writing with a model paragraph provided. Student writes 4-6 sentences using the
target grammar and vocabulary. A short opinion sentence or simple description.
Scaffolding phrase starters optional."

A2 fix: append "A short guided dialogue (EO-01 or EO-08, 2-3 turns) is a valid alternative
when the session focus is oral production."

### 4. warmup.json: A2 example (Finding 4)

Current: "Open personal questions using preterite/present tense. ... Example: Que hiciste el fin de
semana? ... Note: preterite only after introduction in A2.1+."

Fix: change opening to "present/familiar tense", change example to "Que haces los fines de semana?",
update note to "Use preterite only if the student has already learned it."

## Tests expected to pass
- SectionProfileServiceTests: cross-layer validation (IDs exist, no valid/forbidden overlap)
- PedagogyConfigServiceTests: GetValidExerciseTypes still filters by available:false, so LUD types
  won't appear in effective runtime lists (consistent with existing warmup behavior)
- No schema changes; no C# code changes
