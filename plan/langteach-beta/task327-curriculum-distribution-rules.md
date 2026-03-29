# Task 327: Wire course distribution rules into curriculum generation prompts

## Goal
Modify `BuildCurriculumPrompt` (`CurriculumUserPrompt`) to inject structured rules from `course-rules.json` via `PedagogyConfigService`: variety rules, skill distribution targets, spiral grammar recycling guidance, and style substitution guidance from teacher notes keywords.

## Acceptance Criteria
- [ ] Variety rules injected (no repeat practice combos in 3 sessions, alternate written/oral production, competency coverage in every 5 sessions)
- [ ] Skill distribution targets injected based on course type (general vs conversational proportions)
- [ ] Spiral grammar recycling guidance injected with valid/lazy examples
- [ ] Style substitution guidance injected as a prompt block when teacher notes contain relevant keywords (label names from style-substitutions.json)
- [ ] Unit tests for curriculum prompt composition

## Files to change

### `backend/LangTeach.Api/AI/PedagogyConfig.cs`
- Extend `GrammarProgression` record to include `string[]? ValidRecyclingExamples` and `string[]? LazyRecyclingExamples` (currently not deserialized from JSON).

### `backend/LangTeach.Api/AI/IPromptService.cs`
- Add optional `CourseType = "general"` parameter to `CurriculumContext` record.

### `backend/LangTeach.Api/AI/PromptService.cs`
- Add `IPedagogyConfigService` constructor dependency.
- Modify `CurriculumUserPrompt`: when `ctx.Mode != "exam-prep"`, append a `COURSE DISTRIBUTION RULES` section with:
  1. Variety rules block (from `CourseRulesFile.VarietyRules`)
  2. Skill distribution targets block (select "general" or "conversational" from `SkillDistribution` using `ctx.CourseType`)
  3. Grammar recycling guidance (all recycling rules + valid/lazy examples from `GrammarProgression`)
- Append `ACTIVITY SUBSTITUTION GUIDANCE` block when `ctx.TeacherNotes` contains any style substitution label (case-insensitive). Uses `IPedagogyConfigService.GetStyleSubstitutions` by matching all possible labels from `CourseRulesFile` isn't right -- need to call `GetStyleSubstitutions` with all labels from substitutions. Actually: call `GetCourseRules()` won't help -- instead read all substitutions from `GetStyleSubstitutions(allKnownRejectTypes)`. Better approach: directly check if TeacherNotes contain the label for each substitution. For simplicity, implement keyword-label matching in a private helper.

### `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs`
- Add `PedagogyConfigService` to test setup.
- Update `PromptService` instantiation to include `PedagogyConfigService`.
- Add ~6 tests:
  1. Variety rules are present in general curriculum prompt
  2. General skill distribution injected when CourseType = "general"
  3. Conversational skill distribution injected when CourseType = "conversational"
  4. Spiral recycling guidance injected in general curriculum prompt
  5. Style substitution guidance injected when teacher notes contain a matching keyword
  6. Style substitution guidance absent when teacher notes contain no keywords

## Design decisions

### Style substitution keyword matching
The `style-substitutions.json` labels are: "role-play", "long writing", "mechanical grammar", "listening".
Match: check if `TeacherNotes` (case-insensitive) contains any label string. When matched, inject the rule text and substitute codes for that label.

### Exam-prep mode
Skip the entire course distribution rules block for exam-prep mode -- it has its own pacing/session-type constraints that are already injected. Variety rules and skill distribution are only meaningful for general courses.

### CourseType
Add as optional parameter (`CourseType = "general"`). Controller does not need to change -- "general" is the only mode in the frontend today. "conversational" is ready for when a future issue adds that option.

### No controller changes needed
`BuildCurriculumContext` in `CoursesController` already defaults to passing no `CourseType`, which will use "general".

## Prompt section format (general mode only, appended to existing user prompt)

```
COURSE DISTRIBUTION RULES (mandatory):

Variety:
- Practice exercises: do not repeat the same combination in <N> consecutive sessions.
- Production: alternate between written and oral in consecutive lessons.
- Macro-skills: in every <W> consecutive lessons, all 4 macro-skills (CE=reading, CO=listening, EE=writing, EO=speaking) must appear as primary focus at least once.

Skill distribution (<courseType> course):
- Reading (CE): <min>-<max>% of sessions
- Listening (CO): <min>-<max>% of sessions
- Writing (EE): <min>-<max>% of sessions
- Speaking (EO): <min>-<max>% of sessions

Grammar — spiral recycling model:
<one bullet per recycling rule trigger/action>

Valid recycling examples:
<list>

Avoid lazy recycling:
<list>
```
