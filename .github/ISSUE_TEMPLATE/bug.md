---
name: Bug
about: Something is broken or producing wrong output
labels: 'type:bug'
assignees: ''
---

## What happens

<!-- Describe the broken behaviour. Include Teacher QA persona and finding ID if applicable. -->

## What should happen

## Config boundary

<!-- REQUIRED if the fix adds or changes a rule that varies by language, level, template, or L1. -->

**Does the fix add or change a rule that varies by language, CEFR level, lesson template, or student L1?**

- [ ] No — skip this section
- [ ] Yes — answer below before implementation starts

**If yes: where does the rule live in `data/`?**

> Example: "The subjunctive temporal correlation rule goes in `data/pedagogy/grammar-validation-rules.json`, not in PromptService."
> If your answer is "patch it in PromptService" or "add a conditional in the service" — stop and consult Sophy first.

## Acceptance criteria

- [ ] ...
- [ ] No hardcoded level/language/template conditions in C# (if config boundary applies)

## Prior findings traceability

<!-- If this is a recurring Teacher QA finding, add a row here. -->

| Finding ID | First detected | Sprint | Status |
|------------|---------------|--------|--------|
| | | | |
