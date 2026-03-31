# Task 272 — New exercise format: Sentence Transformation

## Goal
Add `sentenceTransformation` as a sixth exercise sub-format inside the existing `Exercises` content type. Students rewrite sentences using different grammatical structures (tense changes, voice, reported speech, register).

CEFR targeting:
- B1: tense changes (present to past), affirmative to negative
- B2: active to passive, direct to reported speech, indicative to subjunctive
- C1: register transformation (informal to formal), restructuring complex sentences

Maps to exercise type GR-03 (already exists in exercise-types.json with `uiRenderer: "exercises"`).

---

## Fields per item

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | yes | Transformation instruction (e.g., "Rewrite in the past tense") |
| `original` | string | yes | Original sentence to transform |
| `expected` | string | yes | Primary correct answer |
| `alternatives` | string[] | no | Additional acceptable answers |
| `explanation` | string | no | Why the transformation works that way |
| `stage` | enum | no | `controlled`, `meaningful`, `guided_free` |

Note: The issue mentions `acceptMultiple` and `note`, but these map naturally to: `alternatives` array (non-empty = multiple accepted) and `explanation` (replaces `note`). This keeps the schema consistent with other sub-formats.

---

## Files to change

### 1. `data/content-schemas/exercises.json`
- Add `{ "required": ["sentenceTransformation"] }` to `anyOf` array
- Add `sentenceTransformation` property:
  ```json
  "sentenceTransformation": {
    "type": "array",
    "minItems": 1,
    "items": {
      "type": "object",
      "required": ["prompt", "original", "expected"],
      "additionalProperties": false,
      "properties": {
        "prompt": { "type": "string" },
        "original": { "type": "string" },
        "expected": { "type": "string" },
        "alternatives": { "type": "array", "items": { "type": "string" } },
        "explanation": { "type": "string" },
        "stage": { "type": "string", "enum": ["controlled", "meaningful", "guided_free"] }
      }
    }
  }
  ```

### 2. `data/pedagogy/practice-stages.json`
- Add `"GR-03"` to `guided_free` stage's `allowedExerciseCategories` (already there)
- Verify GR-03 is already in guided_free: yes, it is. No change needed.

### 3. `frontend/src/types/contentTypes.ts`
- Add interface:
  ```ts
  export interface ExercisesSentenceTransformation {
    prompt: string
    original: string
    expected: string
    alternatives?: string[]
    explanation?: string
    stage?: PracticeStage
  }
  ```
- Add `sentenceTransformation?: ExercisesSentenceTransformation[]` to `ExercisesContent` (optional with `?`, matching trueFalse/sentenceOrdering pattern)
- `isExercisesContent`: update both occurrences of the recognized-field check (the type guard and any duplicate) to include `sentenceTransformation`
- `coerceExercisesContent`:
  - Add `sentenceTransformation` and `sentence_transformation` to `hasRecognizedField` check
  - Fill `sentenceTransformation: Array.isArray(obj.sentenceTransformation) ? obj.sentenceTransformation : (Array.isArray(obj.sentence_transformation) ? obj.sentence_transformation : [])`

### 4. `frontend/src/components/lesson/renderers/ExercisesRenderer.tsx`
- Import `ExercisesSentenceTransformation`
- Add `stIdsRef` + `syncIds` call for `sentenceTransformation.length`
- **Editor section**: "Sentence Transformation" header, table with columns:
  - Prompt (text input)
  - Original sentence (text input)
  - Expected answer (text input)
  - Alternatives (comma-separated text input, split/join on save)
  - Stage (read-only badge)
  - Actions (remove button)
  - Add button at bottom
- **Preview section**: grouped by stage, show prompt + original + expected, alternatives in parentheses
- **Student section**:
  - State: `stAnswers` (Record<number, string>), `stChecked` (Record<number, boolean>), `stRevealed` (Record<number, boolean>)
  - Display: prompt instruction + original sentence
  - Input: text field for student's transformation
  - Check: compare against `expected` and `alternatives` (case-insensitive, trim whitespace)
  - Reveal: show model answer + explanation + alternatives if any
  - Score: include sentenceTransformation count in `totalQuestions` and correct count in score

### 5. `backend/LangTeach.Api/AI/PromptService.cs`
- In `ExercisesUserPrompt()`, add to the format JSON string:
  ```
  "sentenceTransformation":[{"prompt":"","original":"","expected":"","alternatives":[""],"explanation":"","stage":""}]
  ```
- Add guidance line:
  ```
  sentenceTransformation: prompt is the transformation instruction; original is the source sentence; expected is the primary correct answer; alternatives lists other acceptable answers. Use for B1+ levels for tense changes, voice transformations, reported speech, and register shifts. Maps to DELE "transformaciones gramaticales".
  ```
- Update line 278's hardcoded format list to include `sentenceTransformation`: `fillInBlank / multipleChoice / matching / trueFalse / sentenceOrdering / sentenceTransformation`

### 6. `frontend/src/components/lesson/renderers/ExercisesRenderer.test.tsx`
- Add test for rendering sentenceTransformation items in editor mode
- Add test for student interaction (type answer, check, reveal)
- Add test for multi-answer validation (expected + alternatives)

### 7. `frontend/src/types/contentTypes.test.ts`
- Add test for `coerceExercisesContent` with sentenceTransformation data
- Add test for snake_case `sentence_transformation` coercion
- Add test for `isExercisesContent` recognizing sentenceTransformation

### 8. `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs`
- Add test verifying `sentenceTransformation` appears in exercise prompt format
- Add test verifying guidance text mentions B1+ and DELE

### 9. `e2e/helpers/mock-ai-stream.ts`
- Add `SENTENCE_TRANSFORMATION_FIXTURE` or extend `EXERCISES_FIXTURE` with sentenceTransformation items

### 10. `e2e/tests/sentence-transformation-type.spec.ts`
- E2E test: generate exercises, verify sentenceTransformation renders in student view
- Test multi-answer: verify both expected and alternative are accepted

---

## Validation logic (student mode)

For checking student answers against expected + alternatives:
1. Normalize: trim whitespace, lowercase
2. Compare against normalized `expected` and each normalized `alternative`
3. If match: mark correct, show green
4. If no match: mark incorrect, show model answer + explanation + alternatives

This is simpler than fuzzy matching. Exact match (case-insensitive, trimmed) is the right starting point. Fuzzy matching (accent-insensitive, punctuation-tolerant) can be added later if needed.

---

## Out of scope
- Fuzzy/accent-insensitive matching (future enhancement)
- Auto-grading of free-form transformations beyond exact match
- Audio input for transformations
