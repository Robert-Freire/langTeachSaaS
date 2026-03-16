# T16 — One-Click Full Lesson Generation

**Branch:** `task/t16-one-click-full-lesson-generation`
**Effort:** 0.5 days
**Status:** planning

---

## Goal

Add a "Generate Full Lesson" button to the lesson editor toolbar. One click generates content for all 5 sections sequentially, each streaming independently, with a progress indicator showing which section is active.

---

## Section-to-Content-Type Mapping

Each section gets one content block of a fixed type. This mapping is intentionally different from the per-section defaults in `GeneratePanel` (which reflect what the teacher would most likely generate manually). The full-lesson flow uses a pedagogically sequenced set:

| Section | Content Type | Rationale |
|---------|-------------|-----------|
| WarmUp | `vocabulary` | Introduce key vocabulary before the lesson |
| Presentation | `grammar` | Present the grammar point |
| Practice | `exercises` | Drill the grammar with exercises |
| Production | `conversation` | Use language in a real context |
| WrapUp | `homework` | Reinforce with take-home tasks |

Note: `GeneratePanel` defaults are WarmUp→conversation, Presentation→vocabulary, etc. The full-lesson mapping above is fixed and independent of those defaults.

---

## Architecture

No backend changes needed. The existing `POST /api/generate/{taskType}/stream` endpoint handles all required task types. The frontend orchestrates 5 sequential streaming requests.

### New Frontend Files

- `frontend/src/components/lesson/FullLessonGenerateButton.tsx` — Button + dialog + orchestration logic
- `frontend/src/components/lesson/FullLessonGenerateButton.test.tsx` — Unit tests

### Modified Frontend Files

- `frontend/src/pages/LessonEditor.tsx` — Mount `FullLessonGenerateButton` in the toolbar area

---

## Detailed Implementation

### 1. `FullLessonGenerateButton` component

State:
```ts
type GenerationPhase = 'idle' | 'confirming' | 'generating' | 'done' | 'error';
interface FullLessonState {
  phase: GenerationPhase;
  currentSectionIndex: number; // 0-4 while generating
  errorMessage?: string;
}
```

Props:
```ts
interface FullLessonGenerateButtonProps {
  lessonId: string;
  sections: LessonSection[]; // all 5 sections from parent
  lessonContext: {
    language: string;
    cefrLevel: string;
    topic: string;
    studentId?: string; // lesson.studentId ?? undefined
  };
  onBlockSaved: (block: ContentBlockDto) => void; // reuse existing handleBlockInsert
}
```

Behavior:
1. Render "Generate Full Lesson" button (disabled if `topic` is empty OR `language` is empty — sections are always present when the editor loads)
2. On click: set phase = 'confirming', show AlertDialog
3. On confirm: set phase = 'generating', loop through 5 sections sequentially
4. For each section:
   - Map section type -> task type (see mapping table above)
   - Call `streamText(url, body, token)` and await the full content string
   - Call `saveContentBlock(lessonId, req)` to persist the block
   - Call `onBlockSaved(block)` to update LessonEditor local state
   - Advance `currentSectionIndex`
5. On completion: set phase = 'done' (brief success state, auto-reset to 'idle' after 2s)
6. On any error: set phase = 'error', show error message in dialog

### 2. Progress indicator

Inside the AlertDialog (kept open during generation):
```
Generating lesson...
[===========    ] 3 / 5

WarmUp         ✓
Presentation   ✓
Practice       ⟳ (spinner)
Production     ·
WrapUp         ·
```

Use a simple ordered list with status icons per section.

### 3. Streaming implementation

`useGenerate` cannot be used for sequential automation — it stores accumulated content in React state, so awaiting `generate()` gives you nothing (the output is only accessible through re-renders). Instead, extract the streaming logic into a standalone async utility that resolves with the complete content string:

```ts
// frontend/src/lib/streamText.ts (new small utility)
export async function streamText(
  url: string,
  body: object,
  token: string,
  signal?: AbortSignal
): Promise<string>
// Performs the SSE fetch, accumulates all chunks, and returns the full string.
// Throws on non-2xx responses or stream errors.
```

The `FullLessonGenerateButton` component calls `useAuth0().getAccessTokenSilently()` once at the top of its generation loop, then passes the token to each `streamText` call. In the E2E environment the mock-auth layer already patches `getAccessTokenSilently` to return a fake token, so no special handling is needed inside `streamText`.

