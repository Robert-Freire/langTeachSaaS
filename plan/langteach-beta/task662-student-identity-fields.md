# Task 662: Student Identity Fields in Edit Form and Profile View

## Goal
Surface the 6 identity fields (birthYear, profession, countryOfOrigin, cityOfOrigin, countryOfResidence, cityOfResidence) that already exist in the backend but have no UI.

## Current state
- `Student` type and `StudentFormData` in `api/students.ts` already include all 6 fields.
- `StudentProfileTab.tsx` already renders an "About" section showing origin, location, birthYear (raw), profession, and reasonForStudying.
- `StudentForm.tsx` has NO inputs for these fields.
- `StudentDetail.tsx` header does NOT show profession or origin/residence.

## Changes

### 1. `StudentProfileTab.tsx` - fix birthYear display
Change `<FieldValue label="Birth year" value={student.birthYear} />` to render "YYYY (age years)" using `new Date().getFullYear() - birthYear`.

### 2. `StudentDetail.tsx` - add header fields
Below the `<h1>` name heading:
- Profession line (if set): small muted text below name
- In metadata row: compact "CityOfOrigin / CityOfResidence" if either is set

### 3. `StudentForm.tsx` - add "Personal Background" card
New card between "Basic Info" and "Interests" with:
- BirthYear: number input (data-testid="student-birth-year")
- Profession: text input max 128 (data-testid="student-profession")
- CountryOfOrigin: text input max 64 (data-testid="student-country-origin")
- CityOfOrigin: text input max 64 (data-testid="student-city-origin")
- CountryOfResidence: text input max 64 (data-testid="student-country-residence")
- CityOfResidence: text input max 64 (data-testid="student-city-residence")

Also: add state, sync in useEffect, include in mutate call.

### 4. Unit tests
- `StudentProfileTab.test.tsx`: update birthYear assertion from `'1998'` to `/1998 \(\d+ years\)/`
- `StudentForm.test.tsx`: add test for Personal Background section rendered
- `StudentDetail.test.tsx` (if present): add header fields test

### 5. E2E test
- `students.spec.ts`: round-trip test - create student with identity fields, verify they appear in profile

## Acceptance criteria (from issue)
- [ ] All 6 fields editable in student create and edit forms (Personal Background section)
- [ ] Identity Details card on Profile tab renders all fields when populated
- [ ] Student header shows Profession below name and Origin/Residence in compact format
- [ ] BirthYear displayed as "YYYY (age years)" not raw number
- [ ] Empty fields do not render (no "N/A" clutter)
- [ ] Round-trip works: save in form, see in profile view, re-edit preserves values
- [ ] Follows Stitch design system

## Notes
- No backend changes needed (all fields exist in Student.cs, StudentDto, etc.)
- Screenshots referenced in issue are not in the worktree; following explicit AC requirements
