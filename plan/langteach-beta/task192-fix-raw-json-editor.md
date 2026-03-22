# Task 192: Fix raw JSON visible in editor when AI returns unexpected content format

## Goal

Prevent teachers from seeing raw JSON in the lesson editor when AI generates content with
schema mismatches or truncated output. Replace the raw textarea fallback with a friendly
error UI and add a coercion layer to auto-fix common schema variations.

## Acceptance criteria (from issue)

- [ ] Editor shows friendly error with Regenerate button instead of raw JSON
- [ ] "Show raw content" toggle for teachers who want to manually fix JSON
- [ ] Common schema mismatches auto-coerced before type guard check
- [ ] Preview and Student modes keep showing ContentParseError (already working)
- [ ] Truncated AI responses show a clear "Generation was incomplete" message

## Architecture

### 1. Coercion layer in `contentTypes.ts`

Add one coerce function per content type. Each receives `unknown` and returns the typed
content or `null`. Common patterns handled:

- **Extra wrapper key**: `{ vocabulary: { items: [...] } }` -> unwrap and retry
- **Array instead of object**: `[{word, definition}]` -> wrap in `{ items: [...] }`
- **Near-match field names**:
  - Vocabulary: `term` -> `word`, `example`/`sentence` -> `exampleSentence`
  - Grammar: `mistakes` -> `commonMistakes`
  - Exercises: missing arrays default to `[]`
  - Conversation: single scenario -> wrap in `{ scenarios: [...] }`
  - Reading: missing `comprehensionQuestions`/`vocabularyHighlights` default to `[]`
  - Homework: array directly -> wrap in `{ tasks: [...] }`

### 2. Registry coerce hook

Add optional `coerce?: (v: unknown) => unknown` to `ContentRenderer` interface in
`contentRegistry.tsx`. Each renderer exports and registers its coerce function.

### 3. ContentBlock.tsx: apply coercion in parsedContent memo

After JSON parse succeeds, call `renderer.coerce?.(parsed)`. If it returns a non-null
value, use it instead of the raw parsed object. This is transparent to all renderers.

Also pass `onRegenerate={handleRegenerate}` to `renderer.Editor` (requires adding
`onRegenerate?: () => void` to `EditorProps`).

### 4. New `ContentEditorParseError` component

Location: `frontend/src/components/lesson/ContentEditorParseError.tsx`

Props:
- `rawContent: string`
- `onChange: (newRaw: string) => void`
- `onRegenerate?: () => void`
- `isIncomplete?: boolean` (for truncated JSON - shows different message)

Renders:
- Error message: "This content was generated in an unexpected format."
  OR if `isIncomplete`: "Content generation was incomplete."
- "Regenerate" button (calls onRegenerate if provided)
- "Edit manually" / "Hide raw content" toggle revealing a textarea

### 5. Truncated JSON detection in ContentBlock.tsx

In the parsedContent memo, detect if JSON parse failed AND the raw content looks like
truncated JSON (starts with `{` or `[` but has no closing bracket). Set a
`isIncomplete` flag alongside parsedContent and thread it to the Editor via EditorProps.

### 6. All 6 renderer Editors: replace textarea fallback

Replace the raw `<textarea>` fallback in each renderer's Editor with:
```tsx
<ContentEditorParseError
  rawContent={rawContent}
  onChange={onChange}
  onRegenerate={onRegenerate}
  isIncomplete={isIncomplete}
/>
```

Renderers affected: Vocabulary, Grammar, Exercises, Conversation, Reading, Homework.

Note: FreeTextRenderer is untyped and should NOT be modified.

## Files to modify

1. `frontend/src/types/contentTypes.ts` - add coerce functions per type
2. `frontend/src/components/lesson/contentRegistry.tsx` - add coerce to ContentRenderer,
   add onRegenerate + isIncomplete to EditorProps
3. `frontend/src/components/lesson/ContentBlock.tsx` - apply coercion in memo, pass
   onRegenerate + isIncomplete to Editor
4. `frontend/src/components/lesson/renderers/VocabularyRenderer.tsx`
5. `frontend/src/components/lesson/renderers/GrammarRenderer.tsx`
6. `frontend/src/components/lesson/renderers/ExercisesRenderer.tsx`
7. `frontend/src/components/lesson/renderers/ConversationRenderer.tsx`
8. `frontend/src/components/lesson/renderers/ReadingRenderer.tsx`
9. `frontend/src/components/lesson/renderers/HomeworkRenderer.tsx`

## Files to create

1. `frontend/src/components/lesson/ContentEditorParseError.tsx`
2. `frontend/src/components/lesson/ContentEditorParseError.test.tsx`

## Tests

- `ContentEditorParseError.test.tsx`: renders error message, shows/hides raw textarea,
  calls onRegenerate
- `VocabularyRenderer.test.tsx`: coercion (wrapped schema, array input, field renames),
  friendly error shown instead of textarea
- `GrammarRenderer.test.tsx`: coercion (wrapped schema), friendly error
- `ExercisesRenderer.test.tsx`: coercion (missing arrays filled), friendly error
- Other renderers: at minimum assert the friendly error is shown (no raw textarea)
- Existing tests must remain passing

## Implementation order

1. `contentTypes.ts` - add coerce functions
2. `ContentEditorParseError.tsx` + its test
3. `contentRegistry.tsx` - extend interfaces
4. `ContentBlock.tsx` - wire coercion + new props
5. Renderers (all 6) - replace textarea fallback, register coerce function
6. Update renderer tests
