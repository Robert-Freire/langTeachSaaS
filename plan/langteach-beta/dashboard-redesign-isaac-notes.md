# Dashboard redesign — Isaac's notes on existing model

> Working document. Isaac (pedagogy) reviewed the backend to map what exists vs
> what the "teacher command center" dashboard needs. The goal is to confirm with
> Robert + Sophy what is reusable and what is actually missing, **before**
> proposing new entities.

## TL;DR

### Scope correction (Robert, 2026-04-09)

Two entities that sound similar but are **different things**:

- **`Lesson`** = AI-generated lesson content (sections, exercises, vocabulary
  blocks, PDF-exportable). Originally meant to be THE atomic unit. Today
  **underused**: Jordi doesn't generate lessons with the app. **Out of scope
  for the dashboard redesign.** Future: link a Session to a Lesson when the
  teacher actually used generated content in that class.
- **`SessionLog`** (the "Session" for teachers) = what the teacher has done, or
  has programmed to do, with a specific student. This is the real primitive
  around which the dashboard must rotate.

The dashboard redesign is a **Session-first** page. Lessons don't appear on it.

### What exists

The app already has **much more** than I assumed. In particular:

- **`SessionLog`** — rich record per student, with structured fields for
  homework, difficulties, topic tags, next-session topics, level reassessment,
  draft-from-voice workflow. **Also serves as the scheduling entity**:
  `SessionDate` is `DateTime` (nullable), so future sessions = `SessionLog`
  rows with `SessionDate > now` and `Status=Confirmed`.
- **`ReflectionExtractionService`** — text/voice → structured
  `ExtractedReflectionDto` (WhatWasCovered, AreasToImprove, EmotionalSignals,
  HomeworkAssigned, NextLessonIdeas, SuggestedDifficulties). Already wired.
- **`CourseSuggestion`** — pending/accepted/dismissed suggestions generated
  from lesson notes and difficulties. A recommendation engine already exists.
- **`StudentSessionSummaryDto`** — already computes `LastSessionDate`,
  `DaysSinceLastSession`, `OpenActionItems`, `LevelReassessmentPending` per
  student. Most of the "recent activity" column can reuse this.
- **`VoiceNote`, `LessonNote`, `TelegramLink`** — voice pipeline and messaging
  entry points already exist.

So my earlier sketch of "we need a Session entity" was wrong. `SessionLog` is
the session entity. Its lifecycle looks like this:

```
Future session (planned)     SessionLog, SessionDate > now, Status=Confirmed,
                              most content fields empty or pre-filled plan
Past session (happened)      SessionLog, SessionDate < now, Status=Confirmed,
                              ActualContent / GeneralNotes / HomeworkAssigned filled
Draft from voice             SessionLog, Status=Draft (awaits teacher confirmation)
Cancelled                    SessionLog, IsCancelled=true, Status=Confirmed
```

The dashboard redesign is mostly an **aggregation + presentation** problem,
not a model problem. There are a few small gaps (see §4) but they are much
smaller than I thought.

---

## 1. What exists today (confirmed by code)

### 1.1 Student
`backend/LangTeach.Api/Data/Models/Student.cs`

- `Name, LearningLanguage, CefrLevel, NativeLanguage`
- `Interests, LearningGoals, Weaknesses` (JSON)
- `Difficulties` (JSON, structured: competency, subcategory, severity, trend, status)
- `SkillLevelOverrides` (per-skill CEFR overrides)
- `Notes` (free text)
- Collections: `Lessons`, `Courses`, `SessionLogs`

**Verdict:** complete for dashboard needs. No `target_exam` / `exam_date` on
Student, but those live on `Course` (see 1.4) which is the right place.

### 1.2 Lesson — AI-generated content, out of scope for dashboard
`backend/LangTeach.Api/Data/Models/Lesson.cs`

- `StudentId` (nullable → group/template lesson)
- `Title, Language, CefrLevel, Topic, DurationMinutes, Objectives`
- `Status` (string: "Draft", "Published", ...)
- `ScheduledAt` (DateTime?) — exists, but **NOT the session scheduling primitive
  for our dashboard**. See 1.3.
