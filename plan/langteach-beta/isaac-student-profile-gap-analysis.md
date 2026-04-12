# Student Profile: Gap Analysis (Isaac Review)

> **Date:** 2026-04-11
> **Reviewer:** Isaac (ELE pedagogy)
> **Source:** Compared `student-profile-field-guide.md` against the live UI at `localhost:5173`
> **Branch reviewed:** `sprint/ui-redesign-student-polish`

---

## Summary

The profile VIEW has placeholder sections for most field-guide fields (About, Languages, Short-Term Objectives, Teaching Todos, Commercial), but the EDIT form is missing the actual input fields. The teacher sees empty-state labels with no way to fill them in. Of the 22 fields in the field guide, 10 are implemented and 12 are missing from the edit form entirely.

---

## What IS implemented

| Field | Edit form | Profile view | Notes |
|-------|-----------|-------------|-------|
| Name | Yes | Yes (header) | |
| LearningLanguage | Yes (dropdown) | Yes (header) | |
| CefrLevel | Yes (dropdown) | Yes (header badge) | |
| Interests | Yes (tag input) | Yes (tags) | Not in field guide, pre-existing |
| NativeLanguages | Yes (multi-select) | Placeholder only | Shows "No language details" even when set? Needs verification |
| LearningGoals | Yes (select/type) | Placeholder only | |
| Weaknesses | Yes ("Areas to Improve") | Not visible in profile view | Label mismatch with field guide |
| Difficulties | Yes ("Specific Difficulties") | Placeholder only | |
| PersonalNotes | Yes (textarea) | Yes | |
| TeachingNotes | Yes (textarea) | Yes (or placeholder) | |

---

## What is MISSING

### Priority 1: Generation-critical (these feed AI prompts directly)

#### 1. ReasonForStudying
- **Field guide ref:** Section 1
- **Current state:** No field in edit form. No section in profile view.
- **Pedagogical impact:** HIGH. This is the anchor of every course decision. "Para vivir en Alicante" vs "para aprobar el DELE B2" produces completely different materials. Without this, the AI generates content with no motivational context. The prompt service cannot personalize vocabulary domain, register, or topic selection.
- **Type:** text field (string, max 512)

#### 2. ShortTermObjectives
- **Field guide ref:** Section 3
- **Current state:** Profile VIEW shows section header and "No objectives set." Edit form has NO input for it. Dead UI.
- **Pedagogical impact:** HIGH. Time-pressured goals ("DELE en junio", "viaje a Madrid en 3 semanas") should override normal lesson planning. When the exam is in 6 weeks, every class pivots to exam prep. Without this, the teacher has no place to record urgency, and generation cannot prioritize accordingly.
- **Type:** JSON array of `{ id, text, targetDate? }`

#### 3. SpokenLanguages
- **Field guide ref:** Section 1
- **Current state:** No field in edit form. No display in profile view.
- **Pedagogical impact:** HIGH. A student who already speaks 3 languages approaches the 4th with different tools: cognate awareness, metalinguistic vocabulary, cross-language comparison. Prompt generation can leverage this ("esto en ingles se dice asi, no?"). A monolingual student needs a completely different approach.
- **Type:** JSON array of strings

#### 4. OfficialCefrLevel
- **Field guide ref:** Section 2
- **Current state:** No field in edit form. No display in profile view.
- **Pedagogical impact:** MEDIUM-HIGH. Jordi's specific complaint: "Preply dice A2 pero yo creo que es B1." The gap between official and teacher-assessed level is information. It helps justify to the student why you're working at a certain level, and it flags misalignment that the teacher should be aware of.
- **Type:** nullable string (A1/A2/B1/B2/C1/C2)

#### 5. SkillLevelOverrides
- **Field guide ref:** Section 2
- **Current state:** No field in edit form. No display in profile view.
- **Pedagogical impact:** MEDIUM-HIGH. Most intermediate students have uneven skill profiles. A Brazilian living in Spain typically comprehends at B2 but writes at A2. Generating reading exercises at B2 and writing exercises at A2 for the same student is correct pedagogy. Without this, all four skills get the same level, which is wrong for most real students.
- **Type:** JSON object `{ reading?, writing?, listening?, speaking? }` each nullable CEFR level

