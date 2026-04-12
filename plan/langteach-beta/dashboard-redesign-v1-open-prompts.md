# Dashboard redesign v1 — Open-ended Stitch prompts

> **Purpose:** Give Stitch maximum creative freedom while keeping the
> data requirements and user context tight. Each prompt describes WHO
> uses the screen, WHAT information it must surface, and WHY it matters.
> Layout, grouping, and interaction patterns are Stitch's job.
>
> **Fallback:** If the output doesn't work, fall back to
> `dashboard-redesign-v1-prompts.md` which has more prescriptive layout.
>
> **Companion docs:**
> - `docs/student-profile-field-guide.md` (field definitions)
> - `plan/langteach-beta/stitch-design-system/DESIGN.md` (Academic Atelier)

---

## Shared context (paste once at the start of a Stitch session)

> You are designing screens for "LangTeach", a web app for independent
> language teachers. The user is Jordi, a Spanish teacher in his 40s who
> manages 20-30 private students. He uses a laptop during prep, sometimes
> a tablet. He has 10 minutes between classes. Everything must be fast
> to scan and fast to act on.
>
> The app already has a design system called "Academic Atelier":
> - Indigo (#3525CD) as primary accent, zinc neutrals for canvas
> - No 1px borders anywhere. Depth comes from tonal layering (white
>   cards on light lavender backgrounds)
> - Typography: Manrope for headlines, Inter for UI
> - Glassmorphism for floating elements
> - Indigo gradient on primary buttons
> - CEFR badges: square with rounded corners (A-level = soft purple,
>   B-level = indigo, C-level = warm amber)
>
> Stack: React + TypeScript + Tailwind + shadcn/ui + Lucide icons.
>
> UI chrome (nav, headers, buttons, labels) is in English.
> Teacher-authored content (notes, todos, session text) is in Spanish.
> CEFR tokens are universal (A1, A2, B1, B2, C1, C2).
>
> Left sidebar navigation with: Dashboard, Students, Lessons, Courses,
> Settings. "LangTeach" wordmark at top. User avatar at bottom.

---

## Cohort (paste with each screen prompt)

> Use these 12 students as sample data. Vary their states to make
> the design realistic:
>
> | Name | CEFR | L1 | Situation |
> |------|------|----|-----------|
> | Ana Martins | B1 | Portuguese | Active, has a short-term objective (DELE B2 in June) |
> | Marco Bianchi | A2 | Italian | Active, corporate student, inconsistent attendance |
> | Sophie Laurent | B2 | French | Active, advanced, few difficulties |
> | Ricardo Müller | A1 | German | New student (started 2 weeks ago) |
> | Henk de Vries | A2 | Dutch | Active, retiring to Spain, highly motivated |
> | Nadia Kowalska | B1 | Polish | Active, preparing work presentation in May |
> | Hans Eriksson | A2 | Swedish | Inactive since February |
> | Carmen Chen | C1 | Mandarin | Active, wants to polish written register |
> | Lucia Fernández | B2 | Spanish (heritage) | Active, DELE B2 exam prep |
> | Yuki Tanaka | A1 | Japanese | Active, just started, very shy |
> | Olga Petrov | B1 | Russian | Active, irregular schedule |
> | Thomas Williams | A2 | English | Active, lives in Barcelona, immersion context |

---

## Screen 1: Students list (`/students`)

### Prompt 1: Students list (already generated, iterate)

> We have a working Students list design. The table layout, signal
> badges, and density are strong. Make these adjustments:
>
> **Keep as is (working well):**
> - Table layout with columns: Name (+ initials avatar with colored
>   background), CEFR Level badge, Native Language, Last Session
>   (relative), Next Session (relative with time, e.g. "Today
>   10:30"), Signals
> - Signal badges: "Cancelled 2x" (amber), "Review pending"
>   (indigo), "NEW" (indigo), "Inactive 12d" (red), "Exam prep"
>   (indigo), "RETURNING" (grey). These tell the teacher who needs
>   attention at a glance.
> - Search bar
> - "Add Student" primary CTA button
> - Footer: "Showing 12 of 24 students" + "Load more"
> - Row density: compact enough to show 10-12 students without
>   scrolling on a laptop viewport
> - Clicking a row navigates to the student detail page (Overview
>   tab). Row hover state: background shifts to
>   surface-container-highest per the Atelier system.
>
> **Changes needed:**
>
> 1. **CEFR filter as horizontal pills, not a dropdown.** Show
>    All, A1, A2, B1, B2, C1, C2 as toggle pills in a row. Six
>    options is within the "visible at a glance" threshold. Faster
>    than opening a dropdown. Place beside the search bar.
>
> 2. **Add sort dropdown.** "Sort by: Next Session" (default),
>    with options: Next Session, Last Session, Name, CEFR Level.
>    Place on the right side of the toolbar.
>
> 3. **Fix sidebar nav.** Use the standard app navigation:
>    Dashboard, Students, Sessions, Courses, Lessons, Settings.
>
> 4. **Remove "Curation Note."** The footer text about "roster
>    optimized for today's curriculum" has no data backing it.
>    Remove.
>
>> 5. **Add edit icon per row.** A small ghost-style pencil icon
>    on the right side of each row for quick navigation to Edit
>    Student. No delete icon inline (too destructive for a list
>    view).

### Prompt 1b: Students list (density fix)

> The Students list has the right features now (CEFR pills, sort
> dropdown, signal badges, correct sidebar). But the rows are too
> tall. Only 7-8 students are visible without scrolling. The
> previous version showed 12. This is a density regression.
>
> **The problem:** Column content is wrapping to two lines. Names
> like "Oksana Petrenko" stack vertically. "Next Session" values
> like "Today 10:30" stack. Signal badges take too much vertical
> space. Row padding looks increased.
>
> **Fix the density:**
>
> 1. **Single-line rows.** Names, native language, dates, and
>    signals must all fit on one line per row. No wrapping.
>    If a name is long, truncate with ellipsis rather than wrap.
>
> 2. **Reduce row padding.** Tighten vertical padding to match
>    the original density. The table is the teacher's daily
>    command post; density is a feature, not a compromise.
>
> 3. **Compact signal badges.** Make badges smaller (label-sm
>    size). They should be scannable, not dominating the row.
>
> 4. **Column widths.** Give Name the most horizontal space.
>    CEFR Level, Last Session, and Next Session can be narrower
>    (these are short values). This prevents wrapping.
>
> **Target:** 10-12 students visible without scrolling on a
> 1440x900 viewport. The original version achieved this. The
> new version must match that density while keeping the improved
> toolbar and signal system.

---

## Screen 2: Student detail (`/students/:id`)

**Tab structure (decided 2026-04-11 after first Stitch round + Isaac review):**

| Tab | Purpose | Frequency |
|-----|---------|-----------|
| Overview | The "glance" tab. Summary of everything actionable. | Daily |
| Profile | The "deep" tab. Full identity, languages, notes, goals, difficulties, commercial. | Weekly/monthly |
| Sessions | Full session timeline with filters and search. | Weekly |
| Progress | Skill overview, pacing, coverage analysis. | Periodic |

**Header (always visible across all tabs):**
Name, avatar, CEFR badge, profession, origin/residence ("Lisbon / Madrid"),
Active + Private/Corporate badges, next session with time and duration.
Actions: "Edit Student", "Log Session" (primary CTA).

### Prompt 2a: Overview tab (already generated, iterate)

> We have a working Overview tab for the student detail page.
> Make these adjustments:
>
> - **Tabs:** Change from "Overview, Materials, Performance" to
>   "Overview, Profile, Sessions, Progress."
> - **Primary Objective card:** Remove the "65% Ready" progress
>   indicator. Show text, deadline, and days remaining only. There
>   is no backend for objective completion tracking.
> - **Pedagogical Profile card:** Remove trend labels ("Strong",
>   "Improving") from the skill bars. Keep the bars as a visual
>   encoding of the CEFR level (short bar = A1, full bar = C2).
>   Show only the CEFR sublevel label on each bar (e.g. "B2", "A2").
> - **Teacher's Working Memory:** Remove Attendance Rate and
>   Engagement Index (computed fields we can't build yet). Keep
>   "Student Since." Give the text area more room to breathe.
> - **Session History:** Keep as is. Show last 2-3 sessions only,
>   with a link to the Sessions tab for full history.
> - Everything else (the three-card row, the header, the timeline)
>   is good. Keep it.

### Prompt 2b: Profile tab (already generated, iterate)

> We have a working Profile tab for the student detail page.
> The overall layout and hierarchy are strong. Make these
> adjustments:
>
> **Keep as is (these are working well):**
> - "THE WHY / MOTIVACION" hero treatment at top with interest tags.
>   This is the best element on the page.
> - Pedagogical Diagnostic section grouping (Learning Goals,
>   Short-Term Objectives, Skill Assessment Overrides, Difficulties)
> - Identity Details card on the right (Profession, Born, Origin,
>   Residence)
> - Overall visual rhythm: motivation (why) at top, diagnostic
>   (where/what) in middle, working memory (how) at bottom
>
> **Changes needed:**
>
> 1. **Split Teaching Todos into two separate lists:**
>    - "Teaching Todos" (indigo convention): pedagogical ideas
>      ("Find Spanish podcasts about architecture", "Review
>      conditional mood with narrative exercises"). Checkable as
>      pending/covered/discarded.
>    - "Pending Followups" (amber convention): operational items
>      the teacher owes this student ("Send DELE B2 practice PDFs",
>      "Share audio clip"). Checkable as pending/done.
>    These are two different mental categories for the teacher.
>    Keep them visually distinct with color and separate headers.
>
> 2. **Working Memory & Notes: two subsections, one card.**
>    Keep them under one visual container but with clear separation:
>    - "Sensitivities / Life Context" (maps to PersonalNotes):
>      about the person. Sensitive data.
>    - "Pedagogical Observations" (maps to TeachingNotes): how to
>      teach this student. Teaching strategy.
>    Use a subtle tonal shift or spacing gap between them.
>    The subsection labels Stitch already uses are perfect.
>
> 3. **Remove "Learning Thread" section entirely.** The curriculum
>    data (Current/Next/Planned topics) depends on a Course entity
>    that doesn't exist yet. Don't show a placeholder.
>
> 4. **SpokenLanguages: remove proficiency levels.** Show just the
>    language name, no "B1 PROFICIENCY" badges. The data model is a
>    flat list of language names.
>
> 5. **Language labels: fix "PRAXIS."** Replace with:
>    - "Teacher's Assessment: B1" (the teacher's own CEFR judgment)
>    - "Official: A2" (from an exam or platform)
>
> 6. **Rate: remove billing details.** No "Billed bi-weekly via
>    Wire Transfer." Just show the rate as free text (e.g. "45/hr").
>
> 7. **Difficulty status labels:** Use "Working" and "Covered"
>    instead of "Advancing" and "Reviewing." For trend, use
>    "Improving", "Stable", or "Regressing."
>
>> 8. **Short-Term Objectives:** Remove the chevron (>) arrows.
>    These are standalone items with dates, not links to curriculum.
>    Show the full list with target dates and amber highlight when
>    within 6 weeks of deadline.

### Prompt 2b-2: Profile tab (second iteration)

> The Profile tab is almost there. A few label and affordance fixes:
>
> 1. **Section heading:** Change "Working Memory & Student Notes"
>    to just "Teacher's Working Memory." Both subsections
>    (Sensitivities/Life Context and Pedagogical Observations) are
>    for the teacher. The subsection labels already clarify what
>    goes in each.
>
> 2. **"STRONG POINTS" label:** Rename to "Spoken Languages" or
>    "Other Languages." Portuguese and English are languages Ana
>    speaks, not strong points. Match the data model.
>
> 3. **Add an Interests section on the right column,** below
>    Identity Details. The tags next to the motivation quote are
>    nice for display, but Profile is the reference tab. Show the
>    full list of interest tags here with an edit affordance.
>
> 4. **ReasonForStudying edit affordance:** Add a small ghost-style
>    pencil icon on hover near the motivation quote. The teacher
>    should be able to edit this in place without navigating to
>    Edit Student. Inline edit or click-to-expand textarea.
>
> 5. **Past-due objectives:** The "Architectural Vocabulary Module,
>    March 22" objective has a past date. Past-due objectives
>    should be visually distinct from upcoming ones (muted or
>    flagged as overdue). Don't treat them the same as neutral
>    future items.

### Prompt 2c: Sessions tab (already generated, iterate)

> We have a working Sessions tab. The expand/collapse pattern,
> toolbar, cancelled session treatment, and homework card
> separation are all working well. Make these adjustments:
>
> 1. **Header consistency:** Make the student header treatment
>    identical to the Overview and Profile tabs. Currently the
>    Sessions header feels lighter (breadcrumb "Students > Ana
>    Martins" without the same header density). Use the same
>    header block: avatar, name, CEFR badge, profession,
>    origin/residence, Active + Private badges, next session.
>    Tabs sit in the same position across all four tabs.
>
> 2. **Voice note icon:** The microphone icon on sessions with
>    audio should be interactive, not just an indicator. Add a
>    tooltip ("Play recording") and make it clickable to play
>    the audio inline. For v1, a simple audio player expanding
>    below the session header is enough.
>
> 3. **Keep everything else as is:**
>    - Expand/collapse with chevron
>    - "TOTAL HOURS 42.5" in header (no streak counter)
>    - Toolbar: Search + Date Range + status pills
>      (All/Completed/Cancelled/Draft) + Topic filter
>    - Expanded view: Session Narrative (quoted, Spanish) +
>      Teacher Notes (indigo left-border) + Homework card
>      (Previous Homework status + Homework Assigned, separate
>      labels) + Next Session Plan + linked lesson
>    - Cancelled sessions greyed out with reason, 0 min
>    - Three-dot menu (Edit, Delete)
>    - "Showing 15 of 42 sessions" + "Load earlier sessions"

### Prompt 2d: Progress tab (already generated, iterate)

> We have a working Progress tab. The skill bars and pacing
> analytics are strong, but several elements reach past the data
> we have. Make these adjustments:
>
> **Keep and adjust:**
>
> 1. **Skill Imbalance bars:** Keep the horizontal bar
>    visualization (Reading B2, Speaking B1, Listening B1,
>    Writing A2). Change the subtitle from "Mapping current
>    proficiencies against target B1 benchmark" to "Skill levels
>    compared to general CEFR level (B1)." The baseline is the
>    student's current CefrLevel, not a target. We don't have a
>    target level field.
>
> 2. **Remove AI annotations:** Delete "ADVANCED PROFICIENCY
>    DETECTED" on Reading and "FOCUS AREA: SYNTACTIC PRECISION"
>    on Writing. The bars already communicate the imbalance
>    visually. No analysis pipeline exists for these labels.
>
> 3. **Pacing Analytics:** Keep 14 sessions, 1.2/wk frequency,
>    since Jan. Keep Cancellation Rate 7% but remove the green
>    trend dot (no historical comparison data to drive it).
>
> 4. **"LEARNING TRACK: European Portuguese":** Change to
>    "Native: Portuguese" or remove. There is no learning track
>    concept in the model.
>
> **Remove:**
>
> 5. **Curriculum Progress timeline:** Remove entirely (the
>    "Colloquial Imperatives", "Past Narratives", "Abstract
>    Writing" entries). This depends on a Course entity that
>    doesn't exist yet.
>
> **Add:**
>
> 6. **Difficulties Summary:** A compact section showing how the
>    student's difficulties have evolved. Which difficulties moved
>    from "working" to "covered" (progress). Which have been
>    "working" for a long time with no session touching them
>    (stale, need attention). This data exists today (Difficulties
>    + SessionLog references). Format as a simple list or small
>    table: difficulty name, status, time in current status.
>
> **"Coming soon" placeholders (use the same rounded card style
> as the Topic Analysis placeholder):**
>
> 7. **Topic Analysis:** Keep as is. "COMING SOON."
>
> 8. **Curriculum Progress:** Replace the removed timeline with a
>    placeholder card: "Curriculum Progress: COMING SOON. Track
>    your lesson plan milestones."
>
> 9. **Engagement Trends:** Add a new placeholder card:
>    "Engagement Trends: COMING SOON. How your student's
>    engagement evolves over time."
>
> **Design note:** The tab will feel sparse, and that's OK. Three
> real sections (skill bars, pacing, difficulties summary) plus
> three "coming soon" placeholders. The placeholders serve double
> duty: they fill the visual space AND they're conversation
> starters with our first customer to validate what to build next.
> Make the real sections feel solid and valuable on their own.

---

## Screen 3: Edit Student (`/students/:id/edit`)

### Prompt 3: Edit Student (already generated, iterate)

> We have a working Edit Student form. The content layout and field
> grouping are strong. One structural change needed, plus polish.
>
> **Structural change: restore the app sidebar.**
>
> The current design replaces the app navigation sidebar (Dashboard,
> Students, Sessions, Courses, Lessons, Settings) with a form
> section nav (Basic Info, Background, Proficiency, etc.). This
> breaks spatial memory: the teacher expects the left sidebar to
> be app navigation on every screen. When it suddenly becomes form
> navigation, it's disorienting.
>
> Instead: **keep the normal app sidebar.** Add a sticky horizontal
> section nav (pill-style links or a scrollspy indicator) at the
> top of the form content area, just below the "Edit Student" header
> and above the first form section. Sections: Basic Info, Background,
> Proficiency, Teaching Goals, Difficulties, Notes, Commercial.
> Clicking a section link scrolls the form to that section. The
> active section highlights as the teacher scrolls.
>
> This gives section jumping without losing "where am I in the app."
>
> **Keep as is (working well):**
> - Basic Information + Proficiency Details side by side at the top
>   (name, language, levels, and four skill override badges in one
>   view)
> - "ACTIVE STUDENT" badge in the header
> - Personal Background with Birth Year, Profession, Origin &
>   Residence on the left and Reason for Studying as a large
>   textarea on the right
> - Origin & Residence combined with location pins (collapses four
>   fields into two readable lines)
> - Interest tags with "+ Add Interest" input
> - Cancel / Save Profile buttons in top bar (keep these sticky)
>
> **Verify the sections below the fold follow the same quality:**
> - Teaching Goals: Learning Goals (editable list) + Short-Term
>   Objectives (each with text + optional target date)
> - Difficulties: structured add (competency + subcategory +
>   severity). Status labels: Working/Covered. Trend labels:
>   Stable/Improving/Regressing.
> - Notes: two separate textareas. "Sensitivities / Life Context"
>   (PersonalNotes) and "Pedagogical Observations" (TeachingNotes).
>   Same subsection convention as the Profile tab.
> - Teaching Todos: inline editable list, each item with text +
>   status (pending/covered/discarded) + created date
> - Pending Followups: separate from Teaching Todos, amber
>   convention, each with text + status (pending/done) + age
> - Commercial: Active toggle, Corporate toggle, Rate (free text
>   with autocomplete). Low visual priority.
> - Courses: read-only list of linked courses + "Create Course"
>   button
>
> **Design challenge reminder:** Most fields are optional. The
> "day one" path is just name, language, and level. Everything
> else fills in gradually over weeks. The form should make that
> minimal path fast while keeping the full picture discoverable.

---

## Screen 4: Log Session (`/students/:id/log-session`)

### Prompt 4: Log Session (redesign from scratch)

> Design the Log Session page for LangTeach. This is the most
> critical moment in the teacher's workflow: 5 minutes after class,
> Jordi sits down to record what happened before he forgets.
>
> **Important:** This page must feel like it belongs in the same app
> as the Student Detail, Edit Student, and Students List screens.
> Same sidebar, same visual language, same Academic Atelier design
> system. Do not break the layout to accommodate this screen.
>
> **Who uses this and when:** Immediately after every class. The
> teacher has 5-10 minutes before the next student. Speed matters.
> The most common path is: write "what happened," jot homework,
> note next session plan, maybe add a teaching todo, save. That
> path should take under 3 minutes.
>
> **The design problem (solve it however you think works best):**
>
> While logging a session, the teacher needs to reference student
> context: what was planned for today, what the last session covered,
> active teaching todos, short-term objectives, active difficulties.
> The teacher thinks "what did I plan?" while writing "what actually
> happened." This context needs to be accessible without leaving
> the page, but it does NOT need to be permanently visible in a
> side-by-side split. Consider creative alternatives:
>
> - A collapsible/expandable context panel the teacher can open
>   when needed and close to focus on writing
> - Context cards above the form that scroll away as the teacher
>   types
> - A slide-over drawer triggered by a button
> - Inline references embedded near the relevant form fields
>   (e.g., "Planned for today" shown right above the "What
>   happened" textarea)
> - Or something else entirely
>
> The key insight: the teacher glances at context BEFORE writing,
> then focuses on the form. It's sequential, not simultaneous.
> Design for that flow.
>
> **Student context the teacher needs to reference:**
> - Student name, level, native language, session number
> - Short-term objectives with dates (amber if deadline is close)
> - Teaching todos (checkable as "covered in this session")
> - Pending followups (operational items owed to this student)
> - Last session: date, summary, homework status
> - What was planned for today (auto-populated from last session's
>   "next session topics," visually distinct as auto-filled)
> - Active difficulties (checkable: which were worked on today)
>
> **Session log fields the teacher fills in:**
> - Date (default: today) + Duration (30/45/60/90 min) +
>   Cancelled toggle
> - What happened (main textarea, the session narrative)
> - Homework assigned (single line)
> - Next session plan (textarea, feeds the next session's
>   "planned for today")
> - New teaching todos (quick-add, pedagogical ideas that came up.
>   Saved to student's backlog)
> - New followups (quick-add, operational promises like "send PDF."
>   Amber convention. Saved to teacher-level followup tray)
> - Topics covered (tag input)
> - Level reassessment (toggle + CEFR dropdown, only when toggled)
> - Session-specific notes (mood, energy, context today)
> - Linked lesson (dropdown with search)
> - Audio: record + upload buttons (transcription fills fields
>   via AI extraction)
>
> **Field priority:** "What happened," homework, and next session
> plan are used every time. Topics, level reassessment, session
> notes, and linked lesson are used occasionally. Design the form
> so the frequent fields are prominent and the occasional fields
> are discoverable but don't add visual weight to the default view.

### Prompt 4b: Log Session (iterate on current design)

> The Log Session layout is working well. The compact context card
> alongside the form preserves the app's look and feel while giving
> the teacher the briefing they need. Make these adjustments:
>
> **Keep as is (working well):**
> - The context card on the left (student info, current goal,
>   teaching todos, last session summary, planned for today)
>   alongside the "What Happened?" form on the right. This is
>   not a rigid two-column split; the context scrolls away as
>   the teacher moves into the form. Good.
> - The inline reference line inside "What Happened?" pulling
>   from planned content ("Reference: Narrating past events,
>   Por vs Para"). Smart, zero overhead.
> - Teaching Todos + Pending Followups side by side with
>   quick-add inputs and amber convention on followups.
> - Homework Assigned + Next Session Plan side by side.
> - Topics Covered as tag input.
> - Level Check toggle for reassessment.
> - "Save Log" as primary CTA in top bar.
>
> **Changes needed:**
>
> 1. **Fix sidebar nav items.** Use the standard app navigation:
>    Dashboard, Students, Sessions, Courses, Lessons, Settings.
>    Not "Curriculum" or "Reports."
>
> 2. **Rename "Teaching Tasks" to "Teaching Todos."** Match the
>    label used on every other screen ("Ideas para clases" /
>    "Teaching Todos").
>
> 3. **Add Active Difficulties to the context card.** Below
>    "Planned for Today," show a checklist of the student's
>    active difficulties (e.g., "Ser vs Estar," "Indefinido
>    irregulares"). Checkable: the teacher marks which
>    difficulties were worked on in this session.
>
> 4. **Add Duration and Cancelled toggle.** Near the top of the
>    form, beside the session date and "SESSION #15." Duration
>    as a dropdown (30/45/60/90 min). Cancelled as a toggle.
>    These are missing from the current design.
>
> 5. **Replace "Session Mood" emojis with "Session Notes."**
>    A small textarea for mood, energy, and context observations
>    ("Ana was tired today, kept it light"). Maps to the
>    generalNotes field. Emoji mood tracking is not in the data
>    model.
>
> 6. **Rename "Record Reflection" to "Voice Note."** And
>    "Upload Audio" stays as is. "Record Reflection" is unusual;
>    "Voice Note" matches the app's language.
>
> 7. **Add Linked Lesson.** A dropdown with search, below the
>    Topics Covered section. "Link to lesson plan (optional)."
>    Used occasionally but should be present.

---

## Open questions (decisions needed from PM or UX before finalizing)

1. Duration: constrained dropdown (30/45/60/90) or free-text minutes?
2. Session numbering: count cancelled sessions or skip them?
3. Teaching Todos vs Followups in the quick-add: two visible sections,
   or a type selector on each item?
4. Pending followups in context panel: read-only or checkable?
5. Voice merge strategy for a second recording: append, replace, or
   show a diff?
6. Voice on a confirmed session: revert to Draft or auto-confirm?
