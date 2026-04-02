# Task 274: New Content Type: Noticing Task (actividad de descubrimiento)

## Overview

Add `noticingTask` content type following the established pattern (enum, schema, CEFR config, prompt, renderer). The noticing task presents a context-rich text with embedded target structures and discovery questions that guide students to notice grammar patterns inductively, before receiving explicit explanation.

## Scope

- Backend: enum, schema, CEFR config, prompt, unit tests
- Frontend: TypeScript types, renderer (Editor/Preview/Student), unit tests
- Data: JSON schema, CEFR level config, section profile updates, exercise-types catalog reference
- E2E: mock AI stream test for noticing-task generation

## Key Design Decisions

1. **Schema shape**: `text` (the context-rich passage), `instruction` (what to look for), `targets[]` (each with `form`, `position: [start, end]`, `grammar` referencing exercise-types catalog), `discoveryQuestions[]`, `teacherNotes`
2. **Section placement**: presentation only (this is an input/discovery activity, not practice or production)
3. **Grammar references**: `targets[].grammar` uses exercise-types catalog IDs (e.g. "GR-08") or grammarInScope entries from CEFR config, not freeform strings
4. **CEFR config**: each level file gets a `noticingTask` section with `targetCategories`, `questionComplexity`, `scaffolding`, and `guidance`
5. **Frontend interactivity**: Student view allows clicking/highlighting words in the text. Discovery questions shown below. No answers visible in student mode.

## Implementation Steps

### Step 1: Content Schema (data layer)

