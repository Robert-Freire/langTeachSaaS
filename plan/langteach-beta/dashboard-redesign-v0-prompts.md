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

---

## 5. Stitch prompt — Students list (`/students`)

Paste the shared context block (section 1), then paste this prompt.

~~~
TASK: Design the Students list screen.

DESIGN LANGUAGE: Use the same Stitch "Academic Atelier" style as the
dashboard mockup. Key rules:
- Tonal layering: page canvas #FBF8FF, main content area #FFFFFF, sidebar
  #F4F2FD. NO 1px solid borders to section content. Depth comes from
  background color shifts and ambient shadows only.
- Typography: Manrope for display/headline text, Inter for UI/body.
  Section headers in Headline-MD (Manrope, 1.75rem). Table headers in
  Label-SM (Inter, 0.6875rem, uppercase, 0.05em tracking). Body text
  in Body-MD (Inter, 0.875rem).
- CEFR badges: square format with md (0.375rem) corners, NOT pills.
  A-levels: blue-100/blue-700. B-levels: indigo-100/indigo-700.
  C-levels: slate-800/white.
- Primary color: indigo (#3525CD). Buttons use gradient from #3525CD to
  #4F46E5 at 135deg.
- No divider lines between table/list rows. Use 16px vertical gap or
  hover background shift instead.
- Row hover: surface-container-highest with lg (0.5rem) corner radius.
- Ambient shadows for elevated cards: blur 40px, y 12px, 6% opacity
  using #1A1B22.
- Never use pure black (#000000). Text color: #1A1B22.

LAYOUT:

HEADER AREA
  Left: page title "Students" in Headline-MD (Manrope).
  Subtitle: student count "12 active students" in Body-MD, zinc-500.
  Right: primary button "Add Student" with gradient background.

TOOLBAR
  Row below header:
  - Search input (surface-container-lowest fill, ghost border at 20%
    opacity, placeholder "Search by name..."). On focus, ambient shadow
    increases slightly.
  - CEFR level filter dropdown: "All levels", A1, A2, B1, B2, C1, C2.
  - Status filter: "All", "Active", "Former".
  - Sort dropdown: "Sort by: next session" (default). Options: next
    session, last session, name, level.

TABLE
  Full width on surface-container-lowest (#FFFFFF) card, with ambient
  shadow. No header row border. Column headers in Label-SM uppercase.

  Columns:
    STUDENT | LEVEL | NATIVE LANGUAGE | LAST SESSION | NEXT SESSION | SIGNALS

  "STUDENT" column: avatar circle (initials, indigo-100 bg) + name in
  Title-SM (Inter, 1rem, medium). One line per student.

  "LEVEL" column: square CEFR badge per the color rules above.

  "NATIVE LANGUAGE" column: Body-MD text. If multiple, show first with
  "+1" indicator.

  "LAST SESSION" column: relative time in English. "4d ago", "yesterday",
  "today", "12d ago". If none: em-dash.

  "NEXT SESSION" column: relative date/time. "Today 10:30", "Thu 12:00",
  "Mon 09:00". If none: em-dash.

  "SIGNALS" column: small badges where relevant:
    - Rona Díaz:      amber badge "Canceled 2x"
    - Matteo Russo:   amber badge "Review pending"
    - Bruno Almeida:  red-subtle badge "Inactive 12d"
    - Paula Moretti:  indigo-subtle badge "New"
    - all others:     (empty)

  Use all 12 students from the cohort in the shared context block.

  Row click: navigates to student detail (just design intent, no actual
  routing needed in the component).

  Row hover: background shifts to surface-container-highest (#E8E5F5)
  with lg corner radius. No border on hover.

FOOTER
  Below table: centered text "Showing 12 of 24 students" in Body-MD
  zinc-500, with a ghost button "Load more".

SIDEBAR: same Stitch sidebar as the dashboard mockup. "Students" nav
item is active (left indigo border bar). Include "LANGUAGE CURATOR"
subtitle, nav order: Dashboard, Students, Courses, Lessons, Settings.
User card at bottom with "JR" avatar, "Jordi R.", "TEACHER" label.

EMPTY STATE (for reference, secondary component):
  When the teacher has no students yet: centered on page, Display-LG
  (Manrope, 3.5rem) text "Your students will appear here", Body-MD
  subtitle, primary gradient button "Add your first student".

OUTPUT: a single React component file using shadcn/ui components, fully
self-contained, with all cohort data hardcoded as const arrays at the
top. Include the Stitch sidebar.
~~~

---

## 6. Stitch prompt — Student detail (`/students/:id`)

Paste the shared context block (section 1), then paste this prompt.

~~~
TASK: Design the Student detail screen for Matteo Russo (C1.1, Italian).
Use the richest student from the cohort so all sections have content.

DESIGN LANGUAGE: Same Stitch "Academic Atelier" rules as the Students
list (see that prompt for the full spec). Key reminders:
- Tonal layering, no 1px borders, ambient shadows.
- Manrope headlines, Inter body, Label-SM uppercase metadata.
- Square CEFR badges. Indigo primary gradient buttons.
- No divider lines. Depth via background shifts.
- Text color #1A1B22, never pure black.

LAYOUT:

HEADER CARD (full width, surface-container-lowest, ambient shadow)
  Left side:
  - Large avatar circle (initials "MR", indigo-100 bg, 64px).
  - Name: "Matteo Russo" in Headline-MD (Manrope, 1.75rem).
  - Below name, row of metadata in Label-SM uppercase:
    CEFR badge "C1.1" (dark/slate style) + "ITALIAN" + "FILM STUDENT"
    + "SESSION #14"
  - Below metadata: "Next session: Today, 10:30" in Body-MD, indigo text.
  Right side:
  - Ghost button "Edit Profile"
  - Primary gradient button "Start Session"

TAB BAR (below header, no border)
  Three tabs: "Profile" | "Sessions" | "Progress"
  Active tab: indigo bottom indicator (3px), indigo text.
  Inactive tab: zinc-500 text, hover shifts to zinc-700.
  Tab bar sits on page canvas (#FBF8FF), not inside a card.

--- TAB 1: PROFILE (default active) ---

Two-column layout on surface-container-lowest card with ambient shadow.

LEFT COLUMN (wider, ~60%):

  Section: "ABOUT" (Label-SM header)
  Key-value pairs, each on its own line:
  - Country of origin: Italy
  - City: Rome
  - Lives in: Barcelona
  - Birth year: 1998
  - Reason for studying: "Vive en Barcelona, necesita el castellano
    para el día a día y para la carrera de cine"

  Section: "LANGUAGES" (Label-SM header)
  - Native: Italian
  - Spoken: English (B2), French (A2)
  - Learning: Spanish (C1.1)

  Section: "PERSONAL NOTES" (Label-SM header)
  Body-MD text in Spanish:
  "Muy motivado, cinéfilo. Le gusta debatir sobre cine europeo.
  A veces se frustra con el subjuntivo pero trabaja duro."

  Section: "TEACHING NOTES" (Label-SM header)
  Body-MD text in Spanish:
  "Nivel alto pero con lagunas en subordinadas concesivas y uso de
  por/para en contextos abstractos. Buena producción oral, necesita
  pulir registro formal escrito."

RIGHT COLUMN (~40%):

  Section: "LEARNING GOALS" (Label-SM header)
  Editable list (each item is a chip or list row):
  - "Dominar el subjuntivo en todas sus formas"
  - "Mejorar registro formal escrito"
  - "Preparar DELE C1"

  Section: "SHORT-TERM OBJECTIVES" (Label-SM header)
  Each item: text + optional target date in zinc-500:
  - "Redacción formal semanal" — target: May 2026
  - "Completar ejercicios de por/para" — target: Apr 15

  Section: "DIFFICULTIES" (Label-SM header)
  Compact table (no borders, tonal row alternation):
    AREA | DETAIL | SEVERITY
  - Grammar | "Subjuntivo en concesivas" | amber badge "Frequent"
  - Grammar | "Por/para en abstractos" | zinc badge "Occasional"
  - Writing | "Registro formal" | amber badge "Frequent"

  Section: "TEACHING TODOS" (Label-SM header)
  List with status indicators:
  - Pending (indigo dot): "Enviar ejercicios de por/para"
  - Pending (indigo dot): "Corregir redacción 'mi ciudad ideal'"
  - Covered (green dot, strikethrough): "Explicar diferencia
    indicativo/subjuntivo en temporales"

  Section: "COMMERCIAL" (Label-SM header)
  - Status: active (green badge "Active")
  - Type: zinc badge "Private"
  - Rate: "25 EUR/h"

--- TAB 2: SESSIONS (not active, but design the content) ---

Section: "SESSION TIMELINE" (Label-SM header)

Vertical timeline, most recent first. Each session is a card on
surface-container-lowest (slightly elevated from the tab background).
No connecting lines between cards. Use vertical gap (24px) to separate.

Session card structure:
  Top row: date "Apr 5, 2026 · 10:30" in Label-SM + status badge
  ("Completed" green, "Scheduled" indigo, "Canceled" amber, "Draft" zinc).
  Content area (Body-MD, Spanish):
  - "Subjuntivo en concesivas, le costó. Trabajamos con textos
    periodísticos para contextualizar."
  - "Deberes asignados: redacción 'mi ciudad ideal'"
  - "Homework status: pendiente de corrección"
  Topics row: vocabulary chips with secondary-fixed-dim background,
  full roundedness: "subjuntivo" "concesivas" "por/para" "registro formal"

Show 4 session cards for Matteo:
1. Apr 5 (Completed): notes above
2. Apr 1 (Completed): "Repasamos por/para. Ejercicio contrastivo con
   italiano. Buena sesión, mucha participación."
3. Mar 28 (Completed): "Texto argumentativo: ventajas del cine europeo
   vs Hollywood. Corregimos registro. Avanza bien."
4. Mar 25 (Canceled): "Canceló por examen en la universidad."

Below timeline: ghost button "Load earlier sessions".

Section: "TEACHING TODOS" (same as Profile tab right column, repeated
here for context during session review).

--- TAB 3: PROGRESS (not active, design placeholder) ---

Section: "SKILL OVERVIEW" (Label-SM header)
Horizontal bar chart or table showing skill levels:
  SKILL | LEVEL | TREND
  - Reading | C1 | green arrow up
  - Writing | B2 | amber arrow right (plateau)
  - Speaking | C1 | green arrow up
  - Listening | C1 | green arrow up
  - Grammar | B2 | amber arrow right
  - Interaction | C1 | green arrow up

Section: "COVERAGE" (Label-SM header)
  Placeholder text: "Topic coverage analysis from session history"
  (This section will be populated from the progress dashboard #190)

Section: "PACING" (Label-SM header)
  Badge: "On track" green or "Behind" amber.
  Subtitle: "14 sessions over 3 months, avg 1.2/week"

SIDEBAR: same Stitch sidebar. "Students" nav item is active.

OUTPUT: a single React component file using shadcn/ui components, fully
self-contained, with all Matteo's data hardcoded at the top. Include
the Stitch sidebar. Design all 3 tab contents (Profile active by
default, Sessions and Progress accessible via tab click).
~~~

---

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
