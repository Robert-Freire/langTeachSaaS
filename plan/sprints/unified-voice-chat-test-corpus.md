# Atelier Assistant — Voice/Text Test Corpus

Sprint: Unified Voice & Chat  
Author: Isaac (ELE pedagogy review)  
Purpose: Test texts for the Atelier Assistant LLM extraction pipeline (issues #1008, #1009, #1004, #1005).  
Each case lists the raw teacher input, the expected entity proposals, and a pedagogical note explaining what makes it tricky or realistic.

---

## How to use this corpus

Each test case maps to the three proposal types the assistant produces:

| Proposal type | Target entity | Key fields |
|---|---|---|
| Session update | SessionLog (existing) | TopicTags, MentionedDifficultyPairs, ActualContent, HomeworkAssigned, NextSessionTopics, LevelReassessmentSkill/Level |
| New session | SessionLog (new) | Title (max 120), SessionDate (date chip, inline-editable on card) |
| Student update | Student | CefrLevel, SkillLevelOverrides, Weaknesses, Difficulties, TeachingNotes, PersonalNotes, Interests, LearningGoals |
| New student | Student (new) | Name, NativeLanguages, LearningLanguage, CefrLevel, Profession, BirthYear, ReasonForStudying, etc. |
| Teaching todo | TeacherFollowup | Text, DueDate, Kind (Teaching) |

A well-behaved extraction should produce exactly the proposals that match the input, nothing more. Fabricating a proposal the teacher did not mention is a failure mode.

---

## Group 1: Post-class reflections (multi-entity, happy path)

### TC-01 — Sprint story baseline

> "Hoy hemos trabajado el pretérito perfecto. Le cuesta todavía el subjuntivo, especialmente el imperfecto. Súbele el nivel de escritura a B1 porque ha mejorado mucho. Y añade un teaching todo para repasar la voz pasiva la semana que viene."

**Expected proposals:**
- SessionLog: TopicTags = ["pretérito perfecto"], MentionedDifficultyPairs = [("subjuntivo", "subjuntivo imperfecto")]
- Student: SkillLevelOverrides.writing = "B1"
- TeacherFollowup: Text = "Repasar la voz pasiva", Kind = Teaching

**Isaac's note:** The canonical example from the sprint story. Baseline for the pipeline. Note that "imperfecto" here means the imperfect subjunctive (subjuntivo imperfecto), not the indicative imperfect — the extraction should tag it as a subjunctive difficulty, not a past-tense one.

---

### TC-02 — Full reflection, no level change

> "Clase bien. Hemos hecho comprensión lectora con un texto sobre el cambio climático. Ella ha entendido el vocabulario pasivo pero le ha costado inferir el significado de palabras nuevas por contexto. Los ejercicios de léxico bien. Le he mandado como deberes el ejercicio 3 del libro, páginas 47 y 48."

**Expected proposals:**
- SessionLog: TopicTags = ["comprensión lectora", "vocabulario"], ActualContent = (description of class), HomeworkAssigned = "Ejercicio 3, libro, páginas 47 y 48", MentionedDifficultyPairs = [("vocabulario", "inferencia por contexto")]
- No student update (no level or profile change mentioned)
- No teaching todo

**Isaac's note:** "Vocabulario pasivo" is a real ELE term (words a learner recognises but can't produce). The extractor must NOT confuse "vocabulario pasivo" with a grammar construct. The difficulty here is inferring meaning from context, a meta-skill, not a vocabulary gap per se — that nuance matters for `MentionedDifficultyPairs`.

---

### TC-03 — Emotional observation + difficulty

> "Marco hoy ha estado muy desmotivado. Le noto que los textos de B2 le superan un poco, creo que hay que bajarle el nivel de lectura a B1.2. Ha fallado varios ejercicios de subjuntivo presente aunque ya lo hemos trabajado varias veces. Añade una nota de enseñanza: considerar actividades más cortas y con más componente oral para él."

**Expected proposals:**
- SessionLog: MentionedDifficultyPairs = [("subjuntivo", "subjuntivo presente")]
- Student: SkillLevelOverrides.reading = "B1.2", TeachingNotes = "Considerar actividades más cortas con más componente oral"
- No teaching todo (the note is a standing teaching consideration, not a one-off task)

