# Task 443 — Inject session history into lesson generation context

**Issue:** #443  
**Sprint:** Post-Class Tracking (`sprint/post-class-tracking`)  
**Dependencies:** #440 (done), #450 (done — PR #451)

---

## What to build

When a lesson is generated for a student, load that student's recent session logs and inject a structured `SessionHistoryContext` block into the Claude system prompt. Generation is unaffected when no sessions exist.

---

## Data flow

```
GenerateController
  -> SessionHistoryService.BuildContextAsync(teacherId, studentId, today)
      -> DB query: last 5 SessionLogs ordered by SessionDate desc (IsDeleted = false)
      -> returns SessionHistoryContext? (null if no sessions)
  -> GenerationContext with SessionHistory = sessionHistoryContext
  -> PromptService.BuildSystemPrompt
      -> renders SessionHistoryContext as a "Session history" block
```

---

## New types (in `IPromptService.cs`)

```csharp
public record SessionSummaryEntry(
    DateTime SessionDate,
    string? PlannedContent,
    string? ActualContent
);

public record CoveredTopicEntry(string Tag, string? Category);

public record SessionHistoryContext(
    IReadOnlyList<SessionSummaryEntry> RecentSessions,   // last 3
    int DaysSinceLastSession,
    string? OpenActionItems,                              // NextSessionTopics from most recent session
    string? PendingHomework,                             // HomeworkAssigned from most recent session
    HomeworkStatus? LastHomeworkStatus,                  // PreviousHomeworkStatus of most recent session
    IReadOnlyList<CoveredTopicEntry> CoveredTopics,      // deduplicated topic tags, last 5 sessions
    IReadOnlyDictionary<string, string> SkillLevelOverrides // from Student.SkillLevelOverrides JSON
);
```

---

## Files to create

### `backend/LangTeach.Api/Services/ISessionHistoryService.cs`
```csharp
public interface ISessionHistoryService
{
    Task<SessionHistoryContext?> BuildContextAsync(
        Guid teacherId, Guid studentId, DateTime generationDate, CancellationToken ct = default);
}
```

### `backend/LangTeach.Api/Services/SessionHistoryService.cs`
- **Two DB queries** (both cheap):
  1. Sessions: `Where(s => s.TeacherId == teacherId && s.StudentId == studentId && !s.IsDeleted).OrderByDescending(s => s.SessionDate).Take(5)`
  2. Student overrides: `.Where(s => s.Id == studentId).Select(s => s.SkillLevelOverrides).FirstOrDefaultAsync()`
  - Note: `StudentDto` (what the controller holds) does not include `SkillLevelOverrides`, so the service must query it directly. This is intentional; the 2-query pattern is acceptable because both are cheap indexed lookups.
- Returns `null` if sessions count == 0
- Computes `DaysSinceLastSession` = `Math.Max(0, (generationDate.Date - sessions[0].SessionDate.Date).Days)`
  - Days = 0 (same-day session) is treated as the 1-2 day band.
- Builds `RecentSessions` from first 3 entries
- Builds `OpenActionItems` from `sessions[0].NextSessionTopics`
- Builds `PendingHomework` from `sessions[0].HomeworkAssigned`
- Reads `sessions[0].PreviousHomeworkStatus`
- Aggregates `CoveredTopics`: deserialize `TopicTags` JSON from each session, flatten, deduplicate by tag text (case-insensitive), keep category
- Deserializes overrides into `Dictionary<string, string>` (empty dict = no overrides)

### `backend/LangTeach.Api.Tests/Services/SessionHistoryServiceTests.cs`
Unit tests covering all required scenarios (see Acceptance Criteria section).

---

## Files to modify

### `backend/LangTeach.Api/AI/IPromptService.cs`
- Add `SessionSummaryEntry`, `CoveredTopicEntry`, `SessionHistoryContext` records
- Add `SessionHistoryContext? SessionHistory = null` parameter to `GenerationContext`

### `backend/LangTeach.Api/AI/PromptService.cs` — `BuildSystemPrompt`
After the student difficulties block, render session history when `ctx.SessionHistory != null`:

```
SESSION HISTORY:
Time since last session: X days.
<gap rule framing>

Last sessions:
- <date>: planned <PlannedContent>, covered <ActualContent>
- <date>: planned ..., covered ...

Open action items: <NextSessionTopics>

Pending homework: <HomeworkAssigned> (status: <PreviousHomeworkStatus>)

Covered topics: grammar: A, B; vocabulary: C, D; competency: E

Nominal level: B1. Teacher-assessed overrides: speaking A1.2.
```

Time gap rules (from issue spec):
| Days | Instruction |
|------|-------------|
| 1-2  | Build directly on previous session. Minimal recap needed. |
| 3-7  | Include a brief warm-up reviewing key points from last session. |
| 8-14 | Include a dedicated review activity before introducing new content. |
| 15+  | Include a diagnostic mini-activity to assess retention. Do not assume previous content is retained. |

