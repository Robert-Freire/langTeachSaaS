# Task 855 - Audit and clean up StudentGoals emission in PromptService

## Findings

### Is StudentGoals still populated?

YES. `LearningGoals` is still an active field:
- `StudentService.cs` lines 126, 180: writes `LearningGoals` on student create/update
- `StudentForm.tsx` lines 179, 245, 282: UI still renders and submits learningGoals
- `GenerateController.cs` lines 188, 355: passes `student?.Profile.LearningGoals.SelectMany(...)` as `StudentGoals` to `GenerationContext`
- `CourseService.cs` line 344-345: passes `LearningGoalHelper.FlattenGoals(student.LearningGoals)` as `StudentGoals` to `CurriculumContext`

### Emission sites

1. `PromptService.cs:428` (BuildSystemPrompt): `$"- Learning goals: {string.Join(", ", goals)}"` - guarded by `if (goals.Length > 0)` (line 427). No empty lines emitted.
2. `PromptService.cs:1268-1269` (CurriculumSystemPrompt): `$"Goals: ..."` - guarded by `if (ctx.StudentGoals?.Length > 0)`. No empty lines emitted.

### ShortTermObjectives gap

`ShortTermObjectives` is NOT in `GenerationContext` or `CurriculumContext`. It is stored in DB and returned in StudentDto, but never passed to any prompt. This is a separate gap to track.

`ReasonForStudying` IS in `GenerationContext` as `StudentReasonForStudying` and IS emitted at line 458-459.

## Conclusion

Per the issue: "If still populated (legacy migration path): add a comment noting it and plan a migration."

The 4th AC (`Prompt logs no longer contain '- Learning goals:' with an empty value`) is already satisfied by the existing guards.

## Changes

1. Add comments in `GenerateController.cs` and `CourseService.cs` at the `StudentGoals` assignment noting it is populated from the legacy `LearningGoals` field and should eventually be migrated to `ShortTermObjectives`.
2. Add a comment in `PromptService.cs` near the `Learning goals:` emission noting the migration plan.
3. Add a test to `PromptServiceTests.cs` confirming that an empty `StudentGoals` array does NOT emit `- Learning goals:` (to lock in the guard behaviour).
4. File a follow-up issue to add `ShortTermObjectives` to `GenerationContext`/`CurriculumContext`.

## Files

- `backend/LangTeach.Api/Controllers/GenerateController.cs` (lines 188, 355) - add comment
- `backend/LangTeach.Api/Services/CourseService.cs` (line 344) - add comment
- `backend/LangTeach.Api/AI/PromptService.cs` (line 428) - add comment
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` - add guard test

## Acceptance Criteria Check

- [x] `StudentGoals` emission status verified: still populated via LearningGoals
- [x] Not removed (still populated) - legacy path applies
- [x] N/A: not removed, so no gap-fill needed now
- [x] Prompt logs no longer contain `- Learning goals:` with empty value: already guarded, test added to lock in
