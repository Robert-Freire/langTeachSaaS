# Exercise Type Inventory

**Date:** 2026-03-28
**Source:** `data/pedagogy/exercise-types.json` (72 types across 8 categories)
**Purpose:** Map every exercise type to its renderer status. Isaac reviews for prioritization.

## Status Legend

- **Available**: renderer exists and works today
- **Scheduled**: renderer planned for Pedagogical Quality sprint
- **Not Planned**: no renderer work scheduled
- **Blocked**: requires special resources not yet supported (audio, video, etc.)

## Category: CE (Comprension Escrita / Reading Comprehension)

All CE types use `uiRenderer: "reading"` (ReadingRenderer exists).

| ID | Name | Name (ES) | CEFR | Renderer Status | Scheduled Issue | Notes |
|----|------|-----------|------|----------------|----------------|-------|
| CE-01 | Global comprehension (gist reading) | Comprension global | A1-C2 | Available | | ReadingRenderer |
| CE-02 | Detailed comprehension | Comprension detallada | A1-C2 | Available | | ReadingRenderer |
| CE-03 | True/False/Not stated | Verdadero/Falso/No se dice | A2-C2 | Available | #271 enhances | ReadingRenderer handles it; #271 adds richer true/false with justification |
| CE-04 | Matching headings to paragraphs | Relacionar titulo/parrafo | B1-C2 | Available | | ReadingRenderer |
| CE-05 | Ordering paragraphs/fragments | Ordenar parrafos/fragmentos | B1-C2 | Available | | ReadingRenderer |
| CE-06 | Gap-fill in text (cloze) | Rellenar huecos en texto | A2-C2 | Available | | ReadingRenderer |
| CE-07 | Inference and deduction | Inferencia y deduccion | B2-C2 | Available | | ReadingRenderer |
| CE-08 | Register and intent identification | Identificacion de registro/intencion | B2-C2 | Available | | ReadingRenderer |
| CE-09 | Critical reading / argued opinion | Lectura critica / opinion argumentada | B2-C2 | Available | | ReadingRenderer |

## Category: CO (Comprension Oral / Listening Comprehension)

All CO types have `uiRenderer: null` (require audio resources).

| ID | Name | Name (ES) | CEFR | Renderer Status | Scheduled Issue | Notes |
|----|------|-----------|------|----------------|----------------|-------|
| CO-01 | Global listening | Escucha global | A1-C2 | Blocked | | Requires audio |
| CO-02 | Selective listening | Escucha selectiva | A1-C2 | Blocked | | Requires audio |
| CO-03 | Detailed listening | Escucha detallada | A2-C2 | Blocked | | Requires audio |
| CO-04 | Listen and complete | Completar mientras escucha | A2-C2 | Blocked | | Requires audio |
| CO-05 | Listen and take notes | Tomar notas de escucha | B1-C2 | Blocked | | Requires audio |
| CO-06 | Phonetic discrimination | Discriminacion fonetica | A1-B2 | Blocked | | Requires audio |
| CO-07 | Dictation (partial or complete) | Dictado | A1-C1 | Blocked | | Requires audio |
| CO-08 | Authentic media comprehension | Comprension de medios reales | B2-C2 | Blocked | | Requires audio/video |

## Category: EE (Expresion Escrita / Written Expression)

Mixed renderers: exercises, homework, free-text.

| ID | Name | Name (ES) | CEFR | uiRenderer | Renderer Status | Scheduled Issue | Notes |
|----|------|-----------|------|------------|----------------|----------------|-------|
| EE-01 | Guided writing with model | Escritura guiada con modelo | A1-A2 | exercises | Not Planned | #273 related | #273 builds a new "guided writing" content type |
| EE-02 | Complete sentences/paragraphs | Completar frases/parrafos | A1-B1 | exercises | Available | | Maps to fillInBlank format |
| EE-03 | Short functional text | Texto breve funcional | A1-B1 | exercises | Not Planned | | Needs structured prompt/template format |
| EE-04 | Description (person, place, object) | Descripcion | A1-B2 | homework | Available | | HomeworkRenderer |
| EE-05 | Narration | Narracion | A2-C2 | homework | Available | | HomeworkRenderer |
| EE-06 | Letter/email (formal and informal) | Carta/email | A2-C2 | homework | Available | | HomeworkRenderer |
| EE-07 | Opinion/argumentative essay | Opinion/ensayo argumentativo | B1-C2 | homework | Available | | HomeworkRenderer |
| EE-08 | Summary | Resumen | B1-C2 | homework | Available | | HomeworkRenderer; requires source-text |
| EE-09 | Register transformation | Transformacion de registro | B2-C2 | exercises | Not Planned | | Needs source-text + rewrite format |
| EE-10 | Creative/literary text | Texto creativo/literario | B1-C2 | free-text | Available | | FreeTextRenderer |
| EE-11 | Written mediation | Mediacion escrita | B2-C2 | homework | Available | | HomeworkRenderer; requires source-text |

