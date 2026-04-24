# Task 892: Centralize TeacherFollowup.Kind literals

## Goal
Replace scattered `"pedagogical"` / `"operational"` string literals with a single `TeacherFollowupKinds` const class.

## Files to create
- `backend/LangTeach.Api/Data/Models/TeacherFollowupKinds.cs` — new const class

## Files to update (use constants)
- `backend/LangTeach.Api/Data/Models/TeacherFollowup.cs` — default value + comment
- `backend/LangTeach.Api/Data/AppDbContext.cs` — `HasDefaultValue()` call; CHECK constraint SQL stays as-is (SQL literal)
- `backend/LangTeach.Api/Services/DashboardService.cs` — 2 equality checks
- `backend/LangTeach.Api/Services/StudentService.cs` — 6 equality checks + 1 assignment
- `backend/LangTeach.Api/Services/TeacherFollowupService.cs` — 1 default assignment
- `backend/LangTeach.Api/Data/DemoSeeder.cs` — 3 Kind assignments
- `backend/LangTeach.Api/Data/ScenarioSeeder.cs` — 3 Kind assignments
- `backend/LangTeach.Api.Tests/Services/DashboardServiceTests.cs` — 4 Kind assignments

## Files to leave as-is (string form required)
- `TeacherFollowupDto.cs` — regex attribute and SQL string literals need verbatim strings; add comment referencing const class
- `AppDbContext.cs` CHECK constraint SQL — stays as SQL literal

## AC check
- [x] TeacherFollowupKinds class with Pedagogical/Operational consts
- [x] All C# service/seeder/test call sites use consts
- [x] No behaviour change
