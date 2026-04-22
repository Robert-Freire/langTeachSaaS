---
name: Sprint overview files
description: PM-only reference for sprint sequence, story files, and milestone map. Not for task agents.
type: reference
originSessionId: 1a714ce6-a89e-45f5-9788-abac1dcb5636
---
## Purpose

Sprint story files define what we're building from the teacher's perspective. They are loaded by the PM skill, not by task agents. Each active sprint should have a story file at `plan/sprints/<slug>.md`.

**When the sprint changes**, update the PM skill (`SKILL.md`) to point to the new story file.

## Sprint sequence

| Order | Milestone | Status | Description | Story file | Key issues |
|-------|-----------|--------|-------------|------------|------------|
| 1 | Curriculum & Personalization | CLOSED (2026-03-24) | Course creation flow, session-to-lesson navigation, exam prep mode, CEFR exercise selection, pedagogy config architecture (6 JSON layers), PromptService data-driven. | `plan/sprints/curriculum-personalization-test-script.md` | 35 closed |
| 2 | Student-Aware Curriculum | CLOSED (2026-03-29) | Template-seeded curriculum backbone, student profile in course creation, CEFR mismatch warnings, grammar constraints, additive section guidance model, content type constraints, exercise availability flags. | `plan/sprints/student-aware-curriculum.md` | 21 closed |
| 3 | Pedagogical Quality | CLOSED (2026-04-02) | New exercise formats (sentence ordering, error correction, true/false, transformation). New content types (guided writing, noticing task). Practice scaffolding with stage field. L1 contrastive notes in grammar blocks. JSON schema enforcement. 9-persona Teacher QA suite. | none | 35/35 closed |
| 4 | Post-Class Tracking | CLOSED (2026-04-04) | Replace Jordi's Excel. Teacher logs each session: what was planned, what was done, homework sent, observations. Student history view before generating next lesson. Import existing Excel on first login (35 students' worth of history). Profile auto-updated from session notes. Text input only, audio deferred. | none | 23/23 closed |
| 5 | Adaptive Replanning | CLOSED (2026-04-08) | Post-class audio input (WhatsApp-style voice note). Transcription via Whisper. Automatic student profile update from reflection (difficulties, covered topics, emotional engagement). Course replanning triggered by accumulated session data. Also pulled in: generation bug fixes (#437), weakness targeting gaps (#432), pedagogy config fixes (#423), prompt consistency (#422). | `plan/sprints/adaptive-replanning.md` | 22/22 closed |
| 6 | UI Redesign & Student Profile Polish | CLOSED (2026-04-22, merged to main) | Stitch-guided visual redesign of all main screens (dashboard, students, lesson editor, courses, onboarding, settings). New student profile fields from Jordi Round 12 feedback: basic info (age, profession, location, L1, other languages, why studying Spanish), two-level CEFR (official + teacher assessment), short-term objective with date, "ideas para próximas clases" teaching to-do list, student list columns (last class, session count, rate), cancelled session logging. Establishes design system before new feature screens are built. Stitch prompts at `plan/langteach-beta/stitch-redesign-prompts.md`. | `plan/sprints/ui-redesign-student-polish.md` | milestone #16, all closed |
| 7 | Stabilisation | NEXT (milestone #17, no sprint branch yet) | Tech debt, model fixes, test reliability, prompt cleanup before next feature sprint. Key issues: #844 (unify TeachingTodo+TeacherFollowup), #845 (StudentDto refactor), #846 (PromptService cleanup), #848 (Log Session dual edit pattern), #851 (student profile pedagogy improvements). Full list in milestone #17. | none | milestone #17 |
| 8 | Listening Comprehension | PLANNED | Audio-based exercise types (CO-01 to CO-07): dictation, listen-and-answer, gap fill from audio, etc. Audio file upload to lesson sections. AudioPlayer component. Draft plan at `plan/pedagogy-specification/listening-sprint-plan.md`. | `plan/pedagogy-specification/listening-sprint-plan.md` | none yet |
| 8 | Solo Whiteboard | Future | In-class shared whiteboard for live lessons. Upload materials (PDF, images), annotate, student can write too. Session persistence: previous whiteboards stay accessible. Replaces Preply's whiteboard as Jordi's most-used in-class tool. | none yet | 5 sub-issues from #174 |
| 9 | Group Classes | Future | New Group entity with multiple students. Lesson generation considers mixed L1 backgrounds. Per-student error notes within a group session. | none yet | #146, #147 |
| 10 | Phase 2B: Production | Future | Generation caching, free-tier usage limits (25 gen/month), monitoring and cost analytics, error handling/graceful degradation, sign-up onboarding wizard (time-to-first-lesson < 5 min), multi-tenant security hardening. | none yet | none yet |
| 11 | Phase 3: Growth | Future | Student portal (login, assigned lessons, exercises, progress). Text correction with categorized errors. Content library (reuse blocks across lessons). Shareable lesson links. Payments (Stripe). | none yet | none yet |
