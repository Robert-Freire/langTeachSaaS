# Student Screens: Field-to-Screen Mapping

> **Purpose:** Single source of truth for which fields appear on which
> screen, in which section. Updated as design decisions are made.
> Cross-reference with `docs/student-profile-field-guide.md` for field
> definitions.
>
> **Last updated:** 2026-04-11

---

## Tab structure (decided 2026-04-11)

| Tab | Purpose | Daily use |
|---|---|---|
| **Overview** | The "glance" tab. Summary of everything. What the teacher sees between classes. | High (daily) |
| **Profile** | The "deep" tab. Full detail on identity, languages, notes, goals, difficulties, commercial. | Low (planning, onboarding) |
| **Sessions** | Full session timeline with filters and search. | Medium (weekly review) |
| **Progress** | Skill overview, pacing, coverage analysis. | Low (periodic assessment) |

---

## Student Header (always visible, all tabs)

| Field | Source | Notes |
|---|---|---|
| Name | Student.Name | |
| Avatar | Initials from Name | |
| CEFR Level | Student.CefrLevel | Badge |
| Learning Language | Student.LearningLanguage | |
| Profession | Student.Profession | Below name |
| Origin / Residence | Student.CountryOfOrigin + CityOfResidence | "Lisbon / Madrid" format |
| Active badge | Student.IsActive | Green "Active" or grey "Inactive" |
| Private/Corporate badge | Student.IsCorporate | "Private" or "Corporate" |
| Next session | Computed from SessionLogs | "Next: Thursday 10:30" + duration |

---

## Overview tab

The daily working view. Shows the *latest* of everything, not the full detail.

### Primary Objective card (top right)

| Field | Source | Notes |
|---|---|---|
| Objective text | Student.ShortTermObjectives[0].text | First/most urgent objective |
| Target date | Student.ShortTermObjectives[0].targetDate | "Deadline: June 15, 2024" |
| Days remaining | Computed from targetDate | Display only, no percentage |

**Decision (2026-04-11):** No "65% Ready" progress indicator. No backend
for objective completion tracking. Show text + deadline + days remaining only.

### Ideas para clases (Teaching Todos card)

| Field | Source | Notes |
|---|---|---|
| Todo items | Student.TeachingTodos[] | Checklist with status |
| Text | .text | Spanish, teacher-authored |
| Status | .status | pending (checkbox), covered (strikethrough + green dot), discarded |
| Created date | .createdAt | Show as relative time |

**Interaction:** Checkboxes to mark as covered inline. Add button for new items.

### Pending Followups card

| Field | Source | Notes |
|---|---|---|
| Followup items | TeacherFollowup[] where studentId = this student | Filtered from teacher-level entity |
| Text | .text | Spanish, teacher-authored |
| Status | .status | pending (amber dot), done (green dot) |
| Age | Computed from .createdAt | "3d ago" |

**Interaction:** Checkable as done. Visually distinct from Teaching Todos (amber convention).

### Pedagogical Profile card

| Field | Source | Notes |
|---|---|---|
| Per-skill levels | Student.SkillLevelOverrides | Reading, Writing, Speaking, Listening |
| CEFR bar | Visual encoding of level | Bar length = position on A1-C2 scale |
| Trend label | Not available yet | Future: derive from Difficulty trends. Skip for v1. |
| Native languages | Student.NativeLanguages[] | Tags at bottom of card |

**Decision (2026-04-11):** Bars are a visual encoding of the CEFR level,
which we have. Trend labels (Strong, Improving) deferred until we can
derive them from difficulty/session data.

### Session History (recent only)

| Field | Source | Notes |
|---|---|---|
| Session date | SessionLog.sessionDate | "Thursday, March 21" |
| Title/topic | Derived from topicTags or actualContent | First line or generated summary |
| Narrative | SessionLog.actualContent | Spanish, truncated |
| Duration | SessionLog.duration (new field) | "60 min" badge. Not in model yet. |
| Homework | SessionLog.homeworkAssigned | Inline with homework icon |
| Topic tags | SessionLog.topicTags | Chips |

**Show:** Last 2-3 sessions only. Link to Sessions tab for full history.

### Teacher's Working Memory (bottom panel)

