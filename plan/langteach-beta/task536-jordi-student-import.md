# Task 536: Import Jordi's Student Data (Alumnos actuales.xlsx)

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/536

## Branch
`hotfix/jordi-onboarding` -> PR to `main`

## Context

The `LangTeach.MigrationTool` was built in PR #444. It already handles:
- Parsing all sheets as students
- Date formats: DateTime, OA numeric serials, text strings
- Skipping rows with no valid date or all-empty content columns
- Extracting CEFR level from sheet name or column F
- Appending profile notes (Preply test result, student info) to student Notes field
- Idempotency: skips duplicate session dates on re-run
- Dry-run mode

**One gap**: the "Libre" blank/template sheet would create a spurious empty student because `CreateStudentAsync` is called before checking whether the sheet has any meaningful content (sessions or profile notes).

## Acceptance Criteria

- [ ] Running the tool against Jordi's Excel in dry-run mode shows 34 students, no "Libre" student, and correct session counts
- [ ] Running live creates all 34 students and their session history in Jordi's production account
- [ ] Re-running is idempotent (no duplicates)

## Code Changes

### 1. Fix: Skip blank/template sheets in ExcelImporter

**File**: `backend/LangTeach.MigrationTool/ExcelImporter.cs`

Restructure `ImportAsync` to peek at content before creating the student:
- Collect profile notes first
- Scan for valid session rows (without inserting) to get a count
- If sessions == 0 AND profile notes are empty, skip the sheet with a log message
- Only then call `CreateStudentAsync` if needed

This avoids creating "Libre" (completely blank) while still creating students that have profile notes but no sessions yet.

Sketch:
```csharp
var profileNotes = CollectProfileNotes(worksheet);
var peekSessions = PeekSessionCount(worksheet);

if (peekSessions == 0 && profileNotes.preply.Length == 0 && profileNotes.info.Length == 0)
{
    Console.WriteLine($"SKIP (blank sheet): {sheetName}");
    continue;
}
```

Extract a `PeekSessionCount(IXLWorksheet)` helper that walks rows without touching the DB.

### 2. Test: blank sheet is skipped

**File**: `backend/LangTeach.MigrationTool.Tests/ExcelImporterTests.cs`

Add a unit test for the blank-sheet skip path (no rows beyond header -> skip). Cannot test via `ExcelImporter.ImportAsync` without a DB, so test the logic through the public/internal surface indirectly, or expose `ShouldSkipSheet` as an internal helper.

Actually: `ExcelImporter` is not easily unit-testable without a DB. The simplest approach is to add an `internal static bool ShouldSkipSheet(IXLWorksheet)` helper and test it directly.

### 3. Build and run tests locally
```
cd backend && dotnet test LangTeach.MigrationTool.Tests
```

## Operational Steps (for Robert to run)

These are not code changes, but must be confirmed before closing the issue.

### Step A: Get Jordi's teacher ID from production

Query the production DB via Azure CLI:
```
MSYS_NO_PATHCONV=1 az containerapp exec --name langteach-api --resource-group langteach-prod --command "sqlcmd -S <server> -U <user> -P <pass> -Q \"SELECT Id FROM Teachers WHERE Auth0Id LIKE '%jordi%'\""
```

Or use the Azure portal Query Editor on the production SQL database:
```sql
SELECT Id, Auth0Id, CreatedAt FROM Teachers ORDER BY CreatedAt DESC;
```

### Step B: Get production DB connection string

Available in Azure Key Vault or as an app setting in the Container App environment.

### Step C: Dry run
```bash
cd backend
dotnet run --project LangTeach.MigrationTool -- \
  --file "../../feedback/raw/2026-03-29_jordi_excel_alumnos_actuales.xlsx" \
  --teacher-id <JORDI_TEACHER_GUID> \
  --connection "<PROD_CONNECTION_STRING>" \
  --dry-run
```

Expected output: ~34 students, ~200+ sessions, 0 "Libre" entries.

### Step D: Live run

Same command without `--dry-run`.

### Step E: Validate

Ask Jordi to log in and confirm all students and session history are visible.

## Files Changed

- `backend/LangTeach.MigrationTool/ExcelImporter.cs` - blank sheet skip logic
- `backend/LangTeach.MigrationTool.Tests/ExcelImporterTests.cs` - test for blank sheet skip
