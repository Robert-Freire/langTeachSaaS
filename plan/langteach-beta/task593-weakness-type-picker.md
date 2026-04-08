# Task 593: Student Form Weakness Type Picker

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/593

## Context

Issue #586 added an internal `StudentWeakness(Description, WeaknessType)` record and conditional prompt injection based on weakness type. The API kept `List<string>` weaknesses, so the `GenerateController` always constructed `new StudentWeakness(w)` with the default `WeaknessType = "grammatical"`, meaning lexical/orthographic types never fired.

This task makes the type visible at the API and UI layer.

## Current State

- DB column `Student.Weaknesses`: JSON text storing `List<string>`
- `StudentDto.Weaknesses`: `List<string>`
- `CreateStudentRequest`/`UpdateStudentRequest`: `List<string> Weaknesses` with `[MaxStringLengthEach(200)]`
- `GenerateController`: `student.Weaknesses.Select(w => new StudentWeakness(w))` (uses default type)
- `CourseService`: `JsonStorageHelper.DeserializeList<string>(student.Weaknesses).Select(s => new StudentWeakness(s))`
- Frontend: `weaknesses: string[]` in `Student` and `StudentFormData`; UI is a `MultiSelect` popover

## Plan

### Backend

**Step 1 — Add `StudentWeaknessDto` to DTOs**

New file `backend/LangTeach.Api/DTOs/StudentWeaknessDto.cs`:
```csharp
namespace LangTeach.Api.DTOs;

public record StudentWeaknessDto(string Description, string WeaknessType = "grammatical");
```

**Step 2 — Add `DeserializeWeaknessesWithFallback` to `JsonStorageHelper`**

Method that tries `List<StudentWeaknessDto>` first; on `JsonException` falls back to `List<string>` → map with `WeaknessType = "grammatical"`. This handles legacy DB rows that still contain plain string arrays.

**Step 3 — Update `StudentDto`, `CreateStudentRequest`, `UpdateStudentRequest`**

- `StudentDto`: `List<string> Weaknesses` → `List<StudentWeaknessDto> Weaknesses`
- `CreateStudentRequest` / `UpdateStudentRequest`:
  - `List<string> Weaknesses` → `List<StudentWeaknessDto> Weaknesses`
  - Remove `[MaxStringLengthEach(200)]` (was for strings)
  - Keep `[MaxCollectionCount(30)]`

**Step 4 — Update `StudentService`**

- `MapToDto`: use `JsonStorageHelper.DeserializeWeaknessesWithFallback(s.Weaknesses)` instead of `DeserializeList<string>`
- Add `ValidateWeaknesses(List<StudentWeaknessDto>)`:
  - `Description` must be 1–200 chars
  - `WeaknessType` must be one of: `grammatical`, `lexical`, `orthographic`
- Call `ValidateWeaknesses` in `CreateAsync` and `UpdateAsync`

**Step 5 — Update `GenerateController`**

Two call sites at lines ~189 and ~349:
```csharp
// before
student?.Weaknesses.Select(w => new StudentWeakness(w)).ToArray()
// after
student?.Weaknesses.Select(w => new StudentWeakness(w.Description, w.WeaknessType)).ToArray()
```

**Step 6 — Update `CourseService`**

Replace:
```csharp
JsonStorageHelper.DeserializeList<string>(student.Weaknesses).Select(s => new StudentWeakness(s)).ToArray()
```
With:
```csharp
JsonStorageHelper.DeserializeWeaknessesWithFallback(student.Weaknesses)
    .Select(w => new StudentWeakness(w.Description, w.WeaknessType)).ToArray()
```

**Step 7 — Update `StudentsControllerTests.cs`**

Three test methods reference `Weaknesses = ["past tenses", "articles"]` etc. Update to use `List<StudentWeaknessDto>`:
```csharp
Weaknesses = [new StudentWeaknessDto("past tenses", "grammatical"), new StudentWeaknessDto("articles", "lexical")]
```
Update the assertions to use `.BeEquivalentTo` on `StudentWeaknessDto` objects.

### Frontend

**Step 8 — Update `api/students.ts`**

Add:
```ts
export interface StudentWeaknessItem {
  description: string
  weaknessType: 'grammatical' | 'lexical' | 'orthographic'
}
```
Change `Student.weaknesses: string[]` → `StudentWeaknessItem[]`
Change `StudentFormData.weaknesses: string[]` → `StudentWeaknessItem[]`