---

### Priority 2: Teacher-requested features (Jordi voice notes)

#### 6. TeachingTodos
- **Field guide ref:** Section 3
- **Current state:** Profile VIEW shows section header, icon, and "No teaching todos yet." Edit form has NO input. Dead UI.
- **Pedagogical impact:** HIGH. This is the field Jordi asked for by name in the April 9 voice note. His exact pain: ideas that come up during class ("tengo que trabajar la diferencia entre el articulo determinado e indeterminado") get buried in session notes and disappear. These need to live on the student card, accumulate over time, and be markable as covered.
- **Type:** JSON array of `{ id, text, status, createdAt, sourceSessionLogId? }`
- **Note:** Needs inline add/edit on the profile view, not just the edit form. Teachers add these *during* or *right after* class.

---

### Priority 3: Identity and context (improve personalization quality)

#### 7. Profession
- **Field guide ref:** Section 1
- **Current state:** No field. Would live in the "About" section (currently showing "No identity details added yet").
- **Pedagogical impact:** MEDIUM. "Capitan de barco mercante" means maritime vocabulary, radio communication, weather reports. "Abogada corporativa" means formal register, legal connectors, written argumentation. Profession is the strongest signal for vocabulary domain selection after CEFR level.
- **Type:** nullable string (max 128)

#### 8. CountryOfOrigin
- **Field guide ref:** Section 1
- **Current state:** No field.
- **Pedagogical impact:** MEDIUM. L1 interference patterns differ by country. Portuguese from Brazil vs Portugal produce different error types. This refines what NativeLanguage alone tells you.
- **Type:** nullable string (max 64)

#### 9. CountryOfResidence
- **Field guide ref:** Section 1
- **Current state:** No field.
- **Pedagogical impact:** MEDIUM. Immersion context changes everything. A student living in Spain hears Spanish daily and needs different class focus than one in the Netherlands who only gets input during lessons. Also determines whether to use Spain-specific cultural references.
- **Type:** nullable string (max 64)

#### 10. BirthYear
- **Field guide ref:** Section 1
- **Current state:** No field.
- **Pedagogical impact:** MEDIUM-LOW. Age determines tone, pop culture references, learning pace expectations, and activity format preferences. A 16-year-old gets memes and TikTok references; a 55-year-old gets newspaper articles and travel scenarios.
- **Type:** nullable int

#### 11. CityOfOrigin / CityOfResidence
- **Field guide ref:** Section 1
- **Current state:** No fields.
- **Pedagogical impact:** LOW-MEDIUM. Useful for local references ("imaginate que vas al mercado de la Boqueria") and for students from different regions within the same country. Lower priority than country.
- **Type:** nullable string (max 64) each

---

### Priority 4: Commercial / operational

#### 12. IsActive toggle
- **Field guide ref:** Section 4
- **Current state:** Profile VIEW shows "Active" badge. Edit form has NO toggle to change it.
- **Pedagogical impact:** None directly, but operational: the teacher cannot archive a student who has finished or paused. The badge is display-only.
- **Type:** boolean (default true)

#### 13. IsCorporate toggle
- **Field guide ref:** Section 4
- **Current state:** Profile VIEW shows "Private" badge. Edit form has NO toggle.
- **Pedagogical impact:** Indirect. Corporate students often have different motivation patterns (imposed vs chosen), and the teacher may want to filter or group them.
- **Type:** boolean (default false)

#### 14. Rate
- **Field guide ref:** Section 4
- **Current state:** No field anywhere. Not in profile view, not in edit form.
- **Pedagogical impact:** None. Purely operational. But Jordi asked for it three times across feedback rounds. It is a mental prioritization tool for managing the week.
- **Type:** nullable string (max 32), text-free with autocomplete from prior values