## Category: EO (Expresion Oral / Oral Expression)

Most use `uiRenderer: "conversation"` (ConversationRenderer exists).

| ID | Name | Name (ES) | CEFR | uiRenderer | Renderer Status | Scheduled Issue | Notes |
|----|------|-----------|------|------------|----------------|----------------|-------|
| EO-01 | Guided dialogue (closed role-play) | Dialogo guiado | A1-B1 | conversation | Available | | ConversationRenderer |
| EO-02 | Open role-play | Role-play abierto | A2-C2 | conversation | Available | | ConversationRenderer |
| EO-03 | Structured interview | Entrevista estructurada | A1-B2 | conversation | Available | | ConversationRenderer; needs question-list |
| EO-04 | Oral description (image, experience) | Descripcion oral | A1-C1 | conversation | Available | | ConversationRenderer; image optional |
| EO-05 | Sustained monologue / presentation | Monologo sostenido / exposicion | B1-C2 | conversation | Available | | ConversationRenderer |
| EO-06 | Debate / discussion | Debate / discusion | B1-C2 | conversation | Available | | ConversationRenderer |
| EO-07 | Negotiation / problem-solving | Negociacion / resolucion de problemas | B1-C2 | conversation | Available | | ConversationRenderer |
| EO-08 | Thematic free conversation | Conversacion libre tematica | A2-C2 | conversation | Available | | ConversationRenderer |
| EO-09 | Oral mediation | Mediacion oral | B2-C2 | conversation | Available | | ConversationRenderer; needs source-text |
| EO-10 | Audio recording (oral homework) | Grabacion de audio | A2-C2 | null | Blocked | | Requires recorder |

## Category: GR (Gramatica / Grammar)

Most use `uiRenderer: "exercises"` but only 3 exercise sub-formats exist.

| ID | Name | Name (ES) | CEFR | uiRenderer | Renderer Status | Scheduled Issue | Notes |
|----|------|-----------|------|------------|----------------|----------------|-------|
| GR-01 | Fill-in-the-blank | Rellenar huecos | A1-C2 | exercises | Available | | fillInBlank format |
| GR-02 | Multiple choice | Seleccion multiple | A1-C2 | exercises | Available | | multipleChoice format |
| GR-03 | Sentence transformation | Transformacion de frases | A2-C2 | exercises | Scheduled | #272 | New renderer needed |
| GR-04 | Error correction | Correccion de errores | B1-C2 | exercises | Scheduled | #270 | New renderer needed |
| GR-05 | Conjugation (paradigms) | Conjugacion | A1-B2 | exercises | Not Planned | | Needs table/paradigm format |
| GR-06 | Matching | Emparejamiento | A1-B2 | exercises | Available | | matching format |
| GR-07 | Word ordering (sentence building) | Ordenar palabras | A1-B1 | exercises | Scheduled | #269 | New renderer needed |
| GR-08 | Inductive discovery (noticing) | Descubrimiento inductivo | A2-C2 | grammar | Scheduled | #274 | New "noticing task" content type |
| GR-09 | Classification/categorization | Clasificacion/categorizacion | A1-C1 | exercises | Not Planned | | Needs category-bucket format |
| GR-10 | Complete a paradigm from text | Completar paradigma desde texto | B1-C2 | exercises | Not Planned | | Needs source-text + table format |

## Category: VOC (Vocabulario / Vocabulary)

Most use `uiRenderer: "vocabulary"` (VocabularyRenderer exists).

