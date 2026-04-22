# Task 628: Hierarchical Learning Goals

**Issue:** https://github.com/Robert-Freire/langTeachSaaS/issues/628
**Branch:** `worktree-task-t628-hierarchical-learning-goals`
**Sprint:** `sprint/ui-redesign-student-polish`

## Context

Change `LearningGoals` JSON shape from `string[]` to `{ id, text, children }[]` (max 2 levels deep). The field is stored in a `nvarchar(max)` JSON column — no SQL schema migration needed. Existing flat-string entries are migrated lazily via `DeserializeListWithStringFallback`.

## Current state

- `Student.LearningGoals` (model): `string` (JSON storage, default `"[]"`)
- `StudentDto.LearningGoals`: `List<string>`
- `CreateStudentRequest` / `UpdateStudentRequest`: `List<string>`
- `StudentService.MapToDto`: `DeserializeList<string>(s.LearningGoals)`
- `CourseService` line 345: `DeserializeList<string>(student.LearningGoals)` — used to pass goals to AI generation
- Frontend `Student` type: `learningGoals: string[]`
- Frontend form: `MultiSelect` component with `learning-goals-trigger` / `learning-goal-chip` testids
- Frontend profile view (`StudentProfileTab.tsx`): flat bullet list

## Implementation Plan

### Step 1: Backend — new DTO and validation

**File: `backend/LangTeach.Api/DTOs/LearningGoalDto.cs`** (new file)
```csharp
namespace LangTeach.Api.DTOs;

public record LearningGoalDto(
    string Id,
    string Text,
    List<LearningGoalDto> Children
);
```

**File: `backend/LangTeach.Api/DTOs/StudentDto.cs`**
- Change `List<string> LearningGoals` → `List<LearningGoalDto> LearningGoals`

**File: `backend/LangTeach.Api/DTOs/CreateStudentRequest.cs`**
- Change `List<string> LearningGoals` → `List<LearningGoalDto> LearningGoals`
- Keep `[MaxCollectionCount(20)]` on the property
- Drop `[MaxStringLengthEach(100)]` (no longer applicable at list level)

**File: `backend/LangTeach.Api/DTOs/UpdateStudentRequest.cs`**
- Same change as CreateStudentRequest

### Step 2: Backend — StudentService

**File: `backend/LangTeach.Api/Services/StudentService.cs`**

`MapToDto` line 226: Change from:
```csharp
JsonStorageHelper.DeserializeList<string>(s.LearningGoals),
```
To use backward-compatible deserialization:
```csharp
JsonStorageHelper.DeserializeListWithStringFallback<LearningGoalDto>(
    s.LearningGoals,
    text => new LearningGoalDto(Guid.NewGuid().ToString(), text, [])),
```

Add `ValidateLearningGoals` method and call it from `CreateAsync` / `UpdateAsync`:
```csharp
private static void ValidateLearningGoals(List<LearningGoalDto> goals)
{
    if (goals.Count > 20)
        throw new ValidationException("Cannot have more than 20 learning goals.");
    foreach (var goal in goals)
    {
        if (string.IsNullOrWhiteSpace(goal.Text) || goal.Text.Length > 200)
            throw new ValidationException("Each learning goal text must be between 1 and 200 characters.");
        if (goal.Children.Count > 20)
            throw new ValidationException("Cannot have more than 20 sub-goals per goal.");
        foreach (var child in goal.Children)
        {
            if (string.IsNullOrWhiteSpace(child.Text) || child.Text.Length > 200)
                throw new ValidationException("Each sub-goal text must be between 1 and 200 characters.");
            if (child.Children.Count > 0)
                throw new ValidationException("Learning goals support at most 2 levels (no sub-sub-goals).");
        }
    }
}
```

`Serialize` calls in `CreateAsync` (line 116) and `UpdateAsync` (line 171): no change needed, already `Serialize(request.LearningGoals)` which works with any type.

### Step 3: Backend — CourseService and GenerateController

**File: `backend/LangTeach.Api/Services/CourseService.cs`** line 345
Change:
```csharp
JsonStorageHelper.DeserializeList<string>(student.LearningGoals).ToArray()
```
To:
```csharp
JsonStorageHelper.DeserializeListWithStringFallback<LearningGoalDto>(
    student.LearningGoals,
    text => new LearningGoalDto(Guid.NewGuid().ToString(), text, []))
    .Select(g => g.Text).ToArray()
```
This passes flat text strings to the AI (same behavior as before, preserves AI contract).

