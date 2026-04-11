# Task 663: Language context fields in edit form and profile view

## Goal

Surface three language-related fields (SpokenLanguages, OfficialCefrLevel, SkillLevelOverrides) that exist in the DB but have no UI. Also fix NativeLanguages display gap (#667).

## Infrastructure gap resolved in this task

`SkillLevelOverrides` exists in `Student.cs` as a JSON string column but is absent from `StudentDto`, `CreateStudentRequest`, `UpdateStudentRequest`, and `StudentService`. This task includes adding it to the API surface before building the frontend UI.

## Current state

- `officialCefrLevel` and `spokenLanguages` are already in the API (StudentDto, request DTOs, frontend Student type)
- `skillLevelOverrides` is NOT in the API - needs to be added
- `StudentProfileTab` is the Profile tab in StudentDetail
- `StudentProfileOverview` component exists but is NOT rendered anywhere (was removed during task639 redesign)
- The Stitch design specifies an "Overview" tab alongside the "Profile" tab
- Current StudentDetail tabs: Profile, Sessions, Progress

## What to build

### Backend (SkillLevelOverrides API addition)

**`StudentDto.cs`**
- Add `Dictionary<string, string?> SkillLevelOverrides` record parameter

**`CreateStudentRequest.cs` and `UpdateStudentRequest.cs`**
- Add `Dictionary<string, string?> SkillLevelOverrides { get; set; } = new()`
- Validation: keys must be one of `Reading|Writing|Speaking|Listening`; values must be a CEFR level (A1-C2) or null

**`StudentService.cs`**
- `CreateAsync`: serialize `request.SkillLevelOverrides` to JSON and assign to `student.SkillLevelOverrides`
- `UpdateAsync`: same
- `ToDto`: deserialize `s.SkillLevelOverrides` via `JsonSerializer.Deserialize<Dictionary<string, string?>>(s.SkillLevelOverrides)` with empty dict fallback

**`JsonStorageHelper.cs`**
- Add `DeserializeDictionary<TK, TV>` helper (consistent with existing pattern)

### Frontend API types (`students.ts`)

- Add `skillLevelOverrides: Record<string, string | null>` to `Student` interface
- Add `skillLevelOverrides?: Record<string, string | null>` to `StudentFormData`

### Edit form (`StudentForm.tsx`)

Add three new field groups:

**Under "Basic Info" card, new subsection "Languages":**
- `NativeLanguages`: already exists in Teaching Context card - MOVE it here
- `SpokenLanguages`: tag input (same pattern as Interests, free text). Label "Spoken Languages". Hint "Flat list, no proficiency level."

**Under "Basic Info" card, new subsection "Proficiency & Assessment":**
- `OfficialCefrLevel`: dropdown (A1-C2 + empty/clear option). Label "Official Level". Help text "Official exam result or external assessment."
- `CefrLevel` (existing): keep as-is. Label "Teacher's Assessment" (was "CEFR Level")

**New card "Skill Overrides" (after Teaching Context card):**
- Four nullable dropdowns: Reading, Writing, Speaking, Listening
- Each: CEFR level or "--" (null/inherit). Hint "Overrides the general level for AI generation."
- State: `skillLevelOverrides: Record<string, string | null>` initialized to `{}`
- Wire up in `useEffect` and `handleSubmit`

### Profile tab (`StudentProfileTab.tsx`)

**Left column additions (under existing sections):**

New section "Skill Assessment" (after existing content):
- Show all 4 skills that have an override set as a row: skill name + CefrBadge
- If no overrides set: `<EmptyState text="No skill overrides set" />`
- No trend labels (Vera review decision)
- `data-testid="profile-skill-assessment"`

**Right column "Language Ecosystem" section (replaces current "Languages" section):**

Rename/restructure:
- "Native" row: render as tags with language code badge (2-letter ISO code), e.g. "IT" badge next to "Italian". Use existing NativeLanguages data
- "Spoken Languages" row: flat list of names. Label "Spoken Languages" (not "Strong Points")
- "Learning": `${learningLanguage}` with CefrBadge for `cefrLevel`. Plus if `officialCefrLevel` is set, show a second row: "Teacher's Assessment: B1 / Official: A2"
- If both CEFR levels set, show them side by side with labels

Language code mapping: use a small `langToCode` map (English -> EN, Spanish -> ES, French -> FR, German -> DE, Italian -> IT, Portuguese -> PT, Mandarin -> ZH, Japanese -> JA, Arabic -> AR, Catalan -> CA). Falls back to first 2 chars uppercase.

### Overview tab (re-introduce `StudentProfileOverview.tsx` + new tab)

The Stitch design has an Overview tab with a "Pedagogical Profile" card showing skill bars and native language tags.

**`StudentProfileOverview.tsx`** - update with:
- Rename card title to "Pedagogical Profile"
- Add skill bars section: for each of Reading, Writing, Speaking, Listening that has an override in `skillLevelOverrides`, render a row with label + visual bar (width based on CEFR level: A1=1/6, A2=2/6, B1=3/6, B2=4/6, C1=5/6, C2=6/6) + CefrBadge. No trend labels.
- Add NativeLanguages as tags at bottom (before "Learning goals" or at bottom)
- Remove the old "Native language" FieldRow (now shown as tags elsewhere)

**`StudentDetail.tsx`** - add Overview tab:
- Add `{ key: 'overview', label: 'Overview' }` as first tab
- Render `<StudentProfileOverview student={student} />` when active
- Default tab changes from `'profile'` to `'overview'`

### Unit tests

- `StudentForm.test.tsx`: add cases for SpokenLanguages tag input, OfficialCefrLevel dropdown, SkillLevelOverrides dropdowns
- `StudentProfileTab.test.tsx`: add cases for Language Ecosystem section (NativeLanguages tags, spoken languages, dual CEFR), Skill Assessment section
- `StudentProfileOverview.test.tsx`: add cases for skill bars (only override keys shown), NativeLanguages tags

### E2e test (`students.spec.ts`)

Add happy-path test:
1. Navigate to student edit form
2. Set SpokenLanguages (add one tag), OfficialCefrLevel, SkillLevelOverrides (set Reading to B1)
3. Save
4. Navigate to student detail - Overview tab - verify skill bar visible
5. Switch to Profile tab - verify Language Ecosystem and Skill Assessment sections render

## Files to change

| File | Change |
|------|--------|
| `backend/LangTeach.Api/DTOs/StudentDto.cs` | Add SkillLevelOverrides |
| `backend/LangTeach.Api/DTOs/CreateStudentRequest.cs` | Add SkillLevelOverrides with validation |
| `backend/LangTeach.Api/DTOs/UpdateStudentRequest.cs` | Add SkillLevelOverrides with validation |
| `backend/LangTeach.Api/Helpers/JsonStorageHelper.cs` | Add DeserializeDictionary |
| `backend/LangTeach.Api/Services/StudentService.cs` | Serialize/deserialize SkillLevelOverrides |
| `backend/LangTeach.Api.Tests/Services/StudentServiceTests.cs` | Add SkillLevelOverrides test cases |
| `frontend/src/api/students.ts` | Add skillLevelOverrides to Student and StudentFormData |
| `frontend/src/pages/StudentForm.tsx` | Add 3 field groups |
| `frontend/src/pages/StudentForm.test.tsx` | Unit tests for new fields |
| `frontend/src/components/student/StudentProfileTab.tsx` | Language Ecosystem + Skill Assessment sections |
| `frontend/src/components/student/StudentProfileTab.test.tsx` | Unit tests for new sections |
| `frontend/src/components/student/StudentProfileOverview.tsx` | Pedagogical Profile card with skill bars |
| `frontend/src/components/student/StudentProfileOverview.test.tsx` | Unit tests for new content |
| `frontend/src/pages/StudentDetail.tsx` | Add Overview tab, update toggleDifficultyStatus payload |
| `frontend/src/pages/StudentDetail.test.tsx` | Update test for new tab |
| `e2e/tests/students.spec.ts` | Happy-path e2e test |

## Acceptance criteria mapping

| AC | Where implemented |
|----|-------------------|
| All 3 field groups editable in create and edit forms | StudentForm.tsx |
| Language Ecosystem on Profile tab shows SpokenLanguages, both CEFR levels, NativeLanguages | StudentProfileTab.tsx |
| NativeLanguages renders correctly in profile view when data exists (#667) | StudentProfileTab.tsx + StudentProfileOverview.tsx |
| Skill Assessment on Profile tab shows per-skill CEFR badges | StudentProfileTab.tsx |
| Overview tab Pedagogical Profile card shows skill bars with CEFR badges and NativeLanguages tags | StudentProfileOverview.tsx + new Overview tab in StudentDetail |
| No trend labels on skill bars | Both display components |
| SpokenLanguages labeled "Spoken Languages" | StudentProfileTab.tsx |
| CEFR labels use "Teacher's Assessment" and "Official" | StudentProfileTab.tsx + StudentDetail.tsx header |
| SpokenLanguages: flat list, no proficiency | StudentProfileTab.tsx |
| SkillLevelOverrides defaults to empty | Backend default `{}`, frontend state `{}` |
| Follows Stitch design | Profile tab layout, Overview tab card |
