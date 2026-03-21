# Task 156: Structured Difficulty Management

## Problem
Student weaknesses are stored as free-text string arrays (e.g., "past tenses", "articles"). Teachers need granular, structured tracking with category, specific item, severity, and trend.

## Current State
- `Student.Weaknesses`: JSON-serialized `List<string>`, max 30 items
- Displayed via MultiSelect dropdown in StudentForm.tsx
- Options defined in `studentOptions.ts`

## Design Decisions

### Data Model: Embedded JSON array (not a separate table)
Difficulties are tightly coupled to students, queried only within student context, and the volume is small (tens per student). A JSON column follows the existing pattern used for Weaknesses, Interests, and LearningGoals. This avoids a join table, extra migration complexity, and keeps the API surface simple.

### Migration: Keep old `Weaknesses` field, add new `Difficulties` field
The issue says "existing free-text weakness notes are preserved and displayed alongside structured difficulties." We keep `Weaknesses` fully editable as-is (no behavior change) and add the new `Difficulties` JSON field alongside it. Both sections appear in the AI Personalization card.

### AppDbContext: No changes needed
The Student entity config in AppDbContext only defines key, index, relationships, and IsDeleted default. The new `Difficulties` column is a simple `nvarchar(max)` with a default, handled entirely by the migration. No entity configuration changes required.

### Student list view (Students.tsx): Deferred
Difficulties will not appear on student list cards in this task. The list already shows weaknesses, interests, and notes. Difficulty badges on cards can be added as a follow-up polish item.

## Implementation Plan

### Step 1: Backend Model & Migration
**Files:** `Student.cs`, new migration file

- Add `Difficulties` property to Student entity: `string` (JSON-serialized), default `"[]"`
- Each difficulty entry schema:
  ```json
  {
    "id": "guid",
    "category": "grammar|vocabulary|pronunciation|writing|comprehension",
    "item": "ser/estar in past tense",
    "severity": "low|medium|high",
    "trend": "improving|stable|declining"
  }
  ```
- Add validation: max 50 difficulties, item max 200 chars
- Generate EF migration: `dotnet ef migrations add AddStudentDifficulties`

### Step 2: Backend DTOs & Service
**Files:** `DifficultyDto.cs` (new), `StudentDto.cs`, `CreateStudentRequest.cs`, `UpdateStudentRequest.cs`, `StudentService.cs`

- Create `DifficultyDto.cs` in the DTOs folder as its own file:
  ```csharp
  public record DifficultyDto(string Id, string Category, string Item, string Severity, string Trend);
  ```
- Add `List<DifficultyDto> Difficulties` to `StudentDto` record, positioned **after `Weaknesses`** (before `CreatedAt`). This is a positional record, so field order matters for the constructor and `MapToDto()`.
- Add `List<DifficultyDto> Difficulties` to Create/Update requests (default `[]`, not nullable) with:
  - `[MaxCollectionCount(50)]` for the list
  - Manual validation in `StudentService` for each entry's fields (category in allowed set, severity in allowed set, trend in allowed set, item max 200 chars). This follows the same pattern as `ValidateNativeLanguage()` since data annotation attributes don't validate nested object fields.
- Update `StudentService`:
  - Add generic serialization helpers: `Serialize<T>(List<T>)` and `Deserialize<T>(string)` to handle both `List<string>` and `List<DifficultyDto>`. The existing `Serialize(List<string>)` and `Deserialize(string)` methods are typed for strings only.
  - Add `ValidateDifficulties(List<DifficultyDto>)` method with allowed category/severity/trend sets
  - Update `MapToDto()`: add `Deserialize<DifficultyDto>(s.Difficulties)` in the correct positional slot (after Weaknesses, before CreatedAt)
  - Update `CreateAsync()` and `UpdateAsync()`: call `ValidateDifficulties()` and serialize with `Serialize(request.Difficulties)`

### Step 3: Backend Tests
**Files:** `StudentsControllerTests.cs`

- Test creating a student with difficulties (round-trip: send difficulties, GET returns them)
- Test updating difficulties (add, edit, remove entries)
- Test validation rejects invalid category/severity/trend values
- Test max count validation (51 entries returns 400)

### Step 4: Frontend Types & API
**Files:** `students.ts` (API), `studentOptions.ts`

- Add `Difficulty` interface: `{ id: string; category: string; item: string; severity: string; trend: string }`
- Add `difficulties: Difficulty[]` to `Student` interface
- Add `difficulties?: Difficulty[]` to `StudentFormData` (optional so existing callers don't break)
- Add option lists to `studentOptions.ts`:
  - `DIFFICULTY_CATEGORIES`: grammar, vocabulary, pronunciation, writing, comprehension
  - `SEVERITY_LEVELS`: low, medium, high
  - `TREND_OPTIONS`: improving, stable, declining

### Step 5: Frontend UI (StudentForm)
**Files:** `StudentForm.tsx`

- Add `difficulties` state: `useState<Difficulty[]>([])`
- Sync from `existing.difficulties` in the useEffect
- Add a "Difficulties" card section in the form, placed after the AI Personalization card (which keeps Weaknesses editable as-is)
- Each difficulty row: category Select, item Input, severity Select, trend Select, remove IconButton
- "Add Difficulty" button at bottom generates a new entry with `crypto.randomUUID()` as id and empty fields
- Include `difficulties` in the `mutate()` payload
- Inline editing: each row is directly editable (no modal), fields update state immediately

### Step 6: Frontend Unit Tests
**Files:** `StudentForm.test.tsx`

- Update mock for `studentOptions` to include new exports (DIFFICULTY_CATEGORIES, SEVERITY_LEVELS, TREND_OPTIONS)
- Test rendering difficulty entries when editing a student with existing difficulties
- Test adding a new difficulty entry (click Add, verify row appears)
- Test removing a difficulty entry
- Test form submission payload includes difficulties array

### Step 7: E2E Test
**Files:** `students.spec.ts`

- Extend existing `full student CRUD flow` test:
  - After filling basic info, add a difficulty entry:
    - Click "Add Difficulty" button
    - Select category from dropdown
    - Type item text
    - Select severity
    - Select trend
  - Save student, navigate back to edit, verify the difficulty persists
  - Modify the difficulty item text, save, verify change persists
  - Remove the difficulty, save, verify it's gone

## Out of Scope (per issue)
- AI generation using difficulties (issue #157)
- Auto-detection from exercise results
- Trend calculation from historical data
- Difficulty badges on student list cards (deferred polish)