**File: `backend/LangTeach.Api/Controllers/GenerateController.cs`**
There are two call sites (`student?.LearningGoals.ToArray()`) where the result is passed as `StudentGoals: string[]?`. After the DTO change, `LearningGoals` is `List<LearningGoalDto>`, so `.ToArray()` would produce `LearningGoalDto[]` — compile error.
Change each to:
```csharp
student?.LearningGoals.Select(g => g.Text).ToArray()
```

### Step 4: Backend tests update

**File: `backend/LangTeach.Api.Tests/Controllers/StudentsControllerTests.cs`**
- Update `LearningGoals = ["travel", "conversation"]` to:
  ```csharp
  LearningGoals = [
      new LearningGoalDto(Guid.NewGuid().ToString(), "travel", []),
      new LearningGoalDto(Guid.NewGuid().ToString(), "conversation", [])
  ]
  ```
- Update assertions: `student.LearningGoals.Select(g => g.Text).Should().BeEquivalentTo(["travel", "conversation"])`
- Add test: `nested learning goals round-trip` — create a student with a parent goal + 2 children, verify structure is preserved.
- Add test: `3-level deep goal rejected` — verify 400 response.

**File: `backend/LangTeach.Api.Tests/Services/StudentServiceTests.cs`**
- Add test: `LearningGoals with flat string legacy JSON deserializes with backward compat` — save student with `LearningGoals = """["travel","work"]"""` directly in the DB, call `GetAllAsync`, verify deserialized goals have those texts and empty children.

### Step 5: Frontend — types

**File: `frontend/src/api/students.ts`**
- Add type:
  ```typescript
  export interface LearningGoalItem {
    id: string
    text: string
    children: LearningGoalItem[]
  }
  ```
- Change `learningGoals: string[]` → `learningGoals: LearningGoalItem[]` in `Student` interface
- Change `learningGoals: string[]` → `learningGoals: LearningGoalItem[]` in `UpdateStudentPayload` (and `CreateStudentPayload` if separate)

### Step 6: Frontend — LearningGoalTreeEditor component (new)

**File: `frontend/src/components/student/LearningGoalTreeEditor.tsx`** (new)

Responsibilities:
- Display a list of top-level goals. Each shows: text, "add sub-goal" button, "edit" button, "delete" button, collapse/expand toggle (if it has children).
- Children displayed indented below parent (when expanded).
- "Add goal" button at the bottom.
- Inline editing: clicking edit shows an input field in place of the text; blur or Enter confirms.
- testids: `learning-goal-item`, `learning-goal-text`, `learning-goal-add-child-btn`, `learning-goal-delete-btn`, `learning-goal-edit-input`, `learning-goal-add-btn`, `learning-goal-collapse-btn`, `learning-goal-child-item`

Props: `value: LearningGoalItem[]`, `onChange: (goals: LearningGoalItem[]) => void`

**File: `frontend/src/components/student/LearningGoalTreeEditor.test.tsx`** (new)
- Tests: add goal, edit goal, delete goal, add sub-goal, delete sub-goal, collapse/expand, onChange called with correct structure.

### Step 7: Frontend — StudentForm

**File: `frontend/src/pages/StudentForm.tsx`**
- Change state: `const [learningGoals, setLearningGoals] = useState<LearningGoalItem[]>([])`
- Load from existing: `setLearningGoals(existing.learningGoals)`
- Replace MultiSelect with `<LearningGoalTreeEditor value={learningGoals} onChange={setLearningGoals} />`
- Remove the `LEARNING_GOALS` options reference for this field (the predefined options no longer apply with free-text tree)

### Step 8a: Frontend — StudentProfileOverview (chip view)

**File: `frontend/src/components/student/StudentProfileOverview.tsx`**
This component passes `student.learningGoals` to a `<ChipList items={string[]}>`. After the type change, `learningGoals` is `LearningGoalItem[]` — TypeScript compile error.
Change to: `student.learningGoals.map(g => g.text)` to produce a flat string array for the chip list.
Note: sub-goal text is not surfaced in this overview chip view (summary context). The profile tab (step 8b) shows hierarchy.

### Step 8b: Frontend — StudentProfileTab (read-only view)