- `LearningTargets`, template/template-id linkage
- Has a 1-to-1 `LessonNote` (post-class structured notes)

**Decision (Robert, 2026-04-09):** Lesson represents the AI-generated lesson
content artefact. Jordi doesn't use this feature. It is **out of scope** for
the dashboard redesign. In the future, a `SessionLog` may reference a `Lesson`
(the existing `LinkedLessonId` field already supports this) when the teacher
actually used generated content in that class. Until then, the dashboard
ignores `Lesson` entirely. The nav entry "Lessons" can stay but it's not a
dashboard primitive.

> The current `Dashboard.tsx` is built on `Lesson` — it queries
> `getLessons({ scheduledFrom, scheduledTo })` for the week strip,
> `getLessons({ status: 'Draft' })` for prep cards, etc. **This is the wrong
> foundation.** The redesign will rebuild the page on top of `SessionLog`
> instead. The Lesson queries and components don't disappear from the codebase;
> they just stop being the dashboard's data source.

### 1.3 SessionLog — the Session entity for teachers
`backend/LangTeach.Api/Data/Models/SessionLog.cs`

- `StudentId, TeacherId`
- `SessionDate` (`DateTime?`, nullable) — **the scheduling field**. Despite
  the "Log" suffix, this is `DateTime`, so it can carry both date AND time
  for past AND future sessions. Today the time component is often 00:00
  because the UI/seed only fills the date part. **Fixing that is a UI
  change, not a schema change.**
- `PlannedContent, ActualContent` (what was planned vs what happened)
- `HomeworkAssigned` (free text, not structured)
- `PreviousHomeworkStatus` (enum: NotApplicable, NotDone, Partial, Done)
- `NextSessionTopics` (free text, line-separated → parsed as `OpenActionItems`)
- `GeneralNotes`
- `LevelReassessmentSkill`, `LevelReassessmentLevel`
- `LinkedLessonId` (optional link to an AI-generated Lesson that was taught)
- `TopicTags` (JSON array)
- `MentionedDifficultyPairs`, `SuggestedDifficulties` (JSON, structured)
- `IsCancelled`, `Status` (Draft | Confirmed)
- Draft = auto-saved from voice extraction awaiting confirmation

**Lifecycle — re-reading the fields as a timeline primitive:**

| Dashboard concept | Filter |
|---|---|
| Future session (planned) | `SessionDate > now AND Status = Confirmed AND !IsCancelled` |
| Session happening now / today | `date(SessionDate) = today` |
| Past session (happened) | `SessionDate < now AND Status = Confirmed AND !IsCancelled` (content fields typically filled) |
| Draft from voice awaiting review | `Status = Draft` |
| Cancelled session | `IsCancelled = true` |
| Unlogged past session | `SessionDate < now AND Status = Confirmed AND ActualContent IS NULL` (a "pendiente") |

This means **every query the dashboard needs already has a natural filter**
on `SessionLog`. No new entity. No new field. Only the UI needs to start
writing the time-of-day part into `SessionDate` when the teacher schedules a
session.

**Implication for dashboard:**
- "Next session" = `SessionLog WHERE SessionDate >= now, ordered, take 1`.
- "Today" = `SessionLog WHERE date(SessionDate) = today, ordered by SessionDate`.
- "Last session for student X" = `SessionLog WHERE StudentId=X AND SessionDate < now, ordered desc, take 1`.
- "Active students ordered by recency" = `Student LEFT JOIN SessionLog` with
  aggregates on `MAX(SessionDate WHERE SessionDate < now)` and
  `MIN(SessionDate WHERE SessionDate > now)`.
- "Unlogged past sessions" (pendiente) = `SessionLog WHERE SessionDate < now AND ActualContent IS NULL AND !IsCancelled AND Status=Confirmed`.

