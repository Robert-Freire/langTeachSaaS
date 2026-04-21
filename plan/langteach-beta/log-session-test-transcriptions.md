# Log Session — Test Transcriptions

Test data for the "Log Session" feature (new and edit modes).
All texts are in Spanish, as required by the platform.

---

## Field Mapping Reference

The AI extraction (`/api/students/{id}/sessions/extract`) returns an `ExtractedReflectionDto` which maps to `SessionLog` fields as follows:

| Extraction field | SessionLog field | Notes |
|---|---|---|
| `whatWasCovered` | `actualContent` | |
| `areasToImprove` + `emotionalSignals` | `generalNotes` | Concatenated with `\n` |
| `homeworkAssigned` | `homeworkAssigned` | |
| `nextLessonIdeas` | `nextSessionTopics` | |
| `sessionTitle` | `title` | Truncated to 120 chars |
| `topicTags[]` | `topicTags` | Stored as JSON |
| `suggestedDifficulties[]` | `suggestedDifficulties` | Also upserted into student `difficulties` on save |
| `difficultiesWorkedOn[]` | `mentionedDifficultyPairs` | Cross-referenced against existing student difficulties |
| `durationMinutes` | `duration` | Integer, minutes |
| `sessionDate` | `sessionDate` | ISO date string |
| `isCancelled` | `isCancelled` | Boolean |
| `previousHomeworkStatus` | `previousHomeworkStatus` | Enum: NotApplicable / Completed / Partial / NotDone |
| `levelReassessment` | `levelReassessmentSkill` + `levelReassessmentLevel` | Skill = "General"; level = CEFR sublevel |
| `teachingTodos[]` | (separate TeachingTodo entities) | Not stored on SessionLog |
| `teacherFollowups[]` | (separate TeacherFollowup entities) | Not stored on SessionLog |

---

## Test Scenarios

---

### 1. Corta y limpia (caso base)

**Text:**
> La sesión de hoy con Ana fue bien. Repasamos el pretérito perfecto compuesto y por fin está empezando a distinguirlo del indefinido. Trabajamos vocabulario de viajes. Estuvo atenta durante toda la clase. Sin problemas destacables.

**Expected field values:**

| Field | Expected value |
|---|---|
| `actualContent` | "Repasamos el pretérito perfecto compuesto y su diferencia con el indefinido. Vocabulario de viajes." |
| `generalNotes` | "Atenta durante toda la clase. Sin problemas destacables." |
| `homeworkAssigned` | null |
| `nextSessionTopics` | null |
| `title` | "Pretérito perfecto compuesto y vocabulario de viajes" |
| `topicTags` | [{tag: "pretérito perfecto"}, {tag: "pretérito indefinido"}, {tag: "vocabulario de viajes"}] |
| `suggestedDifficulties` | [] |
| `duration` | null |
| `isCancelled` | false |
| `previousHomeworkStatus` | null |

**What to verify:** Minimal extraction -- only content and emotional signal. No difficulties, no homework, no next-session plan.

---

### 2. Media con señales emocionales

**Text:**
> Clase con Marco hoy. Hicimos el juego de rol en el restaurante que tenía preparado. Le encantó, se rió bastante con la escena del pedido. Pero cuando pasamos al ejercicio de escritura de la reseña se le notó el cansancio y lo hizo deprisa. Creo que la producción escrita le cuesta más que hablar. Para la próxima sesión quiero empezar con algo más dinámico antes de pedirle que escriba.

**Expected field values:**

| Field | Expected value |
|---|---|
| `actualContent` | "Juego de rol en el restaurante; ejercicio de escritura de reseña." |
| `generalNotes` | "Le costó el ejercicio escrito, lo hizo deprisa.\nDisfrutó mucho el juego de rol (se rió). La producción escrita le cuesta más que la oral." |
| `homeworkAssigned` | null |
| `nextSessionTopics` | "Empezar con actividad dinámica antes de la producción escrita." |
| `title` | "Juego de rol: restaurante" |
| `topicTags` | [{tag: "juego de rol"}, {tag: "restaurante"}, {tag: "producción escrita"}] |
| `suggestedDifficulties` | [{description: "Producción escrita: cansa más rápido que la oral", competency: "Writing", subcategory: "", severity: "low"}] (possible) |
| `duration` | null |

