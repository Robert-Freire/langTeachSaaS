# Task 227 — Fix Reading & Comprehension Template: Generate Actual Reading Passage

## Problem

Teacher QA found that the **Reading & Comprehension** lesson template generates a grammar lesson (no reading passage, no comprehension questions). Root cause: `LessonPlanUserPrompt` is generic and has no knowledge of which lesson template is active. The `GenerationContext` does not include the template name.

## Fix

### 1. `IPromptService.cs` — Add `TemplateName` to `GenerationContext`

Add an optional parameter to the record:

```csharp
public record GenerationContext(
    ...
    IReadOnlyList<string>? GrammarConstraints = null,
    string? TemplateName = null   // NEW — added at the end to keep it optional/non-breaking
);
```

### 2. `PromptService.cs` — Template-aware `LessonPlanUserPrompt`

When `TemplateName` is "Reading & Comprehension", append specific requirements:

- **warmUp**: activate schema and predict content; no grammar drills
- **presentation**: first read for gist, then second read for detail; pre-teach blocking vocabulary
- **practice**: comprehension questions (factual, inferential, vocabulary in context); text analysis
- **production**: free production task related to the passage (short written response or discussion)
- **wrapUp**: summarise; discuss author purpose

The prompt must explicitly state:
- `warmUp` must be a pre-reading activation task (NOT a grammar or vocabulary drill)
- The lesson MUST include a reading passage of 300-500 words embedded in the presentation notes
- `practice` MUST include comprehension questions of types: factual, inferential, vocabulary in context
- All 5 sections (warmUp, presentation, practice, production, wrapUp) are required

### 3. `GenerateController.cs` — Load and pass template name

In both `Generate` (non-streaming) and `Stream` methods, after loading the lesson, look up the template name if `lesson.TemplateId` is set:

```csharp
string? templateName = null;
if (lesson.TemplateId.HasValue)
{
    var template = await _db.LessonTemplates.FindAsync(new object[] { lesson.TemplateId.Value }, ct);
    templateName = template?.Name;
}
```

Then add `TemplateName: templateName` to the `GenerationContext` constructor call.

## Tests

- Add a unit test in `PromptServiceTests.cs`: when `TemplateName = "Reading & Comprehension"`, the lesson plan prompt contains the phrase "reading passage" and "comprehension questions"
- Add a test for the generic case (no template name): prompt does NOT mandate a reading passage

## No frontend changes needed

The template name flows from the DB to the prompt entirely on the backend.

## Acceptance criteria mapping

- [ ] AC1: Reading & Comprehension template prompt includes a dedicated reading passage requirement — addressed in `LessonPlanUserPrompt`
- [ ] AC2: Template prompt specifies comprehension question types — addressed in `LessonPlanUserPrompt`
- [ ] AC3: Template generates all 5 PPP sections including Production — addressed by explicitly listing all 5 sections in the template-specific prompt block
- [ ] AC4: Teacher QA re-run with Carmen confirms reading passage is present — requires QA re-run after deploy
