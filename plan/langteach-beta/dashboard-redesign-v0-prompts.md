# Dashboard redesign — v0.dev prompts + Claude plan

> Companion to:
> - `dashboard-redesign-isaac-notes.md` (the data model + layout rationale)
> - `stitch-dashboard-approach.md` (the approach + cohort)
>
> This doc contains the **actual prompts to paste into v0.dev** for the
> dashboard, plus the plan for Claude to implement the other 3 screens
> directly against the LangTeach codebase.

## Decisions (Robert, 2026-04-09)

- **Tool split (option B):** v0.dev for the dashboard, Claude for the other
  screens.
- **Fidelity:** wireframe-first for the dashboard. Polish in a later pass.
- **First batch of screens:** Dashboard, Student list, Student detail.
  **Sessions list deferred** until Sophy review of all backend gaps (there
  are other requests from Jordi being evaluated in parallel, and the
  sessions list depends on a new aggregation endpoint that may or may not
  land with other changes).
- **UI language:** English labels, Spanish content. Same pattern as the
  current product. All visible chrome ("Dashboard", "Students",
  "Sessions", buttons, tab labels) in English. All teacher-authored and
  student-facing content (student names, session notes, difficulties,
  pendientes text, pedagogical vocabulary) in Spanish.
- **Cohort:** pseudonymized (Option B from `stitch-dashboard-approach.md`).
- **Stack:** React + Tailwind + shadcn/ui + Vite (already in LangTeach).
- **v0 budget:** up to ~$10 if the free tier runs out. Switch to Claude
  for the dashboard if spend exceeds that.

---

## 1. Shared context block (paste at top of every v0 session)

This block goes at the top of **every** v0 conversation for the dashboard
redesign. It fixes terminology, cohort data, and tone so v0 doesn't drift.

~~~
You are designing screens for LangTeach, a web app used by a freelance
Spanish-as-a-foreign-language (ELE) teacher. The teacher does NOT use this
app to generate lesson content with AI; they use it to manage their
students and track their one-to-one sessions.

UI LANGUAGE RULE (important):
- Chrome, nav, buttons, table headers, tab labels, form labels, filter
  labels: ENGLISH. ("Dashboard", "Students", "Sessions", "Next session",
  "Last session", "Open profile", "Start session", "Followups", etc.)
