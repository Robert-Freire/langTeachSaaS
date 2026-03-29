# Task #351: Fix lesson plan generation — additive section guidance model

## Problem

`LessonPlanUserPrompt` in `PromptService.cs` has two structural defects:

1. **Hardcoded prose** for `presentation` and `wrapUp` sections — ignores the section profile data.
2. **Monolithic template override block** appended far from section instructions — Claude treats it as advisory context, not binding rules, causing Carmen (R&C) and Ana Exam regressions.
3. **`restrictions` field** in `template-overrides.json` is loaded but never enforced.

## Solution: Additive inline model

Each section instruction is assembled from two data-driven sources, in order:

```
- {sectionName} ({min}-{max} min): {sectionProfile[section][level].guidance}
  Template focus: {templateOverride[section].overrideGuidance}   ← only if present
  NOTE: {templateOverride[section].notes}                        ← only if present
```

Level variation is appended after all sections. Restrictions are emitted as explicit "Do not use [X] exercises" constraints.

## Files to change

### 1. `ISectionProfileService.cs`

Add one method:
```csharp
DurationRange? GetDuration(string sectionType, string cefrLevel);
```

### 2. `SectionProfileService.cs`

Implement `GetDuration` using the existing `GetProfile` + level lookup pattern (same as `GetGuidance`). Returns `levelProfile.Duration` or null.

### 3. `PromptService.cs` — `LessonPlanUserPrompt` (lines 411-502)

**Current structure (problematic):**
- Gets warmUp/practice/production from profiles, but presentation/wrapUp are hardcoded prose.
- Appends template override as a monolithic block at the bottom (`BuildTemplateOverrideBlock`).
- Never emits restrictions.

**New structure:**

```csharp
// 1. Look up template entry upfront (inline — same 3 lines as current lines 464-470)
var templateName = Sanitize(ctx.TemplateName);
TemplateOverrideEntry? templateEntry = string.IsNullOrEmpty(templateName)
    ? null
    : _pedagogy.GetTemplateOverrideByName(templateName);

// 2. Build section guidelines loop (replaces the 5 hardcoded lines)
var sbSections = new StringBuilder();
foreach (var sectionName in SectionOrder)
{
    var baseGuidance = _profiles.GetGuidance(sectionName, cefrLevel);
    if (string.IsNullOrEmpty(baseGuidance))
        baseGuidance = GetFallbackGuidance(sectionName); // see fallbacks below

    var duration = _profiles.GetDuration(sectionName, cefrLevel);
    // duration is DurationRange? — omit parenthetical if null
    var durationStr = duration != null ? $" ({duration.Min}-{duration.Max} min)" : "";

    sbSections.AppendLine($"- {sectionName}{durationStr}: {baseGuidance}");

    if (templateEntry?.Sections.TryGetValue(sectionName, out var secOverride) == true
        && !string.IsNullOrWhiteSpace(secOverride.OverrideGuidance))
    {
        sbSections.AppendLine($"  Template focus: {secOverride.OverrideGuidance}");
        if (!string.IsNullOrWhiteSpace(secOverride.Notes))
            sbSections.AppendLine($"  NOTE: {secOverride.Notes}");
    }
}

// 3. Build base instruction
var baseInstruction = $"""
Generate a complete lesson plan for the lesson on "{topic}". Return JSON:
{schema}
...
Section guidelines:
{sbSections.ToString().TrimEnd()}

All five sections (warmUp, presentation, practice, production, wrapUp) are required in every lesson plan.
""";

// 4. Level variation — pass cefrLevel directly (JSON keys match e.g. "B1", "B2")
//    This mirrors the current BuildTemplateOverrideBlock line 128 behavior.
if (templateEntry is not null
    && templateEntry.LevelVariations.TryGetValue(cefrLevel, out var levelVariation))
    baseInstruction += $"\n\n{templateEntry.Name.ToUpperInvariant()} level note for {cefrLevel}: {levelVariation}";

// 5. Restrictions enforcement (NEW — currently loaded but never emitted)
if (templateEntry?.Restrictions is { Length: > 0 })
    foreach (var r in templateEntry.Restrictions)
        baseInstruction += $"\nDo not use [{r.Value}] exercises in this lesson.";

// 6-N. Grammar scope, vocab, L1, weaknesses, coherence rules, objectives — unchanged
```

`BuildSectionGuidelinesBlock` is inlined in the method (no new private helper needed).

Fallbacks for when profile returns empty string (safety net — profiles should always have data):
- `warmUp`: "A brief conversational warm-up activity to activate prior knowledge." (unchanged)
- `presentation`: "Introduce new language with examples in context. Explain meanings and usage."
- `practice`: "Use a variety of exercise formats appropriate to the stated CEFR level." (unchanged)
- `production`: "A communicative task where the student uses the new language independently." (unchanged)
- `wrapUp`: "Student reflects on what they learned. Brief preview of homework or next session."

Duration fallback: when `GetDuration` returns null, `durationStr` is `""` and the parenthetical is omitted. No hardcoded fallback duration needed.