**Isaac's note:** "Le superan los textos de B2" is real teacher language for comprehensible input breakdown — the input is above the student's i+1. A correct extraction distinguishes the level reassessment (reading skill, B1.2) from the motivational observation (which goes to TeachingNotes, not a difficulty tag). The subjuntivo presente failure is worth flagging even at B2 students who have fossilized errors.

---

### TC-04 — Homework follow-up + new topic

> "Los deberes de la semana pasada los ha traído hechos, muy bien. Hemos repasado el condicional simple para peticiones formales, algo que le costaba. Hoy ha salido mucho más seguro. Nuevo tema: hemos empezado con el estilo indirecto. Solo la introducción. Para la semana: que prepare tres ejemplos propios de estilo indirecto transformando frases directas."

**Expected proposals:**
- SessionLog: PreviousHomeworkStatus = Done, TopicTags = ["condicional simple", "estilo indirecto"], HomeworkAssigned = "Preparar tres ejemplos propios de estilo indirecto (directa → indirecta)", NextSessionTopics = ["estilo indirecto (continuación)"]
- No student update (improvement noted but no level change stated)
- No teaching todo

**Isaac's note:** This is a classic PPP sequence: the teacher consolidated a prior difficulty (condicional → peticiones formales) and opened a new Presentation phase (estilo indirecto). The homework is productive, not reproductive — the student generates examples, not copies from the book. `PreviousHomeworkStatus` should be `Done`, not a difficulty tag.

---

### TC-05 — Multiple difficulties, structured

> "Hoy hemos trabajado ser y estar. Le cuesta muchísimo ser con profesiones y estar con estados transitorios. También confunde muy y mucho. El resto bien. No hubo deberes. Para la próxima sesión quiero hacer un juego de rol con identidades falsas para practicar ser."

**Expected proposals:**
- SessionLog: TopicTags = ["ser y estar", "muy/mucho"], MentionedDifficultyPairs = [("ser/estar", "ser con profesiones"), ("ser/estar", "estar con estados transitorios"), ("intensificadores", "muy vs mucho")], HomeworkAssigned = null
- TeacherFollowup: Text = "Juego de rol con identidades falsas para practicar ser", Kind = Teaching

**Isaac's note:** Ser/estar is the canonical difficulty for English L1 learners at A2. The extraction should capture two distinct subtypes of the same root difficulty, not merge them into one entry. "Muy vs mucho" is a separate lexicogrammar difficulty (intensifier selection) and should be tagged independently. The follow-up is pedagogical content planning, not an admin task — Kind = Teaching.

---

## Group 2: Level updates and corrections

### TC-06 — Overall level upgrade

> "Carmen ha mejorado mucho. Creo que ya está en B2.1. Súbele el nivel."

**Expected proposals:**
- Student: CefrLevel = "B2.1"
- No other proposals

**Isaac's note:** Short, unambiguous. Tests that the extractor does not invent a session update when no session content was described. The absence of proposals is as important to verify as their presence.

---

### TC-07 — Per-skill level override, multiple skills

> "Nadia lee muy bien, diría que ya está en C1 de lectura. Pero el habla sigue en B2, y la escritura también se queda en B2. El nivel global no lo toco."

**Expected proposals:**
- Student: SkillLevelOverrides.reading = "C1", SkillLevelOverrides.speaking = "B2", SkillLevelOverrides.writing = "B2"
- CefrLevel: no change (teacher explicitly said not to touch it)

**Isaac's note:** Dissociated skill profiles are very common at C1. A student who reads academic texts fluently may still have B2 spoken fluency. The extractor must honour "no toco el nivel global" as a negative instruction — a common LLM failure mode is to update CefrLevel anyway.

---

### TC-08 — Correction (not an upgrade, a fix)

> "Espera, creo que anoté mal el nivel de Hans. Es B1.2, no B1."

**Expected proposals:**
- Student: CefrLevel = "B1.2"