**File: `frontend/src/components/student/StudentProfileTab.tsx`**
Update `data-testid="profile-learning-goals"` section:
- Render top-level goals with a bullet
- For each goal that has children, render them indented below with a secondary marker
- Keep the same outer container structure

### Step 9: Frontend unit tests (update)

**File: `frontend/src/pages/StudentForm.test.tsx`**
- Update tests that set `learning-goals-trigger` / `learning-goal-chip` to use the new tree editor testids
- Add test: create student with a nested goal, verify the data passed to the API has the expected shape

**File: `frontend/src/components/student/StudentProfileTab.test.tsx`**
- Update mock data `learningGoals` to use `LearningGoalItem[]` format
- Add assertion for sub-goals rendering indented

**File: `frontend/src/components/StudentProfileSummary.test.tsx`**
- Update mock data: `learningGoals: ['get a job in Barcelona']` → `learningGoals: [{ id: '1', text: 'get a job in Barcelona', children: [] }]`

**File: `frontend/src/pages/CourseNew.test.tsx`**
- Update mock data: `learningGoals: ['get a job in Barcelona']` → `learningGoals: [{ id: '1', text: 'get a job in Barcelona', children: [] }]`

### Step 10: E2E tests

**File: `e2e/tests/students.spec.ts`**
- Remove/replace tests using `learning-goals-trigger` and `learning-goal-chip` (MultiSelect)
- Replace with:
  - `student with flat learning goal persists` — add a top-level goal via `learning-goal-add-btn`, type text, save, verify it appears in profile
  - `nested learning goal persists` — add a top-level goal, then a sub-goal via `learning-goal-add-child-btn`, save, reload, verify hierarchy
- Keep the test name "custom free-text learning goal persists after save" but rewrite interactions for the tree editor

## Data migration strategy

No EF Core migration needed (no schema change). Backward compatibility handled at read time:
- `JsonStorageHelper.DeserializeListWithStringFallback<LearningGoalDto>` — if the stored JSON is `["travel", "work"]` (old flat strings), it wraps them as `LearningGoalDto` with empty children.
- On next save, they'll be stored in the new format.
- No startup migration script needed.

## Files touched summary

| File | Change |
|------|--------|
| `backend/LangTeach.Api/DTOs/LearningGoalDto.cs` | NEW |
| `backend/LangTeach.Api/DTOs/StudentDto.cs` | `List<string>` → `List<LearningGoalDto>` |
| `backend/LangTeach.Api/DTOs/CreateStudentRequest.cs` | `List<string>` → `List<LearningGoalDto>` |
| `backend/LangTeach.Api/DTOs/UpdateStudentRequest.cs` | `List<string>` → `List<LearningGoalDto>` |
| `backend/LangTeach.Api/Services/StudentService.cs` | backward-compat read + validation |
| `backend/LangTeach.Api/Services/CourseService.cs` | extract `.Text` for AI |
| `backend/LangTeach.Api.Tests/Controllers/StudentsControllerTests.cs` | update + add tests |
| `backend/LangTeach.Api.Tests/Services/StudentServiceTests.cs` | add backward-compat test |
| `frontend/src/api/students.ts` | new type, update interfaces |
| `frontend/src/components/student/LearningGoalTreeEditor.tsx` | NEW component |
| `frontend/src/components/student/LearningGoalTreeEditor.test.tsx` | NEW tests |
| `frontend/src/pages/StudentForm.tsx` | replace MultiSelect with tree editor |
| `frontend/src/pages/StudentForm.test.tsx` | update + add tests |
| `frontend/src/components/student/StudentProfileOverview.tsx` | flatten goals for ChipList |
| `frontend/src/components/student/StudentProfileTab.tsx` | render hierarchy |
| `frontend/src/components/student/StudentProfileTab.test.tsx` | update mock data |
| `frontend/src/components/StudentProfileSummary.test.tsx` | update mock data |
| `frontend/src/pages/CourseNew.test.tsx` | update mock data |
| `e2e/tests/students.spec.ts` | replace MultiSelect-based tests |

## AC checklist

- [ ] JSON shape migration from flat strings to nested `{ id, text, children }` (backwards compatible, existing entries get empty children)
- [ ] Backend validates nested structure (max 2 levels deep)
- [ ] Frontend tree component: add/edit/delete at any level, collapse/expand
- [ ] Existing flat goals preserved through migration
- [ ] Round-trip: create nested goals, save, reload, structure intact
- [ ] Student profile view renders goals with hierarchy (indented sub-goals)
