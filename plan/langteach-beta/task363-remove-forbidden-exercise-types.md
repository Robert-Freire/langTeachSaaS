# Task 363: Remove dead forbiddenExerciseTypes from section profiles

## Problem
~600 lines of `forbiddenExerciseTypes` JSON across 5 section profiles are redundant.
`GetValidExerciseTypes()` in `PedagogyConfigService` already enforces the `validExerciseTypes`
allowlist via intersection (steps 3-5). The forbidden filter is only meaningful at step 8
(re-filter after L1 `AdditionalExerciseTypes` injection in step 7).

The only L1 additional type across all `l1-influence.json` entries is `CO-06`
(Phonetic discrimination). So the only forbidden entries worth keeping are those that
block `CO-*` in sections where phonetic drills are inappropriate.

## Analysis by section

### warmup.json
Each of 6 levels has: `GR-*` (remove), `EE-*` (remove), `CO-*` (KEEP - guards against CO-06 via L1).

### presentation.json
Each of 6 levels has specific IDs (GR-01..03, EO-02, EO-05/06, EE-04..11) and `LUD-*`.
None match CO-06. **Remove all forbiddenExerciseTypes arrays.**

### practice.json
A1/A2/B1/B2 have GR and EE patterns. C1/C2 have GR and LUD patterns.
None match CO-06. **Remove all forbiddenExerciseTypes arrays.**

### production.json
Each level has GR-01..07, VOC-01..03, CE-*, LUD-*. None match CO-06.
**Remove all forbiddenExerciseTypes arrays.**

### wrapup.json
Each of 6 levels has many entries including `CO-*`. Keep only `CO-*` (guards against CO-06).
Remove all other entries.

## C# model
`ForbiddenExerciseTypes` stays in `SectionLevelProfile` because warmup and wrapup still use it.
No model changes.

## Steps

1. Edit `data/section-profiles/warmup.json`: strip `GR-*` and `EE-*` entries from all 6 levels,
   leave only `CO-*` entry per level.
2. Edit `data/section-profiles/presentation.json`: remove `forbiddenExerciseTypes` property from
   all 6 level objects.
3. Edit `data/section-profiles/practice.json`: remove `forbiddenExerciseTypes` property from
   all 6 level objects.
4. Edit `data/section-profiles/production.json`: remove `forbiddenExerciseTypes` property from
   all 6 level objects.
5. Edit `data/section-profiles/wrapup.json`: strip all entries except `CO-*` from all 6 levels.
6. Update `PedagogyConfigServiceTests.cs`:
   - `GetForbiddenExerciseTypeIds_WarmUp_A1_ExpandsAllGRPattern`: GR-* no longer in warmup, remove
     or rename to test that GR-01..10 are NOT in the warmup forbidden list.
   - `GetForbiddenExerciseTypeIds_WarmUp_A1_AlsoExpandsEEAndCOPatterns`: remove the EE-* assertion;
     keep (and rename to `_OnlyCOPattern`) asserting only CO-* remains.
7. Run `dotnet test` in `backend/` to verify all tests pass.

## No e2e test needed
This is a JSON data-only change. `GetValidExerciseTypes()` behavior is unchanged (CO-* entries
preserved where needed). Existing `PedagogyConfigServiceTests` cover the intersection + forbidden
logic. No new test cases required.
