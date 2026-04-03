# Session Tracking: Pedagogical Requirements

**Author:** Isaac (ELE pedagogy perspective)
**Date:** 2026-04-02
**Epic:** #391 (Post-class session tracking and student progress loop)
**Purpose:** Define what a teacher needs to track per session, with real examples from Jordi's workflow. This is the pedagogical input for sprint planning, not a technical spec.

---

## 1. Student History View

The student detail page becomes the teacher's command center. Everything hangs off the student: past sessions, pending actions, and generation context.

### 1.1 Session Timeline

A chronological list of all sessions for this student, most recent first. Each entry must show enough at a glance that the teacher doesn't need to click into it for the morning review.

**Inline visible per session:**
- Date and time-distance label ("3 days ago", "2 weeks ago")
- What was planned (short summary)
- What was actually done (short summary)
- Homework assigned (if any)
- Homework status from previous session (done / not done / partial)
- Number of observations flagged

**Expandable detail:**
- Full planned content
- Full session notes
- Observations (split by type, see section 3)
- Linked lesson (if the session used a generated lesson)

### 1.2 Student Summary Header

Above the timeline, the teacher sees a quick-reference panel:

- Student name, level, native language
- Total sessions logged
- Last session date and how long ago
- Open action items (difficulties flagged, homework pending)
- Level confidence indicator (if teacher has flagged a reassessment)

---

## 2. Session Log Form

This is what the teacher fills in after class. Must take under 2 minutes for a typical session. Jordi does 35-40 classes/week; if this form is slower than scribbling in Excel, he won't use it.

### 2.1 Session Date

**Field:** Date picker, defaults to today.

**Why:** Jordi doesn't always log immediately. Sometimes he transfers paper notes the next day. The date must be editable.

**Examples:**
- `2026-04-01`
- `2026-03-28` (logged two days late)

### 2.2 What Was Planned (Planificacion)

**Field:** Short text (1-3 sentences). Optional if a generated lesson is linked.

**Why:** This is what the teacher intended to cover. If the session used a LangTeach-generated lesson, this can auto-populate from the lesson title and objectives. If not, the teacher writes it manually.

**Examples:**
- `Repaso preterito indefinido. Ejercicio de lectura sobre viajes. Vocabulario: medios de transporte.`
- `Continuar con unidad 3 Aula Plus: expresar obligacion y prohibicion.`
- `Clase de conversacion libre, tema: su viaje a Portugal.`
- `Correccion de deberes + nuevo tema: conectores causales (porque, ya que, como).`

### 2.3 What Was Actually Done (Que he hecho)

**Field:** Short text (1-3 sentences).

**Why:** This is what actually happened. The gap between 2.2 and 2.3 is where the real teaching signal lives. If the teacher planned grammar but spent the session on conversation because the student needed it, that tells the system something important.

**Examples:**
- `Solo hicimos la mitad del ejercicio de lectura. La alumna tenia muchas dudas sobre ser/estar que tuve que resolver primero.`
- `Todo segun lo planificado. Hicimos los 3 ejercicios y la produccion oral.`
- `Cambiamos el plan: el alumno trajo un email del trabajo que necesitaba corregir. Trabajamos vocabulario formal y estructura de emails.`
- `Repasamos deberes (no los habia hecho bien), repaso de indefinido, y empezamos imperfecto.`

### 2.4 Homework Assigned (Deberes)

**Field:** Short text. Nullable (not every session has homework).

**Why:** Tracks what was sent so the teacher knows what to check next session. Also feeds the "pending homework" indicator in the student view.

**Examples:**
- `Escribir 10 frases usando preterito indefinido. Enviar por email antes del jueves.`
- `Leer articulo sobre cambio climatico (enviado por Preply). Preparar 5 preguntas.`
- `Ejercicios pagina 47-48 del libro Aula Plus 3.`
- `Grabar un audio de 2 minutos describiendo su rutina diaria.`
- *(null: no homework this session)*

### 2.5 Previous Homework Status

**Field:** Selection (not done / partial / done / not applicable). Shown only if the previous session had homework assigned.

