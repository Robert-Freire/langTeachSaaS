# Task 683 — Fix DemoSeeder "Reading" competency

## Problem
`DemoSeeder.cs:305` seeded Clara Seed's difficulty record with `competency:"Reading"`, which is not in the difficulty taxonomy (`Grammar, Vocabulary, Pronunciation, Interaction, Discourse, Mediation`).

## Fix
Replaced `"competency":"Reading"` with `"competency":"Discourse"` (best fit for "Reading speed / Comprehension").

## Acceptance Criteria
- [x] `DemoSeeder.cs:305` no longer seeds a difficulty record with `competency: "Reading"`
- [x] The replacement competency is `Discourse`
- [ ] All existing e2e / visual specs that use Clara Seed data continue to pass