**Isaac's note:** "B1" and "B1.2" map to different curriculum content (B1.1 vs B1.2 syllabi). Getting this wrong means the AI generates content at the wrong sublevel. The extractor should handle this as a simple correction, not as a learning event to log in the session.

---

### TC-09 — Official vs working level

> "Ana acaba de aprobar el DELE B2. Anota el nivel oficial como B2. Su nivel de trabajo sigue siendo C1 porque ha seguido avanzando."

**Expected proposals:**
- Student: OfficialCefrLevel = "B2", CefrLevel = "C1" (no change, but confirm it stays)

**Isaac's note:** `OfficialCefrLevel` stores certified exam results; `CefrLevel` is the teacher's working assessment. These are different fields. A real teacher distinguishes them because a student might pass DELE B2 while already working at C1 content.

---

### TC-10 — Ambiguous level signal (session note, not a formal change)

> "Hoy he visto que Ricardo maneja bien el B2 en comprensión pero le cuesta la producción. Todavía no quiero cambiar el nivel, solo tomar nota."

**Expected proposals:**
- SessionLog: MentionedDifficultyPairs = [("producción oral/escrita", "producción en B2")]
- No student CefrLevel or SkillLevelOverrides change (teacher explicitly said not to change it)

**Isaac's note:** "No quiero cambiar el nivel" is a negative instruction. This tests that the system does not eagerly update CefrLevel. The observation goes to the session log as a difficulty signal, not to the student profile as a level reassessment.

---

## Group 3: New student creation

### TC-11 — Full profile, spoken naturally

> "Nueva alumna: Sofía, 28 años, ingeniera, de Madrid. Lengua materna castellano, aprende inglés. Nivel aproximado B1, quiere mejorar para entrevistas de trabajo."

**Expected proposals:**
- Student (new): Name = "Sofía", BirthYear = ~1998, Profession = "Ingeniera", CountryOfOrigin = "España", CityOfOrigin = "Madrid", NativeLanguages = ["Español"], LearningLanguage = "Inglés", CefrLevel = "B1", ReasonForStudying = "Entrevistas de trabajo"

**Isaac's note:** Sprint story example. Age "28 años" should map to BirthYear = 2026 - 28 = 1998. "Castellano" is a valid label for Spanish as a native language. The extractor should not confuse `NativeLanguages` (castellano) with `LearningLanguage` (inglés).

---

### TC-12 — Minimal profile (name + level only)

> "Nuevo alumno, se llama Tomás. Nivel A2."

**Expected proposals:**
- Student (new): Name = "Tomás", CefrLevel = "A2"
- All other fields: null or default

**Isaac's note:** Tests graceful handling of sparse input. The system must not hallucinate a profession, country, or goals that were not mentioned. Partial profiles are common when a teacher creates a student record mid-onboarding call.

---

### TC-13 — Non-Romance L1, specific goals

> "Nuevo alumno: Yuki, japonés, vive en Barcelona, trabaja en diseño gráfico. Aprende español, nivel cero, quiere integrarse en el trabajo y hacer amigos."

**Expected proposals:**
- Student (new): Name = "Yuki", NativeLanguages = ["Japonés"], CountryOfResidence = "España", CityOfResidence = "Barcelona", Profession = "Diseñador/a gráfico/a", LearningLanguage = "Español", CefrLevel = "A1", ReasonForStudying = "Integración laboral y social"

**Isaac's note:** "Nivel cero" is genuine teacher language for A1 (complete beginner). Japanese L1 is pedagogically significant because the phonological and morphological distance from Spanish is maximal — the teacher should be aware the system captures this so future lessons can address specific Japanese L1 interference (particle-based grammar, no articles, pitch accent). `CefrLevel = "A1"` is the correct mapping for "nivel cero."

---

### TC-14 — Heritage speaker creating complications

> "Nueva alumna, Isabel, brasileña, habla portugués como lengua materna. Quiere mejorar el español porque lo habla de pequeña pero con muchos errores. Diría que está en un A2 alto, casi B1, pero con mucho vocabulario cruzado entre español y portugués."

