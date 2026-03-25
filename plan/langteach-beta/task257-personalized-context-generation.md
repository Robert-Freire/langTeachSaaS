# Task 257: Personalized context generation per curriculum entry

**Issue:** #257
**Branch:** `worktree-task-t257-personalized-context-generation`
**Sprint:** `sprint/student-aware-curriculum`

## Goal

For courses linked to a student, each curriculum entry gets AI-generated personalized context (a scenario drawn from the student's life) and personalization notes (emphasis areas, constraint compliance). Works for both template-seeded and free-generated curricula.

## What already exists (from #255)

- `CurriculumGenerationService` runs a second AI pass when `ctx.StudentName is not null` (template path)
- The pass only updates `Topic` via `ApplyPersonalizedTopics` using `PersonalizationDto(OrderIndex, Topic?)`
- `CurriculumPersonalizationUserPrompt` outputs `[{ orderIndex, topic }]`
- `CurriculumContext` has StudentName, StudentNativeLanguage, StudentInterests, StudentGoals (but NOT Weaknesses or TeacherNotes)
- Free-generation path does NOT run a personalization pass

## What changes

### 1. Data layer: DB migration

Add two nullable fields to `CurriculumEntry`:
- `ContextDescription string?` -- AI-generated scenario for this session (e.g., "Marco at a Barcelona registration office")
- `PersonalizationNotes string?` -- AI rationale for personalization choices (emphasis, constraints)

Migration name: `20260324_AddCurriculumEntryPersonalizationFields`

### 2. DTO layer

**`CurriculumEntryDto`** (`CourseDto.cs`): add `ContextDescription` and `PersonalizationNotes` (nullable string).

**`CreateCourseRequest`** (`CourseDto.cs` or request DTOs): add `TeacherNotes string?` -- optional free text the teacher enters about constraints, context, etc.

**`CurriculumContext`** (`IPromptService.cs`): add `StudentWeaknesses string[]?` and `TeacherNotes string?`.

### 3. Prompt layer

**`CurriculumPersonalizationUserPrompt`** in `PromptService.cs`: extend output schema from `[{ orderIndex, topic }]` to:
```json
[{
  "orderIndex": 1,
  "topic": "...",
  "contextDescription": "...",
  "personalizationNotes": "..."
}]
```

Add to the prompt:
- L1 interference patterns: if StudentNativeLanguage is set, instruct AI to flag L1-specific challenges (e.g., Italian L1 -> ser/estar emphasis)
- Weakness-driven emphasis: if StudentWeaknesses present, AI spreads them across multiple sessions as emphasis areas, not just one
- Constraint compliance: if TeacherNotes present, include in prompt (e.g., "no role-play, written exercises preferred")

**`CurriculumSystemPrompt`**: add weaknesses block when present (similar to how interests and goals are already added).

**`PersonalizationDto`** (private record in `CurriculumGenerationService.cs`): extend with `string? ContextDescription` and `string? PersonalizationNotes`.

**`ApplyPersonalizedTopics`**: rename to `ApplyPersonalization` and also write `entry.ContextDescription` and `entry.PersonalizationNotes` from the DTO.

### 4. Free-generation path: add personalization pass

In `CurriculumGenerationService.GenerateAsync`, after building entries from the free-generation AI call, if `ctx.StudentName is not null`, run the same personalization call as the template path:
- Build `TemplateUnitContext` list from the generated entries (use Topic as the unit title, GrammarFocus, empty CompetencyFocus list)
- Set `ctx.TemplateUnits` and call `BuildCurriculumPrompt` (which routes to `CurriculumPersonalizationUserPrompt`)
- Apply personalization with `ApplyPersonalization`

This ensures `ContextDescription` and `PersonalizationNotes` are populated for free-generated curricula too.

### 5. Controller: pass new fields

In `CoursesController.BuildCurriculumContext`:
- Deserialize `student.Weaknesses` (JSON array) and pass as `StudentWeaknesses`
- Pass `req.TeacherNotes` as `TeacherNotes`

In `MapEntryToDto` (CoursesController.cs line 337): add `ContextDescription` and `PersonalizationNotes` at the end of the positional record constructor call, matching the new fields added to `CurriculumEntryDto`. Since `CurriculumEntryDto` is a positional record, new parameters must be appended at the end to avoid shifting existing positions.

### 6. Frontend: teacher notes textarea

In `CourseNew.tsx`:
- Add `teacherNotes` state (string, default empty)
- Add a `Textarea` field below the student selector, labeled "Teacher notes (optional)" with placeholder "e.g., Relocating to Barcelona. Hates role-play. Needs formal register."
- Include in the `CreateCourseRequest` when submitting

In `courses.ts` API type: add `teacherNotes?: string` to `CreateCourseRequest`.

### 7. Tests

**`PromptServiceTests.cs`** (new tests, extend existing file if it exists, else create):
- `PersonalizationPrompt_IncludesStudentInterestsAndGoals`: verify prompt text contains interests/goals from context
- `PersonalizationPrompt_IncludesTeacherNotes`: verify prompt contains teacher notes when provided
- `PersonalizationPrompt_IncludesWeaknesses`: verify prompt mentions weaknesses when provided
- `PersonalizationPrompt_IncludesL1InterferenceInstruction`: verify prompt requests L1 interference patterns when NativeLanguage is set

**`CurriculumGenerationServiceTests.cs`** (new tests):
- `GenerateAsync_TemplateWithStudent_AppliesContextDescription`: verify `ContextDescription` is set on entries from personalization response
- `GenerateAsync_FreeWithStudent_RunsPersonalizationPass`: verify free-generation path calls AI twice when student present. Requires a `SequentialClaudeClient` test double (new, not the existing `ConfigurableClaudeClient`) that returns responses from a queue (call 1: free-gen JSON, call 2: personalization JSON with contextDescription). This verifies `CompleteCallCount == 2` and that the second response's contextDescription is applied.
- `GenerateAsync_FreeWithStudent_AppliesContextDescription`: uses the same `SequentialClaudeClient` to verify `ContextDescription` is populated on entries

**`CourseNew.test.tsx`** (extend existing):
- `renders_teacher_notes_textarea`: verify textarea renders
- `includes_teacher_notes_in_request`: verify submit sends `teacherNotes` from the textarea

**E2E** (`e2e/tests/courses.spec.ts`): add one assertion that the teacher notes textarea is present on the new course form.

## Acceptance criteria mapping

| AC | Covered by |
|----|-----------|
| CurriculumEntry has ContextDescription and PersonalizationNotes (DB migration) | Migration + model change |
| After course creation with student, each entry has a personalized context | Service personalization pass + tests |
| Context descriptions reference student's interests, goals, or situation | Prompt instructs this; PromptService tests verify |
| Known weaknesses appear as emphasis areas across multiple sessions | Prompt with weakness spreading; PromptService test |
| Teacher notes/constraints respected (no role-play = no role-play suggested) | Teacher notes in prompt; PromptService test |
| L1 interference patterns influence personalization | Prompt instructs; PromptService test |
| CourseNew has Teacher notes textarea | Frontend change + unit test + e2e |
| Unit test: personalization prompt includes student profile fields | PromptServiceTests |
| Unit test: personalization prompt includes teacher notes/constraints | PromptServiceTests |
| Personalization works for both template-seeded and free-generated | Both paths in service + service tests |

## Files changed

### Backend
- `backend/LangTeach.Api/Data/Models/CurriculumEntry.cs` -- add 2 fields
- `backend/LangTeach.Api/Migrations/` -- new migration file (EF generated)
- `backend/LangTeach.Api/DTOs/CourseDto.cs` -- CurriculumEntryDto + CreateCourseRequest
- `backend/LangTeach.Api/AI/IPromptService.cs` -- CurriculumContext + TemplateUnitContext
- `backend/LangTeach.Api/AI/PromptService.cs` -- richer personalization prompt
- `backend/LangTeach.Api/Services/CurriculumGenerationService.cs` -- extend DTO, rename method, free path personalization
- `backend/LangTeach.Api/Controllers/CoursesController.cs` -- pass new context fields + MapEntryToDto
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` -- 4 new tests (create if doesn't exist)
- `backend/LangTeach.Api.Tests/Services/CurriculumGenerationServiceTests.cs` -- 3 new tests

### Frontend
- `frontend/src/api/courses.ts` -- add teacherNotes to CreateCourseRequest type
- `frontend/src/pages/CourseNew.tsx` -- add teacher notes textarea
- `frontend/src/pages/CourseNew.test.tsx` -- 2 new tests

### E2E
- `e2e/tests/courses.spec.ts` -- 1 assertion for teacher notes textarea

## Out of scope (explicit)

- `UpdateCurriculumEntryRequest` is NOT changed -- `ContextDescription` and `PersonalizationNotes` are read-only from the teacher's perspective in this issue. Editing them via the update endpoint is deferred.
- Teacher notes are NOT persisted on the Course model (they feed into AI at creation time only). No `MaxLength` attribute is planned (consistent with other optional text fields in `CreateCourseRequest` like `Description`).

## Notes

- `ContextDescription` and `PersonalizationNotes` are nullable; graceful degradation on parse failure keeps existing behavior (entries still created)
- The personalization AI call uses Haiku (cheap, already the model for `CurriculumPersonalizationUserPrompt`)
- Free-generation path gets an extra AI call when a student is linked -- acceptable cost given it's async and only done once at course creation
- The `PersonalizationNotes` field is not displayed in the UI for now (stored only, to be surfaced in issue #258 walkthrough UI)
- Teacher notes are stored in `CreateCourseRequest` only; they are NOT persisted on the Course model (they feed into the AI context and are captured indirectly in `PersonalizationNotes`)
