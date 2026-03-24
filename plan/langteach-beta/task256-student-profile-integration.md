# Task 256: Student Profile Integration in Course Creation Flow

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/256

## Status
IN PROGRESS

## Summary
Show a student profile summary card in `CourseNew.tsx` when a student is selected, with a completeness indicator. Also fix the backend gap: `CurriculumContext` is missing `StudentWeaknesses` and `StudentDifficulties` which are present on `GenerationContext` but never forwarded for curriculum generation.

## Current State

**Frontend:**
- `CourseNew.tsx` has a student dropdown but shows nothing after selection (just the CEFR mismatch warning if levels differ)
- The full `Student` object is available (loaded via `getStudents()`) and has `weaknesses: string[]` and `difficulties: Difficulty[]` already in the API type

**Backend:**
- `CurriculumContext` record (IPromptService.cs:17-28) only has `StudentName`, `StudentNativeLanguage`, `StudentInterests`, `StudentGoals`
- `GenerationContext` already has `StudentWeaknesses` and `StudentDifficulties` — but these are lesson-level, not curriculum-level
- `BuildCurriculumContext()` in CoursesController does NOT pass weaknesses or difficulties to the prompt
- `PromptService.BuildCurriculumSystemPrompt()` prints interests and goals (lines 276-279) but has no weaknesses/difficulties section

## Changes Required

### 1. Backend: Extend CurriculumContext

**`IPromptService.cs`**: Add `StudentWeaknesses` and `StudentDifficulties` to `CurriculumContext`:
```csharp
public record CurriculumContext(
    ...
    string[]? StudentInterests,
    string[]? StudentGoals,
    string[]? StudentWeaknesses = null,
    DifficultyDto[]? StudentDifficulties = null
);
```

**`CoursesController.cs`**: Update `BuildCurriculumContext()` to pass them:
```csharp
StudentWeaknesses: student is not null ? TryDeserializeStringArray(student.Weaknesses) : null,
StudentDifficulties: student is not null ? TryDeserializeDifficultyArray(student.Difficulties) : null
```
Note: `TryDeserializeDifficultyArray` does NOT exist in CoursesController. Must create it (deserializes JSON string to `DifficultyDto[]`, same pattern as `TryDeserializeStringArray`).

**`PromptService.cs`**: Update `BuildCurriculumSystemPrompt()` to append weaknesses and difficulties after goals (same pattern as GenerationContext):
```
if weaknesses: "Known weaknesses: ..."
if difficulties: "Documented difficulties: ..."
```

### 2. Frontend: StudentProfileSummary component

New file: `frontend/src/components/StudentProfileSummary.tsx`

**Props:**
```tsx
interface Props {
  student: Student
}
```

**Layout:**
- Card with the student's key profile fields
- Fields to show: name (heading), nativeLanguage, cefrLevel + learningLanguage, interests (chips/list), learningGoals (list), weaknesses (list), difficulties (count or list)
- Profile completeness: count populated optional fields / 5 total optional fields: nativeLanguage, interests (non-empty), learningGoals (non-empty), weaknesses (non-empty), difficulties (non-empty). Display as "X% complete for curriculum planning"
- If < 100%: show "Adding [missing fields] would improve targeting." with the list of missing field names

**Integration in `CourseNew.tsx`:**
- Render `<StudentProfileSummary student={selectedStudent} />` below the student selector when a student is selected
- `selectedStudent = students.find(s => s.id === studentId)`

### 3. Tests

**Frontend unit tests (`StudentProfileSummary.test.tsx`):**
- Renders correctly with full profile (100% complete)
- Renders correctly with partial profile (some fields missing), shows correct percentage and missing field names
- Renders correctly with empty profile (0% complete)
- Completeness scoring: exactly 1/5 fields populated = 20%

**Update `CourseNew.test.tsx`:**
- When a student is selected, the profile summary card is rendered
- When no student is selected, it is not rendered

**Backend unit tests (PromptServiceTests.cs):**
- `BuildCurriculumPrompt` includes weaknesses when `StudentWeaknesses` is populated
- `BuildCurriculumPrompt` includes difficulties when `StudentDifficulties` is populated
- `BuildCurriculumPrompt` omits weaknesses/difficulties sections when they are null/empty

## Completeness Scoring Logic

Optional fields contributing to the score (5 total):
1. `nativeLanguage` — not null and not empty
2. `interests` — non-empty array
3. `learningGoals` — non-empty array
4. `weaknesses` — non-empty array
5. `difficulties` — non-empty array

Score = (populated fields / 5) * 100, rounded to nearest integer.

## Files to Touch

**Backend:**
- `backend/LangTeach.Api/AI/IPromptService.cs` — add fields to CurriculumContext
- `backend/LangTeach.Api/AI/PromptService.cs` — extend BuildCurriculumSystemPrompt
- `backend/LangTeach.Api/Controllers/CoursesController.cs` — pass weaknesses+difficulties

**Frontend:**
- `frontend/src/components/StudentProfileSummary.tsx` (new)
- `frontend/src/components/StudentProfileSummary.test.tsx` (new)
- `frontend/src/pages/CourseNew.tsx` — integrate the component
- `frontend/src/pages/CourseNew.test.tsx` — add integration tests

## Out of Scope
- Changing the student form itself
- Student profile completeness nudge on the student list/detail page
- Changing how the student selector works