**Expected proposals:**
- Student (new): Name = "Isabel", NativeLanguages = ["Portugués"], CountryOfOrigin = "Brasil", LearningLanguage = "Español", CefrLevel = "A2", TeachingNotes = "Hablante de herencia: interferencia léxica portugués-español, nivel A2 alto / casi B1"

**Isaac's note:** Heritage speakers require different treatment than zero-baseline learners. The "A2 alto / casi B1" signal should resolve to "A2" for `CefrLevel` (the teacher did not commit to B1) with the nuance captured in `TeachingNotes`. "Vocabulario cruzado" is portuñol interference — critical for the generation system to know when building vocabulary exercises.

---

## Group 4: Profile updates, not session-bound

### TC-15 — Adding interests

> "Añade a los intereses de Carmen que le encanta el flamenco y que es muy aficionada al cine de Almodóvar."

**Expected proposals:**
- Student: Interests += ["Flamenco", "Cine de Almodóvar"]
- No session or followup proposal

**Isaac's note:** Interests feed into content personalization — vocabulary exercises built around flamenco or film register will have higher engagement for Carmen. The extractor must append to the existing Interests array, not replace it.

---

### TC-16 — Adding a specific grammatical difficulty

> "Añade a las dificultades de Ana que confunde todavía el pretérito indefinido con el perfecto compuesto. Es una dificultad recurrente."

**Expected proposals:**
- Student: Difficulties += ["Indefinido vs. perfecto compuesto"]
- No session or followup proposal

**Isaac's note:** This is a classic difficulty for English and German L1 learners (whose L1 has only one past form). In Peninsular Spanish the aspectual distinction between indefinido and perfecto compuesto is highly salient; in Latin American Spanish it matters less. The system should store this for future lesson generation.

---

### TC-17 — Updating learning goals

> "Los objetivos de Marco han cambiado. Ya no necesita el español para los negocios en general, ahora tiene que preparar presentaciones en español para clientes alemanes. Actualiza sus objetivos."

**Expected proposals:**
- Student: LearningGoals = ["Presentaciones en español para clientes alemanes"]

**Isaac's note:** Business Spanish for presentations is a distinct register from general business Spanish. The system needs this for content generation to select appropriate formality and vocabulary domains (formal presentations, hedging language, data commentary phrases at the appropriate CEFR level).

---

### TC-18 — Teaching note, no profile field change

> "Añade una nota de enseñanza para Hans: aprende muy bien a través de la música. Usar letras de canciones en los ejercicios de comprensión auditiva le funciona muy bien."

**Expected proposals:**
- Student: TeachingNotes += "Aprende bien a través de la música. Usar letras de canciones en comprensión auditiva."
- No other proposals

**Isaac's note:** `TeachingNotes` is for the teacher's pedagogical observations, not the student's self-reported preferences. A note like this informs future content selection (listening sections with song lyrics rather than news reports) — exactly the kind of affective/learning style data Jordi flagged in his feedback.

---

## Group 5: Edge cases and stress tests

### TC-19 — Long rambling post-class voice note

> "Buf, hoy ha sido una clase larga. Hemos empezado con el repaso del vocabulario de la semana pasada, eso ha ido bien. Luego hemos pasado a los pronombres de objeto directo e indirecto, que siempre es un lío, y sí, se lió bastante sobre todo con la posición del pronombre cuando hay dos verbos, tipo quiero comprarlo versus lo quiero comprar. Ese orden no lo tiene claro. También intentamos hablar un poco de manera libre sobre sus vacaciones, y ahí el vocabulario era rico pero la pronunciación de la erre sigue siendo muy difícil para ella, ese sonido vibrante múltiple que no existe en su lengua. Los deberes que tenía los había hecho pero con bastantes errores en el subjuntivo, así que hemos repasado un poco eso también aunque no estaba en el plan. Para la próxima quiero preparar algo sobre los pronombres de objeto, algo visual, quizás una tabla o una actividad con tarjetas. Ah, y sube el nivel de conversación a B1 porque hoy ha demostrado que llega."

