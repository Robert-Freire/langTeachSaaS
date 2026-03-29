# Task #359 — Log Assembled Prompts at Debug Level

## Problem

Teacher QA and prompt health reviews operate blind: there is no way to see the full assembled prompt that was sent to Claude for a specific generation. When a pedagogical gap is found (e.g., "no L1 interference notes"), it is impossible to tell whether the constraint was missing from the prompt or whether Claude ignored it.

## Acceptance Criteria (from issue)

1. `ILogger<PromptService>` injected into PromptService
2. All `Build*Prompt` methods log full assembled user prompt at Debug level with structured fields (blockType, section, level, template)
3. System prompt logged separately (once per request)
4. `docker-compose.e2e.yml` sets `Logging__LogLevel__LangTeach.Api.AI=Debug`
5. Dev and production log levels unchanged (Info)
6. Teacher QA skill updated: findings include prompt text extracted from container logs
7. Teacher QA findings include a "Diagnosis" line: constraint present / constraint missing / constraint ambiguous

## Scope

Pure observability. No schema changes, no new entities, no frontend work. Touches:
- `backend/LangTeach.Api/AI/PromptService.cs`
- `docker-compose.e2e.yml` (add env var)
- `docker-compose.qa.yml` (add env var — needed for Teacher QA diagnostics; issue mentions e2e.yml but qa.yml is what the teacher-qa skill uses)
- `.claude/skills/teacher-qa/SKILL.md`
- Test files that instantiate `PromptService` directly

## Implementation Plan

### 1. PromptService.cs — Add Logger

**Add import** at the top of the file:
```csharp
using Microsoft.Extensions.Logging;
```

**Constructor change:**

Current:
```csharp
public PromptService(ISectionProfileService profiles, IPedagogyConfigService pedagogy)
{
    _profiles = profiles;
    _pedagogy = pedagogy;
}
```

New (add field and parameter):
```csharp
private readonly ILogger<PromptService> _logger;

public PromptService(ISectionProfileService profiles, IPedagogyConfigService pedagogy, ILogger<PromptService> logger)
{
    _profiles = profiles;
    _pedagogy = pedagogy;
    _logger = logger;
}
```

### 2. PromptService.cs — Add `BuildRequest` Helper

Add a private helper that logs and returns a `ClaudeRequest`. This centralises the logging logic and keeps each `Build*Prompt` method clean.

```csharp
private ClaudeRequest BuildRequest(
    string blockType,
    string section,
    string level,
    string? template,
    string systemPrompt,
    string userPrompt,
    ClaudeModel model,
    int maxTokens)
{
    _logger.LogDebug(
        "PromptSystem | blockType={BlockType} level={Level}\n{SystemPrompt}",
        blockType, level, systemPrompt);
    _logger.LogDebug(
        "PromptUser | blockType={BlockType} section={Section} level={Level} template={Template}\n{UserPrompt}",
        blockType, section, level, template ?? "(none)", userPrompt);
    return new ClaudeRequest(systemPrompt, userPrompt, model, maxTokens);
}
```

### 3. PromptService.cs — Convert Public Methods to Call `BuildRequest`

Each `Build*Prompt` method changes from a one-liner expression body to a block body that calls `BuildRequest`. Structured field values:

| Method | blockType | section | level | template |
|---|---|---|---|---|
| `BuildLessonPlanPrompt` | "lesson-plan" | "lesson-plan" | `ctx.CefrLevel` | `ctx.TemplateName` |
| `BuildVocabularyPrompt` | "vocabulary" | "vocabulary" | `ctx.CefrLevel` | null |
| `BuildGrammarPrompt` | "grammar" | "grammar" | `ctx.CefrLevel` | null |
| `BuildExercisesPrompt` | "exercises" | "practice" | `ctx.CefrLevel` | null |
| `BuildConversationPrompt` | "conversation" | `ctx.SectionType ?? "conversation"` | `ctx.CefrLevel` | null |
| `BuildReadingPrompt` | "reading" | "reading" | `ctx.CefrLevel` | null |
| `BuildHomeworkPrompt` | "homework" | "homework" | `ctx.CefrLevel` | null |
| `BuildFreeTextPrompt` | "free-text" | `ctx.SectionType ?? "free-text"` | `ctx.CefrLevel` | null |
| `BuildCurriculumPrompt` | "curriculum" | "curriculum" | `ctx.TargetCefrLevel ?? "(none)"` | null |

