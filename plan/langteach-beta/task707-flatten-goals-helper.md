# Task 707: Extract FlattenGoals helper

## Goal
Extract shared `LearningGoalHelper` to eliminate duplicated `DeserializeListWithStringFallback<LearningGoalDto>` logic across `CourseService` and `StudentService`.

## Approach

### 1. Create `backend/LangTeach.Api/Helpers/LearningGoalHelper.cs`
- `Deserialize(string? json): List<LearningGoalDto>` - wraps `JsonStorageHelper.DeserializeListWithStringFallback<LearningGoalDto>` with the standard string fallback factory
- `FlattenGoals(string? json): string[]` - calls Deserialize, then flattens parent + children texts

### 2. Update `StudentService.cs`
- `MapToDto` line 228-230: replace inline call with `LearningGoalHelper.Deserialize(s.LearningGoals)`

### 3. Update `CourseService.cs`
- Lines 345-348: replace inline deserialize+flatten with `LearningGoalHelper.FlattenGoals(student.LearningGoals)`

### 4. Unit test in `backend/LangTeach.Api.Tests/Services/LearningGoalHelperTests.cs`
- Null input
- Plain string (legacy fallback)
- JSON array with parent + children

## Acceptance Criteria
- [x] `LearningGoalHelper.FlattenGoals(string? json): string[]` exists
- [x] `CourseService` uses it
- [x] `StudentService.MapToDto` uses `LearningGoalHelper.Deserialize`
- [x] No duplicate call sites remain
- [x] Unit tests covering null, plain string, JSON array