**Expected proposals:**
- SessionLog: TopicTags = ["pronombres OD/OI", "pronunciación", "subjuntivo", "vocabulario"], MentionedDifficultyPairs = [("pronombres OD/OI", "posición con dos verbos"), ("pronunciación", "vibrante múltiple /r/"), ("subjuntivo", "uso en deberes")], PreviousHomeworkStatus = DoneWithErrors, ActualContent = (summary)
- Student: SkillLevelOverrides.speaking = "B1"
- TeacherFollowup: Text = "Preparar actividad visual sobre pronombres OD/OI (tabla o tarjetas)", Kind = Teaching

**Isaac's note:** Real voice notes are not structured. The extractor must find signal in noise. "Dos verbos, tipo quiero comprarlo" — the difficulty is verb-cluster pronoun placement (clitic climbing), a B1 grammar point. "Vibrante múltiple" is the IPA [r], absent in many L1s including English, French, and Japanese. The subjuntivo repaso was unplanned — it should appear in the session log as a topic covered, not as a homework failure.

---

### TC-20 — STT transcription noise (realistic errors)

> "Oy hemos trabajao el condicional para pedir en restaurante. A ella le esta costandole el condicional de cortesía. Le e mandado los ejercicios del tema 8 para la semana ke viene. Y pon un todo para repasar el imperativo en dos semanas."

**Isaac's note:** STT for Spanish produces characteristic elisions: "trabajao" (trabajado), "ke" (que), "le e" (le he), "todo" (todo, but here it means "todo" as in task/todo). The pipeline must be robust to phonetic Spanish spelling and dropped syllables. "Oy" = hoy. "Pedir en restaurante" = petición de cortesía en contexto de restaurante (B1 sociolinguistic function). This test is intentionally degraded.

**Expected proposals:**
- SessionLog: TopicTags = ["condicional de cortesía"], MentionedDifficultyPairs = [("condicional", "condicional de cortesía")], HomeworkAssigned = "Ejercicios tema 8"
- TeacherFollowup: Text = "Repasar el imperativo", DueDate = ~2026-05-16 (two weeks from now), Kind = Teaching

---

### TC-21 — Negative instruction (do NOT extract a proposal)

> "Hoy solo hemos tenido tiempo de charlar un poco, no hemos dado nada nuevo. No hay nada que anotar."

**Expected proposals:** None.

**Isaac's note:** "No hay nada que anotar" must suppress all proposals. The LLM failure mode here is generating an empty session log update or a "general conversation" topic tag when the teacher explicitly said there is nothing to record. Silence is the correct answer.

---

### TC-22 — Mixed-language input (Spanish/English code-switching)

> "Hoy hemos done el pretérito imperfecto for background description. She's getting it pero still confunde cuándo usar imperfecto versus indefinido. I'll prepare something visual para la próxima clase."

**Isaac's note:** Teachers who are themselves bilingual (Jordi teaches at an academic level, may have had English-medium teacher training) will code-switch naturally in voice notes. The extractor must handle mixed-language input and extract content in the target language. The difficulty is the imperfecto/indefinido aspectual contrast — a B1 grammar benchmark.

**Expected proposals:**
- SessionLog: TopicTags = ["pretérito imperfecto"], MentionedDifficultyPairs = [("pasado", "imperfecto vs indefinido")]
- TeacherFollowup: Text = "Preparar material visual sobre imperfecto vs indefinido", Kind = Teaching

---

### TC-23 — Two students mentioned (only context student should update)

> "He hablado con Ana y con Carmen esta semana. Ana ha mejorado mucho, súbele el nivel a B2. Carmen sigue igual."

**Context:** The panel is open on Ana's student page.

**Expected proposals:**
- Student (Ana): CefrLevel = "B2"
- NO proposal for Carmen (she is not the context student)

**Isaac's note:** The context detection feature means the panel knows which student it is open for. If the teacher mentions another student incidentally, the system must not create proposals for the wrong student. This is a context-boundary test: Ana's update should be proposed; Carmen's "sigue igual" is noise.

---

### TC-24 — Exam prep signal

> "Le he dicho a Ricardo que si quiere presentarse al DELE B2 en noviembre tiene que empezar ya. Esta semana hemos visto cómo estructurar el texto argumentativo para la prueba escrita. Le cuesta el argumento de cierre. Añade un objetivo a corto plazo: preparar DELE B2 para noviembre."

