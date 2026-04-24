# Task 904 — Skill Imbalance: empty state shown even when student has skill-level overrides

## Problem

The Skill Imbalance Analysis card on the Progress tab shows "No skill assessments recorded yet." for Diego Seed even though the sweep report observed skill overrides on other tabs.

## Root Cause

`DemoSeeder.SeedScenarioStudentsAsync` creates Diego Seed WITHOUT `SkillLevelOverrides`. The field defaults to `"{}"`. `ProgressDashboard` checks `Object.keys(skillOverrides).length > 0` — correct behavior, but no data is ever present.

The frontend logic is correct. Both Overview and Progress tabs read from `student.level.skillLevelOverrides`. The bug is in the seed data.

Additionally, `ScenarioSeeder.WipeAsync` resets `SkillLevelOverrides = "{}"` for all scenario students (including Diego) and Scenario 5 never restores Diego's overrides.

## Changes

### Backend

1. **DemoSeeder.cs** (line ~325): Add `SkillLevelOverrides` to Diego Seed:
   ```
   SkillLevelOverrides = """{"Reading":"B2","Speaking":"B1","Writing":"A2","Listening":"B1"}"""
   ```
   Diego is B2. Writing A2 (2 levels below) gets a Gap badge; Speaking and Listening B1 (1 below) get the subdued color.

2. **ScenarioSeeder.cs** (SeedScenario5Async, after Diego session inserts): Restore Diego's overrides after WipeAsync resets them:
   ```
   diegoSeed.SkillLevelOverrides = """{"Reading":"B2","Speaking":"B1","Writing":"A2","Listening":"B1"}""";
   diegoSeed.UpdatedAt = now;
   ```

### Frontend tests

3. **ProgressDashboard.test.tsx**: Add "some skills set" test:
   - `skillLevelOverrides: { Reading: 'B2', Writing: 'A2' }` (2 of 4 skills)
   - Assert chart renders (no empty state text)
   - Assert Reading and Writing bars present
   - Assert Speaking and Listening bars absent

4. **e2e/tests/student-detail.spec.ts**: Add e2e test navigating to Diego's Progress tab and asserting skill bars visible (not empty state).

5. **e2e/tests/visual/student-detail.visual.spec.ts**: Add `@visual progress tab - skill bars` screenshot spec using `studentWithSessionsId` (Diego).

## No frontend component changes required

`ProgressDashboard.tsx` is already correct. The `hasSkillData` check and conditional rendering are fine.

## AC coverage

| AC | How covered |
|----|-------------|
| Reads same source as Overview tab | Already true (both use `student.level.skillLevelOverrides`) |
| Chart renders when any skill non-null | Unit tests: "all skills set" (existing) + "some skills set" (new) |
| Empty state only when all null | Unit test: "no skills set" (existing) |
| Unit tests: all/some/no skills | Done |
| Visual spec for student with skill overrides | Visual spec added |
