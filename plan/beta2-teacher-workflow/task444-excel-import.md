# Task 444 — Excel Import: Migrate Jordi's Spreadsheet to Session Logs

## Goal

Build a one-time CLI migration script that reads Jordi's Excel file
(`feedback/raw/2026-03-29-jordi-excel-alumnos-actuales.xlsx`) and imports
historical session data into the `SessionLog` table in production.

## Approach

New .NET console project: `backend/LangTeach.MigrationTool/`. Added to `LangTeach.slnx`.
Uses EPPlus for Excel parsing (MIT-licensed via NonCommercial license OR commercial). 
Alternative: ClosedXML (MIT, simpler API). Use **ClosedXML** — MIT, no registration.

Shares the same EF Core `AppDbContext` and model assemblies from `LangTeach.Api`.
Connects to the DB via connection string passed as env var or `--connection` arg.

## Implementation Steps

### 1. New console project

```
backend/LangTeach.MigrationTool/
  LangTeach.MigrationTool.csproj   (net9.0 console, refs LangTeach.Api + ClosedXML)
  Program.cs                       (arg parsing, orchestration)
  ExcelImporter.cs                 (parsing logic)
  StudentMatcher.cs                (fuzzy name matching + warning log)
```

Reference `LangTeach.Api.csproj` as a ProjectReference so we reuse `AppDbContext`,
`SessionLog`, `Student`, and migration infrastructure directly.

Add project to `LangTeach.slnx`.

### 2. Column mapping (hardcoded to Jordi's format)

| Excel col | Field |
|-----------|-------|
| A | Student name (row header — skip) |
| B | `PlannedContent` |
| C | `ActualContent` |
| D | `HomeworkAssigned` |
| E | `GeneralNotes` (no classification) |
| F | Append to `Student.Notes` |
| G | Append to `Student.Notes` |

Date in column A row 1 of each sheet is a serial or text date — convert to `DateTime`.
Each data row has a date in some column — need to inspect actual file to confirm layout.
Based on issue: "each row = one session, ordered chronologically". Date is likely in a
dedicated column (not column A which is the student name header). Will verify at runtime
and log if no date found.

**Note:** The issue says column A = student name (row header, skip). The date column
is not explicitly listed. Session date must be inferred from the row. Will treat the
first non-empty parseable date value in each row as `SessionDate`. If none found, skip
row with warning.

### 3. Sheet name parsing

Sheet name format: `"Nataliya B1"`, `"PaulaB2"` (name + level, possibly no space).
Strip trailing CEFR level suffix (A1, A2, B1, B2, C1, C2) and match student by name
in the DB (case-insensitive, trimmed). If no match: log warning, continue.

### 4. Student.Notes update (columns F + G)

For each student that has non-empty F or G values across their rows, collect all
unique non-empty values and append them to `Student.Notes`. Format:

```
[Excel import 2026-04-03]
Preply test: <col F values joined by "; ">
Student info: <col G values joined by "; ">
```

Only append if not already present (idempotency: check for `[Excel import` prefix).

### 5. Idempotency

The index `IX_SessionLogs_StudentId_SessionDate` exists but is NOT unique (no `unique: true`
in the migration). Rely solely on query-before-insert: before creating a `SessionLog`,
check `context.SessionLogs.Any(s => s.StudentId == studentId && s.SessionDate == date)`.
If found, skip with a "SKIP (duplicate)" log line. Do not catch unique constraint exceptions.

### 6. CLI interface

```
LangTeach.MigrationTool --file <path> [--dry-run] [--connection <conn-str>]
```

- `--file`: required, path to xlsx
- `--dry-run`: print what would be created, no DB writes
- `--connection`: optional, overrides `ConnectionStrings__DefaultConnection` env var

### 7. Output format

```
Processing sheet: Nataliya B1 -> student: Nataliya Kovalenko
  + Session 2025-09-15: planned, actual, homework
  + Session 2025-10-03: ...
  SKIP (duplicate): 2025-10-10
WARNING: Sheet "Unknown Name C1" -> no matching student found

Summary: 35 sheets, 32 matched, 3 warnings, 148 sessions imported, 0 duplicates
```

## Acceptance Criteria Mapping

- [x] Script accepts xlsx file path as argument -> `--file`
- [x] Parses all sheets and maps columns -> `ExcelImporter.cs`
- [x] Excel date serials converted to dates -> `DateTime.FromOADate()`
- [x] Unmatched sheet names logged with warning -> `StudentMatcher.cs`
- [x] Idempotent: query-before-insert pattern
- [x] Columns F and G appended to student profile notes
- [x] `IsDeleted = false`, `TopicTags = "[]"`, `PreviousHomeworkStatus = NotApplicable` set on all records
- [x] `CreatedAt` and `UpdatedAt` set to `DateTime.UtcNow` on all imported records
- [x] `--dry-run` mode
- [x] Tested against Jordi's actual file (run locally before production)

## Not in Scope

- No frontend
- No API changes
- No new migrations (uses existing schema from #440 + #450)
- No tests (one-time script; manual dry-run against real file is the acceptance test)

## Teacher ID

The script must know Jordi's `TeacherId`. Read it from `--teacher-id` arg or
`MIGRATION_TEACHER_ID` env var. Required; error if missing.

## Dependencies

- ClosedXML NuGet package
- Existing `AppDbContext` with `SessionLog` and `Student` (from #440, #450)
- DB connection string (prod or local)

## Run command (production)

```powershell
cd backend; dotnet run --project LangTeach.MigrationTool -- --file "../../feedback/raw/2026-03-29-jordi-excel-alumnos-actuales.xlsx" --teacher-id <jordi-teacher-guid> --dry-run
```