**Step 9 — Update `StudentForm.tsx`**

Replace `MultiSelect` for weaknesses with a row-based compound input like the difficulties section.

State: `weaknesses: StudentWeaknessItem[]` (default `[]`)

Each row:
- `data-testid="weakness-row"`
- Text input (`data-testid="weakness-description"`) — free-text description, `maxLength={200}`
- Type selector (`data-testid="weakness-type"`) — options: Grammatical / Lexical / Orthographic, default `grammatical`
- Remove button (`data-testid="remove-weakness"`)

Add button: `data-testid="add-weakness"`, adds `{ description: '', weaknessType: 'grammatical' }` row.

Removes: `MultiSelect` usage for weaknesses, `getWeaknessesForLanguage` import, `getLanguageSpecificWeaknessValues` import (no longer needed — language filtering was only meaningful for predefined string values). The `MultiSelect` component itself stays in the file (still used for interests/goals).

Also remove the `language` change handler's stale-weakness filtering logic (the `setWeaknesses((prev) => prev.filter(...))`  call in the `onValueChange` for student-language) since weaknesses are now free-text objects, not predefined strings tied to a language.

Empty state: `data-testid="weaknesses-empty"`, text "No areas to improve tracked yet."

Filter out rows with empty description on submit (same pattern as difficulties).

Update `useEffect`: `setWeaknesses(existing.weaknesses)` (now `StudentWeaknessItem[]`, no conversion needed).

**Step 10 — Update `StudentProfileOverview.tsx`**

`ChipList` takes `items: string[]` and is NOT modified. Replace the `ChipList` call for weaknesses with inline chip rendering (do not try to extend `ChipList`):

```tsx
{student.weaknesses.length === 0
  ? <span className="text-zinc-400 text-sm">None specified</span>
  : <div className="flex flex-wrap gap-1.5">
      {student.weaknesses.map((w, i) => (
        <span key={i} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded px-2 py-0.5">
          {w.description}
          <span className="text-indigo-400">({w.weaknessType})</span>
        </span>
      ))}
    </div>
}
```

**Step 11 — `pages/StudentDetail.tsx` — no code change**

`weaknesses: student.weaknesses` passes through correctly as `StudentWeaknessItem[]`. TypeScript will validate this automatically. No edit needed; confirm it compiles.

**Step 12 — `pages/onboarding/OnboardingStep2.tsx` — no code change**

`weaknesses: []` is type-compatible with `StudentWeaknessItem[]`. No edit needed.

**Step 12b — Clean up dead code in `studentOptions.ts`**

After Step 9 removes `getWeaknessesForLanguage` and `getLanguageSpecificWeaknessValues` from `StudentForm.tsx`, these functions have no callers. Remove them from `frontend/src/lib/studentOptions.ts` and remove the corresponding tests from `frontend/src/lib/studentOptions.test.ts`.

**Step 13 — Update `StudentForm.test.tsx`**

- All `mockGetStudent.mockResolvedValue` calls: `weaknesses: []` is type-compatible, no change needed for empty arrays.
- Calls with string weaknesses: `weaknesses: ['ser/estar', 'irregular verb conjugation']` → `weaknesses: [{ description: 'ser/estar', weaknessType: 'grammatical' }, { description: 'irregular verb conjugation', weaknessType: 'grammatical' }]`
- Update mock of `getWeaknessesForLanguage` and `getLanguageSpecificWeaknessValues` in `vi.mock('../lib/studentOptions', ...)` — remove them (or stub with empty returns if `studentOptions` still exports other things used by the form).

**Tests to DELETE** (MultiSelect behavior no longer exists):
- `shows English-specific weaknesses when English is selected`
- `shows Spanish-specific weaknesses when Spanish is selected`
- `clears language-specific weaknesses when target language changes, preserving common and custom ones`
- `allows adding a custom free-text weakness` (entirely superseded by new row-based test)
- `preserves existing weaknesses when loaded from server` (rephrase: now tests that rows appear for existing `StudentWeaknessItem[]`)

