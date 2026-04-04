# Task 466: review-ui seed named scenario students + scenario lookup

## Goal

Prevent the `review-ui` agent from improvising which student to navigate to by:
1. Adding four stable named scenario students to the e2e visual seed
2. Creating a lookup table at `.claude/procedures/review-ui-scenarios.md`
3. Updating CLAUDE.md step 5 to reference it

## Changes

### 1. `backend/LangTeach.Api/Data/DemoSeeder.cs`

Add `SeedScenarioStudentsAsync` method:
- Upsert by `(TeacherId, Name)` to be safe across re-runs
- Scenario students use tag `[scenario-seed]` in Notes (except Marco who has Excel-style notes)
- Add 2 SessionLog rows for Diego Seed

Called from `SeedVisualAsync` after existing logic completes.

Scenarios:

| Name | CefrLevel | NativeLanguage | Notes | Extra |
|------|-----------|---------------|-------|-------|
| Ana Seed | B1 | Portuguese | `[scenario-seed]` | Interests, LearningGoals, Weaknesses, Difficulties set |
| Marco Seed | A2 | (null) | `[Excel import 2026-01-15]\nCurrent level: A2\nObjectives: Business English, travel vocabulary\nDifficulties: Pronunciation, articles` | no manual fields |
| Clara Seed | A1 | (null) | null | minimal: only Name + LearningLanguage |
| Diego Seed | B2 | Spanish | `[scenario-seed]` | 2 SessionLog entries |

### 2. `.claude/procedures/review-ui-scenarios.md`

New file with lookup table.

### 3. `.claude/CLAUDE.md`

Step 5: extend instruction to reference the scenarios doc.

## Acceptance criteria

- [ ] E2e seed has four named students, stable on re-runs (upsert)
- [ ] `.claude/procedures/review-ui-scenarios.md` exists
- [ ] CLAUDE.md step 5 references it
- [ ] Builds clean

## No e2e test needed

This is tooling / seed infrastructure. No user-facing UI changed.
The visual seed is manually verified per AC item 4 in the issue.
