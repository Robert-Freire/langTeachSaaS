# Task 857 - Add type selector to short-term objective field

## Context

`ShortTermObjective` is stored as a JSON array in `Student.ShortTermObjectives` (nvarchar column). No DB migration needed -- adding a new field with a default in the DTO is backward-compatible: legacy rows deserialize without the field and get `"other"`.

## Changes

### 1. Backend DTO - `ShortTermObjectiveDto.cs`
Add `string ObjectiveType = "other"` as a positional parameter with default.
```csharp
public record ShortTermObjectiveDto(string Id, string Text, DateOnly? TargetDate, string ObjectiveType = "other");
```
This is backward-compatible: old JSON without `objectiveType` deserializes to `"other"`.

### 2. Frontend API - `frontend/src/api/students.ts`
Add `objectiveType: string` to `ShortTermObjective` interface (default "other" handled by transformation in StudentForm).

### 3. Frontend UI - `frontend/src/pages/StudentForm.tsx`
- Update `ObjectiveRow` component:
  - Add `'objectiveType'` to the field union type in `onUpdate`
  - Add a `<select>` with 3 options: `exam_prep` ("Exam prep"), `communicative` ("Communicative"), `other` ("Other")
  - Style to match existing date input
- Update `addObjective` to include `objectiveType: 'other'` as default
- Update `updateObjective` to handle `objectiveType` field  
- When loading existing student, preserve `objectiveType` (or default to "other" if missing)

### 4. Frontend display - `frontend/src/components/student/StudentProfileTab.tsx`
Show a small type badge per objective. Use:
- "Exam Prep" in indigo/blue
- "Communicative" in green
- "Other" neutral (omit badge to keep it clean)

### 5. Prompt context - `backend/LangTeach.Api/AI/IPromptService.cs`
Add a new record and field to both `GenerationContext` and `CurriculumContext`:
```csharp
public record StudentObjectiveContext(string Text, DateOnly? TargetDate, string ObjectiveType);
```
Add `IReadOnlyList<StudentObjectiveContext>? StudentShortTermObjectives = null` to both contexts.

### 6. Prompt emission - `backend/LangTeach.Api/AI/PromptService.cs`
In `BuildSystemPrompt` (GenerationContext path) and `CurriculumSystemPrompt`:
```
- Short-term objectives:
  - [Exam prep] Pass DELE B2 by June
  - [Communicative] Handle a job interview
```
Guard with `if (ctx.StudentShortTermObjectives?.Count > 0)`.

### 7. Controller wiring
- `GenerateController.cs` (x2): pass `StudentShortTermObjectives` to `GenerationContext`
- `CourseService.cs`: pass to `CurriculumContext`

Map from `student?.Profile.ShortTermObjectives` (already deserialized as `IReadOnlyList<ShortTermObjectiveDto>`).

### 8. Tests
- `PromptServiceTests.cs`: add tests for objectives emission (with/without type, empty case)
- `StudentForm.test.tsx`: update test for new type selector rendering
- `StudentProfileTab.test.tsx`: update fixture to include `objectiveType`

## Files

- `backend/LangTeach.Api/DTOs/ShortTermObjectiveDto.cs` - add ObjectiveType field
- `backend/LangTeach.Api/AI/IPromptService.cs` - add StudentObjectiveContext, add to GenerationContext + CurriculumContext  
- `backend/LangTeach.Api/AI/PromptService.cs` - emit objectives with type
- `backend/LangTeach.Api/Controllers/GenerateController.cs` - wire ShortTermObjectives
- `backend/LangTeach.Api/Services/CourseService.cs` - wire ShortTermObjectives
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` - tests
- `frontend/src/api/students.ts` - add objectiveType field
- `frontend/src/pages/StudentForm.tsx` - type selector in ObjectiveRow
- `frontend/src/components/student/StudentProfileTab.tsx` - display type badge
- `frontend/src/components/student/StudentProfileTab.test.tsx` - update fixtures
- `frontend/src/pages/StudentForm.test.tsx` - update for type selector

## Acceptance Criteria Check

- [ ] Type selector with exam_prep / communicative / other in form
- [ ] Type persisted to backend (via DTO)
- [ ] Objective type included in AI generation prompt
- [ ] Existing students default to "other" (DTO default handles this)