**What to verify:** Emotional signals are present. `generalNotes` must contain BOTH the areas-to-improve and the emotional observation. The next-session idea is captured.

---

### 3. Debilidades gramaticales concretas

**Text:**
> Sesión con Sophie. Sigue confundiendo ser y estar de forma sistemática, hoy apareció tres veces en el mismo ejercicio y solo se autocorrigió una vez. También tiene problemas con los verbos reflexivos, se le olvida el pronombre en mitad de la frase. La comprensión auditiva fue bien, entendió el audio sin dificultad. Creo que necesitamos al menos dos sesiones más dedicadas a ser y estar antes de avanzar.

**Expected field values:**

| Field | Expected value |
|---|---|
| `actualContent` | "Ejercicios con ser y estar; verbos reflexivos; comprensión auditiva." |
| `generalNotes` | "Confusión sistemática de ser/estar (3 veces, 1 autocorrección). Omite el pronombre reflexivo." |
| `homeworkAssigned` | null |
| `nextSessionTopics` | "Al menos dos sesiones más dedicadas a ser y estar antes de avanzar." |
| `title` | "Ser vs estar, verbos reflexivos" |
| `topicTags` | [{tag: "ser y estar"}, {tag: "verbos reflexivos"}, {tag: "comprensión auditiva"}] |
| `suggestedDifficulties` | [{description: "Confunde ser y estar sistemáticamente", competency: "Grammar", subcategory: "ser/estar", severity: "medium"}, {description: "Omite el pronombre reflexivo", competency: "Grammar", subcategory: "verbos reflexivos", severity: "low"}] |
| `duration` | null |

**What to verify:** Two distinct difficulties are extracted with correct competency ("Grammar") and different severities. This is the primary scenario for verifying the difficulty extraction pipeline.

---

### 4. Larga y detallada

**Text:**
> Sesión con Ricardo, martes por la tarde. Teníamos mucho que ver. Empezamos con el calentamiento hablando del fin de semana, su español fue bastante fluido, ya se maneja bien en registro informal. Luego entramos en la presentación gramatical del subjuntivo presente, primera exposición, así que lo mantuve ligero: solo las formas y dos usos, la duda y la emoción. Entendió la formación bien pero cuando le pedí que produjera frases de forma espontánea se bloqueó un poco. Es normal en el primer contacto con el subjuntivo. El texto de lectura que preparé funcionó bien, lo leyó con solo dos preguntas de vocabulario, y las dos palabras estaban por encima de su nivel así que es esperable. Nos quedamos sin tiempo para el ejercicio de producción final, quiero hacerlo en la próxima sesión como actividad de apertura. La pronunciación de la jota está mejorando, me di cuenta de que ya se autocorrige conscientemente, buena señal. En general sesión productiva, se fue contento. Oh, también me comentó que su mujer está estudiando italiano y a veces mezcla palabras de los dos idiomas, algo a tener en cuenta.

**Expected field values:**

| Field | Expected value |
|---|---|
| `actualContent` | "Calentamiento (conversación informal). Presentación del subjuntivo presente: formación y dos usos (duda/emoción). Lectura con vocabulario." |
| `generalNotes` | "Producción espontánea del subjuntivo bloqueada (esperado en primera exposición). Pronunciación de la jota mejorando, autocorrección consciente.\nSesión productiva, se fue contento." |
| `homeworkAssigned` | null |
| `nextSessionTopics` | "Ejercicio de producción del subjuntivo como apertura. Vigilar interferencia italiano/español." |
| `title` | "Presentación del subjuntivo presente" |
| `topicTags` | [{tag: "subjuntivo"}, {tag: "lectura"}, {tag: "pronunciación"}, {tag: "conversación"}] |
| `suggestedDifficulties` | [{description: "Producción espontánea del subjuntivo (primera exposición)", competency: "Grammar", subcategory: "subjuntivo", severity: "low"}] |
| `teacherFollowups` | ["Atender posible interferencia del italiano en vocabulario"] |
| `duration` | null |

