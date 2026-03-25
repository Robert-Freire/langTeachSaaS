# Task 152: Grammar-Constrained Content Generation

## Goal
Allow teachers to specify grammar constraints (include/exclude structures) when generating AI content. These constraints feed into the prompt service as additional generation parameters.

## Current State
- `GenerationContext.GrammarConstraints` exists and is used in `BuildSystemPrompt` to inject CEFR-level grammar structures from the curriculum syllabus (Spanish-only, auto-populated)
- `GenerateRequest` DTO has no teacher-facing grammar constraints field
- `GeneratePanel.tsx` has no grammar constraints input

## Approach
Add a **free-text** "Grammar constraints" field that the teacher fills in. Teacher constraints are a **separate concern** from the auto-generated curriculum constraints:
- Auto-generated: "Use ONLY these structures from the curriculum syllabus"
- Teacher-specified: Additional instructions (include X, avoid Y, only regular verbs, etc.)

They're rendered as two separate blocks in the system prompt so the model understands both types.

## Changes

### 1. Backend DTO - `GenerateRequest.cs`
Add:
```csharp
[MaxLength(500)]
public string? GrammarConstraints { get; set; }
```

### 2. Backend AI - `IPromptService.cs`
Add field to `GenerationContext` record in the optional tail (after `ExistingNotes`), with default null so existing callers using named args or `with` expressions are unaffected:
```csharp
string? TeacherGrammarInstructions = null,
```
`BaseCtx()` in PromptServiceTests uses positional construction for the first 11 args then stops; the new field is optional so no test changes needed for existing tests.

### 3. Backend AI - `PromptService.cs`
After the existing GrammarConstraints block (line 60) and BEFORE the student-profile section (line 62), add:
```csharp
if (!string.IsNullOrWhiteSpace(ctx.TeacherGrammarInstructions))
{
    sb.AppendLine();
    sb.AppendLine($"Additional grammar instructions from the teacher:");
    sb.AppendLine(Sanitize(ctx.TeacherGrammarInstructions));
}
```
Prompt order: CEFR constraints -> teacher constraints -> student profile -> notes -> direction.

### 4. Backend Controller - `GenerateController.cs`
In both `GenerationContext` construction sites:
- Streaming path (lines 142-168): add `TeacherGrammarInstructions: request.GrammarConstraints,`
- Non-streaming path (around line 312): add same

Also add `GrammarConstraints` to the `GenerationParams` JSON object stored on the content block (for audit consistency with `Direction` which is already captured there).

### 5. Frontend API - `api/generate.ts`
Add to `GenerateRequest` interface:
```typescript
grammarConstraints?: string
```

### 6. Frontend Component - `GeneratePanel.tsx`
- Add `const [grammarConstraints, setGrammarConstraints] = useState<string | undefined>(undefined)`
- Add `grammarConstraints` to the `request` useMemo AND to its dependency array `[lessonId, lessonContext, style, direction, grammarConstraints]`
- Add a textarea input below the style field (always visible, optional)
  - Label: "Grammar constraints (optional)"
  - Placeholder: "e.g. include subjunctive, only regular verbs, avoid passive voice"
  - `maxLength={500}`, `rows={2}`, `resize-none`

## Tests

### Backend unit test - `PromptServiceTests.cs`
- `SystemPrompt_IncludesTeacherGrammarInstructions_WhenProvided` - verify the section appears
- `SystemPrompt_OmitsTeacherGrammarInstructions_WhenNull` - verify it's absent when null/empty

### Frontend unit test - `GeneratePanel.test.tsx`
- Render panel, verify grammar constraints textarea is present
- Type in it, verify it's included in the generate call

### E2E test (manual for demo per acceptance criteria - already stated in issue)
No new e2e test required; AC says "verified manually for demo".

## Files to modify
- `backend/LangTeach.Api/DTOs/GenerateRequest.cs`
- `backend/LangTeach.Api/AI/IPromptService.cs`
- `backend/LangTeach.Api/AI/PromptService.cs`
- `backend/LangTeach.Api/Controllers/GenerateController.cs`
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs`
- `frontend/src/api/generate.ts`
- `frontend/src/components/lesson/GeneratePanel.tsx`
- `frontend/src/components/lesson/GeneratePanel.test.tsx` (new or update)
