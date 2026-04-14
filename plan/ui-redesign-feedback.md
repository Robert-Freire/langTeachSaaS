1. Dashboard. Done (Vera 2026-04-13, Isaac 2026-04-12)

2. students list. **=> #718**
 * Isaac (pedagogy review, 2026-04-12):
   - **Sort default: disagree with "Next Session" as default.** Most private teachers don't schedule sessions in advance. They teach, log, and book the next one ad hoc. "Next Session" shows dashes for nearly everyone, making the sort meaningless. **"Last Session" (most recent first) should be the default.** The most common question is "who did I just teach?" followed by "who haven't I seen in a while?" Inactive students naturally float to the bottom.
   - **Subtitle accuracy: strong agree.** Calling 35 students "active" when several show "Inactive 58d" is misleading. A teacher trusts that number for workload estimation. Drop "active": "Managing 35 language learners in your atelier."
   - **"SIGNALS" column name: rename it.** "Signals" is developer language. A teacher would understand "ALERTS" or "ATTENTION" more naturally. It's a small thing, but it's the difference between an interface that feels built for engineers vs one built for teachers.
   - **No pacing indicator (future consideration).** Once Course Planner exists (Phase 2), teachers will want to see at a glance whether a student is on track, behind, or ahead. The signals column could carry a pacing badge (e.g., "Behind 2 sessions"). Not needed now, but the column should be designed with room to grow.
 * Vera
   - **Signal badges (CRITICAL):** The signals column should be the teacher's at-a-glance triage view. Currently all signals render as plain colored text (`px-1.5 py-0.5 rounded-md text-[0.6875rem]` in `Students.tsx:449`). The Stitch design shows them as distinct, filled pill badges with `full` roundedness (9999px), each signal type with its own color:
     - `NEW`: green fill, white text (currently: `bg-indigo-50 text-indigo-700`, barely visible)
     - `RETURNING`: dark/charcoal fill (`on-surface` #1A1B22), white text (currently: `bg-zinc-100 text-zinc-600`)
     - `Inactive Xd`: amber/orange fill, white text (currently: `bg-red-50 text-red-700`, using red instead of amber)
     - `Cancelled 2x`: dark fill with a red dot prefix indicator (currently: `bg-amber-50 text-amber-700`)
     - `Review pending`: indigo fill (`primary` #3525CD), white text (currently: `bg-indigo-50 text-indigo-700`, too faint)
     - `Exam prep`: indigo/teal fill, white text (currently: `bg-indigo-50 text-indigo-700`)
     - The variant map is at `SIGNAL_VARIANT_CLASSES` in `Students.tsx:144`. All current styles use light backgrounds with colored text. Stitch shows bold filled backgrounds with white/light text. The visual weight is completely different.
   - **CEFR badge shape:** `CefrBadge.tsx:22` uses `rounded-md` which is correct (`md` = 0.375rem per spec). However the Stitch design shows slightly wider badges with more horizontal padding. Current: `px-1.5 py-0.5`. Consider `px-2 py-0.5` for better proportions. Colors are correct per spec: A-level `bg-[#DDE8F5]` (secondary-container), B-level `bg-[#ECEAFD]` (primary-fixed), C-level `bg-[#F8E9D6]` (tertiary-fixed).
   - **Pencil edit icon:** Not present in Stitch original. The row click navigates to the student detail view (`/students/:id`), while the pencil (`Students.tsx:469-472`) navigates to the edit form (`/students/:id/edit`). These are different screens, so the pencil is not redundant. However, the Stitch design did not include it. Remove it to match Stitch and rely on the Edit button inside the detail view. 
   - **Native Language column empty:** All 35 rows show "—". The column `NATIVE LANGUAGE` takes ~120px of horizontal space delivering zero information. 
          We need to seed data must populate this field for test students, The Stitch design shows every student with a language (Russian, English, Italian, etc.). Use the application to do it and register "problems"
   - **Swap search/filter positions:** Stitch layout: search bar on the left, CEFR tabs on the right. Current implementation (`Students.tsx:296-340`): CEFR tabs on the left, search bar in the middle. Swap them. The search bar is the most frequent interaction and should be in the primary position (leftmost, where the eye starts in LTR reading).
   - **Sort control styling:** Current implementation uses a native `<select>` element (`Students.tsx:330-335`) with classes `bg-white border border-zinc-200 rounded-md`. The `border` also violates the no-line rule. Stitch design shows a custom text control: "Sort by:" label in zinc-500, "Next Session" in zinc-800 font-medium, with a small up/down arrow icon. Replace the native select with a custom dropdown (e.g. Radix `DropdownMenu` or `Popover`) styled to match. Options: Next Session, Last Session, Name, CEFR Level.
   - **Center "Load more" button:** Currently right-aligned within the table footer. Standard pagination pattern is centered. Move the "Load more" button to `text-center` within its container.
   - **Subtitle accuracy:** The subtitle reads "Managing 35 active language learners in your atelier" but multiple students are flagged "Inactive" (58d, 52d, 42d, 76d). Options: (a) change "active" to just the count ("Managing 35 language learners")
   - **Subtitle doesn't update when filtering:** Filtering to B2 still says "Managing 35 active language learners." The subtitle should reflect the current view. When a CEFR filter is active: "Managing 1 B2 learner in your atelier." When search is active: "Showing 1 result for 'nat'." The `filteredStudents.length` is already available in the component state.
   - **List state lost on back navigation:** All list state (`visibleCount`, `cefrFilter`, `searchQuery`, `sortBy`) uses `useState` (`Students.tsx:201-204`), so navigating to a student and pressing back resets everything: pagination, filter, search, and sort. **Recommended fix:** replace all four `useState` calls with `useSearchParams` from React Router. The URL becomes `/students?level=B2&q=nat&sort=name&count=24`. React Router preserves search params on back navigation automatically. One refactor, four wins: pagination, filter, search, and sort all survive navigation. Also makes the view shareable/bookmarkable.
   - **Sort dropdown border violates no-line rule:** The native select has `border border-zinc-200` (`Students.tsx:334`). The design system prohibits 1px solid borders (DESIGN.md section 2). If keeping a select element, use ghost border at 20% opacity (`outline-variant` #C7C4D8 at 20%) or remove the border entirely and use tonal background shift.
   - **Row hover color breaks tonal family:** Current hover is `hover:bg-[#E3E1EC]` (`Students.tsx:393`), a cool neutral gray. The entire screen uses warm lavender tones: canvas `#FBF8FF`, sidebar `#F4F2FD`, cards on white. The gray hover clashes with this palette. Replace with a warm lavender hover that stays in the same tonal family, e.g. `#ECEAFD` (already used for B-level CEFR badges) or `#E8E5F5`. The design system (`DESIGN.md:64`) specifies `surface-container-highest` with `lg` (0.5rem) corner radius for list item hovers. The row should feel like it "lifts" within the lavender world, not shift to a cold gray.
   
3. Student detail
 3.0 (shared header, all tabs) **=> #719**
  * Vera (UX review, 2026-04-12):
    - **Add L1 + profession + location subtitle under name (agree with Isaac).** The header shows "Nataliya" with status badges but nothing about who she is. Isaac is right that L1 is the most critical piece: Ukrainian vs Brazilian vs English L1 fundamentally changes teaching approach (phonetics, false cognates, grammar transfer). Combine both: "Ukrainian speaker · Software Engineer, Kyiv" gives the pedagogical identity AND the personal identity in one line. Data already exists in profile fields.
    - **Primary Objective: integrate into header card, not a separate strip.** Currently it's a full-width pale band with "No objectives set" in italic, wasting ~60px of vertical space. Stitch renders it as a compact card in the top-right of the header. When set: show it inside the header area with `tertiary` (#7E3000) warm tone, deadline, and days-remaining countdown (like Stitch). When empty: hide entirely. This saves vertical space, which matters for the no-scroll goal (see Overview layout constraint below).
    - **Tab row (Overview/Profile/Sessions/Progress) is visually weak.** Active tab has an indigo underline (correct), but inactive tabs are plain gray text with no container or hover affordance. They feel like labels, not clickable tabs. Fitts' law: the click target is just the word "Profile" (~40px wide). Add more horizontal padding and a subtle hover state (tonal background shift to `surface-container-low` #F4F2FD).
    - **Breadcrumb navigation (future).** Stitch has "Students / Detail" above the tabs. We have a back arrow. The arrow works functionally but a small "Students / Nataliya" breadcrumb above the tabs reinforces navigation context. Not critical, consider for a future pass.
    - **"Edit Student" link vs button.** Current implementation shows a pencil icon + "Edit" as a text link. Stitch shows "Edit Student" as a secondary button. The text link is fine but could use slightly more visual weight to match the "Log Session" CTA pattern (primary + secondary button pair in the header).
    - **Session frequency indicator (agree with Isaac).** "Student Since: Apr 2026" in Lifecycle at the bottom of the page tells you nothing about engagement. A compact "3 sessions in 7 weeks" or "avg. every 16 days" near the header badges would immediately signal whether a student is progressing or drifting. Low effort, high value for the teacher's triage.
    - **Tab state not in URL (HIGH).** Clicking a tab (Overview/Profile/Sessions/Progress) changes the view but doesn't update the URL. Three problems: (1) Links aren't shareable (teacher copies URL to revisit a student's progress, lands on default tab instead). (2) Back button breaks (tab switch feels like navigation but doesn't push history, so back exits the student entirely instead of going to the previous tab). (3) Refresh loses position (F5 dumps back to default tab). Fix: use `useSearchParams` from React Router. Each tab click does `setSearchParams({ tab: 'progress' })`. The read side may already work (navigating directly to `?tab=progress` loads the correct tab), so the gap is likely just that clicking a tab doesn't push the param.
  * Isaac (pedagogy review, 2026-04-12):
    - **Header lacks pedagogical identity.** "Nataliya, Active, Private, B1, Spanish" is database metadata, not a student. A teacher with 8 students needs to distinguish *this* Nataliya instantly. The header should surface L1 (Ukrainian), primary goal (exam prep + conversation), and ideally the current difficulty focus. The right side of the header is mostly empty space next to Edit/Log Session. This is where the student's pedagogical fingerprint belongs.
    - **L1 must be visible without clicking Profile.** Ukrainian vs Brazilian vs English L1 fundamentally changes the teaching approach: different phonetic difficulties, false cognates, cultural references for communicative activities. A teacher switching between students needs this at a glance. Header or Pedagogical Profile card on Overview, not buried in the Profile tab.

  3.1 OVERVIEW **=> #720**
  * Vera (UX review, 2026-04-12):
    - **LAYOUT CONSTRAINT: everything must fit in one viewport without scrolling.** The Overview is the teacher's "5 minutes before class" screen. Everything they need should be visible when the page opens. Target layout in one viewport:
      ```
      Header (name, L1, badges, objective card integrated)
      ─────────────────────────────────────────────────────
      Tabs: Overview | Profile | Sessions | Progress
      ─────────────────────────────────────────────────────
      Three cards: Followups | Profile | Ideas
      ─────────────────────────────────────────────────────
      Last Session  [compact card]  (maybe 2nd)  View all →
      ─────────────────────────────────────────────────────
      Teacher's Working Memory              [dark block]
      ```
      This means: (a) Primary Objective integrated into header (saves ~60px), (b) session history limited to 1-2 compact cards (saves ~200px), (c) compact session cards using collapsed `SessionCard` variant (~80px each instead of ~130px). The Sessions tab handles full history.
    - **Three-card row color strategy is intentional, keep it, but refine it.** Stitch deliberately alternates warm and cool tones: indigo/lavender = "thinking" (data, structure), amber/warm = "action" (things needing attention). The Pending Followups card glows amber because followups are promises you might forget. **Keep the amber on Pending Followups, BUT make it conditional:** amber when there are pending items, neutral/white when empty. Currently the amber is always on, even with zero followups, which is crying wolf. Same logic for Ideas para Clases: quieter when empty, more present when populated.
    - **Card order: accept Isaac's reorder.** Current left-to-right: Ideas, Followups, Profile. Isaac argues followups are promises to the student (most urgent), ideas are aspirational (least urgent). His priority order makes pedagogical sense: (1) Pending Followups (leftmost), (2) Pedagogical Profile (what is this student working on?), (3) Ideas para Clases (rightmost, aspirational). The conditional amber reinforces the urgency without needing position, but LTR reading order + amber together creates a strong signal.
    - **Empty states: accept Isaac's rotating pedagogical prompts.** My original "Set a short-term goal for Nataliya" is generic. Isaac's rotating contextual questions are better because a teacher can answer them in 10 seconds between classes. Rotate by student ID + date (not random per visit, so the same question shows consistently until answered). Use Isaac's prompt lists per card (see Isaac's feedback below for the full set).
    - **Pedagogical Profile card: show difficulties, not just skill bars (agree with Isaac).** Skill level bars tell the teacher WHERE the student is. Difficulties tell them WHAT TO WORK ON TODAY. "Working on: pretérito vs imperfecto" is infinitely more actionable than "Writing: A2" for class prep. Show both when available; if space is tight, difficulties win. When no overrides are set, show goals + active difficulties instead of the empty-state prompt. Add native/target language tags at the bottom (L-UKRAINIAN, T-SPANISH) per Stitch.
    - **Ideas para Clases: move + button into card header.** Stitch integrates a small + icon in the card header, not a separate colored button below. Current green + button breaks the color system (green doesn't exist in the Academic Atelier palette). Move the trigger to the header, use `primary` indigo. The input can appear inline when clicked. Lighter, more integrated.
    - **Session History: 1-2 compact cards max, reuse Sessions tab tile (CRITICAL).** Currently shows 3 full-height session cards (~300-400px). For the no-scroll constraint, limit to 1-2 sessions using the collapsed `SessionCard` variant: calendar date block, title (one line, truncated), status badge, duration right-aligned, homework indicator (warm chip, not red text), action item/note count badges. One session answers "what happened last time?" Two sessions let the teacher spot patterns ("grammar twice in a row, let's do conversation"). Clicking navigates to Sessions tab. Same component as the Sessions tab tile, just in collapsed mode (learnability: teacher recognizes the same object in both contexts).
    - **Homework prominence in compact session card (agree with Isaac).** Beyond fixing the error-red color: homework is the first thing a teacher checks before class ("what did I assign?"). In the compact card, give homework its own row with a warm accent (tertiary #7E3000 or amber chip with icon prefix like Stitch). Don't bury it as a subtitle.
    - **Session title "Session" is useless (agree with Isaac).** Nataliya's April 10 entry shows just "Session" as the title. If the teacher didn't write a title, synthesize one from the narrative or topics covered ("Pretérito vs imperfecto, personal conversation"). A blank title wastes the most valuable line of the compact card.
    - **Session topic tags (future, blocked by adoption).** Isaac correctly identifies that the feature exists in the Log Session form but nobody uses it (zero tags across 11+ sessions). The display can't show chips that don't exist. The fix is in the Log Session form (move Topics Covered higher, auto-suggest from narrative), not the Overview. Display-side work deferred until input adoption improves.
    - **"View all" link in Session History.** With only 1-2 sessions showing, this link becomes more important (not less). Make it clearly visible: "View all sessions →" or rely on the Sessions tab as the obvious next step.
    - **Teacher's Working Memory: keep position, keep dark styling.** Isaac argued it should move above session history because it's "buried below the fold." With the no-scroll layout constraint, this concern is resolved: Working Memory is in the first viewport because everything fits without scrolling. The dark footer stays as the visual anchor at the bottom of the viewport, creating a strong "this is your private space" signal through contrast. Isaac's pedagogical point was valid (affective notes are critical), but the fix is making the page fit in one screen, not moving the component.
    - **Competency balance visibility (future, depends on topic tags).** Isaac flags that Nataliya's sessions are all grammar with zero oral production, which is a red flag for exam prep. Valid observation, but requires topic tag adoption first. Once tags exist, a small "skill coverage" indicator could surface gaps. Deferred.
  * Isaac (pedagogy review, 2026-04-12):
    - **Card order should follow teaching urgency, not current layout.** Current left-to-right: Ideas, Followups, Pedagogical Profile. A teacher scans left to right. Followups are promises to the student ("I'll prepare a mock exam"); breaking a promise loses credibility. Ideas are aspirational and can wait. Correct order: (1) Pending Followups (leftmost, most urgent), (2) Pedagogical Profile (what is this student working on?), (3) Ideas para Clases (rightmost, aspirational). Agree with Vera's conditional amber, but reading order matters more than color.
    - **Agree with Vera on empty states, but sharpen the prompts.** "Set a short-term goal" is too vague for a teacher between classes. Use a rotating list of pedagogically specific questions per card (rotate by student ID + date, not random per visit). Every prompt must be a question the teacher can answer in one sentence.
      - *Primary Objective (empty):* "What CEFR level is {name} working toward?" / "What should {name} be able to do by the end of this term?" / "Is {name} preparing for an exam, or building fluency?" / "Where does {name} want to be in 3 months?"
      - *Pedagogical Profile (empty):* "What does {name} struggle with most?" / "Which skill needs the most work: speaking, writing, reading, or listening?" / "Any grammar points {name} keeps getting wrong?" / "What's {name}'s weakest area right now?"
      - *Ideas para Clases (empty):* "Any topic {name} would enjoy practicing with?" / "What activity worked well with {name} last time?" / "Is there a grammar point you've been meaning to cover?"
      - *Pending Followups (empty):* "Anything you promised {name} for next class?" / "Any materials to prepare before the next session?"
    - **Pedagogical Profile card works well when skill overrides are set** (Reading A1, Speaking B1, Writing B1, Listening B2 renders clearly with progress bars). However, the card *only* shows skill level overrides. It doesn't surface active difficulties (e.g. "pretérito vs imperfecto, Working") or learning goals (conversation, exams) from the Profile tab. Skill levels tell the teacher *where the student is*; difficulties tell them *what to work on today*. Both matter, but if space is tight, "Working on: pretérito vs imperfecto" is more actionable for class prep than the skill bars. Consider adding a compact line for the top active difficulty below the skill bars, or when no overrides are set, show goals + difficulties instead of the empty-state prompt.
    - **Homework should be the most visible element in session cards.** Agree with Vera that error-red is wrong. But beyond color: homework is the first thing a teacher checks before class ("what did I assign last time?"). In the collapsed session card, homework should be a prominent indicator, not a subtitle.
    - **Session title "Session" is useless.** Nataliya's April 10 entry shows just "Session" as the title. If the teacher didn't write a title, the system should synthesize one from the narrative or topics covered ("Pretérito vs imperfecto, personal conversation"). A blank title wastes the most valuable line of the card.
    - **Session topic tags: the feature exists but nobody uses it.** The "Topics Covered" field already exists in the Log Session form with tag input + category dropdown. The data model is there. But across 11+ sessions for Nataliya, zero tags were entered. The problem is adoption, not architecture. The field sits at the bottom of the form, below Todos, Followups, and Today's Context, signaling "optional afterthought." For a teacher logging a session in 2 minutes between classes, everything below the fold is invisible. **Recommendation:** move Topics Covered higher in the form (right after the session narrative), and consider auto-suggesting tags from the narrative text (e.g. if the teacher writes "pretérito vs imperfecto," suggest that as a grammar tag). Without tag data, the Overview can't show competency chips and the Progress tab can't track skill balance. This is an adoption/UX problem, not a missing feature. Vera's "future" framing for the *display* was correct (can't render chips that don't exist), but the underlying issue is the input friction.
    - **Teacher's Working Memory is in the wrong place.** Vera says "keep the dark footer, the contrast works." Visually correct. Pedagogically wrong. Working Memory is where the teacher writes "Nataliya's father just came back from Ukraine, she was emotional, start gently." That note is the difference between a good class and a disaster. It's buried below the fold, below session history, below everything. A teacher opening this page 5 minutes before class won't scroll down. Move it above session history, or into the sidebar/right column. The affective dimension is not a footer.
    - **Missing: session frequency or gap indicator.** Nataliya has 3 sessions over ~7 weeks. Paula has 2 in one week. Alex.J has 3 in 2 weeks. The frequency tells the teacher whether this student is progressing normally or stagnating. "Student Since: Apr 2026" in Lifecycle at the bottom doesn't do this. A simple "3 sessions in 7 weeks" or "avg. every 16 days" near the header would immediately signal whether Nataliya is on track or drifting.
    - **No competency balance visibility.** For a B1 student with exam goals, the teacher needs to know: are we covering all four skills or hammering grammar exclusively? Looking at Nataliya's sessions (grammar correction, preterite/imperfect exercises, grammar exam), there's zero oral production visible. That's a red flag for exam prep. The overview doesn't surface this gap. This connects to the topic tags point above.

  3.2 PROFILE **=> #721**
    * Vera (UX review, 2026-04-13):
      - **LAYOUT: column proportions are inverted vs Stitch (CRITICAL).** Stitch uses ~60-65% left column for pedagogical content (the teacher's primary concern) and ~35-40% right column as a sidebar for identity/admin/quick-actions. Current implementation has roughly equal columns, and the left side is mostly empty space while the right side is packed. The pedagogical content should dominate; identity/admin should be the sidebar. This is the single biggest structural divergence from the Stitch design.
      - **Motivation banner lost its editorial personality (CRITICAL).** Stitch renders motivation as a hero moment: large Manrope quote, key phrase highlighted in indigo italic, interest chips (Architecture, Lisbon, Spanish Cinema) pulled into the banner. Current: a flat `surface-container-low` band with plain quoted text. For Nataliya it reads `"to fly"` in a form-field style. This is the most important section on the profile (it answers "why is this person learning Spanish?") and it's being treated like metadata. Needs: editorial typography (Manrope, larger size), emphasis on the emotionally relevant phrase, interest chips nearby.
      - **Teacher's Working Memory sidebar is missing from the right column.** Stitch opens the right column with a beautiful "Teacher's Working Memory" card on a tonal background: Profession, Born (with age calculation), Origin, Residence. Quick-glance identity facts in a key-value layout. Current: "IDENTITY DETAILS: No identity details added yet." Even for students with data, the identity information doesn't surface in this scannable format. The right column opens with emptiness instead of the most human, relatable information about the student.
      - **Pedagogical Diagnostic has no card container.** Stitch wraps the entire Pedagogical Diagnostic section (Learning Goals, Short-Term Objectives, Skill Assessment badges) inside a clearly defined card with a subtle tonal background and an indigo graduation cap icon. It reads as one cohesive pedagogical unit. Current: "PEDAGOGICAL DIAGNOSTIC" is a floating label-sm header with sub-items hanging below it on the same white surface, no tonal grouping, no icon. The sections don't feel related.
      - **Skill Assessment lost its visual punch.** Stitch: four large square CEFR badges (B2, A2, B1, B1) in a horizontal row with skill labels above, immediately scannable at a glance. The size and color coding make it the visual anchor of the pedagogical section. Current (Nataliya): a vertical list (Reading A1, Writing B1, Speaking B1, Listening B2) with small inline badges. Functional but lost all visual power. A teacher should glance at this and instantly know the skill profile without reading line by line.
      - **Focus Areas & Difficulties table is close to Stitch.** Same columns exist (Area, Subcategory, Trend, Status). The "Stable" trend text and "Working" status with green dot are reasonable. Main gap: needs a tonal card container like Stitch to group it visually with the pedagogical section.
      - **Section headers are flat, no visual hierarchy between groups.** All section headers (PEDAGOGICAL DIAGNOSTIC, FOCUS AREAS & DIFFICULTIES, SENSITIVITIES / LIFE CONTEXT, PEDAGOGICAL OBSERVATIONS, IDENTITY DETAILS, INTERESTS, etc.) use the same size, weight, and style. No visual grouping signals "these things belong together." The Atelier design system relies on tonal layering for grouping, but here everything sits on the same white surface with no depth differentiation.
      - **Left column has no inline-add affordance.** Every section on the left (Learning Goals, Short-Term Objectives, Focus Areas, Sensitivities, Pedagogical Observations) shows only placeholder text with no way to add data inline. Compare to the right side which has "+" on Interests and inline inputs for Teaching Todos. The teacher's only path to add a learning goal is the Edit button in the header (a full-form approach for what should be quick inline actions).
      - **Too many empty states shown simultaneously.** Anastasia's profile shows nine "No X yet" messages at once. This is a wall of absence that violates progressive disclosure. A teacher seeing a new student gets overwhelmed by everything they haven't filled in. Consider: (a) collapsing unpopulated sections into a compact summary, (b) showing only 2-3 priority sections expanded with the rest in a collapsed "More details" area, or (c) a focused onboarding card for brand-new students ("Start by adding motivation and identity details"). For future
      - **Left column dead zone.** Below "Pedagogical Observations" there's a vast empty white area (especially visible on Anastasia's empty profile). The column doesn't fill its height, making the page feel unfinished.
      - **Commercial section: missing rate display.** Stitch shows a card with the hourly rate (e.g. EUR45/hr) prominently displayed alongside Active/Private chips. Current: only the status chips. The card treatment and rate are absent.
      - **Language Ecosystem: missing flag icons.** Stitch shows small flag icons next to each language (PT for Portuguese, EN for English, ES for Spanish). Current: plain text "Spanish" with a B1 badge. The flags add scannability and personality.
      - **Priority fixes (top 3):** (1) Wrap Pedagogical Diagnostic in a tonal card with icon, grouping Learning Goals + Objectives + Skill Assessment. (2) Redesign Motivation banner with editorial typography and interest chip integration. (3) Fix column proportions to 60/40 with the left column as primary.
    * Isaac (pedagogy review, 2026-04-13):
      - **Motivation hero: agree with Vera, the Stitch version is pedagogically superior.** The Stitch design renders Ana Martins' reason as an editorial quote with the key phrase "Necesita español para el día a día" in indigo italic. That emphasis is not decorative; it's pedagogically functional. When a teacher reads "se jubila en 2 años y quiere vivir parte del año en Alicante," the italic phrase tells them *what kind of Spanish to teach*: survival communication, daily errands, neighbor conversations. Not academic, not business, not exam prep. The current flat rendering of "to fly" gives the teacher nothing to act on. Vera's call for editorial typography + interest chips in the banner is correct because interests (Architecture, Lisbon, Spanish Cinema) immediately suggest conversation topics and reading material. A teacher sees the motivation + interests together and can plan a lesson in their head before clicking anything else.
      - **Pedagogical Diagnostic card grouping: strongly agree with Vera.** The Stitch design wraps Learning Goals, Short-Term Objectives, Skill Assessment, and Focus Areas inside one card with a graduation cap icon and the student's CEFR badge (B1). This grouping is pedagogically correct because these four elements form the student's *learning plan*. Goals say where they're going, objectives set milestones, skill overrides show current position per competency, difficulties show what's blocking progress. In the current implementation, these sections are visually disconnected. A teacher scanning the page should read them as one unit: "B1 student, wants DELE B2, currently weak in Writing (A2), struggling with ser/estar and false cognates (Port-Esp)." That narrative only emerges when the sections are visually grouped.
      - **Skill Assessment as horizontal badges: agree with Vera, and adding a pedagogical reason.** Stitch shows Reading B2, Writing A2, Speaking B1, Listening B1 as four large square badges in a row. This is not just visually better; it maps directly to how teachers think about skill profiles. In the CEFR framework, each skill is assessed independently. A student can be B2 in Reading and A2 in Writing (common for immigrant students who read Spanish media but never write formally). The horizontal layout lets a teacher see the *shape* of the profile at a glance: the Ana Martins profile shows a clear gap (Writing A2 stands out against B1-B2 in other skills). That gap is the teaching priority. The current vertical list forces the teacher to read line by line, which means they're processing data instead of seeing a pattern.
      - **Stitch's right column order is pedagogically correct.** Teacher's Working Memory (Profession, Born, Origin, Residence) at the top, then Interests, then Commercial, then Teaching Todos, then Followups, then Language Ecosystem at the bottom. This order works because: (1) Identity facts (architect, 39, Lisbon, lives in Madrid) personalize the first 5 minutes of conversation ("How's the project going?" vs generic small talk), (2) Interests feed topic selection, (3) Commercial is administrative, (4) Todos and Followups are action items. The current implementation leads with "Identity Details" as a bare label with no data (for students without it filled in) and buries Language Ecosystem third. **One correction I'd make to the Stitch order:** Language Ecosystem should be higher, ideally second after identity. L1 is the most consequential variable for error prediction. Portuguese L1 learning Spanish means specific false cognates (exquisito, polvo, embarazada), near-transparent grammar that creates dangerous overconfidence, and phonetic transfer issues (/b/ vs /v/, nasal vowels). That information should be visible before Interests and Commercial.
      - **Focus Areas table: the trend + status model is pedagogically sound, but needs a "since when" column.** Stitch shows Grammar > Ser vs Estar > Stable > Working, and Vocabulary > False Cognates (Port-Esp) > Improving > Covered. Good. But a teacher also needs to know *how long* a difficulty has been active. "Ser/estar: Working" means different things if it's been 2 weeks vs 6 months. At 6 months of "Stable" on a B1 grammar point, the teaching approach needs to change (more production practice, less controlled drill). This is a future enhancement, not a current fix, but the table should be designed with room for a date or duration.
      - **Teacher's Working Memory section naming: agree with Stitch, disagree with current.** The current implementation splits this into "Sensitivities / Life Context" and "Pedagogical Observations" as two separate sections. Stitch groups them under "Teacher's Working Memory" on a dark tonal background. The Stitch approach is better because teachers don't think in categories. They think in context: "Ana reverts to Portuguese grammar when tired, prefers evening sessions, visual learner, slow reading speed." Those observations span affective, cognitive, and scheduling dimensions, but the teacher just thinks of them as "what I know about Ana." Forcing a split into "sensitivities" vs "observations" creates a categorization burden that adds no teaching value. One unified section with free-text and optional labels (which `parseNotes` already supports) is the right model. The dark tonal background in Stitch signals "private teacher space," which is the correct affordance.
      - **Empty state problem: agree with Vera, and proposing a pedagogical onboarding sequence.** Nine "No X yet" messages is worse than an empty page because it implies the teacher is failing. A new student profile should guide the teacher through the minimum viable data in priority order: (1) "Why is this student learning Spanish?" (motivation, the single most important field), (2) "What languages does this student speak?" (L1 for error prediction), (3) "What level are they really at?" (skill overrides if different from general CEFR). These three fields let the AI generate a meaningfully personalized lesson. Everything else (interests, difficulties, objectives, personal notes) can be discovered through teaching and added later. The empty state for a new student should be a compact onboarding card with those three questions, not a full page of empty sections.
      - **Missing from Stitch and current: no "what the AI uses" indicator.** Neither design shows which profile fields feed into lesson generation. A teacher who fills in "interests: Architecture" should understand that the next generated lesson will include architecture-themed vocabulary or reading texts. Without that feedback loop, the Profile feels like documentation (filing cabinet) rather than a teaching tool (control panel). This is a Phase 2 concern, but worth noting: even a subtle "Used in lesson generation" tag next to fields that feed prompts would change the teacher's relationship with the Profile tab from "admin I have to do" to "input that makes my lessons better."
      - **Inline editing on the left column: agree with Vera.** A teacher who discovers mid-class that a student struggles with subjunctive should be able to add a difficulty right there, not navigate to the Edit Student form. The right column already has inline add for Interests and Todos. The left column (Goals, Objectives, Difficulties) should follow the same pattern. In classroom reality, a teacher logs observations within 2 minutes after class. Every extra click is a lost observation.
  3.3 SESSIONS **=> #722 (visual polish), #723 (data quality, P2)** (student: Nataliya, http://localhost:5173/students/7eb185b9-14f7-40c1-970e-55b5fa34152c?tab=sessions)
    * Vera (UX review, 2026-04-12):
      - Verdict: **ALMOST**. Core structure works (chronological list, expandable cards, date badges, status filters, search). A teacher can find and scan sessions. But meaningful gaps vs Stitch in information density and visual richness.
      - **What's working well:** Date badges (month abbreviation + large day in soft circle) are scannable and have personality. Filter bar is clean with correct indigo active state. Expanded card layout (narrative left, homework + next plan right) is structurally sound. Teacher Notes with indigo left border is visually distinct from narrative. "Planned for Next Class" amber card highlights actionable info correctly.
      - **Session titles are generic (DATA GAP, not UI gap).** Every collapsed row shows "Session, May 17", "Session, Apr 10", etc. The Stitch reference shows descriptive titles: "Subjunctive Usage in Time Clauses", "Introduction to Business Spanish." The code already handles this: `sessionTitle()` in SessionHistoryTab.tsx:70 returns `session.title` if present, falling back to date. The problem is Nataliya's sessions were logged without titles. The title field exists in the backend (`SessionLog.Title`), the frontend renders it, but real user data doesn't have it. Two paths: (a) auto-generate titles from narrative/topicTags at session save time, (b) backfill existing sessions. The generic titles make the session list useless for searching "the one where we did preterite vs imperfect."
      - **Duration IS rendered, but data is missing.** The code at SessionHistoryTab.tsx:230 renders `session.duration` with a "min" suffix. The backend has `Duration` (int?, minutes). But Nataliya's sessions have no duration data, so nothing shows. Same story as titles: the UI is ready, the data isn't populated. Duration matters for lesson planning and for the "total hours" stat.
      - **Topic tags and topic filter ARE implemented, but unused.** SessionHistoryTab.tsx has full topic tag rendering (collapsed: up to 4 chips, expanded: all chips with grammar/vocabulary coloring) and a Topic dropdown filter (line 725). TopicTags exist in the model. But zero tags on Nataliya's sessions. The feature is invisible because the input friction is too high (tags field buried at bottom of Log Session form, as noted in Overview review).
      - **Total hours in the student header: implemented.** The code at line 504 sums durations. Appears in the header area. Not visible because duration data is null for all sessions.
      - **Collapsed rows are sparse vs Stitch (partially data, partially layout).** Stitch shows: title + status + duration + action icons (mic, kebab) + topic chips. Current shows: generic title + status + "1 action item" / "1 note" indicators. The indicators are useful (teacher sees at a glance which sessions have homework/notes without expanding) but the row feels thin without duration and topic chips. Once data exists, this should look much closer to Stitch.
      - **Missing: session narrative preview in collapsed state.** For sessions with no title but with a narrative, the collapsed row shows a truncated preview (visible on Apr 10: "Discussed student's personal life..."). This is good, it's a smart fallback. But the truncation is aggressive and the text is small. Consider making the preview slightly more prominent when there's no explicit title.
      - **Missing: "Previous Homework Status" in expanded view.** Stitch has "PREVIOUS HOMEWORK STATUS: DONE" with green checkmark, separate from "HOMEWORK ASSIGNED." This distinction matters: did they complete the previous homework? Current expanded card shows only "HOMEWORK" section with assigned work. The completion status of prior homework is a different pedagogical signal.
      - **Missing: lesson linkage in "Planned for Next Class."** Stitch shows "Linked to Lesson #204: Advanced Tenses" below the next session plan. Current: text only, no curriculum linkage. This connects sessions to the lesson/course structure.
      - **Cancelled sessions: need to verify styling.** Filter exists but no cancelled sessions visible in Nataliya's data. Stitch renders them with muted treatment + cancellation reason. Should verify this works when data exists.
      - **Expanded card whitespace.** When a session has a long narrative but no homework/next plan, the left column fills with text while the right column is mostly empty. The two-column layout wastes space for sessions that only have narrative + notes. Consider: if no homework or next plan exists, let the narrative span full width.
      - **Expanded card action buttons: wrong pattern (INTERACTION DESIGN).** Three outlined buttons ("Start next session", "Edit", "Delete") sit in a row at the bottom of every expanded card. Stitch uses a completely different approach: a microphone icon and a kebab menu (three dots) in the collapsed row header, right-aligned next to the chevron. Edit/Delete live inside the contextual menu. No button bar at the card footer. Problems with current: (1) "Start next session" as an outlined ghost button undersells the most valuable action, this is the "I'm about to teach" moment. (2) Edit and Delete at the same visual weight is a misclick risk; Delete should be hidden or demoted. (3) The button bar adds visual noise to every expanded card. **Recommendation:** Move Edit and Delete into a kebab menu in the collapsed row header (matches Stitch, Linear, Notion). For "Start next session," either place it as a subtle link/ghost button inside the "Planned for Next Class" amber card (contextually connected to that content) or let the page-level "Log Session" CTA detect that the most recent session had a next plan and pre-populate. No need for Stitch consultation; the pattern is standard.
      - **Priority observations:** (1) The features are mostly built; the gap is data population. Sessions logged via the real UI without titles, durations, or topic tags produce a degraded experience. Auto-generation of titles from narrative and smarter defaults for duration would close most gaps. (2) Previous homework status tracking is a real missing feature, not a data gap. (3) Once data exists, this tab will be much closer to Stitch than it appears now. (4) Action buttons need restructuring: kebab menu for Edit/Delete, contextual placement for Start next session.
    * Isaac (pedagogy review, 2026-04-12):
      - Verdict: **ADJUST**. Scaffolding is solid (chronological feed, expandable cards, date badges, search, filters). Gaps affect usefulness as a *teaching tool*, not just a session log.
      - **Session titles are the single biggest problem (HIGH).** "Session, Apr 10" repeated down the list is a filing cabinet with no labels. The whole point of session history is answering "when did we cover the subjunctive?" or "which class had the ser/estar breakthrough?" Without meaningful titles, teachers must expand every card and read the narrative. The Stitch mockup gets it right: "Subjunctive Usage in Time Clauses", "Introduction to Business Spanish." **Recommendation:** auto-generate titles from session narrative at save time. "Revisamos el uso del subjuntivo en oraciones temporales" becomes "Subjuntivo en oraciones temporales." This is what makes the search feature functional as a teaching reference.
      - **Homework status needs to be scannable in collapsed rows (MEDIUM).** The expanded card already renders `previousHomeworkStatusName` (line 342-354). But homework completion patterns over time are a critical pedagogical signal: three "Not Done" in a row means disengagement or difficulty (teacher adjusts); consistent "Done" means the student is invested (increase complexity); "Partially Done" means struggling (focus next session on the sticking point). Currently a teacher must expand each card to see this. A small icon (checkmark, x, half-circle) in the collapsed row would let a teacher scan compliance across 10 sessions in seconds. Agree with Vera that Stitch separates "Did they do what I asked?" from "What did I ask next?" because they answer different questions.
      - **"Planned for Next Class" amber card is pedagogically excellent.** The amber section with CalendarDays icon directly supports the teacher workflow: finish class, note what's next, find it when the next session comes. Stitch goes further with "Linked to Lesson #204: Advanced Tenses" below the plan text, transforming the session from a note into a curriculum waypoint. Current `linkedLessonId` rendering (line 321-330) is sufficient for now, but ensure the next-session plan visually connects to the linked lesson when both exist. Teacher reads: "Plan: Review conditional sentences" then "Linked to Lesson #204." That's a complete next-class brief.
      - **Cancellation reasons need pedagogical context (MEDIUM).** Current code renders cancelled sessions as muted/strikethrough (line 115-116) but no cancellation *reason* is visible. Cancellation patterns are pedagogically significant: "work conflict" vs "health issue" vs "just didn't show up" require completely different teacher responses (logistical, empathetic, motivational intervention respectively). If a student cancels 3 times in 6 weeks, the teacher needs to know why before their next conversation. **Recommendation:** surface the reason (from narrative or a dedicated field) in the collapsed row for cancelled sessions.
      - **Duration should default to 60 min in Log Session form (MEDIUM).** Total hours stat (line 614-627) and per-session duration (line 230-234) are implemented but invisible because sessions lack duration data. Stitch shows duration on every collapsed row (60 min, 90 min). Duration is both a business metric ("Ana has done 42.5 hours") and a pedagogical signal ("only 30 min so we rushed grammar, next time 60 min with production practice"). A nullable duration with no default means it will never be filled. 60 min is the standard private class length in Spain.
      - **"Start next session" is undersold (agree with Vera).** This is the most valuable action on the entire page: the moment the teacher transitions from reviewing to planning. Burying it as an outlined ghost button at the same visual weight as Delete is wrong. Agree with Vera's kebab menu proposal (Edit/Delete into contextual menu). "Start next session" should feel like the natural next step after reading, not a choice among three equals. Consider placing it inside the amber "Planned for Next Class" card where it's contextually connected to the content it acts on.
      - **Topic tag adoption is the upstream bottleneck (HIGH, but not a Sessions tab fix).** Display code is well-built (color-coded chips by category at line 280-298, Topic filter at line 717-757). But with zero tags across all sessions, both features are invisible. Topic tags are what make the Topic filter useful: a teacher filtering "ser/estar" across all sessions to see the progression arc is powerful for planning. The fix is in the Log Session form (move Topics Covered higher, auto-suggest from narrative), not here. Fully agree with Vera's "future" framing for display-side work.
      - **Competency balance over time (FUTURE, depends on tag adoption).** Ana Martins' Stitch mockup shows grammar, grammar, grammar, vocabulary. Zero oral production visible. For a B1 student that's a problem: CEFR assesses four competencies independently, and DELE tests all four. Once topic tags populate with competency categories, a subtle visual indicator (proportion of grammar vs vocabulary vs competency tags across the last 10 sessions) would help teachers notice imbalances before they become problems. The architecture (tag categories) is ready for it.
      - **Priority summary:** (1) Auto-generate titles from narrative (high, makes search functional). (2) Homework status icon in collapsed rows (medium, enables pattern scanning). (3) Cancellation reasons visible (medium, supports student relationship management). (4) Duration default 60 min (medium, enables total hours and per-session analysis). (5) Tag adoption upstream fix (high, unblocks Topic filter and competency tracking).
  3.4 PROGRESS **=> #724**
    * Vera (UX review, 2026-04-12):
      - **Difficulty text truncation breaks usability (HIGH).** Difficulties Summary shows "tenia un poco de dific..." with a "Stale" badge. The text is cut off, hiding the actual grammar topic. A teacher can't act on text they can't read. Fix: either give the card more width, allow text wrapping, or show a tooltip on hover with the full text. When there's only one difficulty entry the panel looks abandoned. Consider collapsing it inline with Pacing Analytics when entries are fewer than 2.
      - **Baseline/target reference missing on skill bars (HIGH).** Legend says CURRENT and BASELINE B1 but no visual marker appears on the bars showing where B1 sits. The teacher has to mentally map levels to bar length. Add a subtle vertical tick mark or thin dashed line at the target level on each bar. This transforms the chart from "here's how they're doing" into "here's how they're doing relative to where they should be," which is much more powerful for planning.
      - **Listening bar two-tone segment is unexplained (MEDIUM).** Listening shows a darker fill followed by a lighter/different shade past a break point. No other skill bar has this. The legend doesn't differentiate the two tones. Is the lighter part the baseline? A progress delta? It's visually ambiguous. Either explain the visual encoding (a small legend note) or make all bars consistent.
      - **Reading at A1 for a B1 student has no visual warning (MEDIUM).** Reading is 2+ levels below the general CEFR (A1 vs B1). The UI treats this the same as a skill that's on target. Consider a subtle visual cue (different bar tint, a small gap indicator, or an amber accent on the badge) when any skill is 2+ levels below the general level. This surfaces red flags without the teacher having to compute the gap.
      - **Right column spacing is cramped (LOW).** Pacing Analytics and Difficulties Summary are stacked tight with smaller text. The contrast in density vs the generous Skill Imbalance panel makes the right column feel like it belongs to a different design system. Add more vertical padding inside both right-column panels and a few more pixels of gap between them. The Academic Atelier's "breathable" principle should apply equally to secondary panels.
      - **Coming Soon cards: keep for now (intentional).** These serve as conversation starters with Jordi, the first user. They spark discussion about what analytics teachers actually want. Remove once the product moves past early feedback stage.
      - **Pacing Analytics mini dot chart is in an uncanny valley (LOW).** The cancellation rate section shows a tiny decorative element that's too small to read but too present to ignore. Either commit to a small sparkline that shows session frequency over time, or drop the decoration entirely.
    * Isaac (pedagogy review, 2026-04-12):
      - **Verdict: ADJUST.** The page has the right instincts (skill imbalance, pacing, difficulty tracking) but presents data *about* the student rather than data *the teacher can act on*. A good progress dashboard answers three questions in 5 seconds: (1) Is this student progressing? (2) What should I focus on next session? (3) What am I neglecting? Currently it answers #1 partially and misses #2 and #3.
      - **Baseline marker on skill bars must be visually prominent (HIGH, agrees with Vera).** The code has a baseline reference line but it's barely visible or lost behind the fill bar. This is the single most important visual element on the chart. Without it, the teacher reads absolute levels; with it, they read *gaps*. The gap drives planning. At the EOI, a 2-level skill spread (e.g. B2 Reading, A2 Writing) triggers a formal skills plan. The UI should make this impossible to miss.
      - **Difficulty descriptions truncated to uselessness (HIGH, agrees with Vera).** max-width 140px guarantees truncation for any real difficulty. In ELE, the specificity IS the information: "Subjuntivo" is useless; "Subjuntivo in concessive clauses (aunque + subjuntivo vs indicativo)" tells the teacher which exercises to prepare. Also missing: the competency label (`d.competency`) doesn't render, only `d.description`. A teacher scanning needs to see whether difficulties cluster in grammar, pronunciation, vocabulary, or pragmatics. That clustering is itself a diagnostic signal.
      - **Time-since-last-mention missing from difficulty badges (MEDIUM).** The mockup shows "3 weeks" / "1 week" next to difficulties, but the code only renders the Working/Stale/Covered badge. "Stale" means "not mentioned in 30 days," but the teacher needs to know: stale for 5 weeks (forgot about it) vs stale for 31 days (borderline, probably fine). The time context is pedagogically important for triage.
      - **Skill order should reflect teaching priorities (MEDIUM).** Code uses `['Reading', 'Writing', 'Speaking', 'Listening']` (traditional CEFR document order). For a teacher planning private lessons, sorting by worst gap first turns a chart into a priority list. At minimum, skills below baseline should appear visually distinct (the code does dim them, which is correct, but sorting would be stronger).
      - **No competency balance indicator (MEDIUM, biggest pedagogical gap).** The Skill Imbalance chart shows assessed levels (teacher-set overrides), but nothing about what has actually been practiced. A student could have all four skills at B1, but if the last 10 sessions were 100% grammar drill with zero oral production, they're heading for a divergence that just hasn't been measured yet. Session log data includes `mentionedDifficultyPairs` with competency fields. A simple distribution ("Last 10 sessions: 60% Grammar, 30% Reading, 10% Speaking, 0% Listening") would immediately show the blind spot. This is what "Topic Analysis" (Coming Soon) should become.
      - **Pacing Analytics is admin data, not pedagogical data (LOW).** Missing: (1) Estimated total hours (sessions x duration), since Cambridge/EOI benchmarks use guided learning hours, not session count. (2) Progression velocity: "Started: A2 (Jan) / Current: B1" contextualizes everything else on the page. Without these, 14 sessions tells you about attendance, not learning.
      - **Coming Soon cards promise the right things.** Curriculum Progress, Topic Analysis, Engagement Trends are the right next three. Topic Analysis (competency distribution across sessions) should be prioritized because it directly answers "what am I neglecting?"
      - **Priority summary:** (1) Make baseline marker visually prominent on skill bars (HIGH) **=> #724**. (2) Expand difficulty descriptions + show competency label (HIGH) **=> #724**. (3) Add time-since-last-mention to difficulty badges (MEDIUM) **=> #724**. (4) Sort skills by gap size or group below/above baseline (MEDIUM) **DEFERRED: data-dependent, revisit with Edit Student/Session**. (5) Add simple competency distribution from recent sessions (MEDIUM) **DEFERRED: depends on topic tag adoption (#723)**. (6) Add total estimated hours and progression velocity to Pacing (LOW) **DEFERRED: depends on duration data (#723)**.

4. Edit Student **=> #725 (autosave + bugs), #726 (Stitch visual)** (Vera review, 2026-04-12). Verdict: **ALMOST**
   
   Tested live at `localhost:5173/students/.../edit` with Nataliya's profile. Compared against Stitch mockup.

   ## What's working well
   - **Tab-scroll navigation** is a good pattern. Sticky tab bar with scroll-to-section. Active tab highlights on scroll (partially, see bugs). Arguably better than the mockup's static approach.
   - **Right sidebar persistence.** Teaching Todos and Pending Followups stay visible while scrolling the main form. Correct design decision.
   - **Information grouping order** is logical: identity, languages, background, goals, difficulties, notes, commercial, courses.
   - **Empty states** are present and helpful ("No ideas yet. Add one below," "No short-term objectives yet").
   - **Teaching Todos add interaction** works: type, click +, instant appearance with "just now" timestamp and checkbox/delete.
   - **Tooltips** on info icons work (tested Name field tooltip).
   - **Cancel / Save Profile** sticky with the tab bar. Always reachable.

   ## BUGS (broken behavior)

   - **(CRITICAL) Proficiency tab navigates away from the edit page.** Clicking "Proficiency" in the tab bar navigates to the student detail view (`/students/:id`) instead of scrolling to the proficiency section. This also causes **data loss**: any unsaved changes (e.g., a Teaching Todo just added) are gone. Confirmed: Todo I added disappeared after this navigation.
   - **(CRITICAL) Notes tab does not update active indicator.** Clicking "Notes" scrolls to the right area but the tab bar still shows a different tab as active (observed "Basic Info" remaining highlighted).
   - **(CRITICAL) Commercial tab does not scroll to Commercial section.** Clicking "Commercial" stops at the Difficulties section. The scroll target seems wrong or the section is not far enough down to trigger the intersection observer.
   - **(CRITICAL) Enter key submits the entire form from single-line inputs.** Tested: focused the Hourly Rate field, pressed Enter, the form submitted and navigated to the student view page. The teacher just wanted to finish typing a number. This is the most dangerous UX bug on the page because the teacher doesn't know they just saved (or tried to save) everything.
   - **(HIGH) Inconsistent Enter key behavior across field types.** In the Teaching Todos input and Spoken Languages input, Enter adds an item (correct). In the Hourly Rate, Name, Birth Year, and Profession fields, Enter submits the whole form (wrong). The teacher has to learn which fields are "safe" to press Enter in. This violates consistency (Nielsen heuristic #4).
   - **(MEDIUM) Tab active state shows multiple active tabs simultaneously.** After scrolling, observed "Background" and "Difficulties" both showing as active. The intersection observer thresholds need tuning.
   - **(LOW) Edit student returns to student list** when it should return to the student detail view. (Pre-existing note, confirmed still present.)

   ## DESIGN GAPS (vs. Stitch mockup)

   - **(HIGH) Native Language: closed combo with only 9 options, no way to add custom.** The dropdown offers English, Spanish, French, German, Italian, Portuguese, Mandarin, Japanese, Arabic. That's it. No Ukrainian, no Korean, no Dutch, no Hindi, no Russian. This is a language teaching app. The teacher's students could have *any* native language. The mockup shows chips (Portuguese x, Catalan x) implying a flexible input. This needs to be a combobox with type-to-search and ability to add custom values, same pattern as Spoken Languages.
   - **(HIGH) Spoken Languages is a free-text multivalue with zero validation.** Teacher can type anything ("spanish", "SPANISH", "Spnaish"). No relationship to the Native Languages list, no normalization. Meanwhile Native Languages uses a closed list. These two fields that represent the same concept (languages) use completely different input patterns with completely different constraints. They should share one pattern: combobox with suggestions from a shared language list, plus free-text custom entry.
   - **(HIGH) Hourly Rate UX.** Free text field with "e.g. 45/hr" placeholder. Most teachers have 3-4 standard rates they use for all students (e.g., "45/hr", "35/hr for groups", "50/hr premium"). A combobox with recent/common values as suggestions plus free-text entry would save time and reduce typos. The field also accepts any string, no numeric validation.
   - **(MEDIUM) CEFR badges are plain dropdowns.** The mockup shows Teacher's Assessment "B1" and Official Level "A2" as styled square badges with the Academic Atelier CEFR colors. The implementation uses basic `<select>` dropdowns. The visual punch is missing. After selection, the value should render as a styled badge. Dropdowns for editing, badges for display.
   - **(MEDIUM) Language chips missing.** When native/spoken languages are selected, the mockup shows colored removable chips (indigo pills: "Portuguese x", "Catalan x", "English x", "French x"). The implementation shows a bare dropdown for native and plain tags for spoken ("spanish x" in gray). The visual language of the chips communicates "these are selected items you can manage" much better.
   - **(MEDIUM) Personal Background section is too form-like.** The mockup has a two-column layout with a gorgeous big-quote treatment for "Reason for Studying" (decorative quotation marks, italic text). The implementation has a plain textarea. The mockup makes the student feel present; the form makes the student feel like data.
   - **(MEDIUM) Skill Overrides card placement gives overrides too much weight.** They sit at the same visual level as Basic Info (top right). In the mockup they're at the bottom of the proficiency section as styled badges. Overrides are secondary information.
   - **(MEDIUM) Teaching Goals section lacks richness.** Mockup shows goals as styled cards with descriptions ("Professional Fluency: Mastering vocabulary..."). Implementation shows bullet list with just titles ("conversation", "exams"). Short-term objectives in the mockup have a left-border accent, "NEAR DATE" badge, and calendar icon. The implementation has an empty state that doesn't preview what a filled state would look like.
   - **(MEDIUM) No student photo/avatar.** The mockup has a student photo in Basic Info top-right. Humanizes the profile.
   - **(LOW) Delete button in header is dangerous placement.** Red outlined "Delete" sits next to "Create Course" at the top. The teacher reaching for Save Profile has Delete in the same visual zone. Mockup doesn't show Delete prominently. Move to bottom of page or behind a "..." menu. Destructive actions should require intentional seeking.
   - **(LOW) Teaching Todos input is narrow.** Text "Practice subjunctive with songs" gets clipped during typing; the leading characters scroll off-screen. The sidebar width constrains this, but the input could grow vertically or use a multi-line approach.
   - **(LOW) Difficulties section lacks visual richness vs mockup.** Mockup has competency/severity/trend/status columns with visual severity bars and trend arrows (mini-dashboard). Implementation has flat inline row (description, category dropdown, contrast field, Active badge).

   ## INTERACTION DESIGN RECOMMENDATIONS

   1. **Unify language inputs.** Both Native and Spoken should use the same combobox pattern: type-to-search suggestions from a shared language list (ISO 639 common subset, 50+ languages), allow custom free-text entry for anything not in the list, render selections as removable chips. One interaction pattern, two fields.
   2. **Prevent Enter-to-submit on all single-line inputs.** Add `onKeyDown` handler that calls `e.preventDefault()` when `e.key === 'Enter'` on Name, Birth Year, Profession, Hourly Rate, and all country/city fields. Only the explicit "Save Profile" button should submit. Alternatively, make the form not a `<form>` element and handle submission only through the button click.
   3. **Fix tab navigation targets.** Proficiency, Notes, and Commercial scroll targets are broken. Debug the section `id` attributes and the intersection observer registration. Proficiency may be accidentally matching a route instead of a scroll anchor.
   4. **Hourly Rate suggestions.** Change from plain text input to combobox with "recent values" dropdown (populated from the teacher's other students). Teacher can still type freely, but sees their common rates as quick picks.
   5. **CEFR badge display.** After selecting a level in any dropdown (Teacher's Assessment, Official Level, Skill Overrides), render the value as a styled Academic Atelier badge. Keep the dropdown for the editing interaction, but the resting state should show the badge.

   ## ADDITIONAL BUGS (found in deep interaction testing, 2026-04-12)

   - **(CRITICAL) No dirty form warning.** Changed the Name field to "DIRTY CHANGE", clicked Cancel, navigated away silently. No "You have unsaved changes" confirmation. Teacher can lose all their edits by accidentally clicking Cancel, the back breadcrumb, or a sidebar link.
   - **(CRITICAL) Enter-submits confirmed on FOUR field types:** Hourly Rate, Short-Term Objective description, Specific Difficulty description, and Name field all submit+save+navigate away on Enter. Meanwhile, Learning Goal inline input, Interests, Spoken Languages, Teaching Todos, and Areas to Improve description do NOT submit on Enter (correct behavior). The inconsistency is the real problem: the teacher builds a mental model from one field and carries it to another.
   - **(CRITICAL) Enter-submit causes silent data persistence.** During testing, pressed Enter in the Objective field. The form saved and navigated away. All dirty data on the page (garbage "asdfghjkl" spoken language, test "grammar review" goal) was silently saved. The teacher may not realize they've persisted half-finished or incorrect data.
   - **(HIGH) Cancel navigates to student LIST, not student DETAIL.** Cancel goes to `/students` (the roster). Save goes to `/students/:id` (the detail view). These should be consistent. Both should go to the student detail, since that's where the teacher was before clicking Edit.
   - **(HIGH) Back breadcrumb ("< Students") also goes to student LIST.** Same problem as Cancel. Should go to the student detail view. And like Cancel, it has no dirty form warning.
   - **(HIGH) Learning Language dropdown has same limited list problem.** 9 languages + "Other". A language teaching app that can only teach 9 languages. "Other" is a dead end: what does it map to? What language does the AI generate content for when it's "Other"?
   - **(MEDIUM) Spoken Languages accepts any garbage text.** Typed "asdfghjkl", pressed Enter, accepted as a spoken language. No validation, no normalization, no suggestions. Combined with Enter-submit, this garbage gets persisted silently.
   - **(MEDIUM) Duplicate spoken language rejection is silent.** Tried adding "spanish" when "spanish" already exists. It was correctly rejected, but with zero feedback. The teacher doesn't know if their Enter keystroke failed or succeeded.
   - **(MEDIUM) Tab active state bugs confirmed more broadly.** After scrolling, observed "Background" and "Difficulties" both showing active simultaneously. The intersection observer thresholds need tuning: sections at the bottom of the page can't scroll high enough to trigger their tab active state.
   - **(MEDIUM) Save/Cancel navigation inconsistency.** Save goes to student detail view. Cancel and back breadcrumb go to student list. All three should go to the same place (student detail).
   - **(LOW) Sub-goal "+" button on goals appears unresponsive.** Clicked "+" on "exams" goal, nothing happened. Clicking "+" on "conversation" (which already has sub-items) also didn't visibly respond. The affordance exists but the interaction feels broken or has no visible feedback.
   - **(LOW) "Add goal" requires a double-click to show inline input.** First click did nothing visible. Second click opened the inline "Goal text..." input. May be a race condition or the first click registers as a blur.
   - **(LOW) Seed data typo: "travel to sapin"** should be "travel to Spain". Visible in Nataliya's learning goals.

   ## VALIDATION OBSERVATIONS

   - **Name required validation works.** Cleared name, clicked Save, got "Name is required" in red. Form did not submit.
   - **Birth Year is numeric-only.** Typed "banana", field rejected it (input type="number"). Correct.
   - **Goal/objective/difficulty deletion has no confirmation.** Clicking the trash icon deletes immediately. Acceptable for lightweight items, but combined with Enter-submit, the teacher might accidentally delete something and then lose track because the form saves.
   - **Account Status and Student Type toggles work** but have no undo/confirmation. Toggling Account Status from Active to Inactive is significant (affects how the student appears in the roster). A toggle this consequential probably deserves a confirmation or at least a more prominent visual warning state.

   ## ENTER KEY BEHAVIOR MAP (complete)

   | Field | Enter behavior | Correct? |
   |-------|---------------|----------|
   | Name | SUBMITS FORM | NO |
   | Spoken Languages | Adds tag | YES |
   | Interests | Adds tag | YES |
   | Birth Year | SUBMITS FORM | NO |
   | Profession | SUBMITS FORM | NO |
   | Country/City fields | SUBMITS FORM | NO |
   | Teaching Todos | Adds item (via + button) | YES |
   | Followups | Adds item (via Add button) | YES |
   | Add Goal inline | Adds goal | YES |
   | Short-Term Objective desc | SUBMITS FORM | NO |
   | Areas to Improve desc | Does NOT submit | YES |
   | Specific Difficulty desc | SUBMITS FORM | NO |
   | Hourly Rate | SUBMITS FORM | NO |

   ## ARCHITECTURAL RECOMMENDATION: SWITCH TO AUTOSAVE (Vera, 2026-04-12)

   **The core problem:** The page already runs two save models simultaneously. Teaching Todos and Pending Followups (sidebar) save instantly via API calls. Everything else requires clicking "Save Profile" and navigates away. The teacher builds a mental model from the sidebar ("I add something, it's saved") and carries it to the main form, where it's wrong. This is the root cause behind the Enter-submit bugs, the dirty form warning absence, and the Cancel/Save navigation inconsistency. Fixing the symptoms (blocking Enter, adding dirty warnings) treats the surface; the two-tier save model is the structural problem.

   **Recommendation: Remove Save Profile / Cancel. Implement autosave for all fields.**

   Why this works for LangTeach:
   1. **Matches the teacher's mental model.** The teacher is editing a profile, not submitting a form. They add a note, tweak a level, come back tomorrow and add an interest. Autosave matches the editing-a-document pattern (Google Docs, Notion, Linear).
   2. **Kills the entire Enter-submit bug category.** No form submission means Enter can't trigger it.
   3. **Eliminates dirty form warnings.** No unsaved changes can exist. Navigate away freely.
   4. **Unifies the save model.** Todos, followups, name, profession, CEFR level all behave identically.
   5. **Matches Jordi's workflow.** Opens a student between classes, jots a note, closes it. No "save ceremony."

   Tradeoffs to accept:
   - **Per-field validation replaces form-level validation.** If Name is cleared, show inline error immediately, don't persist empty. Each field validates itself on change.
   - **No "undo all changes" action.** Every change is committed. For a profile editor this is fine: the teacher isn't making risky batch changes, they're updating incrementally. If needed later, add field-level undo (low priority).
   - **Network error handling.** If a save fails, show a small error toast ("Couldn't save, retrying...") with auto-retry. The "Saving..." indicator covers the happy path.
   - **Cancel becomes "Back" or "Done."** Navigates to student detail. No discard semantics because there's nothing unsaved to discard.

   Implementation path:
   1. Remove `<form>` wrapper, "Save Profile" button, "Cancel" button.
   2. Add debounced save per field/section: 400ms after last keystroke for text fields, immediate for dropdowns/toggles/tag additions.
   3. Add a small status indicator in the sticky header where Save Profile currently lives: "All changes saved" (default) / "Saving..." (during save) / checkmark that fades. Keep it subtle.
   4. Replace Cancel with a back arrow or "Done" button that always navigates to the student detail view.
   5. Keep required-field validation inline: Name empty shows "Name is required" immediately, blocks persist for that field only.
   6. Teaching Todos, Followups, Goals, Objectives, Difficulties, Areas to Improve already have add/delete as discrete actions. These continue to work as-is (they're already autosave-shaped).
   7. Enter key in text fields becomes a no-op (or moves focus to next field). No special handling needed because there's no form to submit.
   * Isaac (pedagogy review, 2026-04-12). Verdict: **ADJUST**

   Reviewed the Stitch mockup against the student field guide and Vera's findings.

   ## What's Pedagogically Right

   - **Information architecture follows a teacher's mental model.** Identity, background, level, goals, difficulties, notes, admin. That's the order a teacher thinks when reviewing a student before class.
   - **Key Difficulties section is the strongest part.** Competency, severity bar, trend arrow, status ("Working"/"Covered") in one row. A teacher with 8 students can glance at this and know what to prioritize. The GRAMMATICAL/LEXICAL categorization in Weaknesses completes the picture. This is exactly what the AI prompt service needs.
   - **Reason for Studying as a pull-quote is brilliant.** "I'm planning to retire in Alicante... technical architecture terminology." Three course design inputs in one paragraph. The visual prominence (large quotation marks, wide column) signals: this matters, keep it updated.
   - **Skill Overrides per competency (Reading B2, Writing A2, Speaking B1, Listening B1).** Pedagogically essential. CEFR levels are not flat. A student reading at B2 but writing at A2 needs fundamentally different work per competency. Teacher's Assessment vs Official Level distinction is also correct: these diverge constantly.
   - **Pending Followups** ("Send DELE B2 PDFs", DONE). Real-world teacher workflow. Most teachers track this on paper or WhatsApp. Right placement.
   - **Linked Courses** validates the Phase 2 vision. The student IS their courses.

   ## Pedagogical Adjustments Needed

   - **(HIGH) Teaching Goals structure is too vague.** "Professional Fluency: Mastering vocabulary related to construction materials and zoning laws" is narrative, not actionable. What's missing: **target level** and **time horizon**. "Professional Fluency" means nothing without "from B1 to B2 in technical vocabulary within 6 months." Without this, the AI has no anchor for generation difficulty and the teacher can't track pacing. Goals should be structured: name + target competency + target sublevel + estimated sessions.
   - **(HIGH) Short-Term Objectives need competency tagging.** "DELE B2 Exam, June 15, 2024" is good, but the system should know which competencies this targets. DELE B2 oral expression is a different prep track than DELE B2 reading comprehension. Without this, the AI can't prioritize section types when generating toward this objective.
   - **(HIGH) Agree with Vera on Enter-key/autosave.** Profile data integrity feeds AI generation quality. A teacher updating difficulties mid-class will press Enter instinctively. Silent persistence of half-finished input pollutes the profile, which means garbage in the generated lesson. The "edit profile" metaphor is wrong; this is a living document (Google Docs), not a form (bank application).
   - **(MEDIUM) Pedagogical Observations needs semi-structure.** The free-text box mixes learning style ("visual learner"), methodology notes ("needs constant re-iteration of irregular verbs in spoken context"), and modality preferences ("benefits from annotated drawings"). For now the textarea works, but the AI will need to parse these. At minimum: learning style, preferred activity types, what to avoid, as separate fields or tagged entries.
   - **(MEDIUM) Interests need pedagogical weighting.** "Modernist Architecture", "Mediterranean Cooking", "Photography" as chips is fine, but the teacher should be able to mark which are *pedagogically active* (use in lessons) vs. background info. A teacher might know a student loves photography but deliberately avoid it because they've overused it. An active/inactive toggle or priority ordering gives the AI better signal.
   - **(MEDIUM) L1 deserves more visual weight.** Portuguese and Catalan as native languages in Basic Info is correct placement, but "Native: Portuguese" is arguably more important than "Learning Language: Spanish" (we know they're learning Spanish, that's the whole app). L1 drives every teaching decision: false cognates (Portuguese "escritório" vs Spanish "oficina"), phonetic interference (nasals), grammar transfer (subjunctive triggers differ). Make sure AI prompt service gets L1 as a first-class input.
   - **(MEDIUM) Sensitivities mixes three different signals.** "Very high workload... site visits... prefers evening sessions... does not respond well to rigid drill-style learning." Schedule/energy (evening, comes tired) affects lesson intensity. Methodology preference (no drills, contextual) affects section profile selection. Sensitivities affect topic avoidance. Works as free text for Beta; structure in Phase 2.

   ## Priority Summary

   | Priority | Item | Pedagogical reason | Status |
   |----------|------|--------------------|--------|
   | HIGH | Structure Teaching Goals (target level + time horizon) | AI needs difficulty anchors for generation | **DEFERRED: Phase 2 data model change** |
   | HIGH | Competency tags on Short-Term Objectives | Exam prep needs competency-specific generation | **DEFERRED: Phase 2 data model change** |
   | HIGH | Fix Enter-key / autosave (Vera's recommendation) | Profile data integrity feeds AI quality | **#725** |
   | MEDIUM | Semi-structure Pedagogical Observations | Free text won't parse reliably for AI prompts | **DEFERRED: Phase 2** |
   | MEDIUM | Interest active/inactive toggle | Prevents topic fatigue in generated content | **DEFERRED: Phase 2** |
   | MEDIUM | L1 visual prominence | L1 is the #1 teaching decision driver | **#719 (header subtitle), #721 (profile)** |
   | LOW | Separate sensitivities vs methodology vs scheduling | Works as free text now, structure in Phase 2 | **DEFERRED: Phase 2** |



6. Log Session **=> #727 (autosave + Stitch), #728 (left panel enrichment), #723 (data quality, P2)** (Vera review + live testing, 2026-04-13)

   Tested live on Nataliya (B1, Session #12). Compared implementation against Stitch mockup at `plan/langteach-beta/stitch-design-system/session-edit/screen.png`.

   **Design Review: ALMOST**
   Two-panel architecture is correct (student context left, form right). Academic Atelier palette applied. But the implementation drifts from the mockup in ways that hurt the experience.

   ### Mockup Divergences

   - **"What Happened?" lost its star moment.** Mockup puts it as a big Manrope headline at top of right panel, with session #/date floating right. Implementation demotes it to a `Label` (`text-xs font-semibold uppercase`). The teacher opens this page and sees a form instead of an invitation to reflect. Restore the Manrope headline treatment. Session metadata should sit in compact top-right corner, not a stacked form row.
   - **Top row feels like a tax form.** Date, Duration, Cancelled stacked in `flex items-end gap-4` row. Three form fields with uppercase labels as the first thing the teacher sees. Mockup tucks Duration and Cancelled into top-right as compact controls (pill + toggle). Move date/duration/cancelled into a compact metadata bar aligned right under the session header.
   - **Cancelled is a checkbox, not a toggle switch.** Mockup clearly shows a toggle. A toggle communicates binary state better and is more forgiving at small sizes.
   - **Todos + Followups stacked vertically.** Mockup puts them side-by-side as two equal-width cards. Stacking makes the form feel longer than necessary. Side-by-side communicates "peer-level actions" and saves vertical space.
   - **Voice Note section is generic.** Mockup has a horizontal bar: mic icon + "Voice Note / Capture thoughts via voice" left, "Upload Audio" middle, "TRANSCRIPTION READY" status right. Implementation wraps `AudioRecorder` in a standard form section.
   - **Reference bar positioning.** Mockup places it between textarea and voice note as visual anchor. Implementation puts it inside "What Happened?" form group.

   ### Interaction Testing Results

   | Element | Result | Notes |
   |---------|--------|-------|
   | Left panel followup checkbox | PASS | Strikethrough on check, unchecks cleanly |
   | Left panel difficulty checkbox | PASS | Shows "recorded as worked on today" helper |
   | What Happened textarea | PASS | Types and clears correctly |
   | Duration dropdown | PASS | Shows 30/45/60/90/Other with checkmark |
   | Duration "Other" custom field | PASS | Reveals Minutes input, accepts numbers |
   | Cancelled toggle | BUG | Coordinate clicks failed 3x; needed a11y ref. Hit target too small. |
   | Cancelled hides form fields | PASS | Correctly hides What Happened, Voice Note, Homework, Next Session, Todos, Followups. Keeps Date, Duration, Topics, Context, Reassessment. |
   | New Teaching Todo (Enter) | PASS | Adds item, clears input, shows X to remove |
   | New Teaching Todo (+ button) | PASS | Same behavior as Enter |
   | Todo remove (X) | PASS | Removes item immediately |
   | Empty todo guard | PASS | Clicking + with empty input does nothing |
   | New Followup (+ button) | PASS | Adds item with X to remove |
   | Topics Covered (no category) | PASS | Creates chip "Irregular verbs" with X |
   | Topics Covered (with category) | PASS | Creates chip "Subjunctive mood (Grammar)" |
   | Category dropdown | PASS | Shows Grammar, Vocabulary, Competency, Communicative function |
   | Level Reassessment toggle | PASS | Reveals CEFR sub-level dropdown (A1.1 through C2.2) |
   | Validation: empty What Happened | PASS | Shows error with warning icon, blocks submit |
   | Validation: reassessment no level | PASS | Shows "Select a CEFR sub-level for reassessment." |
   | Back arrow navigation | PASS | Returns to student detail page |
   | Successful submission | PASS | Saves, redirects to student detail, session appears in history |
   | Session counter after submit | PASS | Incremented from #12 to #13 correctly |
   | State reset on re-entry | PASS | Fresh form on re-navigation (no stale data) |

   ### Bugs Found

   1. **Cancelled checkbox hit target too small (MEDIUM).** Multiple coordinate clicks (3+ attempts) failed to register. Only succeeded via a11y ref. The checkbox is 16x16px with minimal surrounding clickable area. Left panel checkboxes (followups, difficulties) have proper `<label>` wrappers and work on first click. The Cancelled checkbox label is a separate element. Wrap checkbox + label text in a single `<label>` or increase clickable area.
   2. **No unsaved changes warning (MEDIUM).** Back button and Cancel navigate away without warning even when the form has data. Teacher types a paragraph, accidentally clicks back, loses everything. Needs a "You have unsaved changes" guard (`useBlocker` or `beforeunload`). Moot if autosave is implemented.

   ### UX Recommendations (including Robert's feedback)

   - **Remove Save/Cancel buttons, implement autosave.** The teacher shouldn't have to scroll to the bottom to save. The session log is a reflection tool, not a checkout form. Autosave with a status indicator ("Saved" / "Saving...") in the header matches the interaction pattern of tools like Notion and Linear. This also eliminates the unsaved changes problem entirely. The current submit button is buried at the very bottom of a 13-section form.
   - **Record session button is missing.** There should be a visible, prominent "Record" CTA to start voice recording inline, matching the mockup's mic treatment. Currently only a small "Record" text button in the Voice Note section.
   - **Form length (13 sections).** Single-column stack makes it feel like a medical intake form. The mockup's side-by-side layouts and visual hierarchy make the same content feel lighter. Group "core" (what happened, homework status, homework assigned) and "extras" (voice note, topics, context, lesson link, reassessment) with collapsible secondary sections or progressive disclosure.

   ### Priority Summary

   | Priority | Issue | Recommendation |
   |----------|-------|----------------|
   | HIGH | Autosave instead of save/cancel | Remove buttons, add status indicator in header |
   | HIGH | Record session button missing | Add prominent record CTA per mockup |
   | HIGH | "What Happened?" headline treatment | Restore Manrope headline, compact metadata top-right |
   | HIGH | Form too long (13 sections) | Group core vs extras, collapsible secondary |
   | MEDIUM | Cancelled checkbox hit target | Wrap in label or increase clickable area |
   | MEDIUM | No unsaved changes guard | Add useBlocker (moot if autosave) |
   | MEDIUM | Todos + Followups stacked | Side-by-side per mockup |
   | MEDIUM | Cancelled is checkbox not toggle | Switch to toggle component |
   | LOW | Voice Note section treatment | More inline/horizontal per mockup |
   | LOW | Reference bar positioning | Match mockup placement |

7. Edit Session **=> #729 (replace modal with Log Session edit mode)** (Vera review, 2026-04-14)

   **Verdict: RETHINK (replace entirely)**

   The Edit Session is a `SessionLogDialog.tsx` modal dialog (~450px wide) from the old design. It opens from the session history expand view's "Edit" button. It has **zero design system treatment** and is functionally a different application from the Log Session page.

   ### What's wrong

   - **It's a dialog, not a page.** The Log Session is a full two-panel page with student context on the left. The Edit Session is a narrow modal crammed into 450px. The teacher loses all context (objectives, todos, difficulties) when editing.
   - **No design system applied.** Plain form labels ("What was planned (optional)"), native dropdowns showing raw enum values ("NotApplicable"), standard borders, no tonal layering, no Manrope headlines, no indigo gradient CTA. It looks like a completely different app.
   - **Different field names and layout.** Log Session says "What Happened?" with editorial treatment. Edit Session says "What was actually done (optional)" with developer language. Log Session has "Next Session Plan". Edit Session has "Topics for next session (optional)". Inconsistent vocabulary confuses the teacher.
   - **Has features the Log Session page doesn't (and vice versa):**
     - Edit has: "What was planned" (separate field), "Suggested difficulties" (AI-extracted chips with dismiss), "Difficulties observed this session" (checkboxes with competency labels)
     - Log Session has: Left panel with student context, "Planned for Today" reference bar, teaching todo checkboxes, pending followup checkboxes, active difficulty checkboxes
   - **"Previous homework status" shows raw enum.** Dropdown displays "NotApplicable" as a single word. Log Session has styled segmented buttons (Done / Partial / Not Done).
   - **No voice note integration.** Has Record/Upload audio at the top but no AI reflection extraction workflow visible.

   ### Recommendation

   **Kill the dialog. Reuse the Log Session page (`/students/:id/log-session`) in edit mode.**

   The Log Session page already has all the data structures. To support editing:
   1. Accept a session ID in the URL: `/students/:id/log-session?edit=<sessionId>` or `/students/:id/sessions/<sessionId>/edit`
   2. Pre-populate all form fields from the existing session
   3. Change the header from "Log Session" / "Session #13" to "Edit Session" / "Session #10, Apr 10"
   4. Change the submit button label from "Log Session" to "Save Changes" (or autosave, per the Log Session recommendation)
   5. Port the "Suggested difficulties" feature from the dialog into the Log Session page (it's valuable, just needs the redesigned treatment)

   This gives the teacher the same rich editing experience (student context panel, checkboxes, editorial tone) whether creating or editing a session. One screen, one design, one mental model.

   ### What to preserve from the old dialog

   | Feature | Keep? | Notes |
   |---------|-------|-------|
   | Suggested difficulties (AI-extracted) | YES | Valuable. Port to Log Session page with proper styling |
   | "What was planned" separate field | NO | Log Session's "Reference" bar handles this better |
   | Difficulties observed checkboxes | ALREADY EXISTS | Log Session left panel has this |
   | Pending Followups | ALREADY EXISTS | Log Session left panel has this |
   | Discard confirmation dialog | YES | Port the `showDiscardConfirm` AlertDialog pattern |

   | Priority | Issue | Recommendation |
   |----------|-------|----------------|
   | HIGH | Dialog is old design, inconsistent with Log Session | Replace with Log Session page in edit mode |
   | MEDIUM | Suggested difficulties feature | Port to Log Session page |
   | LOW | Discard confirmation | Port to Log Session (moot if autosave) |


### Isaac (Pedagogy) Review: Log Session (2026-04-14)

   **Verdict: ADJUST**

   Two-panel layout is the correct architecture for post-class reflection. Student context left, reflection form right. But the implementation strips away the pedagogical scaffolding that makes the mockup work as a *teaching tool* rather than a data entry form.

   #### Left panel: gutted pedagogically

   The mockup's left panel is a teacher's pre-class briefing card:
   - **Short-term Objectives** with deadlines ("DELE B2 Preparation, TARGET: JUNE 15", "Master Imperfect vs Preterite, OVERDUE: OCT 20")
   - **Teaching Todos** from prior sessions (checkboxes: "Review subjunctive triggers", "Check homework (Past Perfect)")
   - **Last Session summary** (a narrative quote, not just a date)
   - **Planned for Today** (what the lesson was supposed to cover)
   - **Active Difficulties** (what to watch for)

   The live version has only: Pending Followups (1 item), Last Session date (no summary), Active Difficulties (1 item). No objectives, no teaching todos from prior sessions, no "Planned for Today."

   A teacher logging a session needs *reminders of intent* to reflect accurately. "What happened?" is meaningless without "what was supposed to happen?" The mockup gives a glanceable brief so the teacher can write "We planned to work on *por* vs *para* but ended up on subjunctive because Ana couldn't form it." Without the brief, after 5 students in a day, teachers won't remember.

   #### "What Happened?" is a form label, not an invitation

   The mockup treats this as the emotional center: big Manrope headline, "Reflect on the session flow and student engagement" subtitle. The live version demotes it to `WHAT HAPPENED?` in small uppercase, indistinguishable from `HOMEWORK ASSIGNED`.

   This is not cosmetic. The *framing* changes what the teacher writes. A headline invites narrative ("Ana was frustrated with the subjunctive, we switched to a communicative activity and her mood changed"). A form label invites data. For post-class reflection to feed useful personalization, you need the narrative.

   #### Previous Homework Status is missing entirely

   The mockup has Done / Partial / Not Done segmented buttons. The live form has nothing. Homework follow-through is the first thing a teacher checks before class. Without logging it, the system can't track whether a student consistently skips homework (motivation problem, not comprehension).

   #### Reference bar missing

   The mockup has "Reference: Narrating past events, Por vs Para" anchoring the reflection to the lesson topic. The live version has no equivalent. This connects session logs to curriculum, essential for the Course Planner (Phase 2). Free text with no topic anchor makes progression tracking impossible.

   #### Todos and Followups stacked, not side-by-side

   Beyond the visual issue (Vera's note): **Teaching Todos** (things to prepare) and **Pending Followups** (promises to the student) are different cognitive categories. Side-by-side communicates "peer-level but different." Stacked makes them feel like more of the same form.

   #### What the live version does well

   - **Active Difficulties checkbox** on left panel. Low-friction tracking of difficulty progression.
   - **Pending Followups checkbox.** One click to resolve a promise.
   - **Topics Covered with category tagging.** Grammar/Vocabulary/Competency/Communicative function categories map to CEFR competency domains.
   - **Today's Context field.** Captures mood/energy, exactly what Jordi asked for (Feedback #7). Good placement as optional metadata.
   - **Level Reassessment flag.** Teachers notice misalignment mid-class but forget to act. A checkbox captures the signal at the right moment.

   #### Priority (pedagogical perspective)

   | Priority | What | Why it matters pedagogically |
   |----------|------|------------------------------|
   | HIGH | Restore "Planned for Today" in left panel | Reflection requires knowing the intent |
   | HIGH | Add Previous Homework Status (Done/Partial/Not Done) | First thing a teacher checks; tracks student engagement patterns |
   | HIGH | Restore "What Happened?" as editorial headline | Framing changes what teachers write; narrative > data entry |
   | MEDIUM | Show Teaching Todos from prior sessions (checkable) | Teacher needs to know what they promised to prepare |
   | MEDIUM | Show Short-term Objectives with deadlines | Anchors session in the student's learning trajectory |
   | MEDIUM | Add Reference bar with lesson/topic anchor | Connects log to curriculum for progression tracking |
   | MEDIUM | Last Session: show narrative summary, not just date | "17 May 2026" tells nothing; the mockup's quote is useful |
   | LOW | Todos and Followups side-by-side | Different cognitive categories deserve visual distinction |

### Isaac (Pedagogy) Review: Edit Session Modal (2026-04-14)

   **Verdict: RETHINK (agree with Vera: replace with Log Session page in edit mode)**

   The Edit Session modal is a ~450px dialog from the old design. Pedagogically, it creates a split-brain experience that will confuse teachers.

   #### The modal undermines reflection quality

   The Log Session page was designed (correctly) as a reflection tool: student context on the left, narrative space on the right, editorial framing. The Edit Session modal throws all of that away: no student context panel, cramped 450px width, developer-facing language ("What was actually done (optional)"), and raw enum values ("NotApplicable" in the homework status dropdown).

   A teacher who logs a rich, contextual session via the full page and then returns to edit it via a cramped modal gets a jarring cognitive downgrade. The same data, presented two different ways, with different field names. This is not a minor inconsistency; it signals that the system doesn't have a coherent model of what a session record is.

   #### Vocabulary inconsistencies are pedagogically harmful

   | Log Session page | Edit Session modal | Problem |
   |-----------------|-------------------|---------|
   | "What Happened?" | "What was actually done (optional)" | Different framing. The page invites narrative, the modal invites a checkbox mentality |
   | "Next Session Plan" | "Topics for next session (optional)" | "Plan" implies intentional preparation. "Topics" implies a list. Teachers think in plans |
   | "Today's Context" | "General notes (optional)" | "Context" prompts for mood, energy, situational factors. "Notes" prompts for anything |
   | Styled segmented buttons | "NotApplicable" raw dropdown | Teachers should never see database enum values |

   If a teacher fills "What Happened?" on the Log page and then opens the modal to edit, they see "What was actually done." Are these the same field? Different fields? The teacher shouldn't have to wonder.

   #### What the modal has that the Log page doesn't (and should)

   - **"What was planned" as a separate field.** The Log page's left-panel "Planned for Today" section handles this better (context, not editable field), but the *concept* is right: reflection requires comparing intent vs reality.
   - **"Difficulties observed this session" with competency labels** (e.g., "Grammar / preterite vs imperfect contrast"). The Log page has Active Difficulties checkboxes on the left panel, but without the competency categorization. The categorization is valuable for tracking which *type* of difficulty a student has (grammar vs pronunciation vs pragmatic).
   - **Pending Followups with completion state.** The modal shows "Prepare a mock exam" with a status indicator. Worth porting.

   #### Recommendation

   Agree fully with Vera: kill the modal, reuse the Log Session page in edit mode. One screen, one design, one mental model. Port the "Difficulties observed with competency labels" feature into the Log Session page. The rest is already handled better by the full page layout.

1. Dashboard **=> #730 (hero card, roster signals, followups)** (Vera review, 2026-04-13)
   * Verdict: **ALMOST**

   ### What's working well
   - **Sidebar** is clean. Indigo active indicator, proper nav hierarchy, teacher identity at the bottom. Matches mockup.
   - **Tonal layering** present. Lavender canvas behind white cards creates the "stationery lift" the design system calls for.
   - **Next Session hero card** reads clearly: countdown badge, student name, CEFR badge, VIEW PROFILE link, planned content preview.
   - **CEFR badges** correct: square-ish with right color coding per level.
   - **"VIEW ENTIRE STUDENT BASE"** link is good progressive disclosure.

   ### Gaps vs Stitch mockup

   - **Missing "Start session" primary CTA on hero card.** The mockup has both "Open profile" (secondary) and "Start session" (primary gradient CTA). The live version only has "VIEW PROFILE." This is the number-one action on the page and it's missing. A teacher lands here, sees their next student, should launch a session in one click. Priority: HIGH.
   - **Missing "Last Session Briefing" block on hero card.** Mockup shows structured bullet points from last session + a "Homework Status" card. Live version has a single "PLANNED" text line. The briefing answers "what happened last time?" and "is there outstanding homework?" at a glance. That's the context Jordi needs before a class.
   - **Today's Agenda empty state wastes prime real estate.** "No sessions today" in a big white card signals "this app has nothing for me." Consider: show the next day with sessions, or collapse/minimize when empty so followups and student list get more prominence. Priority: MEDIUM.
   - **Pending Followups underselling urgency.** Mockup shows colored priority dots, overdue badges ("3 DAYS OVERDUE"), timestamps. Live version has one item with a tiny "1d" badge. The overdue indicators communicate urgency much better.
   - **Student Roster missing "Activity Signal" column.** Mockup shows "CANCELLED 2X", "REVIEW PENDING", "INACTIVE 12D" with color-coded status. This turns a boring list into an at-a-glance triage tool. Live version has a "PENDING" column that appears empty for everyone. Priority: HIGH.
   - **Student Roster missing L1 (native language) column.** Mockup includes L1 right after LEVEL. For a language teacher, knowing native language is immediate context (interference patterns). Small thing, big UX value.
   - **No sort control on student list.** Mockup has "Sort by: Last Session" dropdown. Live version has no visible sort mechanism. Teachers with 20+ students need to reorder.
   - **Student count missing.** Mockup shows "24 active enrollments" under "Student Roster." Live version just says "Students." The count is a subtle confidence signal.

   ### What the live version does better
   - The "PLANNED" content preview shows what's *coming*, not just what happened. Forward-looking context is arguably more valuable right before a session. Ideal: show both planned and last-session briefing.

   ### Top 3 priorities
   1. Add "Start session" primary CTA to the hero card (number-one action on the page).
   2. Add Activity Signal column to the student roster (command center, not phone book).
   3. Handle empty Agenda state better (show next scheduled day, or collapse when empty).

   * Isaac (pedagogy review, 2026-04-12):
     Verdict: **ADJUST**. The dashboard has the right bones (hero card, agenda, followups, roster) but gaps in information density and urgency signaling reduce its usefulness as a teaching tool.

     ### Full agreement with Vera
     - **"Start session" CTA missing (HIGH).** This is the teacher's "I'm about to teach" moment. One click should open the session log pre-populated with the planned content.
     - **Activity Signal column missing (HIGH).** "CANCELLED 2X", "INACTIVE 12D", "REVIEW PENDING" transform the roster from a phone book into a triage tool. A teacher with 10+ students needs at-a-glance signals to decide who needs attention today.
     - **L1 column missing.** Native language is the first variable a teacher considers. Not optional metadata for a language teaching app.
     - **Student count missing.** "24 active enrollments" is both a confidence signal and a workload indicator.
     - **Sort control missing.** Default sort should be "Last Session" (most recent first), not "Next Session." Most private teachers don't schedule in advance. "Who did I just teach?" and "who haven't I seen in a while?" are the two most common questions.

     ### Where I'd push further than Vera

     - **(HIGH) Last Session Briefing needs structured bullets, not just "show both planned and last-session."** The mockup's bullets aren't random session notes; they're a structured pre-class brief. Four elements, mapping to four teacher questions:
       1. **Topics covered** (from narrative/topic tags): "Subjuntivo en concesivas" (What did we do?)
       2. **Student response** (from narrative): "le costó" / "dominó" (How did it go?)
       3. **Promises made** (from followups): "Prometí ejercicios de por/para" (What did I promise?)
       4. **Homework assigned** (from session homework field): "Deberes: redacción 'mi ciudad ideal'" (What homework is pending?)
       If the session log data supports it (narrative + followups + homework fields exist), the dashboard should extract and display them.

     - **(HIGH) Homework Status deserves its own card, not just a bullet in the briefing.** The mockup has a distinct warm-toned "HOMEWORK STATUS" card: "'Mi ciudad ideal' pending correction, VIEW TASK." Homework status is the teacher's first check before class ("did they do it? have I corrected it?"), and it requires a distinct action ("VIEW TASK" to go correct it). Embedding it in briefing bullets would underweight it. The mockup's approach (separate card with warm accent) correctly elevates it.

     - **(HIGH) Followup overdue indicators are pedagogically critical, not just a visual nicety.** A broken followup is a broken promise to the student. "I'll prepare a mock exam" left overdue for 3 days means the student asked about it, the teacher forgot, and trust erodes. In private teaching, the relationship IS the product. A student who feels forgotten will cancel. The "1d" badge on the live version is too quiet. The mockup's colored priority dots and "3 DAYS OVERDUE" badges are the correct weight.

     - **(MEDIUM) "IN 33D" urgency badge needs adaptive tone.** The green "IN 33D" pill normalizes the urgency signal. The mockup shows "IN 35 MIN" in green because 35 minutes is genuinely urgent. Applying the same visual to 33 days teaches the teacher to ignore the hero card. Suggestion:
       - Green: <2 hours ("IN 35 MIN")
       - Neutral/gray: today but not imminent ("TODAY, 16:00")
       - No countdown badge at all for >7 days, just show the date calmly ("Sunday 17 May")

     - **(MEDIUM) Empty Agenda: "This Week" view instead of "Today."** For private teachers, a "This Week" mini-view (next 3-5 sessions across multiple days) is more useful than "Today" because they plan across the week. A teacher opening the dashboard Sunday evening wants to see Monday's and Tuesday's sessions. A single-day agenda is too narrow for the way private teachers think about their schedule.

     - **(MEDIUM) Roster sort default matters more than the control itself.** The current list shows Kim at the bottom (26 Jan), a student not seen in nearly 3 months. With "Last Session" default sort + activity signals, the teacher sees: recent students at top (active), drifting students at bottom (need outreach). The sort order itself tells a story about the health of the atelier.

     ### Priority summary
     | Priority | Finding | Vera agrees? |
     |----------|---------|-------------|
     | HIGH | "Start session" CTA missing | Yes |
     | HIGH | Last Session Briefing (structured bullets) | Yes |
     | HIGH | Homework Status as distinct card | Partially (within briefing) |
     | HIGH | Activity Signals in roster | Yes |
     | HIGH | Followup overdue badges | Yes |
     | MEDIUM | Urgency badge adaptive to time distance | Not mentioned |
     | MEDIUM | "This Week" view instead of "Today" when empty | Partially ("next day") |
     | MEDIUM | L1 column + sort control + student count | Yes |

8. Dashboard left menu / Sidebar **=> #731 (Settings separation, P2)** (Vera review, 2026-04-13)
   Verdict: **ALMOST** (85% there, polish items only)

   Compared live app sidebar against Stitch canvas: Dashboard Polished, Dashboard Wireframe, and Students List High Density versions.

   ### What matches well
   - **Nav items** are correct: Dashboard, Students, Sessions, Courses, Lessons, Settings. Same order as Stitch.
   - **Active state indicator**: indigo left bar on active item. Present in both Stitch and live.
   - **Teacher identity** at bottom with avatar, name, role. Matches.
   - **Logo + subtitle** "LangTeach / LANGUAGE CURATOR" is consistent with Stitch's "Atelier / LANGUAGE CURATOR."
   - **Tonal background** on sidebar differs from main content area. Correct layering.

   ### Gaps vs Stitch

   - **Settings should separate from main nav.** The most polished Stitch iteration (Students List High Density) pins Settings toward the bottom with a visual gap, separated from the primary nav group (Dashboard through Lessons). The live app has Settings inline as item 6. The Stitch pattern is better UX: settings is low-frequency and shouldn't compete with primary navigation. Pinning it near the bottom (above teacher profile) is a well-established pattern (Linear, Notion, Figma). Priority: MEDIUM.
   - **"0 / 50 generations" counter doesn't exist in any Stitch version.** The live app shows this above the teacher profile. It has no label, no icon, no context. A teacher seeing this for the first time would have zero idea what it means. Move to Settings page or a usage tooltip. Priority: MEDIUM.
   - **Log out link not in any Stitch sidebar.** The live app shows it explicitly below the teacher card. Consider tucking it into a click/hover on the teacher profile card, or making it smaller/more subdued. Priority: LOW.
   - **Vertical spacing slightly tighter than Stitch.** The Stitch mockups have ~4-6px more gap between nav items. Subtle, but contributes to the "breathable" feel the design system calls for. Priority: LOW.

   ### Not an issue (confirmed matching)
   - Nav item count (6) is fine. Miller's 7+/-2 is not exceeded. Earlier Stitch iterations had 4-5 items but the latest canvas versions match the live app.
   - Brand name "LangTeach" vs Stitch's "Atelier" is intentional (LangTeach is the product name).
   - Stitch has contextual sidebar CTAs in student detail ("+ New Curriculum") but this is aspirational/future work.

   ### Priority fixes
   1. Separate Settings from main nav (gap + pin toward bottom, above teacher card).
   2. Remove "0 / 50 generations" from sidebar. Move to Settings or usage tooltip.
   3. Tuck Log out into teacher profile area (dropdown or smaller treatment).

5. Sesioons, recorver feedback jordi about old design, teaching todos on top. ask stitch ASk stitch and review with Vera


--------
check ui review seeder. that is enough to validate interface
check ui test review are enough