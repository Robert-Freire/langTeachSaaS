# Sprint: Phase 2A — Teacher Workflow Foundation

**Milestone:** Phase 2A: Teacher Workflow
**Goal:** After the demo sprint, we have a working app but teachers can only create isolated lessons. This sprint adds what's missing for real daily use: planning courses (not just single lessons), tracking what each student struggles with so the AI targets those gaps, letting teachers upload their own materials, and supporting group classes. We also need to fix the login screen (still shows raw Auth0) and the dashboard blank flash on cold start.

---

## Completed

| # | Title | Notes |
|---|-------|-------|
| 98 | Course/Curriculum Planner | The big one. Teachers can now plan multi-lesson courses toward a CEFR goal. |
| 127 | Exercise correction with AI explanation | When a student gets an answer wrong, the app now explains why. |
| 111 | Dashboard cold-start skeleton fix | Dashboard no longer shows empty cards while Azure wakes up. |
| 100 | Enhanced Difficulty Tracking (original) | Closed, split into #156 + #157 (was too broad). |
| 101 | Group Class Support (original) | Closed, split into #146 + #147. |
| 102 | Material Upload (original) | Closed, split into #148 + #149. |

## In Progress

| # | Title | Priority | Assignee |
|---|-------|----------|----------|
| 148 | Material Upload: file storage, UI, preview | P1 | agent |
| 156 | Structured Difficulty Management: schema, CRUD, UI | P1 | agent |
| 149 | Material Upload: AI references uploaded files | P1 | agent |

## Ready to Pick Up

| # | Title | Priority | What it does |
|---|-------|----------|-------------|
| 157 | AI-Powered Difficulty Targeting (depends on #156) | P1 | Makes the AI use the structured difficulties when generating content. Without this, #156 is just organized notes. |
| 150 | Student difficulty areas filtered by target language | P1 | Stop showing "phrasal verbs" for Spanish students. Areas to improve should make sense for the language being taught. |
| 103 | Sign-up & Onboarding Wizard | P1 | Replace the generic Auth0 login with a branded experience. First thing anyone sees. |
| 146 | Group Class: entity, CRUD, student assignment | P2 | Let teachers create groups and assign students to them. Prerequisite for group lesson generation. |
| 147 | Group Class: AI lesson generation with L1 guidance | P2 | Generate lessons for a group, with notes for the teacher on how to adapt for each student's native language. |
| 151 | Warn on CEFR level mismatch (lesson vs student) | P2 | If a teacher assigns an A1 student to a C1 lesson, show a warning. Don't block it, just flag it. |
| 154 | Auto-fill lesson language/level from student | P2 | When you pick a student for a lesson, pre-fill language and level instead of making the teacher set them manually. Also reorder the form so student comes first. |
| 152 | Grammar-constrained content generation | P2 | Let teachers say "use subjunctive but only regular verbs" when generating. For B2/C1 teachers who need to isolate specific structures. |
| 142 | Regenerate button toggle UX | P2 | Small fix: regenerate button should open/close the panel like the generate button does. |
| 143 | Consistent not-found handling | P2 | When a student or lesson doesn't exist, redirect with a toast instead of showing a 404 page. |
| 140 | Filter dropdown value-to-label mapping | P2 | Tech debt: dropdowns show raw enum values instead of human-readable labels. |
| 36 | Settings HTML sanitization | P2 | Bug: you can type HTML tags in the display name and they render. Should be escaped. |
| 95 | Auth0 tests in nightly CI | P2 | Run real Auth0 login tests in CI without conflicting with the mock auth e2e setup. |
| 139 | Batch UI review polish findings | P3 | Accumulated visual fixes from previous PR reviews. |

---

*Updated: 2026-03-21*
