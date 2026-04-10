# Task #626 — Student notes split + native languages plural + learning goals editable

**Issue:** Robert-Freire/langTeachSaaS#626
**Sprint branch:** sprint/ui-redesign-student-polish
**Spec:** plan/langteach-beta/student-profile-field-guide.md (decisions, Robert 2026-04-10)

---

## Summary

Three schema changes on the `Student` entity with a thin frontend adapter that keeps all existing UI working unchanged (no visual redesign):

1. `Notes` → `PersonalNotes` (string?) + `TeachingNotes` (string?)
2. `NativeLanguage` (string?) → `NativeLanguages` (JSON array, NOT NULL, default `"[]"`)
3. `LearningGoals` — already accepted on update DTO; confirm it works end-to-end and add free-text add/remove in the form (replacing the constrained MultiSelect with preset options)

---

## Acceptance criteria checklist

- [ ] EF migration handles data copy before dropping old columns
- [ ] `GET /api/students/{id}` returns `personalNotes`, `teachingNotes`, `nativeLanguages` (array)
- [ ] `PUT /api/students/{id}` accepts `personalNotes`, `teachingNotes`, `nativeLanguages`, `learningGoals`
- [ ] Frontend compiles and renders correctly with renamed fields
- [ ] Seeder updated for new field names
- [ ] Existing data preserved through migration

---

## Backend changes

### 1. `Student.cs`

Replace:
```cs
public string? NativeLanguage { get; set; }
public string? Notes { get; set; }
```
With:
```cs
public string NativeLanguages { get; set; } = "[]";
public string? PersonalNotes { get; set; }
public string? TeachingNotes { get; set; }
```

### 2. EF Migration

Generate migration: `dotnet ef migrations add StudentFieldsSplit`

Then manually edit the `Up()` method to insert data-copy SQL before dropping old columns:

```csharp
// 1. Add new columns
migrationBuilder.AddColumn<string>("NativeLanguages", "Students", nullable: false, defaultValue: "[]");
migrationBuilder.AddColumn<string>("PersonalNotes", "Students", nullable: true);
migrationBuilder.AddColumn<string>("TeachingNotes", "Students", nullable: true);

// 2. Copy data
// Use CONCAT instead of JSON_ARRAY() — JSON_ARRAY() requires SQL Server 2022 (compat 160)
// and is not guaranteed on all Azure SQL tiers. CONCAT is safe on SQL Server 2012+.
migrationBuilder.Sql("""
    UPDATE Students
    SET NativeLanguages = CASE
        WHEN NativeLanguage IS NULL THEN '[]'
        ELSE CONCAT('["', REPLACE(NativeLanguage, '"', '\"'), '"]')
    END,
    PersonalNotes = Notes;
""");

// 3. Drop old columns
migrationBuilder.DropColumn("NativeLanguage", "Students");
migrationBuilder.DropColumn("Notes", "Students");
```

Down() reverses the rename (PersonalNotes → Notes, first element of NativeLanguages → NativeLanguage).

### 3. `StudentDto.cs`

Remove `Notes` and `NativeLanguage`. Add:
```cs
string? PersonalNotes,
string? TeachingNotes,
List<string> NativeLanguages,
```

### 4. `CreateStudentRequest.cs` and `UpdateStudentRequest.cs`

- Remove `string? NativeLanguage`, add `List<string> NativeLanguages = []` with `[MaxCollectionCount(5)]` and `[MaxStringLengthEach(50)]`
- Remove `string? Notes`, add `string? PersonalNotes` (MaxLength 2000) and `string? TeachingNotes` (MaxLength 2000)
- Remove old sync comment on NativeLanguage (was "Must stay in sync with NATIVE_LANGUAGES..."); add equivalent comment on NativeLanguages

### 5. `StudentService.cs`

**MapToDto:** update to use new fields:
```cs
NativeLanguages: JsonStorageHelper.DeserializeList<string>(s.NativeLanguages),
PersonalNotes: s.PersonalNotes,
TeachingNotes: s.TeachingNotes,
```

