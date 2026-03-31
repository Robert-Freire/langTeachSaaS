# Task 271 — New exercise format: True/False with Justification

## Goal
Add `trueFalse` as a fourth exercise sub-format inside the existing `Exercises` content type.
Structure: each item has `statement`, `isTrue`, `justification` (model answer), and optional `sourcePassage`.

CEFR targeting:
- A2: simple factual statements
- B1: inferential statements
- B2: nuance/implication/author's intent

---

## Files to change

### 1. `data/content-schemas/exercises.json`
- Add `trueFalse` to `anyOf` (make it a valid root key alongside the other three)
- Add `trueFalse` property: array of `{ statement, isTrue, justification, sourcePassage? }`
- Keep `trueFalse` optional (not required): existing lessons without it still validate

### 2. `data/pedagogy/exercise-types.json`
- Add a new `CE-10` entry:
  - `id`: `"CE-10"`, `name`: `"True/False with justification"`, `nameEs`: `"Verdadero/Falso con justificación"`
  - `category`: `"CE"`, `secondaryCompetencies`: `["GR", "EE"]`
  - `description`: "Evaluate statements as true or false, quoting the text to justify the answer."
  - `cefrRange`: `["A2", "C2"]`
  - `uiRenderer`: `"exercises"` (distinct from CE-03 which maps to reading renderer)
  - `available`: `true`
- This gives the AI a proper exercise-type ID to reference when building CE-10 into practice stages

### 3. `data/pedagogy/practice-stages.json`
- Add `"CE-10"` to the `allowedExerciseCategories` of the `"meaningful"` stage (currently: `["GR-04", "CE-03", "GR-02", "GR-07", "VOC-07", "CE-01", "CE-02"]`)
- Rationale: true/false with justification requires inference, fitting meaningful practice stage

### 4. `frontend/src/types/contentTypes.ts`
- Add interface:
  ```ts
  export interface ExercisesTrueFalse {
    statement: string
    isTrue: boolean
    justification: string
    sourcePassage?: string
    stage?: PracticeStage
  }
  ```
- Add `trueFalse: ExercisesTrueFalse[]` to `ExercisesContent` as **non-optional** (consistent with the other three fields -- coerce always fills it with `[]`)
- `isExercisesContent`: keep the existing AND check for the original three fields unchanged; add `Array.isArray(c.trueFalse)` to the check (trueFalse will always be present after coerce)
- `coerceExercisesContent`:
  - Add `trueFalse` to `hasRecognizedField` check
  - Fill `trueFalse: Array.isArray(obj.trueFalse) ? obj.trueFalse : []` in the candidate object
  - Also handle snake_case: `obj.true_false` as fallback

### 5. `frontend/src/components/lesson/renderers/ExercisesRenderer.tsx`
- Import `ExercisesTrueFalse` type
- Add `tfIdsRef = useRef<number[]>([])` for stable React keys
- Add `syncIds` call for trueFalse length in `useMemo`
- **Editor section "True/False with Justification"**: table with columns: Statement, isTrue (toggle T/V), Justification, Stage, Actions
  - Toggle renders as a select or button that cycles between "Verdadero (true)" and "Falso (false)"
  - Justification is a text input (the model answer excerpt)
  - Stage shown as read-only badge (same as other formats)
- **Preview section**: show statements numbered, with placeholder [V/F] and em dash where student would write justification
- **Student section**:
  - State: `tfAnswers: (boolean | null)[]`, `tfJustifications: string[]`
  - After Check: T/F selection graded automatically; justification is not graded (model answer revealed)
  - Show model `justification` after Check regardless of correctness (with a label "Justificacion del modelo:")
  - Count T/F selection in `totalQuestions` / `totalCorrect`; do not count justification
  - `handleReset` and `useEffect` cleanup include trueFalse state

### 6. `backend/LangTeach.Api/AI/PromptService.cs`
- In `ExercisesUserPrompt`: add `trueFalse` to the inline JSON template example:
  ```
  "trueFalse":[{"statement":"","isTrue":true,"justification":"","sourcePassage":"","stage":""}]
  ```
- In `BuildPracticeStageBlock`: update the format list from `(fillInBlank / multipleChoice / matching)` to `(fillInBlank / multipleChoice / matching / trueFalse)`
- No hardcoded level conditionals. CEFR guidance for when to use trueFalse comes exclusively from the pedagogy data layer (practice-stages.json allowedExerciseCategories -- added in step 3)

### 7. `frontend/src/components/lesson/renderers/ExercisesRenderer.test.tsx`
- Update `makeContent` helper to include `trueFalse: []` (now required field)
- Add tests:
  - Preview renders "True/False with Justification" section when trueFalse items present
  - Editor renders trueFalse table; onChange fires when statement edited
  - Editor toggle changes isTrue; onChange fires
  - Student: T/F radio selection tracked; justification text input present; model answer shown after Check; score counts only T/F selection
  - coerce fills missing `trueFalse` to `[]` and handles `true_false` snake_case key
- Update `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs`: add assertion that trueFalse appears in the exercises prompt JSON template

---

## Key decisions

- `trueFalse` is **non-optional** in `ExercisesContent` after coerce (consistent with other arrays). Existing JSON without it gets coerced to `trueFalse: []`.
- Justification is **teacher-graded**: model answer revealed after Check but does not affect score.
- `isTrue` stored as boolean (`true`/`false`). Displayed as Verdadero/Falso toggle.
- No hardcoded level conditionals in PromptService. CEFR guidance flows from `practice-stages.json`.
- New exercise type `CE-10` in `exercise-types.json` with `uiRenderer: "exercises"` distinguishes this from `CE-03` (reading renderer).

---

## Out of scope
- Integration into Reading template as `sourcePassage`-linked exercises (follow-up issue)
- E2e tests (existing Exercises e2e coverage sufficient for this phase)