### 1.4 Course + CurriculumEntry + CourseSuggestion
`backend/LangTeach.Api/Data/Models/Course.cs`, `CurriculumEntry.cs`, `CourseSuggestion.cs`

- Course has `Mode` (general | exam-prep), `TargetCefrLevel`, `TargetExam`,
  `ExamDate`, `SessionCount`.
- CurriculumEntry has `Status` (planned | created | taught), `LessonId` (once a
  Lesson is generated from the entry), grammar focus, competencies, vocabulary
  themes, AI-generated personalization context.
- CourseSuggestion has `ProposedChange`, `Reasoning`, `Status` — a first-class
  "adaptive replanning" signal.

**This is gold for the dashboard alerts column.** `CourseSuggestion` items
pending for the teacher ARE the "pendientes contigo" bandeja-style list, at
least for the course-adaptive part.

### 1.5 StudentSessionSummaryDto — already computes per-student signals
`backend/LangTeach.Api/DTOs/SessionLogDtos.cs:76` + service at line 277.

```csharp
StudentSessionSummaryDto(
  TotalSessions,
  LastSessionDate,
  DaysSinceLastSession,
  OpenActionItems,              // parsed from NextSessionTopics lines
  LevelReassessmentPending,
  SkillLevelOverrides
)
```

This endpoint exists **per-student**: `GET /api/students/{id}/sessions/summary`.
For the dashboard we need a *teacher-level* aggregation (all students at once),
but the logic is already written.

### 1.6 Reflection extraction
`backend/LangTeach.Api/Services/ReflectionExtractionService.cs`,
`DTOs/ReflectionExtractionDtos.cs`

```csharp
ExtractedReflectionDto(
  WhatWasCovered,
  AreasToImprove,
  EmotionalSignals,      // emotional/affective signals, already captured
  HomeworkAssigned,
  NextLessonIdeas,
  SuggestedDifficulties  // structured competency + severity
)
```

Endpoint: `POST /api/students/{id}/sessions/extract` (raw text in,
`ExtractedReflectionDto` out). Wired to voice / telegram pipeline per the
`VoiceNote`, `TelegramLink` entities and the recent telegram work.

### 1.7 The current Dashboard.tsx — what it actually does
`frontend/src/pages/Dashboard.tsx`

Fetches, in parallel:
- `students` (first 100)
- `lessons` scheduled this week
- `lessons` status=Draft (all pages up to 100)
- `lessons` status=Published (for unscheduled-published detection)
- `lessons` total count
- `courses`

Renders:
- `<WeekStrip>` — 7-day grid with that week's lessons
- Empty state if no lessons exist
- `<NeedsPreparation>` — drafts that likely need prep
- `<QuickActions>` — "X students / Y lessons this week / Z total"
- `<UnscheduledDrafts>` — drafts without ScheduledAt
- `<CoursesOverview>` — course progress bars

**Honest pedagogical verdict on the current page:** it's a lesson-centric
accountant's view. It answers "how much work is in my lesson pile?". It does
not answer "what do I need to do now and who needs my attention?". The data it
has is good; the prioritization is wrong.

---

## 2. Mapping — the dashboard I proposed → what backs it

All sources below are `SessionLog` unless noted. "Session" in this table
always means `SessionLog`, never `Lesson`.

