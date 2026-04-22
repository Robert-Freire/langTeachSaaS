# Task 745: Extract shared TopicTagEntry record

## Issue
#745 - refactor: extract shared TopicTagEntry record from DashboardService and SessionHistoryService

## What
`TopicTagEntry(string Tag, string? Category)` was duplicated as a `private sealed record` in both
`DashboardService` and `SessionHistoryService`. This is the deserialization record for the `TopicTags`
JSON column on `SessionLog`.

## Change
- Created `backend/LangTeach.Api/Helpers/TopicTagEntry.cs` with `internal sealed record TopicTagEntry`
- Removed private definitions from `DashboardService.cs` and `SessionHistoryService.cs`
- Both services already had `using LangTeach.Api.Helpers;` so no using-directive changes needed

## Tests
All existing tests pass unchanged (no test logic changed).
