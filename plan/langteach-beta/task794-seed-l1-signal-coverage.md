# Task 794 — Seed data: populate L1 for all students and complete roster signal coverage

## Files
- `backend/LangTeach.Api/Data/DemoSeeder.cs` — add large roster seeder method
- `backend/LangTeach.Api/Data/ScenarioSeeder.cs` — extend scenario 5 with 3 new signal students

---

## Part 1: Large Roster with L1 data (DemoSeeder.cs)

Add `SeedLargeRosterAsync` private static method that seeds ~30 Eastern European students
learning Spanish (Teacher B's profile), all with `NativeLanguages` set.

Tag: `RosterTag = "[roster-seed]"` (separate from DemoTag/VisualTag).

Guard: `var rosterSeeded = await db.Students.AnyAsync(s => s.TeacherId == teacher.Id && s.PersonalNotes == RosterTag);`

Call it at the end of `SeedVisualAsync` in BOTH paths (already-seeded AND fresh-seed).

**Student list (~30 students, Spanish learners):**

| Name | L1 | Level |
|------|-----|-------|
| Nataliya | Ukrainian | A2 |
| Kateryna | Ukrainian | B1 |
| Oksana | Ukrainian | A1 |
| Olha | Ukrainian | B2 |
| Iryna | Ukrainian | A2 |
| Svitlana | Ukrainian | B1 |
| Yana | Bulgarian | B1 |
| Gergana | Bulgarian | A2 |
| Milena | Bulgarian | B2 |
| Ralitsa | Bulgarian | A2 |
| Kristina | Bulgarian | B1 |
| Natasha | Russian | A2 |
| Alina | Russian | B1 |
| Darya | Russian | A2 |
| Irina | Russian | B2 |
| Anna | Polish | B1 |
| Marta | Polish | A2 |
| Monika | Polish | B2 |
| Joanna | Polish | A2 |
| Agnieszka | Polish | B1 |
| Zuzana | Slovak | A2 |
| Jana | Czech | B1 |
| Petra | Czech | A2 |
| Elena | Romanian | A2 |
| Noemi | Romanian | B1 |
| Karolina | Hungarian | A2 |
| Maria | Greek | B1 |
| Jelena | Serbian | B2 |
| Inga | Lithuanian | A2 |
| Kristine | Latvian | B1 |

All use `LearningLanguage = "Spanish"` and have `NativeLanguages` set to their origin language.

---

## Part 2: Scenario 5 — Add 3 missing signal students (ScenarioSeeder.cs)

### New students to add to ScenarioStudentDefs

```csharp
("Rui Seed",   "A2", """["Romanian"]""",   "English"),  // EXAM signal
("Sofia Seed", "B2", """["Portuguese"]""", "English"),  // Returning
("Sonia Seed", "B1", """["Greek"]""",      "English"),  // HMWK PARTIAL
```

Add after the existing 9 students (indices 9, 10, 11).

### Update SeedAsync case 5

```csharp
case 5: await SeedScenario5Async(db, teacherId, anaSeed, marcoSeed, claraSeed, diegoSeed,
                                 ruiSeed, sofiaSeed, soniaSeed, now, logger); break;
```

### Update SeedScenario5Async

Add parameters for ruiSeed, sofiaSeed, soniaSeed.

- **Rui (EXAM):** Update `ShortTermObjectives` to `[{"id":"o1","text":"Pass A2 DELE exam","targetDate":"<now+35 days>"}]` then save.
- **Sofia (Returning):** Add past session 25 days ago + upcoming session in 5 days.
- **Sonia (HMWK PARTIAL):** Add past session with `PreviousHomeworkStatus = HomeworkStatus.Partial`.

After: all 7 signal types covered.

---

## Signal coverage after changes

| Signal | Students in Scenario 5 |
|--------|----------------------|
| Cancelled 2x | Ana Seed |
| Inactive Xd | Marco Seed |
| Review pending | Clara Seed |
| No signal | Diego Seed |
| EXAM Xw | Rui Seed (new) |
| Returning | Sofia Seed (new) |
| HMWK PARTIAL | Sonia Seed (new) |
