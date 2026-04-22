# Task 766 — Dashboard Scenario Seed Script

## Goal

Idempotent CLI command (`--seed-scenario <N> <teacher>`) that switches the DB to one of 6 named dashboard test scenarios, plus a shell wrapper `scripts/seed-scenario.sh`.

## Files to create/modify

| File | Change |
|------|--------|
| `backend/LangTeach.Api/Data/ScenarioSeeder.cs` | New static class |
| `backend/LangTeach.Api/Data/DemoSeeder.cs` | Make `UpsertStudentAsync` internal |
| `backend/LangTeach.Api/Program.cs` | Add `--seed-scenario N teacher` arg handling |
| `scripts/seed-scenario.sh` | New shell wrapper |

## Implementation

### ScenarioSeeder.cs

Static class with entry point:
```
SeedScenarioAsync(AppDbContext db, int scenario, string teacherLookup, ILogger logger)
```

Execution steps per call:
1. Resolve teacher by email or auth0 ID (same pattern as DemoSeeder)
2. Ensure teacher is approved + onboarding complete
3. Find-or-create the 9 scenario students (by name; create-only, no profile overwrite for existing students)
4. **Wipe**: delete all SessionLogs for those 9 students; delete all TeacherFollowups for the teacher; reset TeachingTodos = "[]" on all 9 students; SaveChanges
5. Reseed via per-scenario private method

### 9 scenario students

Students created if absent (minimal profile, PersonalNotes = "[scenario-seed]"):
- Ana Visual, Marco B1, Carmen C1, Nadia B2, Hans B1 (+ Ana Seed, Marco Seed, Clara Seed, Diego Seed for Scenario 5)

For Ana Visual: reuse existing profile from DemoSeeder (find-or-create, no update).
For the 4 new students: LearningLanguage=English, appropriate CEFR level, NativeLanguages per spec.

### Scenario data

**Scenario 1 (Ana Visual — "IN 20 MIN")**
- Past session: now-3h; TopicTags=[{"Tag":"Pretérito indefinido"},{"Tag":"Verbos reflexivos"}], GeneralNotes, HomeworkAssigned
- TeacherFollowup with SourceSessionLogId=pastSession.Id: "Send link to reflexive verb exercises"
- NEXT session: now+20min; PlannedContent, HomeworkAssigned, PreviousHomeworkStatus=Partial
- Third session: now+4h (populates 3rd agenda row)

**Scenario 2 (Marco B1 — "IN 3D")**
- Marco B1: session in 3 days; PlannedContent set; no past sessions
- Ana Visual: session in 4 days (populates this-week list with 2 entries)
- 1 standalone TeacherFollowup created 2 days ago (triggers "2D OLD" badge)

**Scenario 3 (Carmen C1 — all empty states)**
- No sessions seeded; no followups (already wiped); no todos
- Hero: "No sessions scheduled" — Agenda: "No sessions this week" — Followups: "All caught up"

**Scenario 4 (Nadia B2 — overdue followups)**
- No sessions for anyone (hero shows no-session state)
- 3 standalone TeacherFollowups (StudentId=NadiaB2.Id): CreatedAt=now, now-2d, now-7d

**Scenario 5 (Roster signals — 4 states)**
- Ana Seed: 2 cancelled sessions in last 30 days (now-20d cancelled, now-10d cancelled)
- Marco Seed: 1 past session at now-20d (not cancelled), no future session → Inactive 20d
- Clara Seed: TeachingTodos=[{id,text,status:"pending"}] → Review pending
- Diego Seed: past session now-3d + upcoming now+5d, TeachingTodos=[] → no signal

**Scenario 6 (Hans B1 — full hero briefing)**
- Past session: now-7d; TopicTags=[{"Tag":"Ser vs estar"},{"Tag":"Subjuntivo"}]; GeneralNotes; HomeworkAssigned="Read article and summarize in Spanish"
- 2 TeacherFollowups with SourceSessionLogId=pastSession.Id: "Find recording of native speaker conversation", "Prepare vocabulary list on travel"
- NEXT session: now+5d; PlannedContent set; HomeworkAssigned="Complete workbook p.45-47"; PreviousHomeworkStatus=Done

### Program.cs — new arg handling

```csharp
var seedScenarioIndex = Array.IndexOf(args, "--seed-scenario");
if (seedScenarioIndex >= 0)
{
    var scenarioStr  = seedScenarioIndex + 1 < args.Length ? args[seedScenarioIndex + 1] : null;
    var teacherArg   = seedScenarioIndex + 2 < args.Length ? args[seedScenarioIndex + 2] : null;
    if (!int.TryParse(scenarioStr, out var scenario) || string.IsNullOrWhiteSpace(teacherArg))
    {
        Console.Error.WriteLine("Usage: --seed-scenario <1-6> <auth0-user-id|email>");
        return 1;
    }
    using var scope  = app.Services.CreateScope();
    var db     = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var sLogger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var seeded = await ScenarioSeeder.SeedScenarioAsync(db, scenario, teacherArg, sLogger);
    return seeded ? 0 : 1;
}
```

### scripts/seed-scenario.sh

```bash
#!/usr/bin/env bash
set -euo pipefail
SCENARIO="${1:-}"
TEACHER="${2:-${SEED_TEACHER:-}}"
if [ -z "$SCENARIO" ]; then echo "Usage: seed-scenario.sh <N> [teacher-email]" >&2; exit 1; fi
if [ -z "$TEACHER" ] && [ -f ".env.e2e" ]; then
  TEACHER=$(grep -E '^E2E_TEST_EMAIL=' .env.e2e | cut -d= -f2 | tr -d '"' || true)
fi
if [ -z "$TEACHER" ]; then echo "ERROR: teacher not set. Pass as arg 2 or set SEED_TEACHER." >&2; exit 1; fi
CONTAINER=$(MSYS_NO_PATHCONV=1 docker ps --filter "name=langteach" --filter "name=api" --format "{{.Names}}" | head -1)
if [ -z "$CONTAINER" ]; then
  CONTAINER=$(docker ps --format "{{.Names}}\t{{.Ports}}" | grep ":5000" | awk '{print $1}' | head -1)
fi
if [ -z "$CONTAINER" ]; then echo "ERROR: API container not running. Start the stack first." >&2; exit 1; fi
echo "Seeding scenario $SCENARIO via container $CONTAINER (teacher: $TEACHER)..."
MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" dotnet LangTeach.Api.dll --seed-scenario "$SCENARIO" "$TEACHER"
```

## Idempotency guarantee

Wipe step deletes all sessions for the 9 students and all teacher followups before each reseed. Running the same command twice produces identical DB state.

## Out of scope

- No changes to DemoSeeder logic or production seeding paths
- Scenarios for other screens (student detail, lesson editor)
- Scenario 7 (slow connection — browser only)