Conditional rendering:
- OpenActionItems block: only if non-null and non-empty
- PendingHomework block: only if HomeworkAssigned is non-null
- CoveredTopics block: only if list is non-empty
- SkillLevelOverrides block: only if any override exists

### `backend/LangTeach.Api/Controllers/GenerateController.cs`
- Inject `ISessionHistoryService _sessionHistory`
- In both `Stream` and `Generate` action helpers, after `student` is resolved:
  ```csharp
  SessionHistoryContext? sessionHistory = null;
  if (request.StudentId.HasValue && student is not null)
      sessionHistory = await _sessionHistory.BuildContextAsync(teacherId, student.Id, DateTime.UtcNow, ct);
  ```
- Add `SessionHistory: sessionHistory` to both `new GenerationContext(...)` calls

### `backend/LangTeach.Api/Program.cs`
```csharp
builder.Services.AddScoped<ISessionHistoryService, SessionHistoryService>();
```

---

## Acceptance Criteria checklist

| AC | Test / verification |
|----|-------------------|
| `GenerationContext` extended with `SessionHistoryContext` | Compile |
| Context only populated when student has session logs | `SessionHistoryServiceTests`: no sessions returns null |
| Time gap calculated from most recent session date | `SessionHistoryServiceTests`: date arithmetic |
| Correct gap rule injected | `PromptServiceTests`: 4 time gap bands |
| Open action items from `NextSessionTopics` | `PromptServiceTests` + `SessionHistoryServiceTests` |
| Pending homework status included when last session had homework | `PromptServiceTests` |
| Covered topics aggregated from `TopicTags` across recent sessions | `SessionHistoryServiceTests`: deduplication, category grouping |
| Reassessed skill levels from `Student.SkillLevelOverrides` | `SessionHistoryServiceTests` + `PromptServiceTests` |
| Unit tests: no sessions, 1 session, 3+ sessions, all time gap bands, topic aggregation, skill overrides | `SessionHistoryServiceTests` |

---

## Unit test scenarios

### `SessionHistoryServiceTests`
1. No sessions -> returns null
2. One session, today -> DaysSinceLastSession = 0, RecentSessions has 1 entry, no OpenActionItems if null
3. Three sessions -> RecentSessions has 3 entries ordered by date desc
4. Five+ sessions -> RecentSessions capped at 3, CoveredTopics from all 5
5. Topic tag deduplication: same tag on two sessions -> appears once
6. Topic tags empty on all sessions -> CoveredTopics is empty
7. SkillLevelOverrides non-empty JSON -> deserialized correctly
8. SkillLevelOverrides empty JSON `{}` -> empty dict
9. DaysSinceLastSession = 1 (gap band 1-2)
10. DaysSinceLastSession = 5 (gap band 3-7)
11. DaysSinceLastSession = 10 (gap band 8-14)
12. DaysSinceLastSession = 20 (gap band 15+)
- Note: gap rule text is rendered in PromptService not SessionHistoryService; the service only returns `DaysSinceLastSession`

### `PromptServiceTests` additions
1. No session history (`SessionHistory = null`) -> prompt does not contain "SESSION HISTORY"
2. Session history present -> prompt contains "SESSION HISTORY"
3. Gap 1-2 days -> "Build directly on previous session"
4. Gap 3-7 days -> "brief warm-up"
5. Gap 8-14 days -> "dedicated review activity"
6. Gap 15+ days -> "diagnostic mini-activity"
7. OpenActionItems present -> included in prompt
8. PendingHomework null -> homework block absent
9. CoveredTopics non-empty -> topics listed
10. SkillLevelOverrides present -> override text in prompt

---

## Approach for prompt rendering

`BuildSystemPrompt` is currently a `private static string` method. It can stay static — pass `SessionHistoryContext?` via `ctx.SessionHistory`. No instance state needed for rendering.

The session history block is appended after the student difficulties block and before the existing notes block. This positions it as "recent class context" after student profile.

**InputSanitizer requirement:** All session history string fields rendered into the system prompt must be passed through `InputSanitizer.Sanitize()` before appending to the `StringBuilder`, consistent with the existing pattern for all other user-sourced strings (`StudentName`, `ExistingNotes`, etc.). This applies to: `PlannedContent`, `ActualContent`, `NextSessionTopics`, `HomeworkAssigned`, topic tag strings, and skill override values.

**DaysSinceLastSession = 0:** Same-day sessions fall into the 1-2 day band ("Build directly on previous session. Minimal recap needed.").

## GenerateController test coverage

Add to `GenerateControllerTests.cs` (or create if not existing):
- `Generate_WithStudentId_CallsSessionHistoryService` — verifies `BuildContextAsync` is invoked when `StudentId` is set
- `Generate_WithoutStudentId_DoesNotCallSessionHistoryService` — verifies `BuildContextAsync` is NOT called when `StudentId` is null
- Mock `ISessionHistoryService` in the existing controller test setup

---

## No migrations needed

`TopicTags` and `SkillLevelOverrides` already exist in the schema (added by #450).