| Dashboard block | Data source | Status |
|---|---|---|
| **Next session hero** | `SessionLog WHERE TeacherId=me AND SessionDate >= now AND Status=Confirmed AND !IsCancelled, ORDER BY SessionDate, TAKE 1` | ✅ query trivial |
| Student context (name, level, L1) | join on `SessionLog.StudentId` → `Student` | ✅ |
| Last session notes (3 bullets) | previous `SessionLog` for same student, `GeneralNotes` / `ActualContent` / `NextSessionTopics` | ✅ |
| Homework I assigned last time | `SessionLog.HomeworkAssigned` (most recent prior session) | ✅ free text — see §4.3 |
| Previous homework status | `PreviousHomeworkStatus` on the **upcoming** session if pre-filled, else null | ✅ |
| **Today's agenda column** | `SessionLog WHERE date(SessionDate) = today AND TeacherId=me, ORDER BY SessionDate` | ✅ |
| Time-of-day on today's list | `SessionDate` (the time component) | 🟡 field supports it, UI currently writes 00:00 — see §4.1 |
| Status (done / upcoming / cancelled) | derived: `SessionDate vs now`, `IsCancelled`, `ActualContent IS NULL` | ✅ pure projection |
| **Pendientes / bandeja** — promises | Free text inside `SessionLog.NextSessionTopics` / `GeneralNotes` | 🔴 not structured — see §4.2 |
| Pendientes — unlogged past sessions | `SessionLog WHERE SessionDate < now AND Status=Confirmed AND !IsCancelled AND ActualContent IS NULL` | ✅ single query, no new entity |
| Pendientes — course adaptive suggestions | `CourseSuggestion WHERE Status='pending'` for teacher's courses | ✅ reuse existing |
| Pendientes — DELE/exam approaching | `Course.TargetExam, ExamDate` + active students in that course | ✅ |
| Pendientes — draft sessions awaiting confirmation | `SessionLog WHERE Status=Draft` | ✅ already exists (voice extraction pipeline) |
| **Active students list** | `Student` joined with aggregates: `MAX(SessionDate WHERE < now)`, `MIN(SessionDate WHERE > now)` | 🟡 needs a teacher-level aggregation endpoint — see §4.4 |
| "Inactive" signal | `MAX(SessionDate WHERE < now) < now - N days AND no SessionLog WHERE SessionDate > now` | ✅ derivable in one query |
| "Same topic 3 sessions in a row" signal | `SessionLog.TopicTags` overlap across recent sessions | 🟡 derivable, more work |
| Course progress per student | `CurriculumEntry.Status` counts per `Course` | ✅ exists, but intentionally **not** on dashboard — move to student detail |

Legend: ✅ exists and ready, 🟡 exists but needs a new aggregation endpoint or
a small UI fix, 🔴 genuinely missing.

---

## 3. What I'd remove from the current dashboard

The current dashboard is built on `Lesson`. Since Lesson is out of scope for
the dashboard redesign (1.2), **all of these components stop being data
sources for the dashboard**. They don't disappear from the codebase — they
remain available on `/lessons` for teachers who do want to use AI-generated
lessons, but the dashboard no longer queries them.

| Component | File | Verdict |
|---|---|---|
| `WeekStrip` (7-day grid of Lessons) | `components/dashboard/WeekStrip.tsx` | Either repurpose to render `SessionLog` rows, or move to `/lessons`. Prefer the second; the dashboard uses a day-focused list instead. |
| `NeedsPreparation` (Lesson drafts that need prep) | `components/dashboard/NeedsPreparation.tsx` | Move to `/lessons`. Dashboard doesn't care about lesson drafts. |
| `QuickActions` ("12 Students / 8 Lessons this week" counters) | `components/dashboard/QuickActions.tsx` | Remove counters. Vanity metrics. |
| `UnscheduledDrafts` (Lessons without `ScheduledAt`) | `components/dashboard/UnscheduledDrafts.tsx` | Move to `/lessons`. |
| `CoursesOverview` (progress bars) | `components/dashboard/CoursesOverview.tsx` | Move to `/courses` or to each student's detail. Not on dashboard. |

**None of this code is wasted** — it all moves to better homes. The dashboard
redesign is a **new Session-first page** that barely shares data sources with
what's there today.

---

## 4. Real gaps (things that genuinely don't exist or need small fixes)

### 4.1 Time-of-day on `SessionLog.SessionDate` 🟡 (small UI fix)

The field is `DateTime?`, so the database already supports hour/minute.
Problem: today the UI and seed data write only the date part, leaving
`00:00:00` as the time. For the dashboard to show "Marco, 10:30" we need:

1. The session create/edit form to accept a time picker alongside the date.
2. The Telegram / voice extraction path (if it creates planned sessions)
   to parse and store the time when provided.