**Expected proposals:**
- SessionLog: TopicTags = ["texto argumentativo", "DELE B2 prep"], MentionedDifficultyPairs = [("escritura", "argumento de cierre")]
- Student: ShortTermObjectives += "Preparar DELE B2 — examen noviembre 2026"
- TeacherFollowup: Text = "Seguir con preparación escrita DELE B2 — cierre argumental", Kind = Teaching

**Isaac's note:** Exam prep context activates different curriculum logic — the DELE B2 prueba escrita has specific task types (carta formal, texto argumentativo, informe) with defined rubrics. The "argumento de cierre" difficulty is real: many B2 candidates produce strong opening arguments but weak conclusions. `ShortTermObjectives` is the correct field, not `LearningGoals` (long-term) — the exam date makes this time-bounded.

---

### TC-25 — Session cancellation note

> "La clase de hoy con Ana se ha cancelado, ella estaba enferma. Marco el registro como cancelado."

**Expected proposals:**
- SessionLog: IsCancelled = true

**Isaac's note:** A cancelled session should update only the `IsCancelled` flag on the existing SessionLog. It must not generate topic tags, difficulty pairs, or student profile changes. Tests that the system does not fill in empty fields with defaults.

---

### TC-26 — Correction after apply (modify-in-place scenario)

The teacher has already applied a proposal that set `CefrLevel = "B1"`. Now they send a follow-up:

> "Espera, me he equivocado. El nivel no es B1, es B1.2."

**Expected proposal:**
- Student: CefrLevel = "B1.2" (correction, replacing the just-applied B1)

**Isaac's note:** This is the modify-in-place flow from issue #1010. The second message must be interpreted as a correction to the immediately preceding action, not as a new standalone update. The LLM must understand "me he equivocado" as referring to the last proposal, not as a fresh observation about the student.

---

## Group 6: New session creation (issue #1029)

These cases exercise the `newSession` proposal type. The teacher dictates a future (or past, or unspecified-date) session intent, and the assistant produces a single `New Session` card with an inline-editable date chip. The card writes to `POST /api/students/{studentId}/sessions` with `Title` and `SessionDate`. Reference date for all examples: **2026-05-02 (Saturday)**.

### TC-27 — Relative date, basic happy path

> "La semana que viene quiero hacer una sesión sobre el subjuntivo con Ana."

**Context:** Panel open on Ana's screen.

**Expected proposals:**
- New session: Title = "Subjuntivo", SessionDate = ~2026-05-09 (one week from reference) or first weekday of next week per resolution policy
- No other proposals

**Isaac's note:** "La semana que viene" is genuinely ambiguous in Spanish — it can mean "seven days from today" or "Monday of next week" depending on speaker convention. The backend must commit to one resolution and the date chip on the card lets the teacher correct it. The literal mention of "Ana" should be ignored as a redundancy (the context already resolves the student); it must NOT trigger a `newStudent` proposal.

---

### TC-28 — Specific weekday in target language

> "Programa una sesión para el lunes sobre los pronombres de objeto directo."

**Expected proposals:**
- New session: Title = "Pronombres de objeto directo", SessionDate = 2026-05-04 (next Monday from a Saturday reference)

**Isaac's note:** "El lunes" with no further qualifier conventionally means "the upcoming Monday." Resolution must use request-time as reference, not generation cutoff. Title length is fine (35 chars, well under 120). The grammar topic is a B1 benchmark — pronoun position with infinitive constructions is the typical sub-difficulty (see TC-19).

---

### TC-29 — No date mentioned, default to today

> "Crea una sesión sobre el uso del imperativo en órdenes y peticiones."

**Expected proposals:**
- New session: Title = "Imperativo: órdenes y peticiones", SessionDate = 2026-05-02 (today, labeled as a suggestion on the card)

**Isaac's note:** Per the issue, "no date mentioned: card defaults to today's date, clearly labeled as a suggestion the teacher can change." The title is a real B1 sociolinguistic function pairing — imperatives differ formally between commands (tú/usted morphology) and softened requests (often replaced by present tense or condicional). The system must NOT silently pick a future date; it must surface today as an editable suggestion.