The SSE parsing logic is identical to `useGenerate` (split on `\n`, look for `data: ` prefix, stop on `[DONE]`).

### 4. Auto-save content block

After `streamText` resolves, the component calls `saveContentBlock(lessonId, req)` from `api/generate.ts` (the same function used by `GeneratePanel`), then passes the returned `ContentBlockDto` to the `onBlockSaved` callback so `LessonEditor` can add it to its local state.

`SaveContentBlockRequest` fields for each call:
```ts
{
  lessonSectionId: section.id,
  blockType: taskType,              // e.g. 'vocabulary'
  generatedContent: fullText,       // full string returned by streamText
  generationParams: JSON.stringify({ lessonId, language, cefrLevel, topic, studentId }),
}
```

The real endpoint (from `api/generate.ts:41`) is `POST /api/lessons/${lessonId}/content-blocks`.

### 5. LessonEditor integration

In the lesson editor toolbar (same area as other action buttons), add:
```tsx
<FullLessonGenerateButton
  lessonId={lesson.id}
  sections={lesson.sections}
  lessonContext={{ language: lesson.language, cefrLevel: lesson.cefrLevel, topic: lesson.topic, studentId: lesson.studentId ?? undefined }}
  onBlockSaved={handleBlockInsert}
/>
```

`onBlockSaved` reuses the existing `handleBlockInsert(block: ContentBlockDto)` directly. No new handler needed.

---

## Unit Tests (Vitest + RTL)

`FullLessonGenerateButton.test.tsx`:

1. Renders button disabled when topic is empty
2. Renders button disabled when language is empty
3. Renders button enabled when topic and language are both present
4. Clicking opens confirmation dialog
5. Canceling dialog returns to idle (does not call `onBlockSaved`)
6. Mock successful generation: `onBlockSaved` called 5 times (once per section) with correct blockType per section
7. Progress indicator shows correct section index during generation
8. Error during section 2 stops generation and shows error state

Mock strategy: mock `fetch` globally in tests to return a minimal SSE stream (`data: "text"\n\ndata: [DONE]\n\n`) for `/api/generate/*/stream` calls, and mock `saveContentBlock` from `api/generate` to return a fake `ContentBlockDto`.

---

## E2E Test

File: `e2e/tests/full-lesson-generation.spec.ts` (mock-auth project)

Happy path:
1. Log in as teacher (mock auth)
2. Create a new lesson with topic "Food vocabulary", language "Spanish", CEFR "A2", student assigned
3. Navigate to lesson editor
4. Click "Generate Full Lesson"
5. Confirm dialog
6. Wait for all 5 sections to complete (poll for content blocks appearing in each section, timeout 60s)
7. Assert each section has at least one content block
8. Assert content is non-empty text

Use `mockAiStream` helper (`e2e/helpers/mock-ai-stream.ts`). Since `mockAiStream` returns the same payload for all requests matching `**/api/generate/*/stream`, and the 5 sequential calls use different content types, we need per-type routing. Register 5 separate `page.route` handlers (one per task type pattern, e.g. `**/api/generate/vocabulary/stream`) using the existing fixtures plus two new ones:

- `VOCABULARY_FIXTURE` — already exists
- `GRAMMAR_FIXTURE` — add to `mock-ai-stream.ts`
- `EXERCISES_FIXTURE` — already exists
- `CONVERSATION_FIXTURE` — already exists
- `HOMEWORK_FIXTURE` — add to `mock-ai-stream.ts`

Each fixture must be a valid JSON object matching the corresponding content type schema so renderers don't throw.

---

## Done Criteria

- [ ] "Generate Full Lesson" button visible in lesson editor toolbar
- [ ] Confirmation dialog appears before generation starts
- [ ] Progress indicator updates as each of 5 sections completes
- [ ] All 5 sections populated with a content block after generation
- [ ] Errors per-section are shown without crashing the whole flow
- [ ] Unit tests pass (`npm test`)
- [ ] E2E happy path passes (`npx playwright test full-lesson-generation --project=mock-auth`)
- [ ] Backend build passes (no new changes, but confirm nothing broken)
- [ ] Frontend build passes (`npm run build`)
