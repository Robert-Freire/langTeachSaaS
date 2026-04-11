# Task 657 - Align difficulty taxonomy with CEFR 2020 Companion Volume

## Issue
GitHub #657 — Replace `Fluency` with `Interaction` + `Mediation`, add `critical` severity level.

## Summary of Changes

Three categories of change:
1. **Config** (`difficulty-taxonomy.json`) — update competencies and severities
2. **Backend** — remove hardcoded lists in `StudentService`, wire via `IPedagogyConfigService`; add EF data migration
3. **Frontend** (`studentOptions.ts`) — update option arrays

## Files to Change

### 1. `data/pedagogy/difficulty-taxonomy.json`
- Replace `"Fluency"` with `"Interaction"`
- Add `"Mediation"` as a new competency
- Add `"critical"` to severities

New content:
```json
{
  "competencies": ["Grammar", "Vocabulary", "Pronunciation", "Interaction", "Discourse", "Mediation"],
  "severities": ["low", "medium", "high", "critical"]
}
```

### 2. `backend/LangTeach.Api/Services/StudentService.cs`
- Remove `AllowedCompetencies` and `AllowedSeverityLevels` static fields
- Inject `IPedagogyConfigService` via constructor
- Replace validation calls with `_pedagogy.GetValidDifficultyCompetencies()` and `_pedagogy.GetValidDifficultySeverities()`

### 3. `backend/LangTeach.Api/Services/IPedagogyConfigService.cs`
- Update doc comment on `GetValidDifficultySeverities()` to mention `critical`

### 4. EF Data Migration (new file)
Generate via `dotnet ef migrations add RenameFluencyToInteraction` (run in worktree), then edit the `Up()` method to use `migrationBuilder.Sql()`:

JSON casing varies per column:
- `Students.Difficulties` — serialized via `JsonStorageHelper.Serialize` (no `PropertyNamingPolicy`) → **PascalCase** keys: `"Competency":"Fluency"`
- `SessionLogs.SuggestedDifficulties` — serialized via `CamelCaseOptions` → **camelCase** keys: `"competency":"Fluency"`
- `SessionLogs.MentionedDifficultyPairs` — serialized via `JsonStorageHelper.Serialize` → **PascalCase** keys: `"Competency":"Fluency"`

```csharp
// Students.Difficulties — PascalCase keys
migrationBuilder.Sql("""
    UPDATE Students
    SET Difficulties = REPLACE(Difficulties, '"Competency":"Fluency"', '"Competency":"Interaction"')
    WHERE Difficulties LIKE '%"Competency":"Fluency"%'
    """);

// SessionLogs.SuggestedDifficulties — camelCase keys
migrationBuilder.Sql("""
    UPDATE SessionLogs
    SET SuggestedDifficulties = REPLACE(SuggestedDifficulties, '"competency":"Fluency"', '"competency":"Interaction"')
    WHERE SuggestedDifficulties LIKE '%"competency":"Fluency"%'
    """);

// SessionLogs.MentionedDifficultyPairs — PascalCase keys
migrationBuilder.Sql("""
    UPDATE SessionLogs
    SET MentionedDifficultyPairs = REPLACE(MentionedDifficultyPairs, '"Competency":"Fluency"', '"Competency":"Interaction"')
    WHERE MentionedDifficultyPairs LIKE '%"Competency":"Fluency"%'
    """);
```

`Down()` reverses each: `"Interaction"` -> `"Fluency"`, same casing per column.

### 5. `frontend/src/lib/studentOptions.ts`
- Replace `Fluency` entry with `Interaction`
- Add `Mediation` entry
- Add `{ value: 'critical', label: 'Critical' }` to `SEVERITY_LEVELS`

### 6. Tests to update
- `frontend/src/lib/studentOptions.test.ts` — add `toContain('Interaction')` and `toContain('critical')` assertions (existing `toContain` tests pass; add new ones for coverage)
- No other test files reference `Fluency`; `competency-constraints.test.ts` does not list it

## Migration Strategy
- The migration only touches JSON string columns. No schema changes.
- `REPLACE` is safe: the JSON serializer always writes `"competency":"Fluency"` (camelCase, no spaces) consistently.
- Both `Students.Difficulties` and `SessionLogs.SuggestedDifficulties` / `MentionedDifficultyPairs` are patched.
- Down migration restores `Interaction` -> `Fluency`.

## Acceptance Criteria (from issue)
- [x] `Fluency` replaced with `Interaction` in taxonomy config
- [x] `Mediation` added as new competency category
- [x] `critical` added as fourth severity level
- [x] Data migration renames existing `Fluency` records to `Interaction`
- [x] No existing records orphaned (REPLACE is lossless)
- [x] Reflection extraction prompt uses updated competency names (auto via config)
- [x] Frontend dropdowns show updated categories
- [x] Sophy review: config-vs-code boundary maintained (by removing hardcoded lists from StudentService)

## E2E Test
Add/extend a test in `e2e/tests/difficulty-trend.spec.ts` or `session-log.spec.ts` that:
1. Creates a student, adds a difficulty with competency `Interaction`
2. Verifies it saves and displays correctly
3. Verifies `Mediation` is available in the dropdown
4. Verifies `critical` severity can be selected

The existing e2e tests use `Grammar`/`high` — no changes needed there.