**What to verify:** Long rambling note is summarized coherently. Difficulty extraction is nuanced (severity "low" because it is first exposure). Teacher followup entity is created from the Italian interference note.

---

### 5. Preparación de examen

**Text:**
> Sesión de preparación del DELE con Nadia. Hicimos una prueba de comprensión lectora completa cronometrada de un examen oficial de B2. Terminó con cuatro minutos de sobra, bien. Cometió dos errores en el ejercicio de reconstrucción de texto, los dos en el tercer párrafo donde el vocabulario era más denso. La prueba de comprensión auditiva fue peor de lo esperado, el hablante de registro formal le resultó difícil. Creo que su punto débil es el registro formal y académico tanto en escucha como en lectura. Quedan seis semanas para el examen. Voy a reestructurar las próximas tres sesiones en torno a la exposición al registro formal. No hay lagunas gramaticales, es puramente léxico y de registro.

**Expected field values:**

| Field | Expected value |
|---|---|
| `actualContent` | "Simulacro DELE B2: comprensión lectora cronometrada y comprensión auditiva." |
| `generalNotes` | "2 errores en reconstrucción (vocabulario denso párrafo 3). Dificultad con hablante de registro formal en auditiva. Punto débil: registro formal/académico en lectura y escucha." |
| `homeworkAssigned` | null |
| `nextSessionTopics` | "3 sesiones de exposición al registro formal y académico. Examen en 6 semanas." |
| `title` | "Simulacro DELE B2 - comprensión lectora y auditiva" |
| `topicTags` | [{tag: "DELE B2"}, {tag: "comprensión lectora"}, {tag: "comprensión auditiva"}, {tag: "registro formal"}] |
| `suggestedDifficulties` | [{description: "Vocabulario académico en comprensión lectora", competency: "Reading", subcategory: "vocabulario académico", severity: "medium"}, {description: "Registro formal en comprensión auditiva", competency: "Listening", subcategory: "registro formal", severity: "medium"}] |
| `duration` | null |

**What to verify:** Two difficulties with different competencies (Reading vs Listening). Exam prep context is captured. Topic tags include exam name.

---

### 6. Natural y desestructurada

**Text:**
> Bueno, Hans hoy... fue bien, más o menos. Estuvimos repasando el pretérito indefinido porque la semana pasada tuvo problemas, y la verdad es que todavía no tiene claro los irregulares. O sea, hizo, dijo, puso, los sigue regularizando. La parte de conversación fue bien, habla mucho que es bueno pero a veces va demasiado rápido y comete más errores. Le dije que fuera más despacio. Ah, y me contó que va a Barcelona el mes que viene, igual puedo preparar algo sobre eso, se le notó emocionado. La sesión fue un poco corta porque tuvo una llamada, hicimos unos cuarenta minutos. Ya recuperamos la semana que viene.

**Expected field values:**

| Field | Expected value |
|---|---|
| `actualContent` | "Repaso del pretérito indefinido (irregulares). Conversación." |
| `generalNotes` | "Sigue regularizando irregulares (hizo, dijo, puso). Habla demasiado rápido bajo presión.\nEmocionado por viaje a Barcelona." |
| `homeworkAssigned` | null |
| `nextSessionTopics` | "Recuperar tiempo de sesión. Posible contenido sobre Barcelona." |
| `title` | "Pretérito indefinido irregular" |
| `topicTags` | [{tag: "pretérito indefinido"}, {tag: "irregulares"}, {tag: "conversación"}] |
| `suggestedDifficulties` | [{description: "Regulariza pretéritos irregulares (hizo, dijo, puso)", competency: "Grammar", subcategory: "pretérito indefinido", severity: "medium"}] |
| `teacherFollowups` | ["Preparar contenido sobre Barcelona para próxima sesión"] |
| `duration` | 40 |

**What to verify:** `duration` is extracted (40 minutes -- stated explicitly). Teacher followup created from the Barcelona observation. Rambling style is normalized.

---

### 7. Sesión difícil con alumno desmotivado