3. Seed/demo data to populate realistic times.

**No schema change. No migration. Just UI + seed.** Small scope, but must
land before the dashboard can render "today at 10:30".

### 4.2 Structured "teacher followup" / promesas bandeja 🔴

Today, if the reflection extraction finds "prometí mandar ejercicios de
por/para", it gets written into `SessionLog.GeneralNotes` or
`NextSessionTopics` as free text. There is **no structured task entity** and
no per-teacher aggregation across all students.

`StudentSessionSummaryDto.OpenActionItems` parses these lines per-student, but:

1. They're scoped to one student.
2. They have no due date, no type, no status, no provenance.
3. They cannot be "ticked off" independently of the session log.
4. They cannot be generated by sources other than `NextSessionTopics` (e.g. a
   teacher typing "remind me to send Hans the legal glossary").
5. They cannot be shown in order of urgency across all students.

**This is the one place where a small new entity would genuinely help.**
Whether it's a new table (`TeacherFollowup` or similar) or a materialized view
over existing fields is a **Sophy question**, not a pedagogy question.

Minimum viable shape (for discussion with Sophy):
```
- id, teacher_id
- student_id (nullable)
- type (enum: promise | homework_review | send_material | unlogged_session | exam_approaching | custom)
- description
- due_hint (nullable date)
- source (enum: reflection_extraction | manual | derived)
- source_ref (nullable: session_log_id, lesson_id, course_id, course_suggestion_id)
- status (pending | done | dismissed)
- created_at
```

If Sophy prefers not to add a table, the alternative is a derived projection
endpoint that unions:
- `CourseSuggestion WHERE Status='pending'`
- Parsed `NextSessionTopics` from recent `SessionLog` records
- Computed "unlogged past `Lesson.ScheduledAt`"
- Computed "exam_date - now < N days"
into a single DTO. No persistence. The teacher can't mark an item "done"
independently without writing back to the source.

I lean toward the table because "mark done / dismiss / snooze" is a real
teacher gesture and is painful to model as writes-back-to-free-text. But Sophy
should decide.

### 4.3 `HomeworkAssigned` as free text 🟡

`SessionLog.HomeworkAssigned` is `string?`. It cannot answer "was this homework
reviewed?" except via the next session's `PreviousHomeworkStatus` enum, which
conflates *all* homework from the prior session into one value. If a teacher
assigns two separate exercises, we lose granularity.

**Not critical for the dashboard V1.** The dashboard can display the last
session's `HomeworkAssigned` as a single string block in the "next session"
hero. But if we want the "pendientes" bandeja to show each piece of homework
separately as "Ana — review redacción", we'd need to structure this.

This is a **Sophy + PM** decision. For now, treat as out of scope; display as
text.

### 4.4 Teacher-level aggregation endpoint 🟡

All the existing queries are per-student (`StudentSessionSummaryDto` is per
student; `getLessons` filters are general). The dashboard will make 5-8 queries
today to render, and it still doesn't assemble the view we want.

What I'd propose: a single `GET /api/dashboard` endpoint shaped for the page:

```jsonc
{
  "next_session": {
    "lesson_id": "...",
    "scheduled_at": "...",
    "student": { "id": "...", "name": "Marco", "cefr_level": "B1.2", "native_language": "Italian" },
    "last_session": {
      "session_date": "...",
      "summary_bullets": ["...", "...", "..."],    // from NextSessionTopics or GeneralNotes
      "homework_assigned": "...",
      "previous_homework_status": "Partial"
    }
  },
  "today": [ { "lesson_id": ..., "time": ..., "student_name": ..., "status": ... } ],
  "followups": [ { "id": ..., "type": ..., "description": ..., "student_name": ..., "due_hint": ..., "severity": "warn|info" } ],
  "active_students": [
    { "id": ..., "name": ..., "cefr_level": ..., "last_session_days_ago": 4, "next_session_at": ..., "signals": ["inactive"] }
  ]
}
```

