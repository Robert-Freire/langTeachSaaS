# Task 268: Mandatory Production + Practice Ordering in Generation Prompts

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/268

## Summary
Two PPP methodology gaps found in Teacher QA (2026-03-24):
1. Production section missing in 2 of 5 personas (Ana A1, Carmen B2 Reading).
2. Practice exercises appear in random order instead of controlled -> meaningful -> semi-free.

Scope: prompt engineering + minor backend validation. No new content types.

---

## Changes

### 1. `PromptService.cs` — `LessonPlanUserPrompt`

**Production mandatory instruction** — strengthen the `production` bullet to make it explicit that production is REQUIRED in every lesson, with CEFR-specific guidance. Add a new private helper `CefrProductionGuidance(cefrLevel)` returning:

- A1/A2: "At A1/A2, Production MUST be a guided writing task: ask the student to write 3-5 sentences using vocabulary or structures from this lesson. Do NOT use 'discuss with your partner' or oral activities only — guided writing is appropriate and possible even at A1."
- B1/B2: "At B1/B2, Production must be a communicative task: an opinion paragraph, a short role-play scenario description, or a problem-solving task where the student uses new language in a meaningful context."
- C1/C2: "At C1/C2, Production must be an open-ended task requiring autonomous extended language use: a structured argument, a creative writing piece, or a task requiring register and pragmatic awareness."
- fallback: empty string

Update the `production` bullet in the base instruction to incorporate `CefrProductionGuidance(cefrLevel)` and add "Production is MANDATORY in every lesson plan — never omit it."

Add "All five sections (warmUp, presentation, practice, production, wrapUp) are required in every lesson plan." to the base instruction (currently this appears only in template-specific blocks like R&C and Exam Prep).

**Practice ordering instruction** — update the `practice` bullet to specify explicit ordering from controlled to meaningful:

Replace the generic `{practiceLevelHint}` suffix with a more explicit two-part instruction for all levels:
- "Order exercises from controlled to meaningful: start with mechanical items (matching, fill-in-blank with word bank, basic MC), then move to more demanding items (MC with close distractors, fill-in-blank without a word bank, true/false with justification). At B1+, include an optional third block bridging toward Production."
- The `CefrPracticeGuidance(cefrLevel)` hint (which gives level-specific constraints) should follow after the ordering instruction.

### 2. `GenerateController.cs` — `Generate` method

After `response = await _claudeClient.CompleteAsync(...)`, when `blockType == ContentBlockType.LessonPlan`, attempt to parse the JSON response and count the sections. Log a warning if fewer than 5 populated sections are found.

```csharp
if (blockType == ContentBlockType.LessonPlan)
{
    try
    {
        using var doc = JsonDocument.Parse(response.Content);
        if (doc.RootElement.TryGetProperty("sections", out var sectionsEl))
        {
            var populatedSections = sectionsEl.EnumerateObject()
                .Count(p => p.Value.ValueKind == JsonValueKind.String && p.Value.GetString()?.Length > 0);
            if (populatedSections < 5)
                _logger.LogWarning(
                    "LessonPlan generated with only {SectionCount}/5 sections. LessonId={LessonId}",
                    populatedSections, lesson.Id);
        }
        else
        {
            _logger.LogWarning("LessonPlan response missing 'sections' property. LessonId={LessonId}", lesson.Id);
        }
    }
    catch (JsonException)
    {
        // Content is not valid JSON — already logged as part of normal error path elsewhere
    }
}
```

This is a pure logging addition — it doesn't affect the response to the client.

### 3. `PromptServiceTests.cs` — new tests

Add 6 new test cases (following the existing pattern in the file):

1. `LessonPlanPrompt_UserPrompt_RequiresProductionInEveryLesson` — asserts `"Production is MANDATORY"` is present
2. `LessonPlanPrompt_UserPrompt_AllFiveSectionsRequired` — asserts `"All five sections"` is present in base prompt (non-template ctx)
3. `LessonPlanPrompt_A1_ProductionGuidance_MentionsGuidedWriting` — ctx with CefrLevel=A1, asserts `"guided writing"` in UserPrompt
4. `LessonPlanPrompt_B1_ProductionGuidance_MentionsCommunicativeTask` — ctx with CefrLevel=B1, asserts `"communicative task"` in UserPrompt
5. `LessonPlanPrompt_UserPrompt_SpecifiesPracticeOrdering_ControlledFirst` — asserts `"controlled"` and `"mechanical"` in UserPrompt
6. `LessonPlanPrompt_UserPrompt_SpecifiesPracticeOrdering_MeaningfulSecond` — asserts `"meaningful"` and `"MC with close distractors"` in UserPrompt

---

## Acceptance Criteria Mapping

| AC | Implementation |
|----|---------------|
| Generation prompt requires Production in every lesson | New mandatory production text + "All five sections required" in base `LessonPlanUserPrompt` |
| Generation prompt specifies exercise ordering (controlled first, meaningful second) | Updated `practice` bullet in `LessonPlanUserPrompt` |
| A1 Production generates guided writing (not "discuss with partner") | `CefrProductionGuidance("A1")` explicitly requires written task |
| Backend logs warning if generated lesson plan has fewer than 5 sections | Logging added in `GenerateController.Generate` after `CompleteAsync` |
| Unit tests verify Production requirement and Practice ordering | 6 new tests in `PromptServiceTests.cs` |
| Teacher QA confirms Production in all personas | Post-implementation QA run (not in this PR scope — QA agent handles) |

---

## Files Touched

- `backend/LangTeach.Api/AI/PromptService.cs` — new `CefrProductionGuidance` helper, updated `LessonPlanUserPrompt`
- `backend/LangTeach.Api/Controllers/GenerateController.cs` — section count warning after CompleteAsync
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` — 6 new unit tests

No DB migrations, no frontend changes, no new content types.

---

## Pre-push Checklist

- [ ] `az bicep build --file infra/main.bicep` — zero warnings, zero errors
- [ ] `cd backend && dotnet build` — zero warnings, zero errors
- [ ] `cd backend && dotnet test` — all tests pass
- [ ] `cd frontend && npm run lint` — zero errors
- [ ] `cd frontend && npm run build` — zero errors
- [ ] `cd frontend && npm test` — all unit tests pass