**CreateAsync/UpdateAsync:** replace `NativeLanguage = request.NativeLanguage` with `NativeLanguages = Serialize(request.NativeLanguages)`, replace `Notes = request.Notes` with `PersonalNotes = request.PersonalNotes, TeachingNotes = request.TeachingNotes`.

**ValidateNativeLanguage:** rename to `ValidateNativeLanguages`, iterate over the list and validate each element against `AllowedNativeLanguages`.

### 6. `GenerateController.cs` (lines 186, 346) and `CourseService.cs` (line 338)

Replace `student?.NativeLanguage` with:
```cs
JsonStorageHelper.DeserializeList<string>(student.NativeLanguages).FirstOrDefault()
```
`StudentNativeLanguage` in the prompt context stays `string?` — no change to `IPromptService.cs` or `PromptService.cs`.

### 7. `DemoSeeder.cs`

Two separate seeding paths both use `Notes` — update both:

**Demo path (lines ~36, 49-53):**
- Line 36: `s.Notes == DemoTag` → `s.PersonalNotes == DemoTag`
- Lines 49-53: `Notes = DemoTag` → `PersonalNotes = DemoTag`

**Visual demo path (lines ~129, 144, 159-160):**
- Line 129: `s.Notes == VisualTag` → `s.PersonalNotes == VisualTag`
- Line 144: `s.Notes == VisualTag` → `s.PersonalNotes == VisualTag`
- Lines 159-160: `Notes = VisualTag` → `PersonalNotes = VisualTag`

**Scenario seed path (lines ~244-294):**
- `NativeLanguage = "Portuguese"` → `NativeLanguages = """["Portuguese"]"""`
- `NativeLanguage = null` → `NativeLanguages = "[]"`
- `Notes = "[scenario-seed]"` → `PersonalNotes = "[scenario-seed]"`
- `Notes = "[Excel import...]"` → `PersonalNotes = "[Excel import...]"`

**Update path (line ~413-418):**
- `existing.NativeLanguage = incoming.NativeLanguage` → `existing.NativeLanguages = incoming.NativeLanguages`
- `existing.Notes = incoming.Notes` → `existing.PersonalNotes = incoming.PersonalNotes; existing.TeachingNotes = incoming.TeachingNotes`

### 8. `LangTeach.MigrationTool/ExcelImporter.cs`

This file (lines 257, 276) reads and writes `student.Notes` against the `Student` model from `LangTeach.Api.Data`. After dropping `Notes` the MigrationTool project will fail to compile.

- Line 257: `student.Notes?.Contains(...)` → `student.PersonalNotes?.Contains(...)`
- Line 276: `student.Notes = (student.Notes ?? string.Empty) + appendBlock` → `student.PersonalNotes = (student.PersonalNotes ?? string.Empty) + appendBlock`

### 9. Backend tests

**`StudentsControllerTests.cs`:**
- Update `Notes = "Prefers morning sessions."` in create test (line 43) → `PersonalNotes = "Prefers morning sessions."`
- Update assertion `student.Notes.Should().Be(...)` (line 54) → `student.PersonalNotes.Should().Be(...)`
- Any `NativeLanguage = "..."` assignments in test requests → `NativeLanguages = ["..."]` as a `List<string>`
- Any `NativeLanguage = "Klingon"` invalid-input tests → `NativeLanguages = ["Klingon"]`; confirm validation still rejects disallowed values per-element

**`StudentServiceTests.cs`:** update all `Notes`, `NativeLanguage` references (use grep to find exact lines before editing).

---

## Frontend changes

### 1. `api/students.ts`

Update `Student` interface:
```ts
personalNotes: string | null
teachingNotes: string | null
nativeLanguages: string[]
// remove: notes, nativeLanguage
```

Update `StudentFormData`:
```ts
personalNotes?: string | null
teachingNotes?: string | null
nativeLanguages?: string[]
// remove: notes, nativeLanguage
```

### 2. `StudentForm.tsx`

State changes:
- Remove `notes`, add `personalNotes`, `teachingNotes`
- Remove `nativeLanguage` (string), add `nativeLanguages` (string[]) — keep a single dropdown for now but store as `[selected]` or `[]`