- Teacher-authored content, student data, session notes, pendientes text,
  pedagogical vocabulary: SPANISH. (Student names stay as given, session
  notes stay in Spanish verbatim, pendientes like "Corregir redacción de
  Matteo" stay in Spanish.)
- Relative time stamps and counts: ENGLISH. ("3 days ago", "in 35 min").
- CEFR level tokens are universal: A1.1, A2.2, B1.1, C1.1.

STACK (mandatory):
- React + TypeScript
- Tailwind CSS
- shadcn/ui components: Card, CardHeader, CardContent, Button, Badge,
  Avatar, Table, Separator, Input. Use these by name.
- Lucide icons only.
- Font: Inter (already loaded).
- Output: a single self-contained React component per screen.

VIEWPORT:
- Desktop-first, 1440×900 primary viewport.
- Fixed sidebar 240px, white background, subtle right border.
- Main content area fills remaining width (no centered 960px column).
- Density target: a teacher with 25 active students must see the next
  session, today's schedule, and 6-8 students without scrolling.

VISUAL TONE:
- Reference: Linear or Superhuman. Information-dense, compact typography,
  minimal decorative whitespace.
- NOT Notion, NOT Duolingo, NOT generic B2B SaaS marketing.
- Palette: indigo-600 primary accent, zinc neutrals for text and borders,
  emerald-600 for success, amber-500 for warnings, red-600 for errors.
- White cards on zinc-50 background.
- Wireframe-first: first pass emphasizes structure and hierarchy.
  Keep colors muted. No gradients, no illustrations, no decorative icons.
  Polish comes in pass 2.

TERMINOLOGY (use these exact English words for UI chrome):
- "Session" = a past or planned class with one student. Never "class" or
  "lesson" on these screens.
- "Student" = learner.
- "Followups" = the tray of things the teacher owes (promises, pending
  corrections, unlogged sessions). Not "tasks", not "todo", not
  "reminders".
- "Next session" = the upcoming session hero.
- "Last session" = the previous session reference.
- "Active students" = the main student table title.
- The word "Lesson" is reserved for AI-generated content and does NOT
  appear on the dashboard, student list, or student detail. There IS a
  "Lessons" nav item in the sidebar (inactive on these screens), but no
  screen in this batch renders Lesson data.

DO NOT INCLUDE:
- Progress bars on the dashboard.
- Student count cards ("24 Alumnos") or lesson count cards ("8 Sesiones
  esta semana") as vanity metrics.
- Gamification: badges, achievements, streaks, points.
- Illustrated empty states, 3D icons, gradient cards.
- A week strip as the main hero. Day-focused only.
- Any LMS-style aesthetic (Duolingo, Khan Academy).

COHORT (use exactly these students, in this order, for all screens):
1.  Ewan McLeod      — A1.2 — English (Scottish, works on a ship in Turkey)
2.  Bruno Almeida    — B1.2 — Portuguese (Brazilian, lives in Porto)
3.  Elena Volkov     — B1.1 — Russian (telecom engineer, Barcelona)
4.  Amani Haddad     — A1.1 — Arabic (also speaks German and English)
5.  Nadia El Amrani  — A2.1 — French (living in Paris)
6.  Kevin Brown      — A2.2 — English (American, focus on hobbies)
7.  Oksana Petrenko  — B1.1 — Ukrainian (shy, needs speaking practice)
8.  Paula Moretti    — B2.1 — Italian (nutritionist)
9.  Rona Díaz        — B1.1 — Romanian (past vs present errors)
10. Sandra Okafor    — A2.1 — English (Nigerian, food/culture interests)
11. Michael Chen     — A1.2 — English (Australian)
12. Matteo Russo     — C1.1 — Italian (film student)

SESSION NOTES (in Spanish, realistic ELE teacher voice — use these
verbatim or lightly adapted, not generic placeholders):
- Matteo Russo, last session: "Subjuntivo en concesivas, le costó.
  Prometí ejercicios de por/para. Deberes: redacción 'mi ciudad ideal'."
- Elena Volkov, last session: "Trabajamos imperfecto vs indefinido.
  Sigue tímida al hablar. Pendiente: enviarle el ejercicio de bajaba/bajé."
- Amani Haddad, last session: "Revisamos A1.1. Dice que los verbos son
  demasiado. Bajar ritmo en las desinencias. Sin deberes, no sobrecargar."
- Oksana Petrenko, last session: "Ha hablado mucho mejor hoy. Debo enviarle
  la explicación del verbo gustar y un ejercicio. Animarla a apuntarse al
  examen."
- Kevin Brown, last session: "A Comer hasta los audios. Deberes: escribir
  formas de pedir. Le debo el audio de Paco."
- Sandra Okafor, last session: "Vocabulario de restaurante. Seguimos con
  poner/traer y gustar la próxima."

PENDIENTES (the teacher's followup tray — in Spanish):
- "Corregir redacción de Matteo (hace 3 días)"
- "Enviar ejercicio de gustar a Oksana"
- "Enviar audio de Paco a Kevin"
- "Registrar sesión del martes con Elena"
- "Confirmar tarifa nueva con Paula"
- "Rona canceló 2 veces — revisar engagement"

Use these exact pendientes. Do not invent generic ones.
~~~

---

## 2. v0.dev prompt — Dashboard (the only screen v0 handles)

Paste the shared context block above, then paste this prompt in the same
conversation.

~~~
TASK: Design the main Dashboard screen.

LAYOUT (4 zones, top to bottom):

ZONE 1 — NEXT SESSION (hero, ~35% of viewport height)
  Large card, full width of main area.
  Top-left: countdown label "In 35 min · 10:30" in zinc-500 small text.
  Below that: student name large "Matteo Russo" + level badge "C1.1"
  + L1 small "Italian" + session number "Session #14" in zinc-500.
  Middle: section titled "Last session · 4 days ago" with 3 bullet lines
  in Spanish (teacher's actual notes):
    • "Subjuntivo en concesivas, le costó"
    • "Prometí ejercicios de por/para"
    • "Deberes: redacción 'mi ciudad ideal'"
  Below bullets: small row "Homework:" (label in English) + the Spanish
  homework text: "redacción 'mi ciudad ideal' — pendiente de corrección".
  Bottom-right: two buttons: [Open profile] (ghost) and [Start session]
  (primary indigo-600).

ZONE 2 — TWO COLUMNS SIDE BY SIDE (~25% of viewport height)

  LEFT column header: "Today · Tuesday, April 9"
  A vertical list of today's sessions. Each row: time (HH:MM),
  student name, level badge, status label (English).
  Use these exact rows in order:
    09:00 — Nadia El Amrani — A2.1 — Done
    10:30 — Matteo Russo    — C1.1 — Next (highlighted row background)
    12:00 — Elena Volkov    — B1.1 — Scheduled
    16:00 — Kevin Brown     — A2.2 — Scheduled
    18:30 — Amani Haddad    — A1.1 — Scheduled
  Footer link: "View week" (text-only, small).

  RIGHT column header: "Followups"
  Each row: small status dot + teacher-authored description in Spanish +
  relative time in English on the right. Amber dot for overdue,
  zinc dot for normal.
  Use these exact rows verbatim:
    • "Corregir redacción de Matteo"           — 3 days ago  (amber)
    • "Enviar ejercicio de gustar a Oksana"    — 2 days ago  (amber)
    • "Enviar audio de Paco a Kevin"           — yesterday   (zinc)
    • "Registrar sesión del martes con Elena"  — yesterday   (amber)
    • "Confirmar tarifa nueva con Paula"       — today       (zinc)
    • "Rona canceló 2 veces, revisar"          — today       (zinc)
  Footer link: "See all" (text-only, small).

ZONE 3 — ACTIVE STUDENTS (~40% of viewport height)
  Title: "Active students" + small sort dropdown on the right:
  "Sort by: last session".
  Compact table, NOT cards. Column headers in English:
    Name | Level | L1 | Last session | Next session | Signals
  Each row is one student from the cohort (use all 12 in the order given
  in the shared context block).
  "Last session" column: "4d ago", "yesterday", "today", "12d ago".
  "Next session" column: "today 10:30", "Thu", "Fri 12:00", or em-dash.
  "Signals" column: small English badges where relevant:
    - Oksana Petrenko: (no badge)
    - Rona Díaz:       amber badge "canceled 2×"
    - Matteo Russo:    amber badge "review pending"
    - Paula Moretti:   zinc badge "new"
    - Bruno Almeida:   red badge "inactive 12d"
    - all others:      (no badge)
  Row hover: subtle zinc-100 background.
  Footer: "See all (24)" text link.

SIDEBAR (left, 240px, always visible):
  Top: "LangTeach" wordmark in indigo-600, font-semibold.
  Nav items (in order, English labels):
    - Dashboard (active state)
    - Students
    - Sessions
    - Courses
    - Lessons
    - Settings
  Active item: indigo-50 background, indigo-600 text, left border indigo-600.
  Inactive: zinc-600 text, hover zinc-50 background.
  Bottom: small Avatar with initials "JR" + "Jordi R." + "Teacher" label
  in zinc-500.

HEADER (above main content):
  Left: page title "Dashboard" + date subtitle "Tuesday, April 9".
  Right: nothing for now. No search, no notifications bell.

WIREFRAME-FIRST INSTRUCTIONS:
- First pass: use muted colors, minimal visual treatment. Prioritize
  hierarchy and structure over polish.
- No icons in badges yet, just text.
- No decorative elements.
- I will iterate on visual polish in a second pass.

OUTPUT: a single React component file using shadcn/ui components, fully
self-contained, with all the cohort data hardcoded as const arrays at
the top of the file.
~~~

### Iteration hints

After v0 generates the first version, expect to say things like:

- "Make the próxima sesión card more compact, it's taking too much vertical space. Target 240-280px height."
- "The pendientes list rows are too tall. Halve the padding."
- "Use a smaller font for the table. 13px. More density."
- "Remove the background gradient on the hero card, use plain white."
- "The sidebar active state should have a 2px left border, not a full background fill."
- "The level badges are too colorful, mute them. Use zinc-100 background with zinc-700 text for all levels, differentiate only by a small letter."

Avoid in iterations:
- Don't ask v0 to "add more information" — the density should already be enough.
- Don't ask for "make it more beautiful" — too vague, v0 will add decoration.
- Do ask for specific reductions: "smaller", "tighter", "less padding", "remove this".

---

## 3. Claude plan — the other 3 screens

These are NOT written as prompts because Claude (me) will implement them
directly against the LangTeach codebase, not through a generator. When
Robert says "go", I will:

### Screen A: Students list (`/students`)

**Preparation:**
1. Read `frontend/src/pages/Students*.tsx` (or equivalent) to see the
   current page structure and routing.
2. Read `frontend/src/components/ui/table.tsx` and any existing table
   wrappers to match the established table pattern.
3. Read `frontend/src/api/students.ts` to understand the Student DTO and
   list query shape.
4. Read the `StudentListQuery` DTO in the backend to confirm available
   filters.

**Build:**
- Compact table view, NOT the current card grid (per `dashboard-redesign-isaac-notes.md` §3 and the "information-dense" tone).
- Columns: Name · Level · L1 · Last session · Next session · Signals · Actions
- Top bar: search input + level filter + "Add student" button
- Sortable by last session (default), name, level
- Signal badges match the dashboard (inactive, canceled, review pending)
- Empty state: minimal, one line + one button
- Uses the same cohort data as the dashboard for demo / screenshots

### Screen B: Student detail (`/students/:id`)

**Preparation:**
1. Read the current student detail page to see what sections exist today.
2. Read `Student` model + `StudentDto` to list all available fields
   (CEFR level, L1, interests, goals, weaknesses, difficulties, notes,
   skill level overrides).
3. Read `SessionLogDto` and `StudentSessionSummaryDto` to understand the
   session history shape.
4. Read `Difficulty` related files to understand the structured
   difficulty tracking.

**Build:**
- Header: avatar + name + level + L1 + "Next session: today 10:30" +
  buttons "New session" / "Edit profile"
- Three tabs (English labels):
  1. **Profile** — interests, goals, notes (content in Spanish),
     structured difficulties as a table with Competency / Subcategory /
     Severity / Trend columns (English headers, Spanish values)
  2. **Sessions** — timeline of recent SessionLogs. Each item: date,
     summary bullets (Spanish content from ActualContent / GeneralNotes),
     homework line, any linked followups. Most recent at top.
  3. **Progress** — skill level overrides table, reassessment signals,
     topic coverage tags. NO course progress bars (that lives on /courses).
- Reuses the cohort and sessions from the dashboard for consistency.

### Screen C: Sessions list (`/sessions`) — **DEFERRED**

**Status:** deferred pending Sophy review of backend gaps.

Reason: a global sessions list needs a teacher-level aggregation endpoint
that does not exist today (sessions are nested under
`/api/students/{id}/sessions`). Robert is reviewing this alongside other
Jordi requests with Sophy in parallel. Building this screen before that
review wastes work — the endpoint shape will likely change based on what
else Sophy decides.

**When the review lands:**
1. Confirm the endpoint shape (single `/api/sessions` query with filters,
   or a composed `/api/dashboard/sessions` projection).
2. Check if SessionLog needs any field additions (e.g., structured
   duration, location, link back to a Lesson) from the Sophy review.
3. Then build the screen with: date range picker + student filter +
   status filter (scheduled / done / canceled / draft awaiting confirm),
   chronological list grouped by day, rows mirroring the dashboard's
   "Today" column style.

### Execution order (my recommendation)

1. **v0 generates the dashboard** (Robert's job). Iterate until the
   hierarchy feels right.
2. **Claude reads the v0 output + LangTeach codebase, builds the
   dashboard for real** in LangTeach using the existing components.
   This forces v0's wireframe to meet the real design system and real
   data shapes. Any mismatches surface here.
3. **Claude builds students list** using the same visual patterns
   settled in step 2.
4. **Claude builds student detail** next.
5. **Sophy review happens in parallel.** Once backend gaps are agreed,
   sessions list becomes a separate task.

At each step, we pause so Robert can review in the Chrome extension
(per CLAUDE.md) before moving on.

---

## 4. Open questions — all resolved

All three open questions from the previous revision have been answered:

1. ✅ **v0 paid tier:** spend up to ~$10 if the free quota runs out.
   Switch to Claude for the dashboard if exceeded.
2. ✅ **Sessions list endpoint gap:** deferred. Screen C out of this
   batch. Waiting for Sophy review of all backend gaps (including other
   Jordi requests being evaluated in parallel).
3. ✅ **UI language:** English chrome + Spanish content, matching the
   current product. No i18n migration triggered.

Ready to execute.
