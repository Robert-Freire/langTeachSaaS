# Task 676: Add Duration and Title fields to SessionLog

## Goal

Add `Duration` (int?, minutes) and `Title` (string?, max 120) to `SessionLog` so the Sessions tab and Log Session form redesign have their data layer.

## Approach

- **Duration**: persist-only; no auto-generation. Client sends the dropdown value (30/45/60/90).
- **Title**: dual-path generation.
  - Option (a) for voice sessions: add `sessionTitle` to the extraction JSON schema. Claude already narrates what was covered; a title field is cheap to add.
  - Option (b) fallback for manual sessions: deterministic generation in `SessionLogService.CreateAsync`/`UpdateAsync`. No extra AI call: extract the first sentence of `ActualContent` or `PlannedContent` (truncated to 60 chars), or fall back to `"Session, Apr 5"` using `SessionDate`.

## Files to change

### 1. Model
`backend/LangTeach.Api/Data/Models/SessionLog.cs`
- Add `public int? Duration { get; set; }` (minutes)
- Add `public string? Title { get; set; }`

### 2. Migration
Run `dotnet ef migrations add AddSessionLogDurationTitle` in the API project.

### 3. DTOs
`backend/LangTeach.Api/DTOs/SessionLogDtos.cs`

**`SessionLogDto`** (positional record): append `int? Duration` and `string? Title` parameters.

**`CreateSessionLogRequest`**: add:
```csharp
public int? Duration { get; set; }

[MaxLength(120)]
public string? Title { get; set; }
```

**`UpdateSessionLogRequest`**: same two properties.

### 4. Extraction DTO
`backend/LangTeach.Api/DTOs/ReflectionExtractionDtos.cs`

Append `string? SessionTitle` as the **last parameter** to `ExtractedReflectionDto` (positional record -- must go last to avoid breaking all existing construction sites).

### 5. PromptService
`backend/LangTeach.Api/AI/PromptService.cs` — `BuildReflectionExtractionPrompt`

Add to the system schema description (after `sessionDate` line):
```
- sessionTitle: string or null — a concise title (under 60 chars) for this session derived from what was covered. Examples: "Subjunctive in time clauses", "Pasado compuesto — revisión". Null if no content is mentioned.
```

### 6. ReflectionExtractionService
`backend/LangTeach.Api/Services/ReflectionExtractionService.cs` — `ParseResponse`

Read `sessionTitle` from parsed JSON and pass as last arg to `ExtractedReflectionDto`.

Also update the catch-block fallback at line 69 (currently 8 nulls/args) to add a 9th `null` for `SessionTitle`:
```csharp
return new ExtractedReflectionDto(null, null, null, null, null, null, [], null, null);
```
This is required to compile after the record parameter is added.

### 7. SessionLogService
`backend/LangTeach.Api/Services/SessionLogService.cs`

**`CreateAsync`**: persist `Duration` and `Title`. If `Title` is null, call `GenerateTitle(request.PlannedContent, request.ActualContent, request.SessionDate)` to produce a generated title.

**`UpdateAsync`**: persist `Duration` and `Title` as-is (full-replace semantics). If `Title` is null, set it to null -- do NOT call `GenerateTitle` on update. The title was already generated at creation time. If the user explicitly clears it, respect that.

Note: `UpdateSessionLogRequest` comment says "full-replace semantics: nullable fields that are omitted will be set to null." This makes null on update mean "clear the title," which is intentional. The frontend can always re-derive a title from the extracted content at create time.

**`ToDto`**: append `sl.Duration` and `sl.Title` to the `SessionLogDto` constructor.

**New static method** (private, tested via `SessionLogServiceTests`):
```csharp
internal static string GenerateTitle(string? plannedContent, string? actualContent, DateTime? sessionDate)
{
    var content = actualContent ?? plannedContent;
    if (!string.IsNullOrWhiteSpace(content))
    {
        var firstLine = content.Split('\n', StringSplitOptions.RemoveEmptyEntries)[0].Trim();
        if (firstLine.Length <= 60) return firstLine;
        // Truncate at last space before char 60 to avoid cutting mid-word
        var cut = firstLine.LastIndexOf(' ', 59);
        return cut > 0 ? firstLine[..cut] : firstLine[..60];
    }
    var date = sessionDate?.ToString("MMM d", CultureInfo.InvariantCulture) ?? "unknown date";
    return $"Session, {date}";
}
```

### 8. Unit tests

**`SessionLogServiceTests.cs`**: add tests for `GenerateTitle`:
- Returns first line of `ActualContent` (truncated at 60 chars) when content provided
- Prefers `ActualContent` over `PlannedContent`
- Falls back to `PlannedContent` when `ActualContent` is null
- Returns `"Session, Apr 5"` format when no content and date is set
- Returns `"Session, unknown date"` when no content and no date
- Title preserved (not overwritten) when explicitly provided in request

**`ReflectionExtractionServiceTests.cs`**: add one test that a JSON payload with `"sessionTitle": "Preterite vs Imperfect"` round-trips through `ParseResponse`.

## Acceptance criteria coverage

| AC | How |
|----|-----|
| Migration adds Duration (nullable int) and Title (nullable string, max 120) | Step 2 |
| DTOs include both fields | Step 3 |
| Create and update endpoints accept and persist both fields | Step 7 |
| Title auto-generated from session content when not provided | Step 7 — GenerateTitle from content |
| Fallback title format "Session, Apr 5" when no content | Step 7 — GenerateTitle fallback |
| Existing sessions not broken (both fields nullable) | nullable columns + migration |
| Unit tests for title generation logic | Step 8 |

## E2E

No new e2e needed; this is a backend-only field addition. Existing session log e2e continues to pass (new fields are nullable with defaults).

## Out of scope

- Frontend rendering of Duration/Title (tracked in session detail redesign task)
- AI-powered title generation for manual sessions (date-based fallback is sufficient for this task)