| ID | Name | Name (ES) | CEFR | uiRenderer | Renderer Status | Scheduled Issue | Notes |
|----|------|-----------|------|------------|----------------|----------------|-------|
| VOC-01 | List with translation/definition | Lista con traduccion/definicion | A1-C2 | vocabulary | Available | | VocabularyRenderer |
| VOC-02 | Matching (word-definition, word-image) | Emparejamiento | A1-B2 | vocabulary | Available | | VocabularyRenderer; image optional |
| VOC-03 | Categorize/group by semantic field | Categorizar por campo semantico | A1-B2 | vocabulary | Available | | VocabularyRenderer |
| VOC-04 | Find in text (vocabulary in context) | Buscar en texto | A2-C2 | vocabulary | Available | | VocabularyRenderer; needs source-text |
| VOC-05 | Complete sentences with vocabulary | Completar frases con vocabulario | A1-C2 | vocabulary | Available | | VocabularyRenderer |
| VOC-06 | Synonyms and antonyms | Sinonimos y antonimos | A2-C2 | vocabulary | Available | | VocabularyRenderer |
| VOC-07 | Collocations | Colocaciones | B1-C2 | vocabulary | Available | | VocabularyRenderer |
| VOC-08 | Mind map / lexical network | Mapa mental / red lexica | A2-C2 | null | Blocked | | Requires visual-map |
| VOC-09 | Flashcards (spaced repetition) | Flashcards | A1-C2 | null | Blocked | | Requires flashcard-system |
| VOC-10 | Idioms and fixed expressions | Expresiones idiomaticas | B2-C2 | vocabulary | Available | | VocabularyRenderer |
| VOC-11 | Word formation (derivation, composition) | Formacion de palabras | B1-C2 | vocabulary | Available | | VocabularyRenderer |

## Category: PRAG (Pragmatica / Pragmatics)

| ID | Name | Name (ES) | CEFR | uiRenderer | Renderer Status | Scheduled Issue | Notes |
|----|------|-----------|------|------------|----------------|----------------|-------|
| PRAG-01 | Communicative functions | Funciones comunicativas | A1-C2 | conversation | Available | | ConversationRenderer |
| PRAG-02 | Register adaptation (formal/informal) | Adecuacion de registro | A2-C2 | exercises | Not Planned | | Needs rewrite/compare format |
| PRAG-03 | Cultural/intercultural content | Contenido cultural/intercultural | A1-C2 | null | Blocked | | Requires video/image |
| PRAG-04 | Intercultural comparison | Comparacion intercultural | A2-C2 | null | Blocked | | Needs discussion format |
| PRAG-05 | Social simulation | Simulacion social | A2-C2 | conversation | Available | | ConversationRenderer |

## Category: LUD (Ludico / Games)

All have `uiRenderer: null` (require special resources/generators).

| ID | Name | Name (ES) | CEFR | Renderer Status | Scheduled Issue | Notes |
|----|------|-----------|------|----------------|----------------|-------|
| LUD-01 | Crossword | Crucigrama | A1-B2 | Blocked | | Requires crossword-generator |
| LUD-02 | Word search | Sopa de letras | A1-A2 | Blocked | | Requires word-search-generator |
| LUD-03 | Board game | Juego de tablero | A1-C1 | Blocked | | Requires printable-board |
| LUD-04 | Speed quiz (Kahoot-style) | Kahoot / quiz de velocidad | A1-C2 | Blocked | | Requires platform integration |
| LUD-05 | Taboo / Describe without saying | Taboo | A2-C2 | Blocked | | Requires cards format |
| LUD-06 | Memory / pairs | Memory / parejas | A1-B1 | Blocked | | Requires cards format |
| LUD-07 | Who is who / 20 questions | Quien es quien | A1-B1 | Blocked | | Requires image |
| LUD-08 | Pasapalabra / alphabet quiz | Pasapalabra / rosco | A2-C1 | Blocked | | Requires word-list |

## Summary

| Status | Count | Details |
|--------|-------|---------|
| **Available** | 42 | Renderers exist and work today |
| **Scheduled** | 4 | New exercise formats: #269, #270, #271 (enhances CE-03), #272 |
| **Scheduled (new content type)** | 2 | #273 (guided writing), #274 (noticing task) |
| **Not Planned** | 6 | GR-05, GR-09, GR-10, EE-01, EE-03, EE-09, PRAG-02 |
| **Blocked** | 18 | Need audio, video, visual-map, flashcard-system, or game generators |