**Remove:** the `BuildTemplateOverrideBlock` call (lines 464-470) and the method itself (lines 113-131).

### 4. `data/pedagogy/template-overrides.json`

Apply these 7 corrections (all approved by Isaac):

| Template | Section | Field | Change |
|---|---|---|---|
| Grammar Focus | warmUp | `overrideGuidance` | Replace with: `"Open with a single question that reveals what the student already knows or assumes about today's grammar point. One question, one student response, brief teacher reaction. This is activation, not practice or discovery."` |
| Grammar Focus | warmUp | `priorityExerciseTypes` | `["GR-08","GR-01"]` → `["EO-08","PRAG-01"]` (GR-* is forbidden in warmUp profile) |
| Writing Skills | warmUp | `overrideGuidance` | Replace with: `"Activate the student's awareness of the target text type. Ask one question about when and why people write this type of text. This is activation, not model analysis."` |
| Exam Prep | warmUp | `overrideGuidance` | Replace with: `"Orient the student to today's exam task type. State the task, the time limit, and the one scoring criterion the student should prioritise. No conversational icebreaker. This is briefing, not teaching."` |
| Writing Skills | wrapUp | `overrideGuidance` | Replace with: `"Self-assessment against the lesson's success criteria. Student identifies one strength and one area to improve in their written text."` |
| R&C | warmUp | `overrideGuidance` | Remove "No grammar drills." suffix (redundant — already forbidden by profile). Keep: `"Pre-reading activation only. Activate background knowledge, predict content from the title, or brainstorm vocabulary around the topic."` |
| Thematic Vocabulary | wrapUp | `overrideGuidance` | Replace with: `"Student recalls new words from memory (e.g., reconstruct the mind map without notes). Note items the student could not recall for spaced review."` |

### 5. `data/section-profiles/presentation.json`

Update B1 and B2 guidance with conditional grammar-discovery framing:

**B1:** `"Introduce new language through authentic-style excerpts (100-150 words). When the lesson includes a grammar point, use guided discovery: present data, ask the student to formulate the rule. Include typical L1 interference notes. When no grammar point is targeted, let the text or content carry the input."`

**B2:** `"Register-appropriate authentic texts as the primary input vehicle. When the lesson targets grammar, focus on nuance: indicative vs subjunctive, aspect, discourse markers. Student formulates rules from data. When grammar is not the focus, the text serves vocabulary expansion and comprehension."`

### 6. `PromptServiceTests.cs`

**Tests to update** (break because `"READING & COMPREHENSION TEMPLATE"` and `"EXAM PREP TEMPLATE"` headers are no longer emitted):
- `LessonPlanPrompt_IncludesReadingPassageRequirements_WhenReadingComprehensionTemplate` — remove the `.Contain("READING & COMPREHENSION TEMPLATE")` assertion; the substance checks (reading passage, inferential, etc.) remain valid since they are in the overrideGuidance text
- `LessonPlanPrompt_IncludesWrittenProductionRequirement_WhenExamPrepTemplate` — remove `.Contain("EXAM PREP TEMPLATE")`; substance checks remain valid

**New tests to add** (in a new `// --- Additive section guidance model ---` block):

1. `LessonPlanPrompt_IncludesTemplateFocusInlineWithSectionGuidance` — asserts that when R&C template is used, the prompt contains "Template focus:" before the next section header, not at the bottom
2. `LessonPlanPrompt_EnforcesRestrictions_WhenTemplateHasRestrictions` — R&C template: asserts prompt contains `"Do not use [LUD] exercises in this lesson."` (exact format matches emission: `$"\nDo not use [{r.Value}] exercises in this lesson."`)
3. `LessonPlanPrompt_PresentationUsesProfileGuidance_WhenNoTemplate` — asserts presentation section contains profile guidance text (not hardcoded "Introduce the new language")
4. `LessonPlanPrompt_WrapUpUsesProfileGuidance_WhenNoTemplate` — asserts wrapUp section contains profile guidance text (not hardcoded "Reflection and self-assessment only")
5. `SectionProfileService_GetDuration_ReturnsCorrectRange` — in `SectionProfileServiceTests.cs`, asserts warmup A1 returns min=2, max=3

## Test mapping to acceptance criteria

| AC | Test |
|---|---|
| PromptService builds from sectionProfile.guidance + templateOverride inline | `LessonPlanPrompt_IncludesTemplateFocusInlineWithSectionGuidance` |
| No hardcoded prose for 5 core sections | `LessonPlanPrompt_PresentationUsesProfileGuidance_WhenNoTemplate`, `LessonPlanPrompt_WrapUpUsesProfileGuidance_WhenNoTemplate` |
| restrictions field enforced | `LessonPlanPrompt_EnforcesRestrictions_WhenTemplateHasRestrictions` |
| Config fixes applied | Updated tests (no more header checks; substance still asserted) |
| Existing 22+ PromptService tests pass | No deletions — only updates to 2 header assertions |

## Out of scope

- WarmUp/WrapUp duration override mechanism
- Issue D (grammar model language validation)
- Teacher QA full 5-persona run (done as post-PR verification step by user)