This is the shape the frontend actually needs. It maps 1:1 to the four zones in
the redesign. Whether it's one endpoint or three composable ones is a Sophy
call.

### 4.5 Student signals computation 🟡

"Inactive for 10 days", "same topic 3 sessions in a row", "exam in 15 days" —
all derivable, none computed today at the teacher level. These are filters and
`GROUP BY` queries over existing data. No new entity.

### 4.6 Engagement / emotional signal surfacing 🟡

`SessionLog` stores `SuggestedDifficulties` with severity, and
`ReflectionExtractionService` extracts `EmotionalSignals` — **but
`EmotionalSignals` is not stored on `SessionLog`**. It's returned to the
frontend as part of the extraction result and lost unless the teacher types it
into `GeneralNotes`. Cross-reference: `LessonNote.EmotionalSignals` IS stored.

So emotional signals are captured per-**lesson** (via LessonNote) but not per
**session log**. That inconsistency is worth noting; probably a separate issue
from the dashboard redesign. For V1 I'd not surface engagement cards on the
dashboard yet; the data model isn't consistent enough.

---

## 5. Questions for Robert

Before escalating to Sophy/Arch, these decisions are yours:

1. **Scope of V1**: is this dashboard redesign a single task, or a sprint? The
   minimum that delivers Jordi value is: (a) next-session hero, (b) today's
   schedule, (c) active-students list ordered by recency. Those three use only
   existing data + one aggregation endpoint. Everything else (followups
   bandeja, signals, engagement) can be V2.

2. **Lesson-centric vs session-centric language**: the backend calls the
   scheduled thing `Lesson` and the post-class thing `SessionLog`. In the UI I
   want to call both "sesión" from the teacher's point of view. Agree?

3. **The "Lessons" sidebar item**: now clearly separate from Sessions.
   Options:
   (a) Keep "Lessons" in nav as the entry point to AI-generated lesson
       content for teachers who want it (Jordi doesn't; future customers
       might). Dashboard doesn't touch it.
   (b) Hide "Lessons" for now, re-enable when the Session ↔ Lesson linkage
       feature lands.
   (c) Move "Lessons" under Settings → Advanced.
   My vote: (a). It costs nothing, doesn't clutter the dashboard, and stays
   discoverable for future users. Sidebar order: **Dashboard · Students ·
   Sessions · Courses · Lessons · Settings**.

4. **Followup entity — table or projection?** This is the only real model
   decision. I'd ask Sophy. Your gut?

5. **Groups**: out of scope for V1 dashboard? `Lesson.StudentId` is nullable,
   hinting at group or template lessons, but there's no `Group` entity that I
   saw. If V1 is 1:1 only, say so and I design for that.

---

## 6. Suggested next steps

1. **You + me**: discuss this doc, decide V1 scope.
2. **Me + Sophy**: one focused conversation on two things only:
   - Followup entity shape (table vs projection)
   - Teacher-level dashboard aggregation endpoint shape
3. **PM**: not needed yet. The pedagogical direction (alumno-céntrico,
   promesas, señales) is already in the vision via feedback #1, #2, #7. No
   product question to resolve.
4. **Arch**: when there's a concrete plan with endpoints and migrations, yes.
   Not before.
5. **UI**: once V1 scope is agreed, the visual redesign from my earlier sketch
   can land as a task. Current `components/dashboard/*` mostly get repurposed
   or moved, not deleted.

---

## 7. Out of scope for this document (observed, not acting)

- `LessonNote.EmotionalSignals` exists but `SessionLog` has no equivalent
  stored field. Inconsistent. Log to `plan/observed-issues.md` if we care.
- `HomeworkAssigned` as free text vs a structured `Homework` model — real
  limitation, but not dashboard-blocking.
- Group entity / group lessons — not in current model.
- `ScheduledAt` exists on Lesson but not on SessionLog, so "scheduled session
  that got logged" requires joining via `LinkedLessonId`, which is optional.
  The linkage could be made required when logging from an upcoming Lesson.
