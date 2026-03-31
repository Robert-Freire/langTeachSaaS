# Task 269 — New Exercise Format: Sentence Ordering (ordenar frases)

## Goal

Add `sentenceOrdering` as a new sub-format within the existing `exercises` content type. Students tap/click fragments to build the correct sentence. Targets A1/A2 (word-level) and B1 (phrase-level). GR-07 already exists in the exercise-types catalog.

---

## Architecture

`sentenceOrdering` follows the exact same pattern as `fillInBlank`, `multipleChoice`, `matching`: it is an optional array field on `ExercisesContent`. The renderer already handles mixed formats; we add a fourth section.

`correctOrder` semantics: array of fragment indices in correct order. E.g. fragments=["en","vivo","Barcelona","yo"], correctOrder=[3,1,0,2] → "yo vivo en Barcelona".

Student UI: click-to-order chip interface (no drag-and-drop). Unordered chips shown; student clicks to append to answer, clicks placed chip to remove it.

CEFR scope: A1/A2/B1 (GR-07 already in validExerciseTypes for A1 and A2; add to B1). Already forbidden for C1/C2 in section profiles.

---

## Changeset

### 1. JSON Schema — `data/content-schemas/exercises.json`
- Add `sentenceOrdering` to `anyOf` (so content with only sentenceOrdering is valid)
- Add `sentenceOrdering` property: array of `{ fragments: string[], correctOrder: number[], hint?: string, explanation?: string, stage?: PracticeStage }`
- `fragments`: minItems 2
- `correctOrder`: must have same length as fragments; items are integers

### 2. Section profile — `data/section-profiles/practice.json`
- B1 `validExerciseTypes`: add `"GR-07"` (currently missing; A1/A2 already have it)
- B1 `levelSpecificNotes`: add note for GR-07 — "Use phrase-level ordering at B1: reorder clauses or multi-word chunks rather than individual words"

### 3. Frontend Types — `frontend/src/types/contentTypes.ts`
- Add `ExercisesSentenceOrdering` interface: `{ fragments: string[], correctOrder: number[], hint?: string, explanation?: string, stage?: PracticeStage }`
- Update `ExercisesContent`: add `sentenceOrdering?: ExercisesSentenceOrdering[]`
- Update `isExercisesContent`: keep existing three arrays as required (backward compat) and sentenceOrdering as optional. No change to existing guard logic needed since the field is optional.
- Update `coerceExercisesContent`:
  - Add `sentenceOrdering` to `hasRecognizedField` check (critical: without this, content with ONLY sentenceOrdering returns null)
  - Add `sentenceOrdering: Array.isArray(obj.sentenceOrdering) ? obj.sentenceOrdering : []` to the candidate object
  - This ensures AI responses that include only sentenceOrdering still get coerced correctly (the other three default to `[]`)

### 4. Frontend Renderer — `frontend/src/components/lesson/renderers/ExercisesRenderer.tsx`

**Editor section** (append after Matching section):
- Heading: "Sentence Ordering"
- Table: Fragments (comma-separated editable text), Correct Order (read-only derived), Hint, Stage, Delete button
- Fragments edited as comma-separated string; parsed into array on change
- Correct order: numbered input chips (1-based displayed, 0-based stored) — teacher edits order by typing index numbers
- Add item button

**Preview section**:
- Show each item's fragments as shuffled chips (visual preview)
- Display hint if present
- Show correct answer below each item

**Student section**:
- Per-item: show fragment chips in scrambled order (deterministic shuffle: rotate by half length, same as matching)
- Student clicks chip from pool → appends to answer sequence; clicks placed chip → removes it
- "Check Answers" validation: compare student order array to `correctOrder`
- Score counting: add `sentenceOrdering.length` to `totalQuestions` (line ~460 in current renderer)
- After check: show correct sequence for wrong answers; show explanation if present
- State: `soAnswers: number[][]` — per-item array of chosen fragment indices

**Integration points in existing code (must update):**
- `emit` function (line 107): add `sentenceOrdering` to the spread — `emit({ ...content, sentenceOrdering: ... })` works only if `sentenceOrdering` is included when destructuring `content` on line 105. Update destructure to include `sentenceOrdering`.
- `handleReset` (line ~474): add `setSoAnswers(sentenceOrdering.map(() => []))`
- `useEffect` reset (line ~416): add `setSoAnswers([])`
- `totalQuestions` (line ~460): add `+ (sentenceOrdering?.length ?? 0)` and `soCorrect` to totalCorrect sum

### 5. Backend PromptService — `backend/LangTeach.Api/AI/PromptService.cs`

In `ExercisesUserPrompt`:
- Append `sentenceOrdering` to the JSON template string shown to the AI
- Add instruction: "Use sentenceOrdering for A1/A2/B1 practice where appropriate: scramble words/phrases and provide correctOrder as fragment indices in correct sequence."
- Update the stage variety note to mention sentenceOrdering as a fourth available format

### 6. Tests

**Backend** — `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs`:
- Test that A1 exercises prompt includes sentenceOrdering JSON template
- Test that A2 exercises prompt includes sentenceOrdering JSON template

**Frontend** — `frontend/src/components/lesson/renderers/ExercisesRenderer.test.tsx`:
- Preview renders sentenceOrdering section when items present
- Student: clicking fragment chips builds answer sequence
- Student: correct answer validated, score counts sentenceOrdering items
- Student: incorrect answer shows correct sequence
- Coerce: sentenceOrdering items are preserved in coercion

**Frontend** — `frontend/src/types/contentTypes.test.ts`:
- `isExercisesContent` accepts content with sentenceOrdering
- `isExercisesContent` accepts content without sentenceOrdering (backward compat)
- `coerceExercisesContent` normalizes sentenceOrdering
- `coerceExercisesContent` handles AI response with ONLY sentenceOrdering (no other arrays)

**E2E** — happy-path test for sentence ordering student interaction:
- Generate or seed a lesson with exercises content containing sentenceOrdering items
- Student view: verify fragment chips are visible
- Click chips to build correct answer sequence
- Click "Check Answers" — verify correct result shown
- Click "Try Again" — verify reset works

---

## Files Changed (summary)

| File | Change |
|------|--------|
| `data/content-schemas/exercises.json` | Add sentenceOrdering to anyOf + properties |
| `data/section-profiles/practice.json` | Add GR-07 to B1 validExerciseTypes + levelSpecificNote |
| `frontend/src/types/contentTypes.ts` | New interface, updated ExercisesContent, is/coerce functions |
| `frontend/src/components/lesson/renderers/ExercisesRenderer.tsx` | Editor/Preview/Student sections for sentenceOrdering |
| `frontend/src/components/lesson/renderers/ExercisesRenderer.test.tsx` | New frontend tests |
| `frontend/src/types/contentTypes.test.ts` | Type guard + coerce tests |
| `backend/LangTeach.Api/AI/PromptService.cs` | Update ExercisesUserPrompt |
| `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` | 2 new prompt tests |

---

## Out of Scope

- Drag-and-drop (accessibility concern; click-to-order is sufficient for MVP)
- Streaming partial parse for sentenceOrdering (exercises block is fully buffered already)
- New Teacher QA persona run (deferred; will be triggered as part of sprint QA cycle)