| Field | Source | Notes |
|---|---|---|
| Memory text | Student.TeachingNotes | Free text, Spanish |
| Attendance Rate | Computed: completed / (completed + cancelled) | From SessionLogs. Future. |
| Engagement Index | Computed from emotionalSignals | From SessionLogs. Future. |
| Student Since | First SessionLog date or Student.createdAt | Computed. |

**Decision (2026-04-11):** "Teacher's Working Memory" is a better UI
label than "Teaching Notes." DB field stays `TeachingNotes`. UI label
changes to "Teacher's Working Memory." Internal Stats (Attendance,
Engagement, Student Since) are computed fields, not buildable for v1
(need session history aggregation). Show the text area only for now,
add stats when backend supports them.

---

## Profile tab

The reference view. Everything about the student, fully detailed.
Stitch design reviewed and approved (2026-04-11, 3 iterations).

### Layout (from Stitch, confirmed)

**Top:** "THE WHY / MOTIVACION" hero section. ReasonForStudying as large
italic quote with interest tags beside it. Edit affordance (ghost pencil
icon on hover) for inline editing.

**Left column (~60%):** Pedagogical Diagnostic, then Teacher's Working Memory.

**Right column (~40%):** Identity Details, Interests, Commercial, Teaching
Todos, Pending Followups, Language Ecosystem.

### "The Why / Motivacion" hero section (top)

| Field | Source | Notes |
|---|---|---|
| Reason for Studying | Student.ReasonForStudying | Hero quote treatment, large italic. Inline editable (pencil on hover). |
| Interests | Student.Interests[] | Tags displayed beside the quote |

### Pedagogical Diagnostic section (left)

| Field | Source | Notes |
|---|---|---|
| CEFR Level | Student.CefrLevel | Badge next to section title |
| Learning Goals | Student.LearningGoals[] | Bullet list. Editable on Edit Student. |
| Short-Term Objectives | Student.ShortTermObjectives[] | Each: text + targetDate. Red border + "Critical" if within 6 weeks. Red "OVERDUE" if past due. No chevron arrows (not links). |

**Decision (2026-04-11):** Past-due objectives show "OVERDUE" label. No
"65% Ready" or completion tracking (no backend).

### Skill Assessment Overrides (left, under diagnostic)

| Field | Source | Notes |
|---|---|---|
| Reading | Student.SkillLevelOverrides.reading | CEFR badge (square, colored by level) |
| Writing | Student.SkillLevelOverrides.writing | |
| Speaking | Student.SkillLevelOverrides.speaking | |
| Listening | Student.SkillLevelOverrides.listening | |

**Decision (2026-04-11):** Show CEFR level badges only. No trend labels
(Strong, Improving) until derivable from difficulty/session data.

### Focus Areas & Difficulties (left, under skills)

| Field | Source | Notes |
|---|---|---|
| Difficulties | Student.Difficulties[] | Table columns: Area, Subcategory, Trend, Status |
| Trend values | .trend | "Stable", "Improving", "Regressing" (not "Advancing") |
| Status values | .status | "Working", "Covered" (not "Reviewing") |
| Weaknesses | Student.Weaknesses[] | "Areas to Improve" (free text with category) |

**Decision (2026-04-11):** Use model vocabulary for labels. Trend and Status
are separate columns.

### Teacher's Working Memory section (left, bottom)

One visual card with two subsections separated by spacing/tonal shift.

| Field | Source | Notes |
|---|---|---|
| Sensitivities / Life Context | Student.PersonalNotes | Subsection 1. About the person. Sensitive data. |
| Pedagogical Observations | Student.TeachingNotes | Subsection 2. How to teach this student. Indigo left-border accent. |

**Decision (2026-04-11):** Section heading is "Teacher's Working Memory"
(not "Working Memory & Student Notes"). DB fields stay `PersonalNotes` and
`TeachingNotes`. Subsection labels: "Sensitivities / Life Context" and
"Pedagogical Observations."

### Identity Details card (right, top)

| Field | Source | Notes |
|---|---|---|
| Profession | Student.Profession | |
| Born | Student.BirthYear | Display as "1985 (39 years)" with calculated age |
| Origin | Student.CountryOfOrigin + CityOfOrigin | "Lisbon, Portugal" + "NATIVE PORTUGUESE" label |
| Residence | Student.CountryOfResidence + CityOfResidence | "Madrid, Spain" |

**Decision (2026-04-11):** Card heading is "IDENTITY DETAILS" (not
"Teacher's Working Memory," which is the notes section on the left).

