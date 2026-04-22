# Task 834 — Expand Demo Seed Data for Visual QA Coverage

## Scope
All changes are in `backend/LangTeach.Api/Data/DemoSeeder.cs`.
No schema changes, no migrations.

## Changes

### 1. Session timing (AC 1)
The `recentCutoff` in `GetSessionsListAsync` is `today.AddDays(-7)`.
Sessions seeded at `-7` are at the cutoff boundary; 2 days later they fall outside Recent.

**Fix**: change all sessions intended to appear in the Recent window:
- `SeedScenarioStudentsAsync`: Diego's past sessions `-14` → `-3` and `-7` → `-1`
- `SeedScenarioStudentsAsync`: Hugo's past sessions `-14` → `-3` (keep `-5` as-is)
- `SeedAnaVisualSessionLogAsync`: Ana Visual's session `-7` → `-1`

### 2. Ana Seed PersonalNotes / Sensitivities (AC 3)
`PersonalNotes = "[scenario-seed]"` is just the seed tag — nothing shows in the
Sensitivities subsection of Teacher's Working Memory. Replace with real content.
`TeachingNotes` already has content. `SkillLevelOverrides` already set.

**Fix**: Set Ana Seed's `PersonalNotes` to a realistic sensitivities text.

### 3. Ana Visual spoken languages (AC 4)
Ana Visual has `NativeLanguages = ["Portuguese","Ukrainian"]` but no `SpokenLanguages`.
The rounded-full language chips on Edit Student require at least one spoken language.

**Fix**:
- Add `SpokenLanguages = """["English"]"""` to Ana Visual in initial `SeedVisualAsync` creation.
- Add SpokenLanguages to the `EnsureAnaVisualExtrasAsync` check/update guard (guard currently
  only checks LearningGoals, ShortTermObjectives, SkillLevelOverrides, NativeLanguages — missing
  SpokenLanguages causes silent skip on existing seeds).

Note: the session timing fix only applies to fresh databases; the `logsExist` guard prevents
re-seeding existing Diego/Hugo/Petra sessions. Acceptable for the stated purpose.

### 4. Ana Visual name corruption fix (AC 6)
Name "Ana Visualxzq" has appeared in some runs. Root cause: unknown legacy issue.
Fix: add a pre-pass that renames any `Name.StartsWith("Ana Visual") && Name != "Ana Visual"`
to "Ana Visual" before running the ensure methods.

**Fix**: Add `FixAnaVisualNameAsync` called early in `SeedVisualAsync`.

### 5. Dashboard hero Last Session Briefing (AC 7)
After `--visual-seed`, the earliest upcoming session is Petra Seed (+4 days).
Her past session was at -25 with only `PlannedContent` set — no `GeneralNotes`,
`HomeworkAssigned`, or `TopicTags` — so the Last Session Briefing sub-sections
would be invisible/empty.

**Fix**: Enrich Petra's past session with `ActualContent`, `GeneralNotes`,
`HomeworkAssigned`, `NextSessionTopics`, and `TopicTags`.

### 6. Students list signals (AC 9)
After `--visual-seed`, two scenario students already produce the required badges:
- Marco Seed: last session -20d, no upcoming → "Inactive 20d" (amber) ✓
- Hugo Seed: pending TeachingTodo → "Review pending" (purple) ✓

These are confirmed by tracing through `buildSignals` in `Students.tsx`.
No additional code change needed here; the timing fixes in #1 ensure sessions
are correctly categorized.

## Files changed
- `backend/LangTeach.Api/Data/DemoSeeder.cs`
