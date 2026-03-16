# T15.3 — Exercise/Quiz Type (Teacher + Student)

**Branch**: `task/t15.3-exercise-quiz-type` (worktree: `worktree-task-t15.3-exercise-quiz-type`)
**Priority**: Must | **Effort**: 1.5 days

---

## Context

T15.1 laid the typed content foundation (registry dispatch, student study route).
T15.2 delivered the Vocabulary type (editable table for teacher, flashcards for student).
T15.3 follows the same pattern for the `exercises` content type.

The prompt service already generates exercises in this JSON shape (confirmed in `PromptService.cs`):
```json
{
  "fillInBlank": [{ "sentence": "She ___ (go) to the store.", "answer": "went", "hint": "past simple" }],
  "multipleChoice": [{ "question": "Which means happy?", "options": ["sad", "glad", "angry"], "answer": "glad" }],
  "matching": [{ "left": "hello", "right": "hola" }]
}
```

The TypeScript types in `contentTypes.ts` already match this (`ExercisesContent`, `ExercisesFillInBlank`, `ExercisesMultipleChoice`, `ExercisesMatching`).

---

## Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/components/lesson/renderers/ExercisesRenderer.tsx` | Teacher editor, preview, and student interactive view |
| `e2e/tests/exercises-type.spec.ts` | E2E happy path test |

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/components/lesson/contentRegistry.tsx` | Register `ExercisesRenderer` for the `exercises` block type |
| `e2e/helpers/mock-ai-stream.ts` | Add `EXERCISES_FIXTURE` constant |

---

## ExercisesRenderer Design

### Editor (teacher, edit mode)

Three collapsible-by-label sections, each showing the full answer key:

**Fill-in-blank table** — columns: Sentence (with `___` placeholder), Answer, Hint. All cells are editable inputs. Row-level remove button. "Add item" button at the bottom.

**Multiple Choice list** — each question shows: editable question text, list of editable options, radio-like indicator marking the correct answer (editable dropdown or inline toggle). Add/remove question. Add/remove option within a question.

**Matching table** — two columns: Left, Right. Both editable. Add/remove rows.

Emit changes via `onChange(JSON.stringify(newContent))`.

Fallback: if `isExercisesContent` returns false, render a raw textarea.

### Preview (teacher, preview mode)

Renders what the student will see, without answers filled in:
- Fill-in-blank: sentence displayed with `___` (or `[  ]`) where the blank is, answer hidden
- Multiple choice: question + all options listed as radio buttons (unselected, not clickable)
- Matching: left items listed, right column shows `___`

### Student (interactive)

Single "Check Answers" button at the bottom that grades all three sections simultaneously.

**Fill-in-blank**: `<input>` inside the sentence (split on `___`). On check: border turns green if correct (case-insensitive trim), red if wrong. Show correct answer in red row on wrong.

**Multiple choice**: `<input type="radio">` per option. On check: selected option turns green if correct, red if wrong. Correct option highlighted if student picked wrong.

**Matching**: select dropdown per left item showing all right items as options. On check: green if correct mapping, red otherwise.

**Score summary** (shown after check): `"You got X / Y correct"` — counts across all three types combined.

Re-attempt: a "Try Again" button resets all answers and hides feedback.

---

## E2E Test Plan (`exercises-type.spec.ts`)

Test name: `exercises render as quiz in editor and student can complete them`

Steps:
1. Authenticate + `mockAiStream(page, EXERCISES_FIXTURE)`
2. Create a lesson via Grammar Focus template
3. Save a section note to **Practice** to persist it (`section-practice`)
   - Reason: `SECTION_DEFAULT_TASK['Practice'] = 'exercises'` in `GeneratePanel.tsx`. Using Presentation would default to `vocabulary`, saving the block with the wrong type.
4. Approve teacher, click Generate on Practice section (`generate-btn-practice`), click the Generate button inside the panel, wait for `insert-btn`, click Insert
5. Assert `[data-testid="exercises-editor"]` is visible (Editor rendered, not raw textarea)
6. Navigate to student study view (`/lessons/:id/study`)
7. Assert `[data-testid="exercises-student"]` is visible
8. Fill in the fill-in-blank answer "went" into `fib-input-0`
9. Select the correct multiple choice radio option (`mc-option-0-1` for "glad")
10. Select matching answer "hola" from `match-select-0` dropdown
11. Click `check-answers-btn`
12. Assert `score-summary` contains text `"You got 3 / 3 correct"`
13. Assert `fib-result-0` is visible and indicates correct (e.g., has `text-green-600` class or aria-label)

### `EXERCISES_FIXTURE`
```ts
export const EXERCISES_FIXTURE = {
  fillInBlank: [
    { sentence: "She ___ to the store yesterday.", answer: "went", hint: "past simple of 'go'" },
  ],
  multipleChoice: [
    { question: "Which word means happy?", options: ["sad", "glad", "angry"], answer: "glad" },
  ],
  matching: [
    { left: "hello", right: "hola" },
  ],
}
```

---

## Data-testid Contract

| testid | Location |
|--------|----------|
| `exercises-editor` | root div of Editor component |
| `exercises-preview` | root div of Preview component |
| `exercises-student` | root div of Student component |
| `fib-input-{i}` | fill-in-blank input for item i |
| `fib-result-{i}` | feedback span after check for item i |
| `mc-option-{i}-{j}` | radio button for question i, option j |
| `mc-result-{i}` | feedback for MC question i |
| `match-select-{i}` | dropdown for matching item i |
| `match-result-{i}` | feedback for matching item i |
| `check-answers-btn` | submit/check button |
| `score-summary` | score display after check |
| `try-again-btn` | reset button after check |

---

## Implementation Order

1. Add `EXERCISES_FIXTURE` to `mock-ai-stream.ts`
2. Create `ExercisesRenderer.tsx` (Editor, Preview, Student)
3. Register it in `contentRegistry.tsx`
4. Write `exercises-type.spec.ts`

---

## Done When

- Teacher sees a structured exercise editor split into three typed sections with editable fields and visible answer keys
- Student can interactively fill in answers and click "Check Answers" to see green/red feedback and a score
- All three exercise sub-types (fill-in-blank, multiple choice, matching) render correctly in teacher edit, teacher preview, and student views
- E2E test passes end-to-end against the running stack