## Isaac's Review (2026-03-28)

Verdict: **ADJUST**. Scheduled items (#269-#274) are well-chosen. But some "Not Planned" types need to move up, and several "Blocked" types have text-only workarounds.

### Not Planned Types: Isaac's Prioritization

| ID | Type | Isaac Priority | Rationale | Renderer Approach |
|----|------|---------------|-----------|-------------------|
| GR-05 | Conjugation (paradigms) | **P1** | Most-used exercise at A1-A2. Every Aula Plus lesson has conjugation tables. Without this, A1 classes feel incomplete. | Structured table (subject rows, tense columns) with editable cells. Reuse vocabulary table layout. |
| EE-01 | Guided writing with model | **P1** | Essential A1-A2 (PCIC: "escribir a partir de un modelo" is the primary written production below B1). | Unblocked by #273 (guided writing content type). Once #273 ships, this becomes available. |
| GR-09 | Classification/categorization | **P2** | Weekly use at A1-B1 (sort: masculine/feminine, preterite/imperfect, ser/estar). PCIC fundamental cognitive task. | Extend matching format with "category header" property, or drag-into-buckets. |
| EE-03 | Short functional text | **P2** | Core A1-B1 DELE task (Tarea 1 in DELE A2/B1 written expression). Postcards, notes, messages. | Template/prompt frame with constrained fields. Could reuse homework renderer with scaffolding. |
| EE-09 | Register transformation | **P2** | B2-C1 staple. Every DELE B2 written expression section. | Split-panel: source text + editable rewrite area. New format. |
| PRAG-02 | Register adaptation | **P2** | **Merge with EE-09.** Same exercise, different catalog category. One renderer serves both. | Same as EE-09. |
| GR-10 | Complete paradigm from text | **P3** | B1+ only, less frequent. Appears in Nuevo Prisma B1-B2 grammar units. Can wait. | Needs source-text + table format. |

### Blocked Types: Workarounds

**Can work WITHOUT special resources (text-only fallbacks):**

| ID | Type | Isaac Priority | Workaround |
|----|------|---------------|------------|
| CO-07 | Dictation | **P1** | Teacher reads aloud in class. Generate text + answer key. This is how 90% of EOI classrooms do dictation today. |
| PRAG-03 | Cultural content | **P1** | Text-based cultural readings. Use ReadingRenderer. A reading about Dia de Muertos doesn't need video. |
| LUD-05 | Taboo | **P1** | Generate word cards with "forbidden words" list. Vocabulary renderer with a taboo-words field. |
| PRAG-04 | Intercultural comparison | **P2** | Discussion prompts + comparison table. ConversationRenderer + simple grid. |
| LUD-08 | Pasapalabra | **P2** | Word-list with definitions per letter. Simple quiz format without circular visual. |
| VOC-08 | Mind map | **P3** | Hierarchical list or indented outline. Functional but not visually ideal. |

**Genuinely blocked (need infrastructure):**

| ID | Type | Isaac Priority | Why blocked |
|----|------|---------------|-------------|
| CO-01 to CO-06, CO-08 | Listening comprehension (7 types) | **P1 collectively** | Truly need audio. Listening is 25% of every DELE exam, ~20% of EOI class time. **Biggest competency gap.** Prioritize audio infra over game generators. |
| VOC-09 | Flashcards | **P2** | Needs spaced-repetition system. Wait for Phase 3. |
| EO-10 | Audio recording | **P2** | Needs recorder widget. Blocked until audio infra exists. |
| LUD-01 to LUD-04, LUD-06, LUD-07 | Games (6 types) | **P3** | Nice to have. External tools (Wordwall, Educaplay) fill this gap today. |

### Isaac's Key Observations

1. **Biggest gap a teacher would notice:** No listening comprehension at all. An EOI teacher plans 1-2 listening activities per session. An entire CEFR competency is absent. Top infrastructure priority after current sprint.

2. **Second gap:** No conjugation exercise (GR-05). At A1-A2, conjugation drills are as fundamental as vocabulary lists. A teacher would question the platform's suitability for beginners.

3. **Potential renderer mismatch:** CE-05 (ordering paragraphs) and CE-04 (matching headings) are listed as using ReadingRenderer. Verify these support drag-and-drop interaction, not just static text. If ReadingRenderer only shows text with questions, these are effectively broken despite being "Available."

4. **Merge PRAG-02 and EE-09.** Register transformation is register transformation regardless of catalog category. Two entries for one activity will confuse prompt generation.

5. **Suggested resources:** PCIC Inventario de funciones (cvc.cervantes.es), DELE prep guides (Edelsa), ProfeDeELE.es activity archive.

## Arch's Renderer Families Analysis (2026-03-28)

**Key finding: no new renderer components needed.** The 7 existing renderers cover all 58 non-blocked types. ExercisesRenderer grows from 3 sub-formats to ~9. Each sub-format is a self-contained interaction widget inside a shared shell (check answers, score, reset).

### Renderer Family Map

| Renderer | Types Today | After Expansion | New Sub-formats Needed |
|---|---|---|---|
| ExercisesRenderer | 4 | ~15 | sentenceOrdering, errorCorrection, trueFalse, transformation, conjugation, classification |
| ReadingRenderer | 9 | 10-11 | None (add PRAG-03 cultural content as text fallback; verify CE-04, CE-05 interactive support) |
| ConversationRenderer | 11 | 12-13 | None (add PRAG-04 intercultural comparison) |
| VocabularyRenderer | 9 | 11 | taboo-words field variant (LUD-05), definition-list variant (LUD-08) |
| HomeworkRenderer | 6 | 7 | Scaffolding/template variant for EE-03 |
| GrammarRenderer | 1 | 1 | None |
| FreeTextRenderer | 1 | 1 | None |
| **Total** | **41** | **~58** | |
| Blocked (need infra) | 18 | 14 (4 unblocked via text fallbacks) | |

### ExercisesRenderer Sub-format Coverage

All sub-formats share: check answers button, score display, reset/try again, item-level feedback.

| Sub-format | Exercise Types Covered | Interaction Pattern |
|---|---|---|
| fillInBlank (exists) | GR-01, EE-02, CE-06 (via ReadingRenderer) | Sentence with blank, text input |
| multipleChoice (exists) | GR-02 | Question + 3-4 radio options |
| matching (exists) | GR-06, VOC-02 (via VocabularyRenderer) | Two-column drag or select pairing |
| sentenceOrdering (#269) | GR-07 | Drag/tap word chips into order |
| errorCorrection (#270) | GR-04 | Sentence with inline editable error spans |
| trueFalse (#271) | CE-03 (enhanced) | Statement + T/F/NS radio + justification field |
| transformation (#272) | GR-03, EE-09, PRAG-02 | Source sentence + editable rewrite field |
| conjugation (Isaac P1) | GR-05 | Table grid: subject rows x tense columns |
| classification (Isaac P2) | GR-09 | Drag items into labeled category buckets |

### Cross-Renderer Reuse Opportunities

- **Matching widget:** shared between ExercisesRenderer (GR-06) and VocabularyRenderer (VOC-02). Extract as a shared component.
- **Fill-in-blank widget:** shared between ExercisesRenderer (GR-01) and ReadingRenderer (CE-06 cloze). Extract input widget.

## Sophy's Data Model Decisions (2026-03-28)

1. **`uiRenderer` stays in the catalog JSON.** Catalog maps exercise type to content block type (pedagogical decision). Frontend registry maps content block type to React component (rendering decision). Correct two-layer split.

2. **One `uiRenderer` string is sufficient.** Sub-format dispatch happens inside the renderer based on JSON content shape, not via the mapping. Keep it flat.

3. **Merge PRAG-02 into EE-09.** Delete PRAG-02 as a standalone entry. If nothing references it by ID, just delete it. If it does, add `"aliases": ["PRAG-02"]` to EE-09.

4. **Add `"available": true/false` to the catalog JSON.** No separate allowlist file. When a renderer/sub-format ships, flip to `true`. The backend reads `available` to constrain generation. Default `false` for types with `uiRenderer: null`.
