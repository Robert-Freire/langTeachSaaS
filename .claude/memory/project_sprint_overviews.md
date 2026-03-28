---
name: Sprint overview files
description: PM-only reference for sprint sequence, story files, and milestone map. Not for task agents.
type: reference
---

## Purpose

Sprint story files define what we're building from the teacher's perspective. They are loaded by the PM skill, not by task agents. Each active sprint should have a story file at `plan/sprints/<slug>.md`.

**When the sprint changes**, update the PM skill (`SKILL.md`) to point to the new story file.

## Sprint sequence

| Order | Milestone | Status | Story file | Issues |
|-------|-----------|--------|------------|--------|
| 1 | Curriculum & Personalization | CLOSED (2026-03-24, 35/35) | `plan/sprints/curriculum-personalization-test-script.md` | 35 issues, all closed |
| 2 | Student-Aware Curriculum | ACTIVE | `plan/sprints/student-aware-curriculum.md` | #206, #255, #256, #257, #258, #259, #260, #261, #262, #253, #254, #152, #151, #167, #166 |
| 3 | Pedagogical Quality | NEXT | none yet | #269-#276 (exercise types, scaffolding, L1 contrastive notes) + #334-#337 (tech debt from drift report) + #315-#318 (enforcement, QA personas) |
| 4 | Listening Comprehension | PLANNED | `plan/pedagogy-specification/listening-sprint-plan.md` | CO-01 to CO-07 exercise types, audio upload, AudioPlayer component. Draft plan ready. |
| 5 | Solo Whiteboard | Future | none yet | 6 issues from #174 |
| 6 | Adaptive Replanning | Future | none yet | audio input, post-class reflections, auto-difficulty, course replanning, progress dashboard |
| 6 | Group Classes | Future | none yet | #146, #147 |
| 7 | Phase 2B: Production | Future | none yet | caching, usage limits, CI pipeline |
| 8 | Phase 3: Growth | Future | none yet | student portal, evaluation, content library, payments |
