# Task 353: Add AI output validation for grammar model language errors

## Goal

Add a post-generation validation step that checks Spanish-language AI output for common grammar errors and surfaces warnings to the teacher after generation. Warnings are non-blocking and dismissible.

## Current State

- Generation uses SSE streaming endpoint (`/api/generate/{taskType}/stream`)
- `useGenerate.ts` hook handles the SSE stream in `GeneratePanel`
- `streamText.ts` helper handles stream in `FullLessonGenerateButton`
- No post-generation validation exists
- Existing warnings infrastructure: `CurriculumWarning` (course-level), `CefrMismatchWarning` (lesson-level)

## Design

### Integration point: streaming endpoint, accumulate tokens server-side

In `GenerateController.Stream()`, accumulate all tokens while streaming to client. After the stream ends, run validation. Emit a warnings SSE event before `[DONE]`:
```
data: {"type":"grammar_warnings","items":["Possible ser/estar error: ..."]}
data: [DONE]
```

This adds zero perceptible latency (regex is sub-millisecond).

`streamText.ts` silently ignores non-string JSON objects, so it already handles this gracefully. No changes needed to `FullLessonGenerateButton`. Warnings surface only in `GeneratePanel` (via `useGenerate`).

### Validation service: Spanish-only, regex-based

`ISpanishGrammarValidationService` with a single method:
```csharp
IReadOnlyList<string> Validate(string content, string grammarTopic);
```

Returns human-readable warning strings. Each pattern group includes context note when `grammarTopic` matches the error type.

**Pattern groups (5 minimum):**

1. **Ser/estar confusions** (`grammarTopic` keywords: ser, estar, verb ser, verb estar)
   - `\beres de acuerdo\b` → "Possible ser/estar error: 'eres de acuerdo' — should be 'estás de acuerdo' (estar, not ser)"
   - `\bera deprimid[ao]\b` → "Possible ser/estar error: 'era deprimida/o' — modern Spanish prefers 'estaba deprimida/o'"
   - `\bsoy (bien|mal|cansad[ao]|content[ao]|enferm[ao]|triste)\b` (case-insensitive) → "Possible ser/estar error: conditions and states use estar"
   - `\bson (bien|mal)\b` → "Possible ser/estar error: 'son bien/mal' — should be 'están bien/mal'"
   - `\bera (bien|mal|cansad[ao]|content[ao]|enferm[ao])\b` → "Possible ser/estar error: temporary state uses estaba"

2. **Indicative after WEIRDO triggers** (`grammarTopic` keywords: subjunctive, subjuntivo)
   - `\b(espero|quiero|necesito|deseo|ojalá|dudo|temo) que (tiene|es|está|puede|hace|va|viene|sabe)\b` (case-insensitive)
   - Message: "Possible subjunctive error: after '...que' with a wish/doubt verb, the subjunctive is required"

3. **Gender agreement (high-confidence nouns)** (`grammarTopic` keywords: gender, género, agreement, concordancia)
   - `\bla (problema|mapa|día|tema|drama|poema|sistema)\b` → "Possible gender error: '[word]' is masculine — use 'el'"
   - `\bel (mano|gente|clase|ciudad|noche|tarde|mañana|leche)\b` → "Possible gender error: '[word]' is feminine — use 'la'"

4. **Por/para misuse** (`grammarTopic` keywords: por, para)
   - `\bpor el propósito de\b` → "Possible por/para error: 'por el propósito de' — purpose/goal uses 'para'"
   - `\bpara la razón de\b` → "Possible por/para error: 'para la razón de' — cause/reason uses 'por'"
   - `\bpara [a-záéíóúñ]+ (causa|motivo)\b` → "Possible por/para error: cause/motive uses 'por'"

5. **False cognate misuse** (`grammarTopic` keywords: vocabulary, false cognates, falsos amigos)
   - `\beventualmente\b` → "Note: 'eventualmente' means 'possibly/at some point', not 'eventually' (in the end)"
   - `\bactualmente\b` in certain contexts → "Note: 'actualmente' means 'currently/nowadays', not 'actually' (en realidad)"
   - `\brealizar\b` → "Note: 'realizar' means 'to carry out/achieve', not 'to realize' (darse cuenta)"

### Context-awareness

When `grammarTopic` contains keywords matching the pattern group (case-insensitive), the warning message appends: `(particularly critical — this is the grammar focus of this lesson)`.

Run all patterns always. This is correct: a ser/estar error in a vocabulary lesson is still wrong, just less pedagogically damaging.

## Files to Create/Modify

### Backend

1. **CREATE** `backend/LangTeach.Api/AI/ISpanishGrammarValidationService.cs`
2. **CREATE** `backend/LangTeach.Api/AI/SpanishGrammarValidationService.cs`
3. **MODIFY** `backend/LangTeach.Api/Controllers/GenerateController.cs`
   - Inject `ISpanishGrammarValidationService`
   - In `Stream()`: accumulate tokens, run validation for Spanish language only, emit warnings SSE event before `[DONE]`
   - In `Generate()`: run validation and include `Warnings` in `GenerationResultDto`
4. **MODIFY** `backend/LangTeach.Api/DTOs/GenerationResultDto.cs`
   - Add `IReadOnlyList<string>? Warnings` field
5. **MODIFY** `backend/LangTeach.Api/Program.cs`
   - Register: `builder.Services.AddSingleton<ISpanishGrammarValidationService, SpanishGrammarValidationService>();`
6. **CREATE** `backend/LangTeach.Api.Tests/AI/SpanishGrammarValidationServiceTests.cs`
   - At least 1 positive and 1 negative test per pattern group
   - Context-awareness test: topic match adds "critical" note

### Frontend

7. **MODIFY** `frontend/src/hooks/useGenerate.ts`
   - Extract `grammar_warnings` events from SSE stream
   - Add `warnings: string[]` to return value
8. **MODIFY** `frontend/src/components/lesson/GeneratePanel.tsx`
   - After status === 'done', if warnings exist, show dismissible amber banner listing warnings
9. **MODIFY** `frontend/src/components/lesson/GeneratePanel.test.tsx`
   - Add tests: warnings banner renders when warnings present; dismissible; absent when no warnings
10. **MODIFY** `frontend/src/hooks/useGenerate.test.ts`
   - Add tests for warning extraction from SSE stream

## Out of Scope

- Validation in `FullLessonGenerateButton` (uses `streamText` which silently ignores non-string SSE events)
- Non-Spanish languages
- LLM-based validation

## Acceptance Criteria Mapping

- [x] Detects "eres de acuerdo" and ser/estar errors → Pattern group 1
- [x] Appears in lesson warnings panel → GeneratePanel dismissible banner
- [x] < 500ms latency → regex, sub-millisecond
- [x] 5+ patterns → 5 groups above
- [x] Unit tests per pattern → SpanishGrammarValidationServiceTests.cs
- [x] Non-blocking → warnings only, content still renders
