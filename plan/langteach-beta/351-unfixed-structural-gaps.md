# #351 Unfixed Structural Gaps

Teacher QA full run (2026-03-28) validated that the additive prompt model (#351) works at the infrastructure level but does not produce correct output for 4 specific cases. This doc describes the gaps and the structural root cause, for architectural discussion.

## What #351 changed

Replaced hardcoded per-section prose in `PromptService.cs` with a config-driven loop:

```
for each section:
    base     = sectionProfile[section][level].guidance
    duration = sectionProfile[section][level].duration
    override = templateOverride?.sections[section]?.overrideGuidance
    emit both, in order
```

Template overrides were rewritten by Isaac (pedagogy reviewer). Restrictions field is now enforced. Unit tests confirm composition works.

## The 4 unfixed gaps

### Gap 1: Carmen R&C has no reading passage

**Expected:** Presentation section contains a 300-500 word reading passage with comprehension questions.
**Actual:** Presentation generates a grammar block (indicativo/subjuntivo in political context). The grammar content is excellent but serves the wrong pedagogical purpose for a Reading & Comprehension lesson.

**Also:** Production section is missing entirely (4 sections instead of 5).

**Original fix:** #227 (PR #235, merged 2026-03-22). That fix added R&C-specific requirements to the prompt. #351 replaced that approach with the additive model, but the R&C template override guidance for Presentation doesn't force the content type to be `reading`.

### Gap 2: Ana Exam Production is oral, not written

**Expected:** Production contains written exam tasks (essay, formal letter, short report) with explicit time limits and word count targets.
**Actual:** Production generates 3 conversation scenarios (oral practice). No time limits or word count targets.

**Original fix:** #228 (PR #239, merged 2026-03-22). Same pattern as Gap 1: the original fix added Exam Prep-specific prose, #351 replaced it with template overrides, but the override guidance text alone doesn't constrain the content type.

### Gap 3: WarmUp overgeneration (Grammar Focus, Exam Prep)

**Expected (Grammar Focus):** "Open with a single question that reveals what the student already knows. One question, one student response, brief teacher reaction."
**Expected (Exam Prep):** "Orient the student to today's exam task type. State the task, the time limit, and the one scoring criterion."
**Actual:** Both generate 3 full conversation scenarios with 5-6 exchanges each. The conversation content type schema always produces multi-scenario output.

### Gap 4: WrapUp overgeneration (all 5 personas)

**Expected:** Brief reflection, self-assessment, or preview of next steps. No new practice material.
**Actual:** All 5 personas generate 3 full conversation scenarios in WrapUp. This is indistinguishable from Practice/Production content.

## Root cause

There are two layers in the generation pipeline:

1. **Section guidance** (text instructions to the AI): "what should this section do?"
2. **Content type** (JSON schema): "what shape should the output take?"

#351 fixed layer 1. The guidance strings are correct and specific. But layer 2 is unconstrained: the AI picks a content type (conversation, grammar, exercises, vocabulary, reading, freeText) and then fills the schema for that type. The conversation schema always produces 3 scenarios with 5+ exchanges. The grammar schema always produces a full explanation block.

The guidance says "single question, brief reaction" but the conversation schema has no "brief" mode. The guidance says "reading passage" but nothing forces the AI to pick the `reading` content type over `grammar`.

### Where the constraint is missing

```
Current flow:
  section guidance (text) ──> AI decides content type ──> fills schema

What's needed:
  section guidance (text) + content type constraint ──> AI fills schema
```

The section profiles already have `validContentTypes` and `forbiddenContentTypes` fields (#321), but these are used by the frontend dropdown only (#326). They are NOT enforced in the prompt. The AI receives guidance text but no instruction about which content type to generate.

## Options for discussion

### Option A: Add content type constraint to the prompt

Tell the AI which content type to use per section. Source from the section profile or template override.

```
WarmUp (2-5 min): [guidance text]
Content type: conversation (brief mode) OR freeText
```

Pro: Simple, no schema changes. Con: "brief mode" is a text instruction the AI may still ignore.

### Option B: Section-aware content type schemas

Add a `mode` parameter to the conversation schema: `full` (3 scenarios, 5+ exchanges) vs `brief` (1 scenario, 2-3 exchanges). WarmUp/WrapUp always use brief. Practice/Production always use full.

Pro: Structural enforcement. Con: Schema change, affects all content types, more complex.

### Option C: Force content type per section in template overrides

Extend `template-overrides.json` to specify the required content type per section:

```json
{
  "sections": {
    "warmUp": {
      "overrideGuidance": "...",
      "requiredContentType": "freeText"
    },
    "presentation": {
      "overrideGuidance": "...",
      "requiredContentType": "reading"  // R&C only
    }
  }
}
```

PromptService reads this and tells the AI: "Generate a [reading] block for this section."

Pro: Config-driven, per-template control. Con: Reduces AI flexibility (sometimes conversation IS right for WarmUp).

### Option D: Hybrid (C for type selection, B for length control)

Use template overrides to specify the content type when it matters (R&C Presentation = reading, Exam Prep Production = exercises). Use a section-level duration hint to control length (WarmUp = brief, Production = full). Let the AI choose the content type when the override doesn't specify one.

## What this means for the sprint close

These gaps don't block the Student-Aware Curriculum merge. The additive model is a real improvement: config-driven, testable, no more hardcoded prose. The gaps are about the next layer of enforcement, which belongs in the Pedagogical Quality sprint (#269-#276).