### Interests section (right, below identity)

| Field | Source | Notes |
|---|---|---|
| Interests | Student.Interests[] | Tags with edit pencil + "+" add button |

**Decision (2026-04-11):** Interests appear both as tags beside the
motivation quote (display) and as an editable section on the right column.

### Commercial section (right)

| Field | Source | Notes |
|---|---|---|
| Private/Corporate | Student.IsCorporate | "PRIVATE STUDENT" or "CORPORATE" badge |
| Active | Student.IsActive | "ACTIVE" or "INACTIVE" badge |
| Rate | Student.Rate | Free text display (e.g. "45/hr"). No billing details. |

**Decision (2026-04-11):** Rate is free text only. No billing frequency or
payment method fields (not in model).

### Teaching Todos (right)

| Field | Source | Notes |
|---|---|---|
| Todos | Student.TeachingTodos[] | Full list with inline add/edit/status. Indigo convention. |
| Status | .status | pending (checkbox), covered (strikethrough + checkmark) |

**Decision (2026-04-11):** Teaching Todos are pedagogical only. Operational
items ("send PDF") go to Pending Followups.

### Pending Followups (right, below todos)

| Field | Source | Notes |
|---|---|---|
| Followups | TeacherFollowup[] filtered | Amber convention. Inline checkable. |
| Overdue indicator | Computed from .createdAt | Red "Overdue (2 days)" if stale |

### Language Ecosystem (right, bottom)

| Field | Source | Notes |
|---|---|---|
| Spoken Languages | Student.SpokenLanguages[] | Flat list, language name only. No proficiency levels. Label: "SPOKEN LANGUAGES" (not "Strong Points"). |
| Learning Language | Student.LearningLanguage | "Learning Spanish" with ES badge |
| Teacher's Assessment | Student.CefrLevel | "TEACHER'S ASSESSMENT B1" |
| Official Level | Student.OfficialCefrLevel | "OFFICIAL A2" (show if different from CefrLevel) |
| Native Languages | Student.NativeLanguages[] | Tags with language code badges (PT, EN) |

**Decision (2026-04-11):** SpokenLanguages is a flat list (no proficiency
per language, deferred). Label is "Spoken Languages." CEFR labels use
"Teacher's Assessment" and "Official" (not "Praxis").

### NOT on Profile tab

| Item | Reason |
|---|---|
| Learning Thread (Current/Next/Planned topics) | Depends on Course entity, Phase 2. Removed entirely. |
| Billing frequency/method | Not in model. Rate is free text only. |
| SpokenLanguage proficiency levels | Deferred. Model is flat list. |
| Trend labels on skill badges | Deferred. Need difficulty/session aggregation. |

---

## Sessions tab

Full session history. Stitch design reviewed (2026-04-11).

### Layout (from Stitch, confirmed)

**Header stats:** Total Hours (computed from session durations). No Streak
counter (gamification-adjacent, can create wrong incentives for
cancellations).

**Toolbar:** Search + Date Range picker + Status filters
(All/Completed/Cancelled/Draft) + Topic filter.

**Timeline:** Vertical list, most recent first. Each session has a
collapsed and expanded state.

**Collapsed session row:**
- Date badge (month + day)
- Title (see decision below)
- Status badge (Completed green, Cancelled grey, Draft zinc)
- Content snippet (truncated actualContent)
- Topic tags (chips)
- Duration badge ("60 min")
- Expand chevron

**Expanded session card:**
- Session Narrative (actualContent, quoted, Spanish)
- Teacher Notes (generalNotes, indigo left-border, same convention as Profile)
- Homework card (right side): homeworkAssigned text + previousHomeworkStatus
- Next Session Plan (right side): nextSessionTopics + linked lesson link
- Voice note indicator (mic icon if voiceNoteId present)
- Three-dot menu (edit, delete)

**Cancelled sessions:** Greyed out, show cancellation reason from
actualContent, 0 min duration.

**Pagination:** "Showing 15 of 42 sessions" + "Load earlier sessions"

### Field mapping

