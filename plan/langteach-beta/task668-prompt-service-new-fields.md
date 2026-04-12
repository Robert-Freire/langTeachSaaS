# Task 668: Wire new student profile fields into PromptService GenerationContext

## Context

The `Student` model already has all the new fields (`ReasonForStudying`, `SpokenLanguages`, `Profession`, `BirthYear`, `CountryOfOrigin`, `CountryOfResidence`, `OfficialCefrLevel`) from previous tasks. They are stored in the DB but NOT passed to AI generation. This task wires them through.

## Files to change

| File | Change |
|------|--------|
| `backend/LangTeach.Api/AI/IPromptService.cs` | Add 7 new optional fields to `GenerationContext` |
| `backend/LangTeach.Api/AI/PromptService.cs` | Include new fields in `BuildSystemPrompt` student profile block |
| `backend/LangTeach.Api/Controllers/GenerateController.cs` | Populate new fields in both `GenerationContext` constructors (lines ~179 and ~339) |
| `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` | Tests verifying new fields appear in generated prompts |

## Step-by-step

### 1. Extend `GenerationContext` (IPromptService.cs:102)

Add 7 optional parameters at the end of the record (all nullable, default `null` so they're backward-compatible):

```csharp
string? StudentReasonForStudying = null,
string[]? StudentSpokenLanguages = null,
string? StudentProfession = null,
int? StudentBirthYear = null,
string? StudentCountryOfOrigin = null,
string? StudentCountryOfResidence = null,
string? StudentOfficialCefrLevel = null
```

### 2. Update `BuildSystemPrompt` (PromptService.cs:~411)

Inside the `if (ctx.StudentName is not null)` block, after the existing student profile lines, add:

```
- Reason for studying: {ReasonForStudying}          (if set)
- Profession: {Profession}                           (if set)
- Age: {computed from BirthYear}                    (if set)
- Country of origin: {CountryOfOrigin}              (if set)
- Country of residence: {CountryOfResidence}        (if set)
- Official CEFR level: {OfficialCefrLevel}          (if set, format: "X1 (official) / {CefrLevel} (teacher assessment)")
- Also speaks: {SpokenLanguages joined by ", "}     (if non-empty)
```

Personalization instructions to add after the profile block:
- If `ReasonForStudying` is set: "The student's reason for studying {language} is: {reason}. Anchor vocabulary, topics, and examples to this motivation."
- If `SpokenLanguages` is non-empty: "The student also speaks {langs}. Where relevant, leverage cross-language awareness and cognates."
- If `Profession` is set: "The student's profession is {profession}. Use domain-specific vocabulary and scenarios from this field where appropriate."
- If `OfficialCefrLevel` is set and differs from `CefrLevel`: note the gap in the prompt.

### 3. Populate in GenerateController (two sites: ~line 179 and ~line 339)

`student` is `StudentDto?` in `GenerateController`. `StudentDto.SpokenLanguages` is already `List<string>` (pre-deserialized by the mapper). Both `GenerationContext` constructor calls are identical in structure; apply the same mapping to both.

```csharp
StudentReasonForStudying: student?.ReasonForStudying,
StudentSpokenLanguages: student?.SpokenLanguages.ToArray(),
StudentProfession: student?.Profession,
StudentBirthYear: student?.BirthYear,
StudentCountryOfOrigin: student?.CountryOfOrigin,
StudentCountryOfResidence: student?.CountryOfResidence,
StudentOfficialCefrLevel: student?.OfficialCefrLevel,
```

### 4. Tests (PromptServiceTests.cs)

Add a test class `StudentProfileNewFieldsTests` (or add to existing) with:

- `ReasonForStudying_IncludedInSystemPrompt`: set `StudentReasonForStudying`, assert system prompt contains the value and the motivation instruction
- `Profession_IncludedInSystemPrompt`: set `StudentProfession`, assert prompt contains the profession
- `SpokenLanguages_IncludedInSystemPrompt`: set `StudentSpokenLanguages = ["French", "Portuguese"]`, assert prompt contains cross-language instruction
- `OfficialCefrLevel_IncludedWhenDiffersFromTeacherLevel`: set `StudentOfficialCefrLevel = "A2"` with `CefrLevel = "B1"`, assert both appear in prompt
- `NewFields_NotIncluded_WhenNull`: verify no extra lines appear when all new fields are null (regression guard)
- `Age_ComputedFromBirthYear`: set `StudentBirthYear = 1990`, assert prompt contains the string for `(DateTime.UtcNow.Year - 1990)` so the test stays valid year over year
- `CountryOfOrigin_AndResidence_IncludedInSystemPrompt`: set both, assert both appear

Use `BuildLessonPlanPrompt` (simplest entry point) for all tests. Pattern follows existing tests in the file.

## Acceptance criteria

- [x] `GenerationContext` has all 7 new fields
- [x] `BuildSystemPrompt` includes them in the student profile block (when non-null/non-empty)
- [x] Both `GenerationContext` constructors in `GenerateController` populate the new fields from `student`
- [x] `SpokenLanguages` is deserialized from JSON before being passed to `GenerationContext`
- [x] Tests cover each new field appearing in the prompt output
- [x] Existing tests still pass (no regressions)
- [x] No frontend changes needed (pure backend)

## Out of scope

- `SkillLevelOverrides` wiring (already handled in `SessionHistoryContext`)
- `ShortTermObjectives` or `TeachingTodos` in prompts (separate concerns)
- Any frontend changes