Effect changes (sync from existing):
- `setPersonalNotes(existing.personalNotes ?? '')`
- `setTeachingNotes(existing.teachingNotes ?? '')`
- `setNativeLanguages(existing.nativeLanguages.length ? [existing.nativeLanguages[0]] : [])`

Submission:
- `personalNotes: personalNotes || null`
- `teachingNotes: teachingNotes || null`
- `nativeLanguages: nativeLanguages`

UI changes:
- Native language section: keep single `<Select>` but bind to `nativeLanguages[0] ?? ''`; on change: `setNativeLanguages(v ? [v] : [])`
- Notes section: replace single `<Textarea notes>` with two textareas, one for `personalNotes` (label "Personal notes") and one for `teachingNotes` (label "Teaching notes")
- Learning goals: the existing `MultiSelect` already supports custom text via `addCustom()`. No UI change needed — keep as is. The fix for Jordi's complaint is at the backend (which already works) — no frontend form change required for LearningGoals.

### 3. `StudentProfileOverview.tsx`

- `parseNotes(student.personalNotes)` instead of `student.notes`
- Add a second FieldRow for teaching notes: `parseNotes(student.teachingNotes)` with label "Teaching notes"
- `student.nativeLanguages[0]` or `student.nativeLanguages.join(', ')` instead of `student.nativeLanguage`

### 4. `Students.tsx`

- `student.personalNotes` instead of `student.notes`
- `student.nativeLanguages[0]` instead of `student.nativeLanguage`
- Update the null checks accordingly (`student.nativeLanguages.length > 0` instead of `!student.nativeLanguage`)

### 5. `StudentDetail.tsx`

The `onToggleDifficultyStatus` mutation (lines 41-51) calls `updateStudent` with the full student object. Update specifically:
- Line 46: `nativeLanguage: student.nativeLanguage` → `nativeLanguages: student.nativeLanguages`
- Line 50: `notes: student.notes` → `personalNotes: student.personalNotes, teachingNotes: student.teachingNotes`
- Line 141: `parseNotes(student.notes)` → `parseNotes(student.personalNotes)`

### 6. `StudentProfileSummary.tsx` + `studentProfileUtils.ts`

- `studentProfileUtils.ts`: `{ key: 'nativeLanguage', label: 'native language' }` — check if this key references the Student type; update to `nativeLanguages`
- `StudentProfileSummary.tsx`: update `student.nativeLanguage` access

### 7. `OnboardingStep2.tsx`

- Keep single dropdown, send as array: `nativeLanguages: nativeLanguage ? [nativeLanguage] : []`

### 8. Test files (update mock data only, no logic changes)

Files that have inline `Student` mock objects with old fields. Replace:
- `notes: null` → `personalNotes: null, teachingNotes: null`
- `nativeLanguage: null` → `nativeLanguages: []`
- `nativeLanguage: 'Italian'` → `nativeLanguages: ['Italian']`

Affected files:
- `CourseNew.test.tsx`
- `Dashboard.test.tsx`
- `SchedulePopover.test.tsx`
- `LessonNew.test.tsx`
- `Onboarding.test.tsx`
- `OnboardingStep3.test.tsx`
- `StudentProfileSummary.test.tsx`
- `StudentProfileOverview.test.tsx`
- `StudentForm.test.tsx`
- `StudentDetail.test.tsx`
- `Students.test.tsx`
- `e2e/tests/courses.spec.ts`

---

## E2E test

`e2e/tests/courses.spec.ts` line 306: update mock student object to use new field names (same pattern as unit tests above).

Happy path e2e: one test that creates a student with `personalNotes`, `nativeLanguages`, verifies GET returns them correctly. Can be added to `StudentsControllerTests` as an integration test rather than Playwright (Playwright e2e is limited for form input).

---

## Order of implementation

1. Backend: model → migration → DTOs → service → controllers → seeder → backend tests
2. Frontend: api types → form → display components → test file mock updates
3. Build verify + QA verify

---

## Out of scope

- Multi-native language picker UI (profile redesign issue)
- TeachingNotes shown on session log (separate issue)
- Any other new columns from the field guide (IsActive, IsCorporate, Rate, etc.)
