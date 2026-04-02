# Pedagogy Config Authoring Guide

**Audience:** Isaac (pedagogy domain expert)
**Purpose:** How to write and maintain the two JSON config layers that drive lesson plan generation.

---

## The Model

Two layers compose to form the instruction Claude receives for each section of a lesson plan:

1. **Section profiles** (`data/section-profiles/<section>.json`) — define what every lesson section IS: its purpose, duration, interaction pattern, valid and forbidden exercise types. These apply to every lesson regardless of template.

2. **Template overrides** (`data/pedagogy/template-overrides.json`) — define how a specific lesson template (Grammar Focus, Reading & Comprehension, Exam Prep, etc.) approaches each section differently from the default.

Claude sees both, in this order: section profile first, template override second. Think of the section profile as the grammar of a section — what it fundamentally is and cannot violate. The template override is the specific pedagogical instruction for this template's approach to that section.

Neither layer overrides the other. They add up.

---

## What Each Layer Owns

### Section profile owns:
- Duration (minimum and maximum minutes)
- Interaction pattern (teacher-led, student-led, etc.)
- Valid and forbidden exercise types, with reasons
- The general purpose of the section — what it is for and what it is not for

### Template override owns:
- The pedagogical angle or activity focus specific to this template
- Any content requirement unique to this template (e.g., a reading passage must appear in Presentation for Reading & Comprehension)
- Priority exercise types (reorders valid types; never adds types not already permitted by the profile)

---

## Rules for Writing Override Strings

### 1. Write focus, not format

The section profile already defines duration, interaction pattern, and what's forbidden. You only need to specify the pedagogical angle for this template. Do not re-state constraints the profile already enforces — they become redundant noise in the prompt and can create contradictions.

**Good:**
> "Direct the warm-up toward surfacing what the student already knows about today's grammar point — one open question, student response, teacher reaction."

**Redundant (profile already says this):**
> "Brief grammar activation (3 minutes maximum). Use a noticing task. No role-plays or multiple exchanges. Keep to 2-3 turns."

### 2. Only write an override when the template genuinely does something different

If every lesson type would approach a section the same way, the override adds nothing. Leave it `null`. The section profile handles it.

`null` is correct and valid. It is not a placeholder. It means: the section profile guidance is sufficient for this section in this template.

### 3. Be specific enough to exclude wrong interpretations

Vague focus strings invite Claude to fill the gap with whatever seems pedagogically plausible — which is often too much. If you write "activate prior knowledge," Claude will generate a full practice activity. If you write "one diagnostic question that surfaces prior knowledge," it won't.

You don't need to specify duration (the profile does that). But you do need to be specific enough about form that there is only one reasonable interpretation.

### 4. Use second-person imperative, present tense

Consistent with the section profile guidance style.

- Yes: *"Open with a brief question that surfaces what the student already knows."*
- No: *"The teacher should open with a brief question..."*
- No: *"A brief question is used to surface..."*

### 5. One to three sentences maximum

If you feel you need more, something structural is happening — see the Exception Path section below.

---

## Worked Example: What Good and Bad Look Like

**Section:** WarmUp, Grammar Focus template, B1 level

**Section profile (B1) says:**
> "Opinion prompts with light justification. Que opinas de...? Por que? Tied to the lesson topic. 2-3 follow-up questions. No scaffolding phrases needed."
> Duration: 3-5 min. Forbidden: all GR-* (grammar drills).

**Current override (problematic):**
> "Activate prior knowledge of the target grammar structure. Use an inductive noticing task or a quick diagnostic exercise."

**Problem:** "inductive noticing task" and "diagnostic exercise" are open-ended. Claude interprets them as license for a full multi-scenario practice activity — 3 scenarios, 7-9 exchanges each. The section profile's duration and interaction constraints are there, but the override language drowns them out.

**Better:**
> "Open with a single question that reveals what the student already knows or believes about today's grammar point. One question, one student response, brief teacher reaction. This is activation, not practice."

The revision is still only focus — what to activate, how to frame it. But "a single question" and "not practice" are specific enough to prevent overgeneration.

---

## Another Example: Structural Override (R&C Presentation)

Sometimes a template requires something genuinely structural — content that goes beyond adjusting focus. Reading & Comprehension requires an actual reading passage in Presentation. That is not just a focus; it is a content requirement.

This is a legitimate use of a longer override:

> "Embed a complete reading passage with CEFR-appropriate length in this section (A1: 100-150 words, A2: 150-250 words, B1+: 300-500 words). First read for gist, second read for detail. Pre-teach blocking vocabulary before reading. NOTE: The reading passage TEXT MUST appear in this section. Do not move the passage to practice or production."

This composes with the section profile (which permits `reading` as a content type in Presentation). It is specific because it has to be — the structural requirement only works if Claude knows to put the text here and not somewhere else.

The test: could the section profile alone produce the right result for this template? If no, a structural override is warranted.

---

## The Exception Path

The rules above handle the common case. If you hit a situation where following them feels pedagogically wrong — where the section profile constraints or the additive model genuinely prevent you from specifying what the template needs — do not work around it silently.

You are the domain expert. The architecture serves the pedagogy, not the other way around.

**When the rules feel constraining:**

1. Write what you actually need, even if it re-states format or adds constraints that seem outside your lane.
2. Add a comment in the adjacent `notes` field explaining why: *"The standard WarmUp duration is insufficient for this template's activation approach at C1 — needs 5-7 min."*
3. Flag it explicitly when you submit the change.

That triggers a review. If your pedagogical reason is sound, the section profile gets updated, or a new compositing rule is added, or the architecture learns something it was missing. The important thing is that the reason is visible — not that the rules are never questioned.

The rules exist to make the common case clean. They are not a cage.

---

## Quick Reference

| You want to... | Where it goes |
|----------------|---------------|
| Set section duration | Section profile `duration` field |
| Forbid an exercise type | Section profile `forbiddenExerciseTypes` |
| Set the pedagogical focus for a template | Template override `overrideGuidance` |
| Prioritise specific exercise types for a template | Template override `priorityExerciseTypes` |
| Add a structural content requirement unique to a template | Template override `overrideGuidance` (with `notes` explaining why) |
| Make a section optional for a template | Template override `required: false` |
| Leave a section unchanged for a template | Template override `overrideGuidance: null` |
| Prevent new content at section close | Section profile `closingConstraint` field |
| Change section behaviour permanently across all templates | Section profile (discuss first) |