**Note on `BuildCurriculumPrompt`**: This method currently has conditional logic (`ctx.TemplateUnits is { Count: > 0 }` → different model). The logging still fits the `BuildRequest` helper if I extract the system/user prompt strings first and then call `BuildRequest`. I'll refactor this method into a block body that builds system + user, then calls `BuildRequest`.

**Note on `BuildConversationPrompt`**: This method has internal branching (WarmUp vs WrapUp vs default). The method already returns a string from different branches. I'll keep the branching logic in `ConversationUserPrompt` and log at the `BuildConversationPrompt` level.

### 4. docker-compose.e2e.yml and docker-compose.qa.yml

Add to the `api` service `environment` section in both files:
```yaml
Logging__LogLevel__LangTeach.Api.AI: Debug
```

Note: Adding to docker-compose.qa.yml is necessary even though the issue only mentions e2e.yml — the Teacher QA skill uses docker-compose.qa.yml, and without this env var the diagnostic logs won't appear in QA runs.

### 5. Fix Tests + Add Logging Unit Test

Two test files instantiate `PromptService` directly and need the new logger parameter:

- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` line 17:
  `new(ProfileService, PedagogyService)` → `new(ProfileService, PedagogyService, NullLogger<PromptService>.Instance)`

- `backend/LangTeach.Api.Tests/AI/PromptServiceIntegrationTests.cs` line 45:
  `new PromptService(profileService, pedagogyService)` → `new PromptService(profileService, pedagogyService, NullLogger<PromptService>.Instance)`

Add a new test in `PromptServiceTests.cs` that verifies `BuildLessonPlanPrompt` emits exactly two Debug log entries (one for system, one for user) using a simple `FakeLogger<PromptService>` that captures entries. Check whether `Microsoft.Extensions.Logging.Testing` is already referenced in the test project; if not, use a manual `FakeLogger` helper (a simple `ILogger<T>` implementation that collects `LogEntry` records).

### 6. Teacher QA Skill Update

Update `.claude/skills/teacher-qa/SKILL.md` to:

**Step 3.5 (after each Playwright run):** Extract prompt logs from the QA container:
```bash
docker compose -f docker-compose.qa.yml --env-file .env.qa logs api 2>&1 \
  | grep -E "PromptSystem|PromptUser" \
  | tail -200
```
Save the log extract to `.claude/skills/teacher-qa/output/<persona-dir>/prompt-logs.txt`.

**Report format update:** For each finding (Bug, Content Quality Issue, Gap), add a "Diagnosis" sub-line:
```
- [C1] [Section: Practice] Exercises reference "the image above" but no image exists
  Diagnosis: constraint present — "All content must be text-only" constraint found in system prompt
```

Diagnosis values:
- **constraint present** — the relevant constraint text is found in the assembled prompt logs
- **constraint missing** — expected constraint is absent from the prompt
- **constraint ambiguous** — constraint exists but wording is vague or could be misinterpreted

## Files Changed

- `backend/LangTeach.Api/AI/PromptService.cs` — add logger field, `BuildRequest` helper, convert all 9 public methods
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` — add NullLogger to constructor call
- `backend/LangTeach.Api.Tests/AI/PromptServiceIntegrationTests.cs` — add NullLogger to constructor call
- `docker-compose.e2e.yml` — add Debug log level env var
- `docker-compose.qa.yml` — add Debug log level env var
- `.claude/skills/teacher-qa/SKILL.md` — add Step 3.5, update report format

## No DI Registration Changes

`ILogger<PromptService>` is resolved automatically by ASP.NET Core's DI container — no changes to `Program.cs` needed.
