# Sprint: Stabilisation

## The teacher's story

Jordi has been using the app for a few weeks. The redesign looks good. But he's started to notice small things: a session he logged via the web has no title so it just says "Session, Apr 2" in the list. A teaching idea he added three sessions ago is still sitting there — he can't remember if he did it or not. And once, while he was editing the session date, the voice note extraction fired and overwrote what he'd just typed.

These aren't crashes. But they add up to a feeling that the app isn't quite finished.

This sprint doesn't add features. It makes the existing ones solid.

## What changes for Jordi

Before this sprint: the app has rough edges that accumulate into quiet friction. Data model duplications mean the same concept (a teaching reminder) lives in two different places. Debug logs may expose session content. E2E tests are broken so regressions go undetected.

After this sprint: the rough edges are gone. Teaching todos and followups are the same thing. Session logs from the web have titles. The student profile holds a last-session summary so Jordi walks in prepared. Stale ideas get marked done. The code is clean enough that the next feature sprint starts from a solid base.

## What this sprint delivers

**Data model fixes**
- Unify `TeachingTodo` (JSON column) and `TeacherFollowup` (relational table) into one entity with a `kind` discriminator — the biggest structural debt from the UI Redesign sprint
- Group the 28-field `StudentDto` positional record into nested DTOs (IdentityDto, LocationDto, LevelDto, CommercialDto)
- Consolidate the language list from dual C# + TypeScript hardcoding into a single JSON source

**Code cleanup**
- Extract shared frontend utilities: `getInitials` (3 copies), `CEFR_ORDER` (2 copies), `formatRelativeDate`
- Fix PromptService: duplicate native language declaration, overlapping personalization directives, SpokenLanguages iterated twice, missing CEFR priority cue
- Truncate raw Claude response in debug logs (session content privacy)
- Align `ValidationProblem` usage in `TeacherFollowupsController`

**Test reliability**
- Rewrite broken `session-log.spec.ts` e2e tests for the full-page autosave flow
- Extract shared `createStudentViaUI` helper across e2e specs
- Fix `ScenarioSeeder.SeedScenario6Async` NULL constraint (Hans B1 demo scenario)

**UX fixes**
- Log Session: remove dual edit pattern (modal + full-page), align STATUS label in create/edit modes
- UI labeling: My Profile / Settings consistency, T-ENGLISH tag explanation, Dashboard subtitle casing
- Visual polish: difficulty truncation, PREVIEW badge contrast, cancelled session callout, Official Level select component
- Edit Student: language combobox summary, Focus Areas description display
- Add optional title field to LogSession form (sessions logged via web show date fallback today)

**Student profile pedagogy**
- `Ideas para próximas clases`: timestamp per idea + mark-done mechanism
- Short-term objective: type selector (exam_prep / communicative / other)
- Student Overview: last-session summary card auto-populated from most recent session

**Seeder coverage**
- Ana Seed: SkillLevelOverrides + TeachingNotes
- Ana Visual: native language + spoken languages + learning goals + short-term objective
- Mock teacher: scheduled future session + pending followup
- Demo students: pace=behind and hasPendingLessonPlan=true variants for badge coverage
- Fix session list timing (now-1 / now-3 day offsets)

## What we're NOT building

- No new content types or exercise formats (that's Listening Comprehension)
- No new AI generation features
- No new screens or major workflows
- No production infrastructure (caching, limits, monitoring — that's Phase 2B)

## How to use this document

Every task plan should answer: **does this make the app more reliable, cleaner, or less surprising for a teacher using it daily?** If a change adds complexity without fixing a real rough edge, it doesn't belong in this sprint.