| Field | Source | Notes |
|---|---|---|
| Session date | SessionLog.sessionDate | Date badge (APR 05) |
| Session title | See decision below | Not in model yet |
| Status | SessionLog.status + isCancelled | Completed/Draft/Canceled |
| Actual content | SessionLog.actualContent | Main narrative, "SESSION NARRATIVE" label |
| Homework assigned | SessionLog.homeworkAssigned | Right-side card with status icon |
| Previous homework status | SessionLog.previousHomeworkStatus | Green check (Done), amber (Partial), red (Not Done) |
| Next session topics | SessionLog.nextSessionTopics | Right-side card, "NEXT SESSION PLAN" label |
| General notes | SessionLog.generalNotes | "TEACHER NOTES" label, indigo left-border. Scoped to this session. |
| Topic tags | SessionLog.topicTags | Chips below narrative |
| Duration | SessionLog.duration | Badge on right. New field, not in model yet. |
| Level reassessment | SessionLog.levelReassessmentSkill + Level | If present |
| Linked lesson | SessionLog.linkedLessonId | Link shown under Next Session Plan |
| Voice note | SessionLog.voiceNoteId | Mic icon on session header if present |
| Teacher name | N/A | Not needed for single-teacher. Remove for v1. |

### Decisions needed

**Session title:** Stitch shows titles like "Subjunctive Usage in Time
Clauses" and "Introduction to Business Spanish." Our SessionLog has no
`title` field.

**Decision (2026-04-11):** AI-generate from plannedContent or
actualContent (whichever is available). Most sessions won't have a
linked lesson or topic tags, so those fallbacks would almost always
produce a generic date label. The extraction prompt (or a lightweight
post-processing step) should generate a short title (under 60 chars)
from the session narrative. Store it on SessionLog so it's not
re-generated on every list render. Fallback for sessions with no
content: "Session, Apr 5."

**Streak counter:** Stitch shows "STREAK 12." Drop it. Streaks create
wrong incentives: a student who cancels for a valid medical reason
"breaks" a streak, which feels punitive. Total Hours is useful
(billing, pacing). Streak is not.

**Homework card clarity:** The card should clearly distinguish between
"Homework Assigned" (what was given THIS session) and "Previous Homework
Status" (whether the student did LAST session's homework). Stitch's
current design shows one card with the assigned homework + "Done" status.
Needs two distinct labels.

**Features:** Filter by date range, search, status filter, topic tag filter.

---

## Progress tab

Stitch design reviewed (2026-04-11). Mix of real data sections and
"coming soon" placeholders to spark conversation with Jordi.

### Skill Imbalance Analysis (left, main section) — REAL DATA

| Field | Source | Notes |
|---|---|---|
| Reading level | Student.SkillLevelOverrides.reading | Bar + CEFR badge |
| Writing level | Student.SkillLevelOverrides.writing | Bar + CEFR badge |
| Speaking level | Student.SkillLevelOverrides.speaking | Bar + CEFR badge |
| Listening level | Student.SkillLevelOverrides.listening | Bar + CEFR badge |
| Baseline | Student.CefrLevel | Reference line on chart |

Bar length = position on A1-C2 scale. Baseline reference line = student's
general CefrLevel. Skills above baseline are visibly longer, skills below
are visibly shorter. The teacher sees the imbalance at a glance.