---

### TC-30 — Past date (recovering a forgotten session)

> "Apunta una sesión del lunes pasado sobre los conectores de contraste, que se me olvidó registrarla en su momento."

**Expected proposals:**
- New session: Title = "Conectores de contraste", SessionDate = 2026-04-27 (previous Monday)

**Isaac's note:** Past dates are explicitly valid per the acceptance criteria. This is a real teacher need: voice notes are sometimes retrospective ("I forgot to log Thursday's session"). "Conectores de contraste" (sin embargo, no obstante, aunque, a pesar de que) is a B2.1 topic for argumentative writing. The system must not interpret "del lunes pasado" as the upcoming Monday — past resolution is critical here.

---

### TC-31 — No student context (Apply must be disabled)

> "Programa una sesión sobre el estilo indirecto para la próxima semana."

**Context:** Panel opened from Dashboard. No student in scope.

**Expected proposals:**
- New session card appears with Title = "Estilo indirecto", SessionDate = ~2026-05-09, but Apply is **disabled** with the inline message "Open from a student's screen to schedule a session."

**Isaac's note:** Critical negative-path test. The acceptance criteria state Apply must be disabled (not silently failing, not inventing a student). The card must still render so the teacher sees their input was understood — they just need to navigate to a student first. This is the boundary between "intent extracted" and "intent applicable."

---

### TC-32 — Combined: post-class reflection AND new session in one utterance

> "Hoy hemos visto el contraste imperfecto-indefinido y le ha costado bastante. Programa para el jueves una sesión de refuerzo del mismo tema con ejercicios contrastivos."

**Context:** Panel open on a student's session log for today's confirmed session.

**Expected proposals (three cards):**
- Session update (existing today's session): TopicTags = ["imperfecto vs indefinido"], MentionedDifficultyPairs = [("pasado", "imperfecto vs indefinido")]
- New session: Title = "Refuerzo: imperfecto vs indefinido (ejercicios contrastivos)", SessionDate = 2026-05-07 (next Thursday)
- No teaching todo (the reinforcement is a scheduled session, not a free-floating reminder — these would be redundant)

**Isaac's note:** This is the highest-value case in the new group. It tests that the assistant correctly distinguishes "what just happened" (session update on today's existing log) from "what the teacher wants scheduled" (newSession for Thursday). A common LLM failure mode is to generate either both as session updates or both as new sessions, or to also produce a TeacherFollowup that duplicates the newSession content. The pedagogically correct decomposition: a difficulty observed → logged on today's session; a planned remediation → scheduled as a future session. They are distinct entities.

---

## Appendix: CEFR level strings the system should recognise

The following are all valid `CefrLevel` values in this codebase. The extractor should map natural teacher language to these strings.

| Teacher says | CefrLevel value |
|---|---|
| "A1", "nivel cero", "principiante" | `A1` |
| "A1.1" | `A1.1` |
| "A1.2" | `A1.2` |
| "A2", "básico" | `A2` |
| "A2.1" | `A2.1` |
| "A2.2", "A2 alto" | `A2.2` |
| "B1", "umbral" | `B1` |
| "B1.1" | `B1.1` |
| "B1.2", "B1 alto" | `B1.2` |
| "B2", "avanzado" | `B2` |
| "B2.1" | `B2.1` |
| "B2.2", "B2 alto" | `B2.2` |
| "C1", "dominio operativo eficaz" | `C1` |
| "C1.1" | `C1.1` |
| "C1.2", "C1 alto" | `C1.2` |
| "C2", "maestría", "nativo nivel" | `C2` |

---

## Appendix: SkillLevelOverrides key names

| Teacher says | JSON key |
|---|---|
| "nivel de lectura", "reading" | `reading` |
| "nivel de escritura", "writing" | `writing` |
| "nivel de conversación", "speaking", "habla" | `speaking` |
| "comprensión auditiva", "listening" | `listening` |

---

*Generated 2026-05-02 by Isaac (ELE pedagogy advisor). Not a task plan — tracked document.*