**Tests to REWRITE**:
- `displays custom entries in edit mode when loaded from server`: mock now uses `weaknesses: [{description: 'irregular verb conjugation', weaknessType: 'grammatical'}]`; assert `weakness-row` and `weakness-description` value
- `includes difficulties in form submission`: weakness data has no impact here, keep as-is

**Tests to ADD**:
- "Add weakness row when clicking Add button" — click `add-weakness`, expect one `weakness-row`, empty state gone
- "Remove weakness row" — add then remove, row gone, empty state shown
- "Weakness type defaults to grammatical" — add row, check `weakness-type` selector default value
- "Weakness rows included in form submission" — add row, fill description, set type to 'lexical', submit, assert `createStudent` called with `weaknesses: [{description: '...', weaknessType: 'lexical'}]`
- "Existing weaknesses render as rows in edit mode" — mock returns `weaknesses: [{description: 'ser/estar', weaknessType: 'orthographic'}]`, assert `weakness-description` value and `weakness-type` value in rendered row

**Step 14 — Update `StudentProfileSummary.test.tsx`**

Change `weaknesses: ['ser vs estar']` → `weaknesses: [{ description: 'ser vs estar', weaknessType: 'grammatical' }]`

**Step 15 — Update e2e `students.spec.ts`**

Tests to update (they use `weaknesses-trigger`/`weakness-chip`):
- `full student CRUD flow`: replace the "Select a weakness (Ser/Estar)" block with: click `add-weakness`, fill `weakness-description` with "Ser/Estar", keep default type. Update the edit-page assertion: instead of `weakness-chip` check, assert `weakness-description` has value "Ser/Estar".
- `custom free-text learning goal persists after save`: replace `addCustomEntry('weaknesses-trigger', 'irregular verb conjugation')` with row-based entry, update assertion from `weakness-chip` to `weakness-description`.
- `weakness options are filtered by target language` test: DELETE entirely. Language-based filtering is removed by design.

Add new test: **"creates student with lexical weakness and verifies round-trip"**
  - Navigate to `/students/new`, fill name, Spanish, B1
  - Click `data-testid="add-weakness"`, fill `data-testid="weakness-description"` with "Vocabulary gaps for travel"
  - Change `data-testid="weakness-type"` to "lexical"
  - Save, navigate to edit page via edit button
  - Assert `weakness-description` has value "Vocabulary gaps for travel" and `weakness-type` shows "lexical"
  - Cleanup: cancel, delete student

## Acceptance Criteria Coverage

| AC | How covered |
|----|-------------|
| `StudentWeaknessDto` with `Description` and `WeaknessType` | Step 1 |
| DTOs use `List<StudentWeaknessDto>` | Steps 3, 8 |
| Existing plain-string DB data handled gracefully | Steps 2, 4, 6 |
| Student form shows type selector per weakness | Step 9 |
| Frontend TypeScript types updated | Step 8 |
| E2E: lexical weakness round-trips correctly | Step 15 |

## No DB Migration Needed

`Student.Weaknesses` is a JSON text column. The change is format-only (old `["str"]` deserializes via fallback; new rows write `[{"description":"...","weaknessType":"..."}]`). No schema migration required.

## Files Changed

Backend:
- `backend/LangTeach.Api/DTOs/StudentWeaknessDto.cs` (new)
- `backend/LangTeach.Api/DTOs/StudentDto.cs`
- `backend/LangTeach.Api/DTOs/CreateStudentRequest.cs`
- `backend/LangTeach.Api/DTOs/UpdateStudentRequest.cs`
- `backend/LangTeach.Api/Helpers/JsonStorageHelper.cs`
- `backend/LangTeach.Api/Services/StudentService.cs`
- `backend/LangTeach.Api/Controllers/GenerateController.cs`
- `backend/LangTeach.Api/Services/CourseService.cs`
- `backend/LangTeach.Api.Tests/Controllers/StudentsControllerTests.cs`

Frontend:
- `frontend/src/api/students.ts`
- `frontend/src/pages/StudentForm.tsx`
- `frontend/src/pages/StudentForm.test.tsx`
- `frontend/src/components/student/StudentProfileOverview.tsx`
- `frontend/src/components/StudentProfileSummary.test.tsx`
- `frontend/src/lib/studentOptions.ts` (remove dead weakness functions)
- `frontend/src/lib/studentOptions.test.ts` (remove tests for removed functions)
- `e2e/tests/students.spec.ts`
