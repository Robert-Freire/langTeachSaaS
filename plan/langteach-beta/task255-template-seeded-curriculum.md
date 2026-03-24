# Task 255: Template-Seeded Curriculum Backbone

**Issue:** #255 — Template-seeded curriculum backbone: use template units as fixed progression
**Sprint:** Student-Aware Curriculum
**Labels:** P1:must, area:backend, area:ai

## Context

The template path in `CoursesController.Create` already exists (lines 84-108) but has two gaps:

1. **Missing metadata fields**: entries hardcode `Competencies = "reading,writing,listening,speaking"` and don't store `TemplateUnitRef` or `CompetencyFocus`.
2. **No AI personalization**: when a student is linked, the AI should personalize entry topics to the student's context, while keeping grammar/order untouched.

The controller currently bypasses `CurriculumGenerationService` for the template path. The issue asks to consolidate all three paths (template+student, template-only, free AI) into the service.

## Architecture Decision

Move all three curriculum-generation paths into `CurriculumGenerationService.GenerateAsync()`:
- **Template + student present** → create skeletons from template units, then call AI to personalize topics per entry (student interests/goals drive the topic framing; grammar stays fixed)
- **Template + no student** → create skeletons from template units, no AI call
- **No template** → existing free AI generation (unchanged)

The controller becomes a thin coordinator: build context, call service, persist.

## Changes

### 1. Template JSON files: add `competency_focus`

Add a `"competency_focus"` array to each unit in all 5 Instituto Educativo JSON files (`data/curricula/instituto_educativo/A1.1.json` through `A2.2.json`). Values are CEFR skill codes: `"CE"` (reading), `"CO"` (listening), `"EE"` (writing), `"EO"` (speaking).

Assignment heuristic per unit:
- Oral communicative functions (presentarse, saludar, conversar) → `["EO", "CO"]`
- Reading comprehension goals → `["CE", "CO"]`
- Written production goals → `["EE", "CE"]`
- Mixed grammar units → `["EO", "CO", "EE"]`

### 2. `CurriculumTemplateService`: parse `competency_focus`

In `CurriculumTemplateService.cs`:
- Add `CompetencyFocus` to `RawUnit`: `public List<string>? CompetencyFocus { get; set; }`
- Add `IReadOnlyList<string> CompetencyFocus` as a new last parameter to the `CurriculumTemplateUnit` positional record
- **Update the positional construction call at line 83-90** in `CurriculumTemplateService.cs`:
  ```csharp
  var units = (raw.Units ?? []).Select(u => new CurriculumTemplateUnit(
      UnitNumber: u.UnitNumber,
      Title: u.Title ?? string.Empty,
      OverallGoal: u.OverallGoal ?? string.Empty,
      Grammar: u.Grammar ?? [],
      VocabularyThemes: u.VocabularyThemes ?? [],
      CommunicativeFunctions: u.CommunicativeFunctions ?? [],
      CompetencyFocus: u.CompetencyFocus ?? []   // new
  )).ToList();
  ```
- `TemplateUnitContext` record (new, in `IPromptService.cs` alongside `CurriculumContext`) — alternatively place in `CurriculumTemplateDtos.cs` for consistency with other template DTOs

### 3. `CurriculumEntry` model: two new nullable fields

In `Data/Models/CurriculumEntry.cs`:
```csharp
public string? TemplateUnitRef { get; set; }  // original unit title from template
public string? CompetencyFocus { get; set; }   // comma-sep CEFR codes: "EO,CO"
```

### 4. EF Migration

`dotnet ef migrations add AddCurriculumEntryTemplateFields` — adds two nullable `nvarchar(max)` columns to `CurriculumEntries`.

### 5. `CurriculumEntryDto`: expose new fields

```csharp
public record CurriculumEntryDto(
    Guid Id,
    int OrderIndex,
    string Topic,
    string? GrammarFocus,
    string Competencies,
    string? LessonType,
    Guid? LessonId,
    string Status,
    string? TemplateUnitRef,   // new
    string? CompetencyFocus    // new
);
```

Update `MapEntryToDto` in `CoursesController` (currently at line 334) to the new 10-parameter call:
```csharp
private static CurriculumEntryDto MapEntryToDto(CurriculumEntry e) =>
    new(e.Id, e.OrderIndex, e.Topic, e.GrammarFocus, e.Competencies,
        e.LessonType, e.LessonId, e.Status, e.TemplateUnitRef, e.CompetencyFocus);
```

### 6. `CurriculumContext`: add template fields

In `IPromptService.cs`, extend the `CurriculumContext` record:
```csharp
public record CurriculumContext(
    string Language,
    string Mode,
    int SessionCount,
    string? TargetCefrLevel,
    string? TargetExam,
    DateOnly? ExamDate,
    string? StudentName,
    string? StudentNativeLanguage,
    string[]? StudentInterests,
    string[]? StudentGoals,
    string? TemplateLevel = null,                            // new
    IReadOnlyList<TemplateUnitContext>? TemplateUnits = null // new
);

public record TemplateUnitContext(
    int OrderIndex,
    string Topic,
    string? GrammarFocus,
    IReadOnlyList<string> CompetencyFocus
);
```

