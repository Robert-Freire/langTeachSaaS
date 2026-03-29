# Task 362: Fix pedagogy profile data inconsistencies (sprint close #306 Part B)

## Changes

### 1. warmup.json B1 scaffolding: "low" -> "medium"
- CEFR Companion Volume B1 spoken interaction descriptors support medium scaffolding
- Presentation profile already uses "medium" at B1 (consistency fix)

### 2. warmup.json A2 guidance: preterite sublevel note
- Added "Note: preterite only after introduction in A2.1+." to A2 guidance string
- Preterito indefinido introduced mid-A2 per PCIC curriculum

### 3. production.json A1 and A2: add "speaking" to competencies
- Both levels have EO-01 (guided dialogue) in validExerciseTypes
- Oral production types require "speaking" competency to avoid misleading AI generator
- PCIC A1 spoken production descriptors confirm oral production is valid at A1/A2

### 4. c2.json scaffoldingDefault: "low" -> "none"
- Section profiles correctly use "none" for C2
- c2.json was inconsistent; fixed to match

## Files changed
- data/section-profiles/warmup.json
- data/section-profiles/production.json
- data/pedagogy/cefr-levels/c2.json

## No schema changes
These are value-only changes to existing JSON fields. No backend code changes required.
