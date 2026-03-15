# T12 — Prompt Construction Service

**Branch**: `task/t12-prompt-construction-service`
**Priority**: Must | **Effort**: 1.5 days

---

## Goal

Implement `IPromptService` with 7 prompt-builder methods that produce `ClaudeRequest` instances ready for `IClaudeClient.CompleteAsync`. This is where output quality lives — every content type gets a tailored system prompt and JSON schema injected into the user prompt.

---

## Files to Create

| File | Purpose |
|------|---------|
| `backend/LangTeach.Api/AI/IPromptService.cs` | Interface + `GenerationContext` record |
| `backend/LangTeach.Api/AI/PromptService.cs` | Implementation |
| `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` | Unit tests |

## Files to Modify

| File | Change |
|------|--------|
| `backend/LangTeach.Api/Program.cs` | Register `IPromptService` as scoped |

---

## GenerationContext

```csharp
public record GenerationContext(
    string Language,
    string CefrLevel,
    string Topic,
    string Style,
    int DurationMinutes,
    string? StudentName,
    string? StudentNativeLanguage,
    string[]? StudentInterests,
    string[]? StudentGoals,
    string[]? StudentWeaknesses,
    string? ExistingNotes,
    string? LessonSummary   // only for BuildHomeworkPrompt
);
```

`StudentInterests/Goals/Weaknesses` come from `StudentDto.Interests/LearningGoals/Weaknesses` (already `List<string>`) — T13 controller maps StudentDto to GenerationContext directly.

---

## IPromptService Interface

```csharp
public interface IPromptService
{
    ClaudeRequest BuildLessonPlanPrompt(GenerationContext ctx);
    ClaudeRequest BuildVocabularyPrompt(GenerationContext ctx);
    ClaudeRequest BuildGrammarPrompt(GenerationContext ctx);
    ClaudeRequest BuildExercisesPrompt(GenerationContext ctx);
    ClaudeRequest BuildConversationPrompt(GenerationContext ctx);
    ClaudeRequest BuildReadingPrompt(GenerationContext ctx);
    ClaudeRequest BuildHomeworkPrompt(GenerationContext ctx);
}
```

`LessonSummary` moved into `GenerationContext` (nullable) to keep the interface uniform — all methods take only `ctx`.

---

## MaxTokens per prompt type

| Method | MaxTokens |
|--------|-----------|
| `BuildLessonPlanPrompt` | 4096 |
| `BuildVocabularyPrompt` | 1024 |
| `BuildGrammarPrompt` | 1500 |
| `BuildExercisesPrompt` | 2048 |
| `BuildConversationPrompt` | 1500 |
| `BuildReadingPrompt` | 2048 |
| `BuildHomeworkPrompt` | 1024 |

---

## Model routing (used by T13, documented here for reference)

| Prompt type | Model |
|-------------|-------|
| Lesson plan, Grammar, Reading, Homework | Sonnet |
| Vocabulary, Exercises, Conversation | Haiku |

---

## System Prompt (shared core)

```
You are an expert {Language} teacher creating materials for a {CefrLevel} level lesson.
Teaching style: {Style}. Topic: {Topic}. Duration: {DurationMinutes} minutes.

Write all examples, sentences, and instructions using vocabulary and grammar appropriate
for {CefrLevel}. Do not use structures above this level in examples. Definitions and
explanations aimed at the teacher may use higher-level language.

{STUDENT_BLOCK}
{NOTES_BLOCK}

Respond ONLY with valid JSON matching the schema below. No markdown, no prose,
no code fences. Start your response with { and end with }.
```

### STUDENT_BLOCK (omitted if StudentName is null)

```
Student profile:
- Name: {StudentName}
- Native language: {NativeLanguage}
- Interests: {Interests joined ", "}
- Learning goals: {Goals joined ", "}
- Areas to improve: {Weaknesses joined ", "}

Personalize content for this student. Reference their interests in examples.
The student's native language is {NativeLanguage}.
- Provide translations in {NativeLanguage} for vocabulary items.
- For grammar explanations, note where {Language} differs from {NativeLanguage}.
- Flag false cognates between {NativeLanguage} and {Language} when relevant.
- Be aware of common errors {NativeLanguage} speakers make in {Language}.
Focus practice on weak areas when relevant to the topic.
```