**Decision (2026-04-11):** Baseline is CefrLevel (teacher's assessment),
NOT a "target level" (doesn't exist in model). No AI annotations
("Advanced Proficiency Detected", "Focus Area: Syntactic Precision") for
v1. The bars speak for themselves.

**Decision (2026-04-11):** Fix "LEARNING TRACK: European Portuguese"
label. Should be "Native: Portuguese" or removed. Learning track implies
curriculum concept we don't have.

### Pacing Analytics (right, top) — REAL DATA

| Field | Source | Notes |
|---|---|---|
| Total Sessions | Count of SessionLogs (completed) | "14" |
| Frequency | Computed: sessions / weeks since first | "1.2/wk" |
| Start Date | First SessionLog date or Student.createdAt | "since Jan" |
| Cancellation Rate | cancelled / total sessions | "7%" number only |

**Decision (2026-04-11):** No trend dot on cancellation rate (requires
historical comparison we don't have). Number only.

### Difficulties Evolution — REAL DATA (not in Stitch, add)

| Field | Source | Notes |
|---|---|---|
| Difficulties | Student.Difficulties[] | Show status transitions |
| Recently covered | .status = "covered" | Green, with date covered |
| Stale working | .status = "working" + no recent session mention | Amber warning |
| Active working | .status = "working" + recent session mention | Normal |

This section IS computable from current data (Difficulties + SessionLog
mentionedDifficultyPairs). Shows which difficulties have progressed and
which are stuck. Not in Stitch design, needs to be added.

### "Coming Soon" placeholders — CONVERSATION STARTERS

These are greyed-out placeholder cards to show Jordi and gauge his
reaction. Not promises, not roadmap commitments. Learning tools.

| Placeholder | What it teases | What we learn from Jordi's reaction |
|---|---|---|
| **Topic Analysis** | "What topics have we covered, what's missing?" | Does he want curriculum coverage tracking? If yes, validates Phase 2 Course entity. If he shrugs, deprioritize. |
| **Curriculum Progress** | "Track your lesson plan progress" (greyed timeline) | Does he plan in sequences? If "this is what I need most," Course is right. If "I don't plan that far ahead," we learn how freelance teachers actually work. |
| **Engagement Trends** | "How your student's engagement evolves over time" (placeholder chart) | Tests whether emotional/affective tracking (Jordi feedback round #7) is something he'd look at on screen, or prefers it feeding generation silently. |

### NOT on Progress tab

| Item | Reason |
|---|---|
| Streak counter | Dropped. Gamification, wrong incentives. |
| Objective completion % | No tracking mechanism. |
| AI annotations on skill bars | No analysis pipeline for v1. |
| Billing/invoicing data | Wrong context. Progress is pedagogical, not commercial. |
| Target level comparison | No target level field on student. Would live on Course (Phase 2). |

---

## Edit Student form

Stitch design reviewed and approved (2026-04-11, 2 iterations).
See `dashboard-redesign-v1-prompts.md` section 3 for the prompt spec.

### Layout (from Stitch, confirmed)

**Tab navigation** across form sections: Basic Info, Background,
Proficiency, Teaching Goals, Difficulties, Notes, Commercial.

**Single-page scrollable view** showing all sections. Tabs jump to
sections (anchor navigation), not separate pages.

**Right sidebar** (always visible): Teaching Todos + Pending Followups.

### Section mapping

| Form Section | Fields | Notes |
|---|---|---|
| Basic Info | Name, LearningLanguage | Avatar uses initials only, no photo upload |
| Basic Info > Languages | NativeLanguages (multi-select), SpokenLanguages (tag input) | Added in Stitch v2. Critical for generation. |
| Basic Info > Proficiency & Assessment | CefrLevel ("Teacher's Assessment"), OfficialCefrLevel ("Official Level") | |
| Basic Info > Skill Overrides | SkillLevelOverrides (Reading, Writing, Speaking, Listening) | Grouped under Proficiency in Stitch. Acceptable. |
| Personal Background | BirthYear, Profession, CountryOfOrigin, CityOfOrigin, CountryOfResidence, CityOfResidence | Left column |
| Personal Background > Reason | ReasonForStudying | Right column, large text display |
| Personal Background > Interests | Interests[] | Tag input with "+ Add Interest" |
| Teaching Goals > Learning Goals | LearningGoals[] | "+ Add Goal" (no date field). Separate from objectives. |
| Teaching Goals > Short-Term Objectives | ShortTermObjectives[] | "+ Add Objective" (with date field). "NEAR DATE" warning. |
| Key Difficulties | Difficulties[] | Table: Competency, Severity (visual bars), Trend (arrows), Status |
| Weaknesses / Areas to Improve | Weaknesses[] | Free text with category badge (Grammatical, Lexical). Below Key Difficulties. |
| Notes > Sensitivities / Life Context | PersonalNotes | Left column |
| Notes > Pedagogical Observations | TeachingNotes | Right column |
| Teaching Todos (right sidebar) | TeachingTodos[] | Inline add/edit/status. Indigo convention. |
| Pending Followups (right sidebar) | TeacherFollowup[] filtered | Inline add/done. Amber convention. Action: "Done" (not "Mark Sent"). |
| Commercial Info | IsActive (toggle), IsCorporate (toggle), Rate (text) | |
| Linked Courses | Read-only list + "+ Create Course" button | |

### Decisions confirmed

| Decision | Notes |
|---|---|
| No photo upload | Avatar initials only. No storage/privacy complexity for v1. |
| Languages in Basic Info | NativeLanguages + SpokenLanguages added. Flat list, no proficiency. |
| Learning Goals vs Short-Term Objectives split | Separate add flows: goals have no date, objectives have date. |
| Weaknesses section added | Below Key Difficulties. Free text + category. |
| Followup action label | "Done" (generic), not "Mark Sent" (too specific). |
| Skill Overrides placement | Grouped under Proficiency & Assessment in Basic Info. Acceptable (not a separate tab). |

---

## Log Session form

Stitch design reviewed and approved (2026-04-11, 2 iterations).
See `stitch-log-session-feedback.md` for Stitch revision prompt.
Maps to session creation/update. See `dashboard-redesign-v1-prompts.md`
section 4 for the full layout.

### Left panel (context, read-only)

| Section | Source |
|---|---|
| Student header | Student basic fields |
| Objectives | Student.ShortTermObjectives[] |
| Teaching Todos | Student.TeachingTodos[] (checkable) |
| Pending Followups | TeacherFollowup[] filtered (read-only or checkable, TBD) |
| Last Session | Previous SessionLog |
| Planned for Today | Previous SessionLog.nextSessionTopics (auto-populated) |
| Active Difficulties | Student.Difficulties[] (checkable) |

### Right panel (form fields)

| Field | Maps to |
|---|---|
| Date | SessionLog.sessionDate |
| Duration | SessionLog.duration (new) |
| Cancelled | SessionLog.isCancelled |
| What happened | SessionLog.actualContent |
| Homework | SessionLog.homeworkAssigned |
| Next session | SessionLog.nextSessionTopics |
| New Teaching Todos | Student.TeachingTodos[] (appended) |
| New Followups | TeacherFollowup (created) |
| Topics covered | SessionLog.topicTags |
| Level reassessment | SessionLog.levelReassessmentSkill + Level |
| Session notes | SessionLog.generalNotes |
| Linked lesson | SessionLog.linkedLessonId |
| Audio | SessionLog.voiceNoteId |

---

## Fields NOT on any screen yet

| Field | Reason | When |
|---|---|---|
| Attendance Rate | Computed from session history, needs aggregation endpoint | Phase 2+ |
| Engagement Index | Computed from emotionalSignals, needs NLP/aggregation | Phase 2+ |
| Skill trend labels (Strong, Improving) | Needs difficulty trend data connected to skill overrides | Phase 2+ |
| Session duration | New field, not in SessionLog model yet | Next migration |
| Objective completion % | No tracking mechanism | Phase 2+ |
| SpokenLanguage proficiency levels | Model is flat list, deferred per Isaac recommendation | Phase 2+ |
| Learning Thread (curriculum position) | Depends on Course entity | Phase 2+ |
| Billing frequency/method | Not in model, Rate is free text only | Phase 2+ |
| Session title | Not in SessionLog model. AI-generated from plannedContent/actualContent, stored. | Next migration |
| Streak counter | Gamification-adjacent, dropped by Isaac. | Dropped |

---

## Design decisions log

| Date | Decision | Source |
|---|---|---|
| 2026-04-11 | No "65% Ready" on objectives. Text + deadline + days remaining only. | Isaac + Vera review of Stitch v1 |
| 2026-04-11 | No trend labels on skill badges for v1. CEFR level only. | Isaac + Vera review of Stitch v1 |
| 2026-04-11 | Attendance Rate and Engagement Index deferred. Keep Student Since only. | Isaac + Vera review of Stitch v1 |
| 2026-04-11 | UI label "Teacher's Working Memory" for TeachingNotes. DB field unchanged. | Isaac recommendation, Stitch naming |
| 2026-04-11 | PersonalNotes and TeachingNotes: two subsections under one card. Labels: "Sensitivities / Life Context" and "Pedagogical Observations." | Isaac option (b), confirmed by Vera |
| 2026-04-11 | Teaching Todos and Pending Followups must be separate lists (indigo vs amber). | Isaac + Vera, model alignment |
| 2026-04-11 | SpokenLanguages: flat list, no proficiency per language. | Isaac recommendation (b) defer |
| 2026-04-11 | Learning Thread removed from Profile tab. Course entity is Phase 2. | Isaac recommendation (b) defer |
| 2026-04-11 | CEFR labels: "Teacher's Assessment" and "Official." Not "Praxis." | Isaac recommendation |
| 2026-04-11 | Rate: free text only. No billing frequency or method. | Isaac recommendation (a) |
| 2026-04-11 | Difficulty labels: Trend = Stable/Improving/Regressing. Status = Working/Covered. | Isaac, model vocabulary alignment |
| 2026-04-11 | Past-due objectives show "OVERDUE" in red. | Vera review of Stitch v2 |
| 2026-04-11 | ReasonForStudying has inline edit affordance (ghost pencil on hover). | Vera review of Stitch v2 |
| 2026-04-11 | Interests section on right column with edit pencil + add button. | Vera review of Stitch v2 |
| 2026-04-11 | Identity Details card heading is "IDENTITY DETAILS" (not "Teacher's Working Memory"). | Vera review of Stitch v3 |
| 2026-04-11 | Sessions tab: Drop "STREAK" counter (gamification, wrong incentives). Keep "TOTAL HOURS." | Isaac review of Stitch sessions |
| 2026-04-11 | Sessions tab: Session title AI-generated from plannedContent/actualContent. Stored on SessionLog. Fallback: "Session, Apr 5." | Isaac + Robert decision |
| 2026-04-11 | Sessions tab: Homework card must distinguish "Homework Assigned" (this session) from "Previous Homework Status" (last session). | Isaac review of Stitch sessions |
| 2026-04-11 | Sessions tab: Remove teacher name from session cards (single-teacher product, v1). | Isaac review of Stitch sessions |
| 2026-04-11 | Progress tab: Skill bars use CefrLevel as baseline, not a target level (doesn't exist). | Isaac review of Stitch progress |
| 2026-04-11 | Progress tab: No AI annotations on skill bars for v1. | Isaac review of Stitch progress |
| 2026-04-11 | Progress tab: No trend dot on cancellation rate. Number only. | Isaac review of Stitch progress |
| 2026-04-11 | Progress tab: Remove "LEARNING TRACK" label. Use "Native" or remove. | Isaac review of Stitch progress |
| 2026-04-11 | Progress tab: Remove Curriculum Progress timeline (Course entity, Phase 2). Keep as "coming soon" placeholder. | Isaac review of Stitch progress |
| 2026-04-11 | Progress tab: Add Difficulties Evolution section (computable from current data). | Isaac recommendation |
| 2026-04-11 | Progress tab: Three "coming soon" placeholders (Topic Analysis, Curriculum Progress, Engagement Trends) as Jordi conversation starters. | Isaac + Robert strategy |
| 2026-04-11 | Progress tab: Skill chart legend label should be "BASELINE B1" or "GENERAL B1", not "TARGET B1" (it's the current assessment, not a goal). | Isaac review of Stitch progress v2 |
| 2026-04-11 | Progress tab: "Extremely reliable learner" label on cancellation rate is a computed label. Define thresholds for v2, skip for v1 or hardcode. | Isaac review of Stitch progress v2 |
| 2026-04-11 | Edit Student: No photo upload. Avatar initials only. | Isaac review of Stitch edit |
| 2026-04-11 | Edit Student: NativeLanguages + SpokenLanguages added to Basic Info. | Isaac review of Stitch edit |
| 2026-04-11 | Edit Student: Learning Goals and Short-Term Objectives split with separate add flows. | Isaac review of Stitch edit |
| 2026-04-11 | Edit Student: Weaknesses section added below Key Difficulties. | Isaac review of Stitch edit |
| 2026-04-11 | Edit Student: Followup action button label is "Done" (generic). | Isaac review of Stitch edit |
| 2026-04-11 | Edit Student: Skill Overrides grouped under Proficiency & Assessment (not separate tab). | Isaac review of Stitch edit |
| 2026-04-11 | Log Session: Add previousHomeworkStatus field (Done/Partial/Not Done) above Homework Assigned. | Isaac review of Stitch log session |
| 2026-04-11 | Log Session: Objectives panel must show ALL active short-term objectives, not just the first one. | Isaac review of Stitch log session |
| 2026-04-11 | Log Session: Rename "Session Notes" to "Today's Context" to avoid confusion with main narrative. | Isaac review of Stitch log session |
| 2026-04-11 | Log Session: Reference line under "What Happened?" (planned content from previous session) is read-only. Approved. | Isaac review of Stitch log session |
| 2026-04-11 | Log Session: Teaching Todos + Followups quick-add must be accessible without scrolling from narrative. | Isaac review of Stitch log session |

---

*Mapping document. Updated 2026-04-11 (all screens reviewed). Sync with field guide on any field changes.*
