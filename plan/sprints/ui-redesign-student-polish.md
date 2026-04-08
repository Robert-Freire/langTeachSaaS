# Sprint: UI Redesign & Student Profile Polish

## The teacher's story

Jordi opens LangTeach to show a colleague. The app loads. He doesn't have to explain anything.

The dashboard feels like a teaching command center: this week's sessions at a glance, active courses with progress bars, a clean sidebar that knows where he is. His colleague leans in. It looks like something he'd actually pay for.

He clicks on a student. The profile page shows everything he cares about: age, profession, native language, how long they've been studying, their official CEFR level and his personal assessment of where they actually are. There's a short-term objective with a target date. And below the session history, a small section he checks every time he sits down to plan: *ideas para próximas clases* — a running list of teaching to-dos he's been adding to all month. "Revisit conditional mood", "she mentioned she has a work presentation in April", "try a roleplay at the café".

He doesn't have to hold all of this in his head. It's right there.

## What changes for Jordi

Before this sprint: the app works but looks unfinished. Student profiles are sparse — level, interests, a notes field. The sidebar is functional but generic. Jordi has to carry context in his head between sessions.

After this sprint: the app looks and feels like a professional tool. Student profiles hold the full picture of a learner — not just CEFR level but who they are, what they're working toward, and what the teacher has been meaning to try. The *ideas para próximas clases* field becomes the teacher's second brain.

## What this sprint delivers

**Visual redesign (all main screens)**
A consistent design system built from the Stitch prompts at `plan/langteach-beta/stitch-redesign-prompts.md`: indigo/zinc palette, clean cards, CEFR badges, polished sidebar. Screens covered: dashboard, student list, student detail, lesson editor, courses view, settings. This sprint establishes the visual language all future screens will follow.

**Richer student profile**
New fields from Jordi's direct feedback:
- Basic info: age, profession, location, native language, other languages known, reason for studying Spanish
- Two-level CEFR: official level (from a test or exam) + teacher's own assessment
- Short-term objective with a target date (e.g. "Pass DELE B2 by June")
- *Ideas para próximas clases*: a free-text teaching to-do list the teacher can add to at any time
- Student list columns: last session date, total session count, hourly rate (optional)
- Cancelled session logging (distinct from completed sessions)

**Seeder and review-ui coverage**
Ana Visual and other seed students get difficulties and richer profile data so review-ui runs can exercise the new screens without manual setup.

## What we're NOT building

- New content types or exercise formats (that's Listening Comprehension sprint)
- Student portal or student-facing views (Phase 3)
- Payment or rate tracking beyond a display field on the profile
- Automated scheduling or calendar integration

## How to use this document

Every task, review, and test should be checked against one question: **does this look like something a professional teacher would show a colleague, and does the student profile hold everything Jordi needs to walk into a class prepared?** If a screen works technically but feels unfinished or sparse, it's not done.
