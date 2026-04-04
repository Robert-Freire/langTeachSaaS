# Task 463: Create dedicated LangTeach.MigrationTool.Tests project

## Problem

MigrationTool unit tests live in `LangTeach.Api.Tests` behind an `extern alias MigTool` workaround
because both assemblies define a `Program` type. This is a structural smell flagged at architecture review.

## Acceptance Criteria

- `backend/LangTeach.MigrationTool.Tests/LangTeach.MigrationTool.Tests.csproj` exists
- `ExcelImporterTests.cs` and `StudentMatcherTests.cs` moved to the new project
- No `extern alias` / `MigTool::` references remain
- `LangTeach.Api.Tests.csproj` no longer references `LangTeach.MigrationTool`
- All tests pass

## Implementation Steps

### 1. Create `backend/LangTeach.MigrationTool.Tests/LangTeach.MigrationTool.Tests.csproj`

Packages needed (same versions as Api.Tests):
- `xunit` 2.9.2
- `xunit.runner.visualstudio` 2.8.2
- `Microsoft.NET.Test.Sdk` 17.12.0
- `coverlet.collector` 6.0.2
- `FluentAssertions` 8.8.0
- `ClosedXML` 0.104.2 (for ExcelImporterTests)

ProjectReference: `../LangTeach.MigrationTool/LangTeach.MigrationTool.csproj` (no alias)

### 2. Update `InternalsVisibleTo` in `LangTeach.MigrationTool.csproj`

Change `LangTeach.Api.Tests` -> `LangTeach.MigrationTool.Tests`

### 3. Create new test files (no extern alias)

`LangTeach.MigrationTool.Tests/ExcelImporterTests.cs`
- Remove `extern alias MigTool;`
- Change `MigTool::LangTeach.MigrationTool` -> `LangTeach.MigrationTool`
- Namespace: `LangTeach.MigrationTool.Tests`

`LangTeach.MigrationTool.Tests/StudentMatcherTests.cs`
- Same transforms

### 4. Delete old test files from `LangTeach.Api.Tests/MigrationTool/`

Delete `ExcelImporterTests.cs` and `StudentMatcherTests.cs`.

### 5. Remove MigrationTool ProjectReference from `LangTeach.Api.Tests.csproj`

Remove the `<ProjectReference Include="..\LangTeach.MigrationTool\...">` block with `<Aliases>MigTool</Aliases>`.

### 6. Add new project to `backend/LangTeach.slnx`

Add `<Project Path="LangTeach.MigrationTool.Tests/LangTeach.MigrationTool.Tests.csproj" />`

## Risks / Notes

- `ExcelImporter` and `StudentMatcher` are `internal`, so `InternalsVisibleTo` is required.
- No API behavior changes; pure test infrastructure refactor.
- No e2e tests needed (pure unit test project move).