`TemplateUnits` is populated by `CurriculumGenerationService` after loading the template; `PromptService` reads it to switch prompt mode.

### 7. `CurriculumGenerationService`: three-path logic

**Constructor change:** Add `ICurriculumTemplateService templateService` as a new constructor parameter, stored as `_templateService`. The service is already registered as a singleton in DI (confirmed: `CurriculumTemplateService` is registered in `Program.cs` via `services.AddSingleton<ICurriculumTemplateService, CurriculumTemplateService>()`).

```csharp
public async Task<List<CurriculumEntry>> GenerateAsync(CurriculumContext ctx, CancellationToken ct = default)
{
    if (ctx.TemplateLevel is not null)
    {
        var template = _templateService.GetByLevel(ctx.TemplateLevel)
            ?? throw new CurriculumGenerationException($"Template '{ctx.TemplateLevel}' not found.");

        // Build skeletons with fixed progression.
        // Derive Competencies from CompetencyFocus using CEFR code mapping:
        //   EO -> speaking, CO -> listening, CE -> reading, EE -> writing
        // Fall back to full set if CompetencyFocus is empty.
        var skeletons = template.Units.Select((u, i) => new CurriculumEntry
        {
            Id = Guid.NewGuid(),
            OrderIndex = i + 1,
            Topic = u.CommunicativeFunctions.Count > 0
                ? $"{u.Title}: {string.Join(", ", u.CommunicativeFunctions.Take(2))}"
                : u.Title,
            GrammarFocus = u.Grammar.Count > 0 ? string.Join(", ", u.Grammar) : null,
            Competencies = u.CompetencyFocus.Count > 0
                ? string.Join(",", u.CompetencyFocus.Select(CefrCodeToSkill).Distinct())
                : "reading,writing,listening,speaking",
            CompetencyFocus = u.CompetencyFocus.Count > 0
                ? string.Join(",", u.CompetencyFocus)
                : null,
            TemplateUnitRef = u.Title,
            LessonType = "Communicative",
            Status = "planned"
        }).ToList();

        // Personalize topics when student is known
        if (ctx.StudentName is not null)
        {
            var templateUnits = template.Units
                .Select((u, i) => new TemplateUnitContext(
                    i + 1, u.Title,
                    u.Grammar.Count > 0 ? string.Join(", ", u.Grammar) : null,
                    u.CompetencyFocus))
                .ToList();

            var personalizationCtx = ctx with { TemplateUnits = templateUnits };
            var request = _prompts.BuildCurriculumPrompt(personalizationCtx);
            var response = await _claude.CompleteAsync(request, ct);
            ApplyPersonalizedTopics(skeletons, response.Content);
        }

        return skeletons;
    }

    // Existing free AI generation path (unchanged)
    var aiRequest = _prompts.BuildCurriculumPrompt(ctx);
    // ... (existing logic)
}
```

`CefrCodeToSkill` private static helper:
```csharp
private static string CefrCodeToSkill(string code) => code.ToUpperInvariant() switch
{
    "EO" => "speaking",
    "CO" => "listening",
    "CE" => "reading",
    "EE" => "writing",
    _ => "speaking"  // safe default
};
```

`ApplyPersonalizedTopics` parses the AI JSON response `[{ orderIndex, topic }]` and updates matching skeleton Topics by orderIndex. Edge cases:
- **Parse failure**: log error, keep all original topics (graceful degradation)
- **Partial array** (AI returns fewer entries than skeletons): update only matched entries by orderIndex; unmatched skeletons keep their original topic
- **Extra entries** (AI returns more than expected): silently ignore extras

### 8. `PromptService.BuildCurriculumPrompt`: template personalization mode

When `ctx.TemplateUnits` is not null, switch to personalization prompt:
```
System: "You are an expert {language} language teacher. You personalize curriculum sessions for a specific student. You output ONLY valid JSON arrays with no markdown, no prose, no code fences."
[student context: name, native language, interests, goals]

User: "The following {N} sessions are fixed by the institutional curriculum. Their grammar focus and order must NOT change. Provide a short, student-specific topic title for each session that connects the grammar to this student's world.

Sessions:
1. Grammar: {grammarFocus} | Skills: {competencyFocus} | Original: {topic}
...

Return a JSON array with exactly {N} objects: [{ "orderIndex": 1, "topic": "..." }, ...]
Output ONLY the JSON array."
```

When `ctx.TemplateUnits` is null (free generation), existing prompt is unchanged.

### 9. `CoursesController.Create`: simplify template path

Remove the direct unit-mapping block (lines 84-108). Instead, when `TemplateLevel` is provided:
- Build `CurriculumContext` with `TemplateLevel = request.TemplateLevel`
- Call `_curriculumService.GenerateAsync(ctx, ct)` (same as free path)
- Validate the template exists before calling (for 400 early return; the service also throws, but controller should still guard)

The `resolvedSessionCount = entries.Count` still applies after the service call.

### 10. `GenerateLessonFromEntry`: include CompetencyFocus

