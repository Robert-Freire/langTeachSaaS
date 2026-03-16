# T15.4 — Conversation Type (Renderer + E2E)

## Context

T15.1-T15.3 established the typed content model: a registry that dispatches rendering to a typed component (Editor/Preview/Student) based on `ContentBlockType`. T15.2 added vocabulary (flashcards), T15.3 added exercises (interactive quiz). T15.4 completes the typed content sprint by adding the `conversation` type renderer.

`WarmUp` and `WrapUp` sections default to `'conversation'` in `SECTION_DEFAULT_TASK` (GeneratePanel.tsx:24-30), making this the most frequently triggered type in a standard lesson. The `ConversationContent` / `ConversationScenario` types and `isConversationContent` guard already exist in `contentTypes.ts`. No backend changes are needed.

---

## Files to modify / create

| File | Action |
|------|--------|
| `frontend/src/components/lesson/renderers/ConversationRenderer.tsx` | **Create** |
| `frontend/src/components/lesson/contentRegistry.tsx` | Add `conversation` entry |
| `e2e/helpers/mock-ai-stream.ts` | Add `CONVERSATION_FIXTURE` |
| `e2e/tests/conversation-type.spec.ts` | **Create** |
| `e2e/playwright.config.ts` | Add `**/conversation-type.spec.ts` to mock-auth `testMatch` |

---

## 1. ConversationRenderer.tsx

Three components following the same pattern as `VocabularyRenderer` / `ExercisesRenderer`.

### Editor

- Guard: if `!isConversationContent(parsedContent)`, fall back to `<textarea>` on `rawContent`.
- Render a list of scenario cards (`data-testid="scenario-card-{i}"`), each containing:
  - **Setup** — `<textarea>` for the context description (`data-testid="scenario-setup-{i}"`)
  - **Role A / Role B** — two `<input>` fields side-by-side (`data-testid="scenario-role-a-{i}"` / `scenario-role-b-{i}"`)
  - **Key phrases** — tag list: existing phrases render as chips with a remove button; a small `<input>` + "Add" button appends new phrases (`data-testid="phrase-chip-{i}-{j}"`, `data-testid="phrase-add-{i}"`)
  - **Remove scenario** button (`data-testid="scenario-remove-{i}"`)
- **Add scenario** button below the list (`data-testid="scenario-add"`)
- Stable keys via `useRef<number[]>` (same pattern as ExercisesRenderer).
- All mutations call `emit(newScenarios)` which does `onChange(JSON.stringify({ scenarios: newScenarios }))`.

### Preview

- Read-only scenario cards.
- Setup as `<p>`, roleA/roleB as colored `<span>` badges, key phrases as small chips.
- Falls back to `<pre>{rawContent}</pre>` if guard fails.

### Student

- Same visual layout as Preview, styled for readability.
- Setup rendered in a callout box at the top of each card.
- Key phrases in a highlighted reference block (indigo background, similar to flashcard back in VocabularyRenderer).
- Role labels with distinct colors (roleA = indigo, roleB = zinc/slate).
- `data-testid="conversation-student"` on the container.
- Falls back to `<pre>` if guard fails.

Export: `export const ConversationRenderer = { Editor, Preview, Student }`

---

## 2. contentRegistry.tsx

```ts
import { ConversationRenderer } from './renderers/ConversationRenderer'

const registry: Partial<Record<ContentBlockType, ContentRenderer>> = {
  exercises: ExercisesRenderer,
  vocabulary: VocabularyRenderer,
  conversation: ConversationRenderer,   // add this line
}
```

---

## 3. mock-ai-stream.ts — CONVERSATION_FIXTURE

```ts
export const CONVERSATION_FIXTURE = {
  scenarios: [
    {
      setup: 'You are at a restaurant and want to order food.',
      roleA: 'Waiter',
      roleB: 'Customer',
      keyPhrases: ["I'd like to order...", 'Could I have...?', 'What do you recommend?'],
    },
  ],
}
```

---

## 4. conversation-type.spec.ts

Happy path test following the mock-auth pattern (`lesson-ai-generate.spec.ts` is the reference):

- Uses `createMockAuthContext` (not `createAuthenticatedContext`)
- `beforeAll`: call `setupMockTeacher(page)` to register and approve the fixed e2e identity
- Each test wraps context in `try/finally { context.close() }`

Steps:
1. `beforeAll`: `createMockAuthContext` + `setupMockTeacher`.
2. Mock AI stream with `CONVERSATION_FIXTURE` (call before `page.goto`).
3. Create a lesson (any template — WarmUp defaults to `conversation`).
4. Fill `section-warmup` textarea with a note, blur, wait for `saved-indicator` (required — section needs a DB row before Generate button is active).
5. Click `generate-btn-warmup`, open the generate panel, click `generate-btn`.
6. Wait for `insert-btn`, click it.
7. Assert `data-testid="conversation-editor"` is visible (not raw JSON).
8. Navigate to student study view.
9. Assert `data-testid="conversation-student"` is visible.
10. Assert setup text `'You are at a restaurant and want to order food.'` is visible.
11. Assert key phrase `"I'd like to order..."` is visible.

---

## Verification

Pre-push checklist:
- `cd frontend && npm run build` — zero errors
- `cd backend && dotnet build` — zero warnings (no backend changes, but required)
- `cd backend && dotnet test` — all pass
- `npx playwright test --project=mock-auth e2e/tests/conversation-type.spec.ts` — green

---

## Branch

`task/t15.4-conversation-type` off `main`