**Text:**
> La sesión con Carmen no fue bien hoy. Llegó tarde, sin hacer los deberes, y se notó que no tenía ganas. Intenté hacer la actividad de vocabulario de emociones pero apenas participó. Cuando le pregunté si pasaba algo dijo que no, pero la energía era muy baja. Gramaticalmente no detecté errores nuevos pero tampoco produjimos mucho. Creo que hay que hablar con ella antes de la próxima sesión para entender qué está pasando. No tiene sentido preparar material si no está en disposición de trabajar.

**Expected field values:**

| Field | Expected value |
|---|---|
| `actualContent` | "Intento de actividad de vocabulario de emociones." |
| `generalNotes` | "No tiene sentido preparar material si no está en disposición de trabajar.\nLlegó tarde, sin deberes, sin energía. Apenas participó." |
| `homeworkAssigned` | null |
| `nextSessionTopics` | null |
| `title` | "Sesión difícil - vocabulario de emociones" |
| `topicTags` | [{tag: "vocabulario de emociones"}] |
| `suggestedDifficulties` | [] |
| `previousHomeworkStatus` | "NotDone" |
| `teacherFollowups` | ["Hablar con Carmen antes de la próxima sesión para entender qué está pasando"] |

**What to verify:** `previousHomeworkStatus` = "NotDone" (deberes no hechos). No difficulties despite low output. Negative affect captured in `generalNotes`. Teacher followup created.

---

### 8. Modo edición -- corrección de sesión anterior (Sophie)

**Text:**
> Quiero corregir lo que dije antes sobre Sophie. Mirando mis notas, la confusión de ser y estar apareció cuatro veces, no tres, y no se autocorrigió ninguna, estaba pensando en la sesión de la semana pasada. Además me olvidé de mencionar que tuvo problemas con el acento gráfico en la primera persona del singular del indefinido, escribía hable en lugar de hablé de forma consistente. Eso es importante para el plan de la próxima sesión.

**Expected field values (delta from original scenario 3):**

| Field | Expected value | Change from scenario 3 |
|---|---|---|
| `actualContent` | (unchanged or empty -- no new content described) | May be null |
| `generalNotes` | "Confusión ser/estar: 4 veces, sin autocorrección. Acento gráfico en indefinido: escribe 'hable' en lugar de 'hablé' de forma consistente." | Updated count, no autocorrection |
| `nextSessionTopics` | "Incluir acento gráfico en primera persona del indefinido en próxima sesión." | New item added |
| `suggestedDifficulties` | [{description: "Confunde ser y estar (4 errores, sin autocorrección)", competency: "Grammar", subcategory: "ser/estar", severity: "medium"}, {description: "Omite acento gráfico en 1ª persona del indefinido (hable → hablé)", competency: "Writing", subcategory: "ortografía", severity: "low"}] | Count corrected, new difficulty added |

**What to verify:** Edit mode must REPLACE existing values, not append. The `suggestedDifficulties` from the correction should overwrite the previous ones (full-replace semantics per `UpdateSessionLogRequest`). Verify the count correction is preserved ("4 veces, sin autocorrección").

---

## Summary Coverage Table

| # | Texto | `actualContent` | `generalNotes` | `homeworkAssigned` | `nextSessionTopics` | `suggestedDifficulties` | `duration` | `topicTags` | `previousHomeworkStatus` | `teacherFollowups` | `isCancelled` |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Corta | si | si (emocional) | no | no | 0 | no | si | no | no | no |
| 2 | Emocional | si | si (areas+emocion) | no | si | 0-1 | no | si | no | no | no |
| 3 | Debilidades | si | si | no | si | **2** | no | si | no | no | no |
| 4 | Larga | si | si | no | si | 1 | no | si | no | **si** | no |
| 5 | Examen | si | si | no | si | **2 competencias distintas** | no | si | no | no | no |
| 6 | Desestructurada | si | si | no | si | 1 | **40** | si | no | si | no |
| 7 | Difícil | si | si | no | no | 0 | no | si | **NotDone** | si | no |
| 8 | Edición | null/parcial | si (correccion) | no | si | 2 (actualizado) | no | no | no | no | no |
