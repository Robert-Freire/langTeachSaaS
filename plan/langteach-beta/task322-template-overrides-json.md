# Task 322 - Create template-overrides.json (7 PPP+ templates)

## Issue
#322 - Create template overrides JSON (7 templates: PPP+ section modifications)

## Context
Layer 4 of the pedagogical configuration architecture (Isaac's spec, Sophy's design). Hardcoded template logic currently lives in `PromptService.cs` (Reading & Comprehension, Exam Prep if/else blocks). This file moves template-specific behavior to JSON so `PedagogyConfigService` (#324) can load it and `PromptService` (#325) can consume it dynamically.

## What this task is
Data-only: create `data/pedagogy/template-overrides.json`. No backend code changes in this task.

## File structure
Each template has:
- `id` (slug), `name` (display name)
- `sections`: one entry per PPP+ section (warmUp, presentation, practice, production, wrapUp), each with:
  - `required`: whether this section is mandatory for this template
  - `overrideGuidance`: replaces the default section guidance (null = keep default)
  - `priorityExerciseTypes`: ordered list of exercise type IDs from exercise-types.json to prefer
  - `minExerciseVarietyOverride`: if set, overrides the default minimum variety count for practice
  - `notes`: informational string for the AI prompt or teacher
- `levelVariations`: level-specific adjustments (object keyed by CEFR level)
- `restrictions`: array of restriction objects `{type, value, reason}`

## The 7 templates

### 1. conversation
- Oral communication focus; PPP but presentation is optional (session may go straight to practice)
- Presentation required: false
- Priority: EO-01, EO-02, EO-08, PRAG-01, PRAG-05
- levelVariations: lower levels use closed role-play (EO-01), higher levels open discussion (EO-06, EO-07)

### 2. grammar-focus
- Explicit grammar teaching with controlled practice
- Practice minExerciseVarietyOverride: 3 (AC requirement)
- Priority: GR-01, GR-02, GR-03, GR-04, GR-08 (noticing at higher levels)

### 3. reading-comprehension
- Reading passage MUST appear in Presentation notes (AC requirement)
- Priority: CE-01, CE-02, CE-03, CE-06, CE-07, VOC-04
- Restrictions: LUD-* inappropriate in practice

### 4. writing-skills
- Written production is the central section; Production required: true, noted as central (AC requirement)
- Priority: EE-01..EE-09 (guided to free writing progression)
- Restrictions: EO-* inappropriate as main section activity (oral not the goal)

### 5. exam-prep
- Timed written tasks; Practice notes mention timer is mandatory (AC requirement)
- Restrictions: LUD-* inappropriate (AC requirement)
- Priority: CE-01..CE-03, GR-01, GR-02, EE-06, EE-07, EE-08

### 6. thematic-vocabulary
- Vocabulary building through semantic fields and context
- Priority: VOC-01..VOC-07, VOC-11, CE-06

### 7. culture-society (Isaac's proposed template)
- Cultural content + intercultural comparison; oral discussion + written reflection
- Priority: PRAG-03, PRAG-04, CE-01, CE-07, EO-06, EO-08

## Acceptance criteria checklist
- [x] File at `data/pedagogy/template-overrides.json`
- [x] 7 templates (conversation, grammar-focus, reading-comprehension, writing-skills, exam-prep, thematic-vocabulary, culture-society)
- [x] Each template has all required fields
- [x] Grammar Focus Practice: minExerciseVarietyOverride: 3
- [x] Exam Prep Practice notes: timer is mandatory
- [x] Exam Prep restrictions: LUD-* inappropriate
- [x] Reading & Comprehension Presentation notes: text MUST be in Presentation
- [x] Conversation Presentation: required: false
- [x] Writing Skills Production: required: true + central section note
- [x] All exercise IDs valid in exercise-types.json

## No tests needed
This is a static JSON data file. Validation logic (schema checks, ID cross-reference) belongs to PedagogyConfigService (#324).
