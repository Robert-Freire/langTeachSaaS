# Task 845 — Refactor StudentDto into nested records

## Goal

Break the 28-field positional `StudentDto` record into nested records grouped by concern, so reordering parameters is no longer a silent breaking change. Purely structural — no behavior changes.

## Nested structure (≤10 root fields)

### C# backend (`StudentDto.cs`)

```
StudentDto (10 root fields):
  Id, Name, LearningLanguage,
  Level: StudentLevelDto, Languages: StudentLanguagesDto,
  Identity: StudentIdentityDto, Profile: StudentProfileDto,
  Commercial: StudentCommercialDto,
  CreatedAt, UpdatedAt

StudentLevelDto: CefrLevel, OfficialCefrLevel, SkillLevelOverrides
StudentLanguagesDto: NativeLanguages, SpokenLanguages
StudentIdentityDto: BirthYear, Age, Profession, CountryOfOrigin, CityOfOrigin, CountryOfResidence, CityOfResidence, ReasonForStudying
StudentProfileDto: Interests, PersonalNotes, TeachingNotes, LearningGoals, Weaknesses, Difficulties, ShortTermObjectives, TeachingTodos
StudentCommercialDto: IsActive, IsCorporate, Rate
```

### TypeScript frontend (`api/students.ts`)

Matching sub-interfaces: `StudentLevel`, `StudentLanguages`, `StudentIdentity`, `StudentProfile`, `StudentCommercial`.

## Files to change

### Backend
1. `DTOs/StudentDto.cs` — define 5 nested records + restructured StudentDto
2. `Services/StudentService.cs` — MapToDto builds the nested structure
3. `Controllers/GenerateController.cs` — update field access (student.NativeLanguages → student.Languages.NativeLanguages, etc.)
4. `LangTeach.Api.Tests/Controllers/StudentsControllerTests.cs` — update deserialized field assertions

### Frontend source (11 files)
Field access mappings to apply:
- `student.cefrLevel` → `student.level.cefrLevel`
- `student.officialCefrLevel` → `student.level.officialCefrLevel`
- `student.skillLevelOverrides` → `student.level.skillLevelOverrides`
- `student.nativeLanguages` → `student.languages.nativeLanguages`
- `student.spokenLanguages` → `student.languages.spokenLanguages`
- `student.birthYear` → `student.identity.birthYear`
- `student.age` → `student.identity.age`
- `student.profession` → `student.identity.profession`
- `student.countryOfOrigin` → `student.identity.countryOfOrigin`
- `student.cityOfOrigin` → `student.identity.cityOfOrigin`
- `student.countryOfResidence` → `student.identity.countryOfResidence`
- `student.cityOfResidence` → `student.identity.cityOfResidence`
- `student.reasonForStudying` → `student.identity.reasonForStudying`
- `student.interests` → `student.profile.interests`
- `student.personalNotes` → `student.profile.personalNotes`
- `student.teachingNotes` → `student.profile.teachingNotes`
- `student.learningGoals` → `student.profile.learningGoals`
- `student.weaknesses` → `student.profile.weaknesses`
- `student.difficulties` → `student.profile.difficulties`
- `student.shortTermObjectives` → `student.profile.shortTermObjectives`
- `student.teachingTodos` → `student.profile.teachingTodos`
- `student.isActive` → `student.commercial.isActive`
- `student.isCorporate` → `student.commercial.isCorporate`
- `student.rate` → `student.commercial.rate`

Affected source files: StudentRoster.tsx, ProgressDashboard.tsx, StudentOverviewTab.tsx, StudentProfileOverview.tsx, StudentProfileTab.tsx, StudentProfileSummary.tsx, LessonNew.tsx, LogSession.tsx, OnboardingStep3.tsx, StudentDetail.tsx, Students.tsx

### Frontend tests (12 files with makeStudent/SAMPLE_STUDENT)
Each `makeStudent` function changes from `Partial<Student>` to a flat overrides bag that builds the nested object internally. This preserves call sites like `makeStudent({ cefrLevel: 'B2' })` unchanged.

Files: Students.test.tsx, LogSession.test.tsx, StudentProfileTab.test.tsx, StudentOverviewTab.test.tsx, StudentProfileOverview.test.tsx, TeachingTodosCard.test.tsx, ProgressDashboard.test.tsx, StudentProfileSummary.test.tsx, OnboardingStep3.test.tsx, Onboarding.test.tsx, StudentRoster.test.tsx, StudentDetail.test.tsx

## Implementation order
1. StudentDto.cs
2. StudentService.cs MapToDto
3. GenerateController.cs field accesses
4. Run dotnet build → fix remaining backend errors
5. api/students.ts types
6. Run npm run build (tsc) → fix frontend errors file by file
7. Update test makeStudent functions (call sites unchanged)
8. Run npm test to verify

## E2E impact
None — the e2e tests do not directly assert on JSON field paths. The API shape changes but the existing test scenarios exercise valid behaviour.