In the `objectives` string built at line 280-282, add `CompetencyFocus` if set:
```csharp
var objectives = entry.GrammarFocus is not null
    ? $"Grammar: {entry.GrammarFocus}. Competencies: {entry.Competencies}."
    : $"Competencies: {entry.Competencies}.";
if (!string.IsNullOrEmpty(entry.CompetencyFocus))
    objectives += $" Skill focus: {entry.CompetencyFocus}.";
```

### 11. Tests

**New test file:** `Services/CurriculumGenerationServiceTests.cs`

Uses `Moq` (already in test project) to mock `ICurriculumTemplateService` and `IClaudeClient`.

`ClaudeResponse` is a 4-parameter record: `ClaudeResponse(string Content, string ModelUsed, int InputTokens, int OutputTokens)`:
```csharp
var mockTemplateService = new Mock<ICurriculumTemplateService>();
mockTemplateService.Setup(s => s.GetByLevel("A1.1")).Returns(FakeA1Template());

var mockClaude = new Mock<IClaudeClient>();
mockClaude.Setup(c => c.CompleteAsync(It.IsAny<ClaudeRequest>(), It.IsAny<CancellationToken>()))
    .ReturnsAsync(new ClaudeResponse("[{\"orderIndex\":1,\"topic\":\"Marco greets his teammates\"}]", "claude-haiku", 10, 20));
```

Tests:
- `TemplatePath_CreatesEntriesMatchingTemplateUnitCount` — entries.Count equals template.Units.Count
- `TemplatePath_PreservesGrammarFocusAndOrder` — OrderIndex and GrammarFocus unchanged after AI personalization
- `TemplatePath_SetsTemplateUnitRefAndCompetencyFocus` — TemplateUnitRef matches unit title; CompetencyFocus matches JSON
- `TemplatePath_WithStudent_CallsAiForPersonalization` — `IClaudeClient.CompleteAsync` called once when StudentName is set
- `TemplatePath_NoStudent_SkipsAiCall` — no AI call when StudentName is null
- `TemplatePath_AiPartialResponse_KeepsUnmatchedOriginalTopics` — if AI returns fewer entries, unmatched skeletons keep original topics
- `FreePath_StillProducesValidEntries` — existing behavior unchanged

**Extend** `CoursesControllerTemplateTests.cs`:

Add a second client-creation helper that uses the REAL `CurriculumGenerationService` with a fake Claude client (not `FakeCurriculumGenerationService`).

`FakeClaudeClient` already exists in `GenerateControllerTests.cs` (same test assembly) with a `FixedContent` property setter and no constructor parameter:
```csharp
private HttpClient CreateClientWithFakeClaudeRealService(string auth0Id, string email, string claudeResponse)
{
    var client = _factory
        .WithWebHostBuilder(b => b.ConfigureServices(services =>
        {
            // Remove FakeCurriculumGenerationService if registered, fall through to real service
            var fakeGen = services.FirstOrDefault(d => d.ServiceType == typeof(ICurriculumGenerationService));
            if (fakeGen is not null) services.Remove(fakeGen);
            services.AddScoped<ICurriculumGenerationService, CurriculumGenerationService>();

            // Replace IClaudeClient with fake that returns the specified response
            var existingClaude = services.FirstOrDefault(d => d.ServiceType == typeof(IClaudeClient));
            if (existingClaude is not null) services.Remove(existingClaude);
            services.AddScoped<IClaudeClient>(_ => new FakeClaudeClient { FixedContent = claudeResponse });
        }))
        .CreateClient();
    client.DefaultRequestHeaders.Add("X-Test-Auth0Id", auth0Id);
    client.DefaultRequestHeaders.Add("X-Test-Email", email);
    return client;
}
```

New tests:
- `CreateCourse_WithTemplateAndStudent_ReturnsPersonalizedTopics` — uses real service + fake Claude; verifies topics are updated from AI response
- `CreateCourse_A1_1Template_EntriesAlignToA1_1Units` — count, grammar focus, TemplateUnitRef present, CompetencyFocus non-null

## Migration command

```bash
cd backend && dotnet ef migrations add AddCurriculumEntryTemplateFields --project LangTeach.Api --startup-project LangTeach.Api
```

## Acceptance Criteria Mapping

| AC | Implementation |
|----|---------------|
| Entries match template progression | `CurriculumGenerationService` creates skeletons from template units in order |
| AI does not reorder/skip | Grammar/order come from template; AI returns only topic strings |
| Free generation still works | Unchanged code path when `TemplateLevel` is null |
| Grammar and vocab stored | `GrammarFocus` from `u.Grammar`, vocab not stored per existing decision |
| CompetencyFocus per entry | New `CompetencyFocus` field populated from `u.CompetencyFocus` in JSON |
| AI prompt includes competency focus | Personalization prompt lists skill codes per session |
| Unit test: template count/order | `CurriculumGenerationServiceTests` |
| Unit test: free gen still valid | `CurriculumGenerationServiceTests` |
| Integration test: A1.1 alignment | `CoursesControllerTemplateTests` |

## Out of Scope

- Frontend changes (CourseNew.tsx template selection already works)
- Iberia templates (communicative objectives only, no unit granularity)
- `visualExplainer` content type (#208 finding)
