# Task 836: Fix ScenarioSeeder.SeedScenario6Async NULL constraint on ShortTermObjectives

## Issue
`SeedScenario6Async` (Hans B1) fails with a NULL constraint violation. Unlike scenarios 5 and 7, Scenario 6 never sets any student-level profile data on Hans B1 beyond the blank wipe state.

## Root Cause
`SeedScenario6Async` relies entirely on `WipeAsync` to reset `ShortTermObjectives = "[]"`, but never sets meaningful data. The acceptance criteria explicitly require "Hans B1 profile includes short-term objective data (no NULL fields)". The seeder also needs to set `UpdatedAt` when modifying the student record.

## Fix
Add student-level context to `SeedScenario6Async` matching the pattern used by scenarios 5 and 7:
- Set `hansB1.ShortTermObjectives` with two meaningful objectives for a B1 learner working on subjunctivo and ser vs estar
- Set `hansB1.UpdatedAt = now`

These changes will be persisted by the existing `db.SaveChangesAsync()` calls inside the method via EF Core change tracking.

## Files Changed
- `backend/LangTeach.Api/Data/ScenarioSeeder.cs` — add profile data block at start of `SeedScenario6Async`

## Testing
- Build passes
- Manual: run `--seed-scenario 6 <email>` against dev DB, verify Hans B1 appears with objectives
- Unit test: not applicable (seeder has no unit tests; verified by AC description)

## AC Checklist
- [ ] `SeedScenario6Async` completes without exceptions
- [ ] Hans B1 appears in the student list after seeding
- [ ] Hans B1 profile includes short-term objective data (no NULL fields)
- [ ] Other scenario seeders are unaffected