**Why:** Closes the homework loop. If the student consistently doesn't do homework, the teacher needs to see that pattern (and the AI should stop generating homework-dependent progressions). If the student does homework well, the AI can build on assumed practice.

**Examples:**
- `done` (student completed all 10 sentences, reviewed in class)
- `partial` (read the article but didn't prepare questions)
- `not done` (forgot, will do for next time)
- `not applicable` (first session, or previous session had no homework)

### 2.6 Observations: Topics for Next Session

**Field:** Short text. Nullable.

**Why:** These are the actionable items that directly feed the next lesson plan and AI generation. Separated from general notes because these have a clear "do something about this" intent.

**Examples:**
- `Debo trabajar con ella el uso de para/por. Confunde sistematicamente.`
- `Necesita mas practica de comprension auditiva. Entiende textos escritos pero no audio.`
- `Repasar subjuntivo en oraciones temporales (cuando + subjuntivo). Lo evita al hablar.`
- `Empezar tema nuevo: describir personas (fisico y caracter). Tiene vocabulario muy limitado.`
- `Quiere preparar una presentacion para su trabajo. Dedicar proxima clase a eso.`

### 2.7 Observations: General Notes

**Field:** Longer text. Nullable.

**Why:** Learning style observations, affective state, context that informs HOW to teach (not WHAT to teach). These accumulate over time and build the teacher's understanding of the student. Critical for personalization but not directly actionable per session.

**Examples:**
- `No estudia fuera de clase pero aprende rapido. Mejor usar actividades que practiquen en clase, no depender de deberes.`
- `Hoy estaba muy cansada, venia de trabajar 10 horas. Baje el ritmo y hicimos mas conversacion.`
- `Le gusta el arte, debo hacer actividades relacionadas con el arte. Tambien le interesa la cocina.`
- `El nivel de habla no es A2, es mas bajo. Comprension lectora si es A2 pero produccion oral mas cerca de A1.2.`
- `Muy motivada despues de su viaje a Barcelona. Dice que pudo pedir en restaurantes. Buen momento para subir exigencia.`
- `Tiene verguenza al hablar. Mejor no corregir cada error en conversacion, anotar y corregir al final.`

### 2.8 Level Reassessment Flag

**Field:** Optional toggle. When activated, prompts teacher to specify which skill and what the real level is.

**Why:** Jordi's data shows he regularly discovers that a student's actual level doesn't match their placement. This is not an observation; it's a professional assessment that should update the student profile. Burying it in notes means it gets forgotten and the AI keeps generating at the wrong level.

**When shown:** Always available, but the form should surface it prominently if the teacher writes phrases like "su nivel real es..." or "no es [level]" in any text field (a simple keyword hint, not AI analysis).

**Example:**
- Skill: `Speaking` / Reassessed level: `A1.2` (student is nominally A2 but speaks at A1.2)
- Skill: `Writing` / Reassessed level: `B1.2` (student writes above their nominal B1.1)

---

## 3. Linking Sessions to Lessons

### 3.1 Lesson Association

**Field:** Optional link to an existing LangTeach lesson.

**Why:** If the teacher generated a lesson in LangTeach and used it in class, linking it provides:
- Auto-populated "what was planned" from the lesson objectives
- A record of which generated content was actually used
- Future ability to rate/improve generation based on what worked

**Examples:**
- Session linked to "Lesson: Preterito indefinido, viajes" (generated lesson)
- Session with no linked lesson (teacher used their own materials or did free conversation)

### 3.2 Topics Covered (Structured Tags)

**Field:** Optional multi-select from curriculum-aligned topic list. Can also be free-text tags.

**Why:** This is the foundation for "covered content" tracking. Even if it's manual this sprint, tagging sessions with topics means the AI can answer "what has this student already studied?" and avoid repetition or gaps.

**Suggested tag categories (from the curricula JSON):**
- Grammar: `preterito indefinido`, `ser/estar`, `subjuntivo presente`, `conectores causales`...
- Vocabulary: `viajes`, `medios de transporte`, `comida`, `trabajo`...
- Competency: `comprension lectora`, `produccion oral`, `comprension auditiva`, `produccion escrita`
- Communicative function: `describir personas`, `expresar obligacion`, `hablar del pasado`...

**Examples:**
- Tags: `preterito indefinido`, `vocabulario: viajes`, `produccion oral`
- Tags: `ser/estar (repaso)`, `comprension lectora`, `vocabulario: arte`
- Tags: `conversacion libre` (no specific grammar target)

---

## 4. How This Feeds AI Generation

This section describes what the AI should "see" when generating the next lesson. Not the implementation (that's for the dev plan), but the pedagogical context the AI needs.

### 4.1 Minimum Context for Next Lesson Generation

When a teacher clicks "generate lesson" for a student, the AI should have access to:

| Data point | Source | Example |
|------------|--------|---------|
| Last 3-5 sessions summary | Session logs (2.2, 2.3) | "Last session: planned indefinido, actually spent time on ser/estar. Before that: reading exercise + transport vocabulary." |
| Open action items | Topics for next session (2.6) | "Teacher flagged: work on para/por, more listening practice." |
| Pending homework | Homework field (2.4) + status | "Homework assigned 3 days ago (10 sentences indefinido), not yet checked." |
| Time since last session | Session date (2.1) | "Last session was 12 days ago (needs recap)." |
| Covered topics | Structured tags (3.2) | "Already covered: indefinido, ser/estar, transport vocab, food vocab." |
| Reassessed levels | Level flag (2.8) | "Nominal A2 but teacher assessed speaking at A1.2." |
| Learning style notes | General notes (2.7) | "Doesn't study outside class. Prefers visual activities. Shy speaker." |
| Student difficulties | Existing student profile | "Recurring issues: ser/estar, para/por." |

### 4.2 Time Gap Rules

The time since last session should influence generation:

| Gap | Pedagogical implication |
|-----|------------------------|
| 1-2 days | Build directly on previous session. Minimal recap needed. |
| 3-7 days | Brief warm-up reviewing key points from last session. |
| 8-14 days | Dedicated review activity before new content. Check homework status. |
| 15+ days | Diagnostic mini-activity to assess retention. Don't assume previous content is retained. |

---

## 5. Excel Import Considerations

Jordi has 35 students with months of history. The import must preserve:

- **Per-student sheet mapping** to per-student session list
- **Date column** (Excel serial format) to proper dates
- **All 5 data columns** mapped to the fields above:
  - Column B (Planificacion) to "What was planned" (2.2)
  - Column C (Que he hecho) to "What was actually done" (2.3)
  - Column D (Deberes) to "Homework assigned" (2.4)
  - Column E (Aspectos que surgen) to "General notes" (2.7), with a note that the teacher can later split actionable items into "topics for next session"
  - Column F (Test Preply) to student profile notes
  - Column G (Informacion del alumno) to student profile (interests, context, native language)

**Important:** Column E in Jordi's Excel mixes actionable and observational notes (see section 2.6 vs 2.7). The import should put everything into "general notes" rather than guess. The teacher can re-classify later. Getting this wrong (putting "le gusta el arte" into "topics for next session") would be worse than not splitting at all.

---

## 6. Feature Summary

| # | Feature | Priority | Fields involved |
|---|---------|----------|-----------------|
| 1 | Session log form | Must have | Date, planned, done, homework, prev homework status, observations (2 types) |
| 2 | Student session timeline | Must have | Chronological list with inline preview, expandable detail |
| 3 | Student summary header | Must have | Last session, total sessions, open actions, level flags |
| 4 | Lesson association | Should have | Optional link between session and generated lesson |
| 5 | Topic tags | Should have | Curriculum-aligned tags per session |
| 6 | Level reassessment flag | Should have | Skill + reassessed level, surfaces as profile update prompt |
| 7 | Generation context injection | Must have | AI sees last N sessions + open items + time gap |
| 8 | Excel import | Must have | Map Jordi's 5 columns to session fields, 35 student sheets |
| 9 | Time gap awareness | Nice to have | Auto-adjust lesson style based on days since last session |
