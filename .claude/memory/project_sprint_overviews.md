---
name: Sprint overview files
description: PM-only reference for sprint sequence, story files, and milestone map. Not for task agents.
type: reference
---

## Purpose

Sprint story files define what we're building from the teacher's perspective. They are loaded by the PM skill, not by task agents. Each active sprint should have a story file at `plan/sprints/<slug>.md`.

**When the sprint changes**, update the PM skill (`SKILL.md`) to point to the new story file.

## Sprint sequence

| Order | Milestone | Status | Description | Story file | Key issues |
|-------|-----------|--------|-------------|------------|------------|
| 1 | Curriculum & Personalization | CLOSED (2026-03-24) | Course creation flow, session-to-lesson navigation, exam prep mode, CEFR exercise selection, pedagogy config architecture (6 JSON layers), PromptService data-driven. | `plan/sprints/curriculum-personalization-test-script.md` | 35 closed |
| 2 | Student-Aware Curriculum | CLOSED (2026-03-29) | Template-seeded curriculum backbone, student profile in course creation, CEFR mismatch warnings, grammar constraints, additive section guidance model, content type constraints, exercise availability flags. | `plan/sprints/student-aware-curriculum.md` | 21 closed |
| 3 | Pedagogical Quality | ACTIVE (sprint/pedagogical-quality) | New exercise formats (sentence ordering, error correction, true/false, transformation). New content types (guided writing, noticing task). Practice scaffolding with stage field. L1 contrastive notes in grammar blocks. JSON schema enforcement. 9-persona Teacher QA suite. | none | #269–#276 open; #378, #358, #348, #343, #317 done; #379 open |
| 4 | Post-Class Tracking | NEXT | Replace Jordi's Excel. Teacher logs each session: what was planned, what was done, homework sent, observations. Student history view before generating next lesson. Import existing Excel on first login (35 students' worth of history). Profile auto-updated from session notes. Text input only — audio deferred. | none yet | Epic #391 |
| 5 | Adaptive Replanning | PLANNED | Post-class audio input (WhatsApp-style voice note). Transcription via Whisper. Automatic student profile update from reflection (difficulties, covered topics, emotional engagement). Course replanning triggered by accumulated session data. Progress dashboard per student. | none yet | none yet |
| 6 | Listening Comprehension | PLANNED | Audio-based exercise types (CO-01 to CO-07): dictation, listen-and-answer, gap fill from audio, etc. Audio file upload to lesson sections. AudioPlayer component. Draft plan at `plan/pedagogy-specification/listening-sprint-plan.md`. | `plan/pedagogy-specification/listening-sprint-plan.md` | none yet |
| 7 | Solo Whiteboard | Future | In-class shared whiteboard for live lessons. Upload materials (PDF, images), annotate, student can write too. Session persistence: previous whiteboards stay accessible. Replaces Preply's whiteboard as Jordi's most-used in-class tool. | none yet | 5 sub-issues from #174 |
| 8 | Group Classes | Future | New Group entity with multiple students. Lesson generation considers mixed L1 backgrounds. Per-student error notes within a group session. | none yet | #146, #147 |
| 9 | Phase 2B: Production | Future | Generation caching, free-tier usage limits (25 gen/month), monitoring and cost analytics, error handling/graceful degradation, sign-up onboarding wizard (time-to-first-lesson < 5 min), multi-tenant security hardening. | none yet | none yet |
| 10 | Phase 3: Growth | Future | Student portal (login, assigned lessons, exercises, progress). Text correction with categorized errors. Content library (reuse blocks across lessons). Shareable lesson links. Payments (Stripe). | none yet | none yet |
