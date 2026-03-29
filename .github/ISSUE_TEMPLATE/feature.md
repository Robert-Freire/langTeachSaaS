---
name: Feature / Enhancement
about: New functionality or improvement
labels: ''
assignees: ''
---

## Problem

<!-- What is broken or missing from the teacher's workflow? -->

## What to build

<!-- Describe the solution. Be specific about what changes. -->

## Config boundary

<!-- REQUIRED if this adds a rule that varies by language, level, template, or L1. -->

**Does this issue add any rule that varies by language, CEFR level, lesson template, or student L1?**

- [ ] No — skip this section
- [ ] Yes — answer below before implementation starts

**If yes: where does the rule live in `data/`?**

> Example: "Word count ranges per level go in `data/pedagogy/cefr-levels/*.json` under a `guidedWriting` key."
> If your answer is "in PromptService" or "hardcoded in the service" — stop and consult Sophy before writing the issue.

## Acceptance criteria

- [ ] ...
- [ ] No hardcoded level/language/template conditions in C# (if config boundary applies)

## Out of scope

<!--  What are we explicitly NOT building here? -->
