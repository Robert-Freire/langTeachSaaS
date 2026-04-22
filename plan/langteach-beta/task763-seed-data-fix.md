# Task 763 — Seed data fix

## Goal
Fix DemoSeeder.cs so review-ui runs and demos show realistic, varied data.

## File
`backend/LangTeach.Api/Data/DemoSeeder.cs`

## Changes

### 1. UpsertStudentAsync — add TeachingTodos + SkillLevelOverrides to update block
So scenario students get their todos/skill overrides refreshed on re-seed.

### 2. Ana Seed — add TeachingNotes, SkillLevelOverrides, TeachingTodos
- TeachingNotes: realistic text
- SkillLevelOverrides: {"Reading":"B2","Speaking":"B1","Writing":"A2","Listening":"B1"}
- TeachingTodos: 1 pending item → triggers "Review pending" badge

### 3. Hugo Seed — add TeachingTodos with 1 pending item
Second student with "Review pending" badge.

### 4. Nataliya Seed (new scenario student)
- LearningLanguage: Spanish, CefrLevel: A2, NativeLanguages: ["Ukrainian"]
- LearningGoals: ["Travel to Spain", "Improve everyday Spanish vocabulary"]
- ReasonForStudying: clean text (no "dsadasd")
- Interests: ["travel", "cooking", "cinema"]
- 2 cancelled sessions within last 30 days → "Cancelled 2x" signal

### 5. Clara Seed — add 2 cancelled sessions in last 30 days
Second "Cancelled 2x" student.

### 6. Diego Seed — add upcoming session
He already has a session 7 days ago; adding upcoming → "no signal" (clean state).
Separate guard so existing session logs are preserved.

### 7. Eva Seed — add recent + upcoming sessions
Recent session 3 days ago + upcoming 5 days from now → second "no signal" student.
Separate guard.

### 8. Petra Seed + Hugo Seed sessions — add Duration = 60

### 9. SeedTeacherFollowupsAsync (new private method)
4 followups guarded by "[scenario-seed]" in text:
- today → green TODAY
- yesterday (-1d) → amber YESTERDAY
- 2 days ago (-2d) → amber 2 DAYS AGO
- 7 days ago (-7d) → red 7 DAYS OVERDUE
Called at end of SeedScenarioStudentsAsync.

### 10. Ana Visual — LearningGoals, ShortTermObjectives, SkillLevelOverrides
Added to the student definition in SeedVisualAsync.
EnsureAnaVisualExtrasAsync method added for already-seeded databases.
Called in the already-seeded branch alongside EnsureAnaVisualDifficultiesAsync.

## Roster signal coverage after changes
| Signal | Students |
|--------|---------|
| Cancelled 2x | Nataliya Seed, Clara Seed |
| Review pending | Ana Seed, Hugo Seed |
| No signal (clean) | Diego Seed, Eva Seed |
| Inactive Xd | Marco Seed + others |

## Visual spec test
`e2e/tests/visual/dashboard.visual.spec.ts` — check if it asserts column values; update expected if needed.

## AC checklist
- [x] Junk data: no Nataliya in seeder previously; adding her clean
- [x] Native language: Nataliya = Ukrainian (and all existing students already have NativeLanguages set)
- [x] Session duration: Petra and Hugo sessions get Duration = 60
- [x] Roster signal variety: 4 signal states visible
- [x] TeacherFollowup: 4 rows, idempotent via text tag
- [x] SkillLevelOverrides: Ana Seed and Ana Visual get 4 skills at different levels
- [x] TeachingNotes: Ana Seed gets TeachingNotes
- [x] Ana Visual: LearningGoals + ShortTermObjective added
