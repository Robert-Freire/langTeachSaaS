# Task #874 -- Consolidate Mandarin/Chinese (Mandarin) duplicate in languages.json

## Problem

`data/languages.json` contains both `"Mandarin"` and `"Chinese (Mandarin)"`. These are the same language. Existing student records may have `"Mandarin"` stored in the `NativeLanguages` JSON column.

## Acceptance Criteria

1. `data/languages.json` contains `"Chinese (Mandarin)"` and NOT `"Mandarin"`.
2. All existing student records with `"Mandarin"` in their `NativeLanguages` column are updated to `"Chinese (Mandarin)"`.
3. The `CreateAsync_AllNativeLanguages_AreAccepted` backend test no longer has `[InlineData("Mandarin")]`.
4. All backend tests pass.

## Implementation Plan

### 1. EF Core data migration

Create a new EF Core migration with a raw SQL UPDATE:

```sql
UPDATE Students
SET NativeLanguages = REPLACE(NativeLanguages, '"Mandarin"', '"Chinese (Mandarin)"')
WHERE NativeLanguages LIKE '%"Mandarin"%'
  AND NativeLanguages NOT LIKE '%"Chinese (Mandarin)"%';
```

The `NOT LIKE` guard prevents double-replacement on any record that already has both values (edge case).

The `Down()` method reverses: replace `"Chinese (Mandarin)"` back to `"Mandarin"` (best-effort; any record that originally had both values cannot be perfectly reversed but this is acceptable for a dev-only rollback).

### 2. Remove "Mandarin" from data/languages.json

Remove the `"Mandarin"` entry from the array. `"Chinese (Mandarin)"` stays.

### 3. Update StudentServiceTests.cs

Remove `[InlineData("Mandarin")]` from `CreateAsync_AllNativeLanguages_AreAccepted`. The `[InlineData("Chinese (Mandarin)")]` line already exists -- no new line needed.

### 4. Run and verify

```bash
cd backend/LangTeach.Api
dotnet ef migrations add RenameMandarin --context AppDbContext
dotnet build
dotnet test
```

## Files Changed

- `data/languages.json`
- `backend/LangTeach.Api/Migrations/<timestamp>_RenameMandarin.cs` (new)
- `backend/LangTeach.Api/Migrations/<timestamp>_RenameMandarin.Designer.cs` (new)
- `backend/LangTeach.Api/Migrations/AppDbContextModelSnapshot.cs` (auto-updated by EF)
- `backend/LangTeach.Api.Tests/Services/StudentServiceTests.cs`

## Out of Scope

- `PedagogyConfigServiceTests.cs` uses `nativeLang: "mandarin"` (lowercase) for pedagogy config L1 adjustments -- unrelated to `languages.json`. No change needed.
- Frontend `languages.ts` LANG_TO_CODE already maps both to `'ZH'` -- no change needed.