### NOTES_BLOCK (omitted if ExistingNotes is null/empty)

```
The teacher has already written these notes for context: {ExistingNotes}
Build on these notes rather than replacing them entirely.
```

---

## Output Schemas (injected as user prompt per method)

### Vocabulary
```
Generate a vocabulary list for the lesson. Return JSON:
{"items":[{"word":"","definition":"","exampleSentence":"","translation":""}]}
Limit to 10-15 items appropriate for {CefrLevel}.
```

### Grammar
```
Generate a grammar explanation. Return JSON:
{"title":"","explanation":"","examples":[{"sentence":"","note":""}],"commonMistakes":[""]}
Include 3-5 examples and 2-3 common mistakes.
```

### Exercises
```
Generate practice exercises. Return JSON:
{"fillInBlank":[{"sentence":"","answer":"","hint":""}],"multipleChoice":[{"question":"","options":[""],"answer":""}],"matching":[{"left":"","right":""}]}
Include at least 3 items of each type.
```

### Conversation
```
Generate conversation scenarios. Return JSON:
{"scenarios":[{"setup":"","roleA":"","roleB":"","keyPhrases":[""]}]}
Include 2-3 scenarios using level-appropriate language.
```

### Reading
```
Generate a reading passage. Return JSON:
{"passage":"","comprehensionQuestions":[{"question":"","answer":"","type":"factual|inferential|vocabulary"}],"vocabularyHighlights":[{"word":"","definition":""}]}
Passage must use {CefrLevel} vocabulary and grammar. Include 3-5 questions and 5-8 vocabulary highlights.
```

### Homework
```
Generate homework tasks. Return JSON:
{"tasks":[{"type":"","instructions":"","examples":[""]}]}
{LESSON_SUMMARY_BLOCK}
Include 3-5 varied tasks the student can complete independently.
```

### Lesson Plan
```
Generate a complete lesson plan. Return JSON:
{"title":"","objectives":[""],"sections":{"warmUp":"","presentation":"","practice":"","production":"","wrapUp":""}}
Each section should be detailed enough for the teacher to follow without preparation.
```

---

## DI Registration

Add to `Program.cs` after existing service registrations:
```csharp
builder.Services.AddScoped<IPromptService, PromptService>();
```

---

## Test Strategy

Unit tests (no Claude API calls, no DB):

1. **Student block included** when StudentName is not null — assert SystemPrompt contains name, native language, interests
2. **Student block omitted** when StudentName is null — assert SystemPrompt does not contain "Student profile"
3. **Notes block included** when ExistingNotes is not null
4. **Notes block omitted** when ExistingNotes is null/empty
5. **LessonSummary block included** in homework prompt when LessonSummary is set
6. **MaxTokens** — assert each method returns the correct MaxTokens value
7. **JSON schema injected** — assert UserPrompt for each method contains "Return JSON"
8. **Empty arrays** treated as omitted — if StudentInterests is empty `[]`, do not render "Interests: " line

---

## Manual Quality Validation (before declaring T12 done)

Run via the integration test or a temporary endpoint (T13 not yet built, so use the ClaudeApiClient directly in an xunit integration test or a minimal test controller).

Test at least 3 of the 10 scenarios from plan.md with real Claude calls:
- Scenario 1: English, A2, Portuguese speaker, Vocabulary
- Scenario 2: Spanish, B1, English speaker, Grammar
- Scenario 6: English, B1, Japanese speaker, Full lesson plan

Verify: level-appropriate content, personalization, false cognate awareness, JSON validity.

---

## Done When

- All 7 `IPromptService` methods implemented and registered
- Unit tests pass (`dotnet test`)
- Manual quality check with 3+ real Claude calls produces usable, level-appropriate, personalized JSON
- `dotnet build` zero warnings
