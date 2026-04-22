# Dashboard redesign v1 — Stitch prompts

> **Context:** Stitch already has the Academic Atelier palette, the
> dashboard screen, and the design language established. These prompts
> are intentionally lighter: they define *what* each screen shows and
> *why*, not pixel-level layout. Stitch has creative freedom on
> arrangement, spacing, and visual treatment.
>
> **Companion docs:**
> - `dashboard-redesign-v0-prompts.md` (v0 original with full specs)
> - `isaac-student-profile-gap-analysis.md` (field gaps + issue grouping)
> - `docs/student-profile-field-guide.md` (field definitions, source of truth)

---

## Shared rules (apply to all screens)

**UI language:** English chrome (nav, headers, buttons, labels). Spanish
for teacher-authored content (notes, todos, followups, session text).
CEFR tokens are universal (A1.1, B2.1, etc).

**Cohort:** Use the same 12 students from the v0 shared context block.

**Stack:** React + TypeScript + Tailwind + shadcn/ui + Lucide icons.

---

## 1. Students list (`/students`)

**Purpose:** The teacher's roster. Scan, prioritize, act.

**Must show per student:**
- Name + avatar (initials)
- CEFR level badge
- Native language
- Last session (relative: "4d ago", "yesterday")
- Next session (relative: "Today 10:30", "Thu")
- Signals: small badges for actionable states (examples: "Canceled 2x",
  "Inactive 12d", "Review pending", "New")

**Layout:** Table, not cards. Density matters: a teacher with 25+
students needs to scan without scrolling. Cards hide operational columns
(last/next session, signals) that drive daily decisions.

**Toolbar:** Search + CEFR level filter + sort (default: next session).

**Footer:** Student count + load more.

**Not in this version:**
- Curator Insights (cross-student AI analysis, no backend yet)
- Upcoming Progress Reviews (no scheduled assessment model yet)
- Card grid layout (future evolution, save the Stitch concept for later)

---

## 2. Student detail (`/students/:id`)

**Purpose:** Everything the teacher needs about one student on one screen.

**Header:** Avatar + name + CEFR badge + native language + next session
info. Buttons: "Edit Profile", "Log Session".

**Three tabs:** Profile, Sessions, Progress.

### Tab: Profile

Two columns. Left wider (~60%), right (~40%).

**Left column sections:**
- **About:** BirthYear, Profession, CountryOfOrigin, CityOfOrigin,
  CountryOfResidence, CityOfResidence, ReasonForStudying. Key-value
  pairs. Empty state: "No identity details added yet".
- **Languages:** Native languages (list), Spoken languages (list),
  Learning language + CefrLevel + OfficialCefrLevel (if different).
- **Personal Notes:** Free text (Spanish).
- **Teaching Notes:** Free text (Spanish).

**Right column sections:**
- **Learning Goals:** Editable list (Spanish).
- **Short-Term Objectives:** Each with optional target date. Highlight
  items within 6 weeks of deadline.
- **Difficulties:** Compact table: Area, Detail, Severity badge.
- **Teaching Todos:** List with status dots (pending/covered).
  Inline add. This is the pedagogical backlog.
- **Pending Followups:** Filtered from teacher-level TeacherFollowups.
  Operational items the teacher owes this student. Visually distinct
  from Teaching Todos (amber convention from dashboard).
- **Commercial:** Active/Inactive status, Private/Corporate badge, Rate.

### Tab: Sessions

Vertical timeline, most recent first. Each session card:
- Date + status badge (Completed/Scheduled/Canceled/Draft)
- Session narrative (Spanish)
- Homework line
- Topic chips

Footer: "Load earlier sessions".

### Tab: Progress

- **Skill Overview:** Table or bars showing per-skill levels
  (Reading, Writing, Speaking, Listening) with trend indicators.
- **Pacing:** Session frequency summary ("14 sessions over 3 months").
- **Coverage:** Placeholder for topic coverage analysis (future).

---

## 3. Edit Student (`/students/:id/edit`)

**Purpose:** Where the teacher fills in and updates all profile fields.
This is the input side of everything the Profile tab displays.

**Key design principle:** Grouped by purpose, not by data type. The
teacher thinks "who is this student" then "what level are they" then
"what's the plan" then "business stuff." The form should follow that
mental model.

### Section: Basic Info