---

## Profile View: display gaps for fields that DO exist

Even for fields that are implemented in the edit form, some don't render in the profile view:

| Field | In edit form | Visible in profile view |
|-------|-------------|------------------------|
| NativeLanguages | Yes | Shows "No language details added yet" even when set (needs verification) |
| LearningGoals | Yes | Shows placeholder "No learning goals set" |
| Weaknesses (Areas to Improve) | Yes | NOT shown in profile view at all |
| Difficulties | Yes | Shows placeholder |
| Interests | Yes | NOT shown in profile view (only visible in student list as tags) |

These display gaps mean data can be entered but the teacher cannot see it on the student's profile card without going into edit mode, which defeats the purpose of a read-only overview.

---

## TeacherFollowup: teacher-level operational todos (Jordi request, 2026-04-11)

Jordi is asking for a to-do list at the teacher level. This is **not** TeachingTodos and must not be conflated with it.

### The distinction

| | TeachingTodos | TeacherFollowup |
|---|---|---|
| **Scope** | Per-student, pedagogical | Per-teacher, operational |
| **Lives on** | Student profile card | Dashboard "Followups" panel |
| **Example** | "Trabajar ser/estar con Ana" | "Enviarle el ejercicio de gustar a Oksana" |
| **Lifecycle** | Accumulates, gets "covered" when worked on in a session | Gets "done" when the teacher completes the action |
| **Urgency** | No date, no pressure | Often has implicit urgency ("hace 3 dias") |
| **Student link** | Always (it's a student field) | Usually, but not always ("comprar licencia de Zoom") |

### Why they must be separate

1. **Different audiences.** TeachingTodos answer "what should I teach this student?" (consulted when planning a lesson). TeacherFollowups answer "what do I owe?" (consulted when starting the workday).
2. **Different surfaces.** TeachingTodos belong on the student profile and in the Log Session context panel. TeacherFollowups belong on the dashboard and optionally on the student detail as a filtered sub-view.
3. **Jordi's original complaint.** Ideas get buried when mixed with admin tasks. Two separate lists, two separate purposes. If you blur the line, TeachingTodos fills with admin noise and the teacher stops reading it.

### Proposed model

```
TeacherFollowup {
  id: guid
  teacherId: guid
  studentId?: guid          // optional, most will have one
  text: string
  status: pending | done
  createdAt: datetime
  dueDate?: date            // optional soft deadline
  completedAt?: datetime
  sourceSessionLogId?: guid // if it came from logging a session
}
```

### Where it surfaces

- **Dashboard "Followups" panel** (already designed in v0 prompts as the pendientes tray): all pending follow-ups across all students, sorted by age/urgency.
- **Student detail profile**: filtered to that student, shown as a small "Pending follow-ups" section (separate from TeachingTodos). This is a teacher entity displayed there, not a student entity.
- **Log Session form**: quick-add for follow-ups that come up during class ("le prometi el PDF"). These are NOT TeachingTodos. The Log Session redesign (section 7 of `dashboard-redesign-v0-prompts.md`) should have a separate quick-add for each type.

### Flow example

1. Teacher finishes session with Oksana, logs it.
2. In the log form, writes a TeachingTodo: "Trabajar verbo gustar en profundidad" (pedagogical, no rush).
3. Also writes a TeacherFollowup: "Enviarle la explicacion del verbo gustar y un ejercicio" (operational, should do it today).
4. Next morning, dashboard Followups panel shows: "Enviar explicacion de gustar a Oksana (yesterday)" with amber dot.
5. Teacher sends the PDF, checks it off. Done.
6. The TeachingTodo stays on Oksana's profile until the teacher works on it in a future session.

### Field guide note

The field guide (`docs/student-profile-field-guide.md`) already anticipated this in the "Lo que NO esta aqui" section and in the TeachingTodos "No sirve para" section. The field guide should be updated to add a cross-reference to TeacherFollowup once the entity is created.

---

## Log Session UX redesign (Isaac review, 2026-04-11)

The current Log Session modal has critical pedagogical UX problems.
Full analysis and a Stitch/v0 prompt are in section 7 of
`dashboard-redesign-v0-prompts.md`. Key issues:

1. Context-blind: no visibility into previous session, TeachingTodos, ShortTermObjectives, or Difficulties while logging.
2. "What was planned" doesn't pre-populate from last session's "Topics for next session."
3. No way to add or check off TeachingTodos during logging.
4. No way to add TeacherFollowups during logging (the quick-add for operational promises).
5. Modal hides the student profile. Should be a full page or side panel.
6. Level reassessment checkbox has no target level input.
7. Missing duration field and default date.

---

## Voice recording extraction gaps (Isaac review, 2026-04-11)

The voice recording flow (Record / Upload audio) transcribes the teacher's
voice note via Whisper, then sends it to Claude Haiku for structured
extraction. The extraction prompt lives in `PromptService.BuildReflectionExtractionPrompt`.

### What voice currently extracts

| Extracted field | Maps to session field | Status |
|---|---|---|
| whatWasCovered | actualContent | Working |
| areasToImprove | generalNotes (combined) | Working |
| emotionalSignals | generalNotes (combined) | Working |
| homeworkAssigned | homeworkAssigned | Working |
| nextLessonIdeas | nextSessionTopics | Working |
| sessionDate | sessionDate | Working (relative date resolution) |
| suggestedDifficulties | suggestedDifficulties | Working |

### What voice SHOULD extract but doesn't

These are fields the teacher naturally mentions in voice notes but the
extraction prompt doesn't ask for:

| Missing extraction | Voice signal examples | Priority |
|---|---|---|
| **topicTags** | "Hemos trabajado el subjuntivo, vocabulario de restaurante" | HIGH (easy win, teachers always name topics) |
| **previousHomeworkStatus** | "Hizo los deberes", "No trajo los deberes", "Los hizo a medias" | HIGH (teachers almost always mention this) |
| **TeachingTodos** | "Tengo que trabajar con el los conectores", "Me apunto para mas adelante repasar ser/estar" | HIGH (this is Jordi's core request, and voice is the natural capture moment) |
| **TeacherFollowups** | "Le tengo que mandar el PDF", "Le debo un ejercicio de gustar", "Prometile enviar el audio" | HIGH (operational promises surface naturally in voice) |
| **levelReassessment** | "Creo que ya esta en B1", "Lo subo a B2", "Habria que replantearse el nivel" | MEDIUM |
| **duration** | "Hemos tenido una hora", "Clase de 45 minutos", "Media hora hoy" | MEDIUM |
| **isCancelled** | "Cancelo la clase", "No vino", "Se suspendio" | MEDIUM |
| **plannedContent** | "Hoy teniamos previsto trabajar el subjuntivo" | LOW (rarely mentioned, teachers go straight to what happened) |
| **Difficulties worked on** | "Hemos trabajado el subjuntivo" should match existing difficulty "Subjuntivo en concesivas" | MEDIUM (requires cross-referencing student's difficulty list) |

### Voice-to-update existing session (not implemented)

Currently `handleVoiceNote` in `SessionLogDialog.tsx` (line 310) always
calls `createSession` with `status: 'Draft'`. It never calls
`updateSession`. Two problems:

1. **No update path.** If the teacher has an existing Draft session and
   records a new voice note to add information, it creates a *second*
   Draft instead of updating the first. The teacher ends up with
   duplicate drafts.

2. **No voice on existing confirmed sessions.** If the teacher wants to
   add a voice note to a session they already confirmed (e.g., they
   forgot to mention something), there's no mechanism. They'd have to
   manually edit the text fields.

**Proposed behavior:**
- **New session (no existing draft):** Voice creates a Draft (current behavior).
- **Editing an existing session (edit mode):** Voice extraction merges
  into the existing form state. Fields that are empty get filled;
  fields that already have content get the extraction appended (with
  a separator) or shown as suggestions the teacher can accept/reject.
- **Second voice note on same session:** Append/merge, not replace.
  The teacher might record one note about what happened and a second
  one 10 minutes later when they remember something.

### Extraction prompt changes needed

The `BuildReflectionExtractionPrompt` in `PromptService.cs` (line 1442)
needs to be updated to extract the additional fields. The JSON schema
should expand to include:

```json
{
  "whatWasCovered": "string or null",
  "areasToImprove": "string or null",
  "emotionalSignals": "string or null",
  "homeworkAssigned": "string or null",
  "nextLessonIdeas": "string or null",
  "sessionDate": "string or null",
  "suggestedDifficulties": [],
  "topicTags": [{ "tag": "string", "category": "string or null" }],
  "previousHomeworkStatus": "Done | Partial | NotDone | null",
  "teachingTodos": ["string"],
  "teacherFollowups": ["string"],
  "levelReassessment": "CEFR level string or null",
  "duration": "integer minutes or null",
  "isCancelled": "boolean or null"
}
```

The prompt should also receive the student's existing difficulties list
as context, so it can match "hemos trabajado el subjuntivo" to the
existing difficulty "Subjuntivo en concesivas" and flag it as worked-on.

### Pedagogical note (Isaac)

Voice is the most natural capture moment for a teacher. Jordi described
it: the teacher is in the car between students, or walking to get coffee,
and they mentally debrief. That 2-minute voice note is where TeachingTodos
and TeacherFollowups are born. If the extraction doesn't capture them,
the teacher has to remember to type them later in the form, which means
they won't. The voice extraction prompt is the single highest-leverage
improvement for capturing the teacher's real workflow.

---

## Recommended issue grouping

Based on natural implementation boundaries:

1. **Issue: Student identity fields** (BirthYear, Profession, CountryOfOrigin, CityOfOrigin, CountryOfResidence, CityOfResidence). All go in the "About" section. One migration, one edit form section, one profile view section.

2. **Issue: Language context fields** (SpokenLanguages, OfficialCefrLevel, SkillLevelOverrides). All go in the "Languages" section. Related to generation prompt inputs.

3. **Issue: Motivation and planning fields** (ReasonForStudying, ShortTermObjectives editable). These are the "why" of the student. Critical for prompt personalization.

4. **Issue: TeachingTodos editable UI**. Profile view already has the section shell. Needs inline add/edit/status-toggle. Separate from #3 because it has a different interaction pattern (inline editing vs form fields).

5. **Issue: Commercial fields editable** (IsActive toggle, IsCorporate toggle, Rate). One form section, simple fields.

6. **Issue: Profile view display gaps** (NativeLanguages, LearningGoals, Weaknesses, Interests not rendering when data exists). Bug-fix scope, no new fields.

7. **Issue: TeacherFollowup entity and dashboard integration**. New entity, migration, API endpoints, dashboard Followups panel, student detail filtered view. Depends on dashboard redesign landing first for the Followups panel surface.

8. **Issue: Log Session redesign**. Full page replacing modal, two-column layout with student context panel, pre-population from previous session, TeachingTodo and TeacherFollowup quick-add, difficulty tracking integration. Depends on #4 and #7.

9. **Issue: Voice extraction prompt expansion**. Update `BuildReflectionExtractionPrompt` to extract topicTags, previousHomeworkStatus, teachingTodos, teacherFollowups, levelReassessment, duration, isCancelled. Pass student's existing difficulties as context for cross-referencing. Depends on #4, #7 (for the new entity types the extraction needs to populate).

10. **Issue: Voice update existing session**. Allow voice recording on an existing session (Draft or Confirmed) to merge/append extracted data instead of always creating a new Draft. Support multiple voice notes per session (append, not replace). Frontend change in `SessionLogDialog.handleVoiceNote` + possibly backend for merge logic.

---

*Isaac, 2026-04-11. Updated with TeacherFollowup, Log Session, and voice extraction analysis. Send to PM for issue creation.*