**Create** `data/content-schemas/noticing-task.json`:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["text", "instruction", "targets", "discoveryQuestions"],
  "additionalProperties": false,
  "properties": {
    "text": { "type": "string", "description": "Context-rich passage containing target structures" },
    "instruction": { "type": "string", "description": "What the student should look for" },
    "targets": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["form", "position", "grammar"],
        "additionalProperties": false,
        "properties": {
          "form": { "type": "string", "description": "The target word/phrase as it appears in text" },
          "position": {
            "type": "array",
            "items": { "type": "number" },
            "minItems": 2,
            "maxItems": 2,
            "description": "[startCharIndex, endCharIndex] 0-based, exclusive end"
          },
          "grammar": { "type": "string", "description": "Exercise-type catalog ID or grammarInScope entry" }
        }
      }
    },
    "discoveryQuestions": {
      "type": "array",
      "minItems": 1,
      "items": { "type": "string" }
    },
    "teacherNotes": { "type": "string" }
  }
}
```

**Modify** `LangTeach.Api.csproj`: add `<EmbeddedResource>` for the new schema (follow existing pattern).

### Step 2: Backend Enum + Kebab Map

**Modify** `ContentBlockType.cs`:
- Add `NoticingTask` to the enum
- Add `[ContentBlockType.NoticingTask] = "noticing-task"` to `ToKebabMap`

### Step 3: CEFR Level Config

**Modify** each `data/pedagogy/cefr-levels/*.json` (a1 through c2):
Add `noticingTask` section. Example for A2:
```json
"noticingTask": {
  "targetCategories": ["gender patterns", "verb endings", "basic word order"],
  "questionComplexity": "binary or simple choice",
  "scaffolding": "high",
  "guidance": "Present 2-3 clear examples. Discovery questions should be yes/no or simple choice. Highlight target forms visually."
}
```
Scale complexity up for higher levels (B1: tense contrasts, B2: subjunctive triggers, C1: pragmatic features, C2: sociolinguistic nuance).

### Step 4: PedagogyConfigService

**Modify** `IPedagogyConfigService.cs`: add `NoticingTaskGuidance GetNoticingTaskGuidance(string level)` method.

**Modify** `PedagogyConfigService.cs`: implement to read `noticingTask` section from CEFR level JSON. Follow existing pattern (e.g. `GetGuidedWritingGuidance`).

**Add** `NoticingTaskGuidance` record to `PedagogyConfig.cs` or `PedagogyConfigDtos.cs`.

### Step 5: Section Profile

**Modify** `data/section-profiles/presentation.json`: add `"noticing-task"` to `contentTypes` array for all levels (A1 through C2). This is a presentation/input activity.

### Step 6: PromptService

**Modify** `IPromptService.cs`: add `ClaudeRequest BuildNoticingTaskPrompt(GenerationContext ctx)`.

**Modify** `PromptService.cs`:
- Add `BuildNoticingTaskPrompt` public method
- Add `NoticingTaskUserPrompt` private method
- Read CEFR noticing task guidance from `_pedagogy.GetNoticingTaskGuidance(level)`
- Read grammar scope for target reference validation guidance
- Use Sonnet model, ~3000 max tokens
- Schema injection happens automatically via `BuildRequest("noticing-task", ...)`

Prompt structure:
- Ask AI to generate a context-rich text on the topic with embedded target grammar structures
- Include level-specific guidance (target categories, question complexity, scaffolding)
- Instruct AI to generate discovery questions that guide student toward the rule without stating it
- Include teacher notes explaining the grammar point and expected student discoveries

### Step 7: GenerateController

**Modify** `GenerateController.cs`: add `[ContentBlockType.NoticingTask]` entry to `PromptBuilders` dictionary.

### Step 8: Frontend TypeScript Types

**Modify** `contentTypes.ts`:
- Add `'noticing-task'` to `ContentBlockType` union
- Add `NoticingTaskTarget`, `NoticingTaskContent` interfaces
- Add `isNoticingTaskContent` type guard
- Add `coerceNoticingTaskContent` coercion function

### Step 9: Frontend Renderer

**Create** `frontend/src/components/lesson/renderers/NoticingTaskRenderer.tsx`:

**Editor view**: text textarea, instruction input, target highlighting tool (select text to mark targets), discovery questions editor (add/remove/reorder), teacher notes textarea.

**Preview view**: formatted text with highlighted targets, discovery questions listed, teacher notes shown.

**Student view**: text displayed with interactive word highlighting (click to select words they think are targets), discovery questions below, teacher notes hidden. Visual feedback when student finds all targets.

### Step 10: Content Registry + Section Content Types

**Modify** `contentRegistry.tsx`: register `'noticing-task': NoticingTaskRenderer`.

**Modify** `sectionContentTypes.ts`: add `'noticing-task'` to `ALL_CONTENT_TYPES`.

### Step 11: Backend Unit Tests

**Create** `PromptServiceTests` additions for `BuildNoticingTaskPrompt`:
- Verifies CEFR guidance is included
- Verifies grammar scope block present
- Verifies schema injection

**Create** `PedagogyConfigServiceTests` additions for `GetNoticingTaskGuidance`:
- Verifies config loaded for each level
- Verifies null/empty handling

**Create** `ContentSchemaServiceTests` addition verifying `noticing-task` schema loads.

### Step 12: Frontend Unit Tests

**Create** `NoticingTaskRenderer.test.tsx`:
- Editor renders all fields
- Preview shows highlighted targets
- Student view hides teacher notes
- Student can click words to highlight
- Discovery questions display correctly

**Modify** `contentTypes.test.ts`:
- Type guard tests for `isNoticingTaskContent`
- Coercion tests for `coerceNoticingTaskContent`

### Step 13: E2E Test

**Create** `e2e/tests/noticing-task-type.spec.ts`:
- Mock AI stream returns valid noticing-task JSON
- Verify content renders in lesson view
- Follow pattern from `sentence-transformation-type.spec.ts`

## Files Changed

| File | Action |
|------|--------|
| `data/content-schemas/noticing-task.json` | Create |
| `backend/LangTeach.Api/LangTeach.Api.csproj` | Modify |
| `backend/LangTeach.Api/Data/Models/ContentBlockType.cs` | Modify |
| `data/pedagogy/cefr-levels/a1.json` | Modify |
| `data/pedagogy/cefr-levels/a2.json` | Modify |
| `data/pedagogy/cefr-levels/b1.json` | Modify |
| `data/pedagogy/cefr-levels/b2.json` | Modify |
| `data/pedagogy/cefr-levels/c1.json` | Modify |
| `data/pedagogy/cefr-levels/c2.json` | Modify |
| `backend/LangTeach.Api/AI/PedagogyConfigDtos.cs` | Modify |
| `backend/LangTeach.Api/Services/IPedagogyConfigService.cs` | Modify |
| `backend/LangTeach.Api/Services/PedagogyConfigService.cs` | Modify |
| `data/section-profiles/presentation.json` | Modify |
| `backend/LangTeach.Api/AI/IPromptService.cs` | Modify |
| `backend/LangTeach.Api/AI/PromptService.cs` | Modify |
| `backend/LangTeach.Api/Controllers/GenerateController.cs` | Modify |
| `frontend/src/types/contentTypes.ts` | Modify |
| `frontend/src/components/lesson/renderers/NoticingTaskRenderer.tsx` | Create |
| `frontend/src/components/lesson/renderers/NoticingTaskRenderer.test.tsx` | Create |
| `frontend/src/components/lesson/contentRegistry.tsx` | Modify |
| `frontend/src/utils/sectionContentTypes.ts` | Modify |
| `frontend/src/types/contentTypes.test.ts` | Modify |
| `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` | Modify |
| `backend/LangTeach.Api.Tests/Services/PedagogyConfigServiceTests.cs` | Modify |
| `backend/LangTeach.Api.Tests/Services/ContentSchemaServiceTests.cs` | Modify |
| `e2e/tests/noticing-task-type.spec.ts` | Create |

## Risks

- **Position validation**: Character offsets in `targets[].position` must match actual text. AI may generate invalid positions. Frontend should gracefully handle mismatches.
- **Interactive highlighting complexity**: The student click-to-highlight UX is the most complex frontend piece. Keep it simple: word-level click, not character-level drag selection.
- **Prompt quality**: Discovery questions must guide without giving away the answer. The CEFR config guidance and example patterns in the prompt should steer this.

## Out of Scope

- Automated position validation at generation time (could be a follow-up)
- Gamification (score tracking for correct target identification)
- Multiple grammar categories per noticing task (keep it single-focus for MVP)