- **Name** (required)
- **Learning Language** (required, dropdown)
- **CEFR Level** (required, dropdown, teacher's assessment)
- **Official CEFR Level** (optional, dropdown, exam/platform result)

### Section: About the Student

Identity and context fields. All optional, all help personalization.

- **Birth Year** (number)
- **Profession** (text, max 128)
- **Country of Origin** (text, max 64)
- **City of Origin** (text, max 64)
- **Country of Residence** (text, max 64)
- **City of Residence** (text, max 64)
- **Reason for Studying** (textarea, max 512. "Why is this student
  learning with you?" This is the anchor of the entire course.)

### Section: Languages

- **Native Languages** (multi-select, can be 1 or 2)
- **Spoken Languages** (tag input, other languages besides native
  and learning target)

### Section: Skill Levels

Only relevant when the student's skills are uneven (most intermediate
students). Optional overrides per skill.

- **Skill Level Overrides:** Four optional dropdowns (Reading, Writing,
  Speaking, Listening), each a CEFR sublevel. Empty means "same as
  general CEFR Level."

### Section: Interests

- **Interests** (tag input, press Enter to add)

### Section: Teaching Context

- **Learning Goals** (editable list, text per item)
- **Short-Term Objectives** (editable list, each: text + optional
  target date)
- **Areas to Improve / Weaknesses** (structured add: description +
  category)
- **Specific Difficulties** (structured add: description + competency +
  subcategory + severity)

### Section: Notes

- **Personal Notes** (textarea. About the student as a person:
  sensitivities, context, life situation.)
- **Teaching Notes** (textarea. How this student learns, what works
  in class, pedagogical observations.)

### Section: Commercial

- **Active** (toggle, default on)
- **Corporate** (toggle, default off)
- **Rate** (text, max 32. Free text with autocomplete from prior
  values. "12 euros", "15 EUR/h", "corporativo-mensual".)

### Section: Teaching Todos

Pedagogical backlog for this student. Inline editable list.

- Each item: text + status (pending/covered/discarded) + created date
- Add new items inline
- Mark items as covered (with optional link to which session)
- Items persist across sessions, don't get buried

### Section: Followups

Operational items the teacher owes this student. Filtered view of
the teacher-level TeacherFollowup entity.

- Each item: text + status (pending/done) + age ("3d ago")
- Add new items inline
- Check off as done
- Visually distinct from Teaching Todos (amber convention)

### Section: Courses

- List of linked courses (read-only here, managed from course pages)
- "Create Course" button

---

## 4. Log Session (`/students/:id/log-session`)

**Purpose:** Post-class capture. The most critical moment in the
teacher's workflow: 5 minutes after class to record what happened.

**Key design principle:** The teacher must see student context while
writing. Not a modal. Full page, two columns.

### Left column: Student context (read-only, ~35%)

Shows everything the teacher needs to reference while logging:

- **Student header:** Name, level, L1, session number.
- **Objectives:** Short-term objectives with dates. Amber highlight
  if within 6 weeks of deadline.
- **Teaching Todos:** Checklist. Teacher can check items off as
  "covered in this session" while logging.
- **Pending Followups:** Operational items owed to this student
  (amber dots, same as dashboard). Read-only or checkable (open
  question for PM/Vera).
- **Last Session:** Date, summary, homework status. Auto-populated.
- **Planned for Today:** Pre-populated from last session's "Topics
  for next session." Indigo-tinted background to show it's auto-filled.
- **Active Difficulties:** Checklist to mark which were worked on today.

### Right column: Session log form (~65%)

- **Row 1:** Date (defaults today) + Duration (dropdown: 30/45/60/90) +
  Cancelled toggle.
- **What Happened:** Main textarea. What was actually covered.
- **Homework:** Single line.
- **Next Session:** Textarea. What to focus on next time. This feeds
  the next session's "Planned for Today."
- **New Teaching Todos:** Quick-add list. Pedagogical ideas that came
  up. Saved to the student's backlog.
- **New Followups:** Quick-add list. Operational promises ("send PDF",
  "share audio"). Saved to teacher-level followup tray. Visually
  distinct from Teaching Todos (amber tint).
- **Topics Covered:** Tag input with category.
- **Level Reassessment:** Toggle + CEFR level dropdown (active when on).
- **Session Notes:** Textarea scoped to this session ("mood, energy,
  context today"), not profile-level observations.
- **Linked Lesson:** Dropdown with search.
- **Audio:** Record + Upload buttons.
- **Footer:** Cancel + Log Session buttons.

### Voice recording behavior

When the teacher records or uploads audio, the transcription is sent
to Claude for structured extraction. Currently extracts 7 fields.
Should also extract:

- topicTags (teachers always name what they covered)
- previousHomeworkStatus ("hizo los deberes" / "no los trajo")
- teachingTodos ("tengo que trabajar X con este alumno")
- teacherFollowups ("le tengo que mandar el PDF")
- levelReassessment ("creo que ya esta en B1")
- duration ("clase de 45 minutos")
- isCancelled ("cancelo la clase")

Voice on existing sessions should merge/append, not create duplicates.

---

## Open questions for PM / Sophy / Vera

1. Log Session: full page or slide-over panel?
2. TeachingTodos checked off during logging: immediate or on submit?
3. No previous session: show empty "Planned for Today" or hide it?
4. Duration: dropdown (30/45/60/90) or free text?
5. Session number: count cancelled sessions or not?
6. Teaching Todos vs Followups quick-add: two sections clear enough, or
   needs a type toggle?
7. Pending followups in context panel: read-only or checkable?
8. Voice merge strategy for second note: append, replace, or diff UI?
9. Voice on confirmed sessions: revert to Draft or auto-confirm?
10. Extraction model: Haiku sufficient for expanded schema, or needs Sonnet?
