# Student Profile — Field Guide

> **Audience:** Robert, Jordi, Isaac.
> **Purpose:** One page per concept. What the field is, why it exists, what belongs in it, what doesn't. Use this to align before backend prep and to share with Jordi for a sanity check before we code the UI.
>
> **Format:** English field names (they map to the database). Explanations and examples in Spanish, the language Jordi thinks in.
>
> **Grounding:** Derived from Jordi feedback rounds 12, 13 and 14 (`plan/langteach-beta/dashboard-redesign-isaac-notes.md`, `requeriments.txt`, and the voice notes of 2026-04-09). Model shape confirmed by Sophy.
>
> **What is NOT here:** Nothing about the UI. No decisions about where a field appears on screen, how it's edited, or what the overview page looks like. This document is only about *what data we capture and why*. Layout comes next.

---

## Cómo leer esta guía

Cada campo tiene cinco líneas:

- **Qué es** — una frase. La definición como se la darías a otro profesor.
- **Por qué está aquí** — la razón pedagógica o de negocio. Si no podemos justificarla, el campo sobra.
- **Ejemplos** — dos o tres, con alumnos reales o semilla (Ana Seed, Marco Seed, Henk el capitán holandés, Lucia la de DELE B2).
- **No sirve para** — lo que parece que podría guardar aquí y que en realidad tiene otro sitio. Esto es lo que evita que el campo se contamine.
- **Quién lo ve** — de momento, siempre el profesor. Lo dejamos escrito para cuando exista el portal del alumno.

---

## Sección 1 — Quién es el alumno

Bloque de identidad. Lo que le diría al profesor sustituto en 30 segundos para que la primera clase no sea un despropósito.

### Name
- **Qué es:** El nombre con el que te refieres al alumno en clase.
- **Por qué está aquí:** Para llamarle por su nombre. Obvio, pero es el anclaje de todo lo demás.
- **Ejemplos:** "Ana", "Marco", "Henk", "Lucia Fernández".
- **No sirve para:** Datos de facturación. Si necesitas el nombre legal completo, eso viene en Fase 2 con la facturación.
- **Quién lo ve:** Profesor. (Futuro: el propio alumno en el portal.)

### BirthYear
- **Qué es:** Año de nacimiento. Cuatro dígitos.
- **Por qué está aquí:** Porque "este alumno tiene 45 años y es ingeniero" y "este alumno tiene 16 años y estudia bachillerato" no se preparan igual. La edad condiciona tono, materiales, referencias culturales y ritmo.
- **Ejemplos:** `1979` para Henk, `2009` para un adolescente de secundaria.
- **No sirve para:** Guardar "edad" como número. La edad se calcula a partir del año, no se escribe a mano. Así no tienes que tocar el campo cada cumpleaños.
- **Quién lo ve:** Profesor.

### Profession
- **Qué es:** A qué se dedica. Una frase corta.
- **Por qué está aquí:** Es el anclaje de la personalización. Un capitán de barco holandés necesita vocabulario de puerto, meteorología y radio. Un abogado necesita registro formal y conectores escritos. Un jubilado que viaja necesita Spanish para restaurantes y aeropuertos. No es el mismo curso.
- **Ejemplos:** "Capitán de barco mercante", "Abogada corporativa", "Jubilado", "Estudiante de bachillerato", "Desarrolladora de software".
- **No sirve para:** Historia laboral ("trabajó 10 años en...", eso va en `PersonalNotes`). Tampoco para "empresa en la que trabaja" (eso es otra cosa, y hoy no lo necesitamos).
- **Quién lo ve:** Profesor. Alimenta prompts de generación.

### CountryOfOrigin
- **Qué es:** El país del que viene el alumno. Texto libre.
- **Por qué está aquí:** Porque la cultura de origen informa las referencias que entenderá y las que no, y porque los patrones de interferencia del L1 dependen en parte del país (portugués de Brasil vs portugués de Portugal).
- **Ejemplos:** "Países Bajos", "Brasil", "Italia", "China".
- **No sirve para:** Nacionalidad legal ni pasaporte. Es el país al que el alumno "siente" que pertenece culturalmente. Si hay conflicto, preguntas.
- **Quién lo ve:** Profesor.

### CityOfOrigin
- **Qué es:** Ciudad o región de origen, si la sabes. Texto libre.
- **Por qué está aquí:** Pequeño pero útil. "Es de Nápoles" vs "es de Milán" cambia el tipo de referencias. Con alumnos de España importa más: Andalucía, Cataluña, País Vasco marcan conversaciones distintas.
- **Ejemplos:** "Róterdam", "São Paulo", "Nápoles".
- **No sirve para:** Lugar de residencia actual (eso está más abajo). Un holandés nacido en Róterdam que vive en Barcelona tiene las dos cosas.
- **Quién lo ve:** Profesor.

### CountryOfResidence
- **Qué es:** País donde vive actualmente el alumno.
- **Por qué está aquí:** Por dos razones. Una: el contexto inmersivo importa. Un alumno holandés que vive en España tiene práctica diaria fuera de clase; un alumno holandés que vive en Holanda no. El ritmo del curso cambia. Dos: zona horaria para clases online (implícito, no lo usamos todavía).
- **Ejemplos:** "España", "Países Bajos", "Reino Unido".
- **No sirve para:** Dirección postal. No estamos haciendo facturación ni envíos.
- **Quién lo ve:** Profesor.

### CityOfResidence
- **Qué es:** Ciudad donde vive. Texto libre.
- **Por qué está aquí:** Útil cuando hay varios alumnos en la misma ciudad (referencias locales compartidas), y crítico cuando el alumno vive en España (permite materiales con ubicación real: "imagínate que vas al mercado de la Boquería").
- **Ejemplos:** "Barcelona", "Madrid", "Róterdam".
- **No sirve para:** Dirección postal.
- **Quién lo ve:** Profesor.

### NativeLanguages (plural)
- **Qué es:** Lista de los idiomas maternos del alumno. Puede ser uno, puede ser dos.
- **Por qué está aquí:** Porque los patrones de interferencia del L1 son la base de la personalización. Un italiano que aprende español confunde cosas distintas que un alemán. Y porque hay muchos alumnos bilingües de nacimiento (neerlandés + frisón, catalán + español, francés + árabe). Guardar solo uno pierde información que el profesor usa de cabeza.
- **Ejemplos:**
  - Henk: `["Neerlandés"]`
  - Ana Seed: `["Portugués"]`
  - Alumno catalán bilingüe: `["Catalán", "Español"]`
- **No sirve para:** Idiomas que aprendió de mayor en el colegio. Eso va en `SpokenLanguages`.
- **Quién lo ve:** Profesor. Alimenta prompts de generación.

### SpokenLanguages
- **Qué es:** Otros idiomas que el alumno habla, aparte de los maternos y aparte del que está aprendiendo contigo. Lista.
- **Por qué está aquí:** Porque un alumno que ya habla tres idiomas aborda el cuarto con herramientas distintas a uno monolingüe. Puedes tirar de cognados, hacer comparaciones ("esto en inglés se dice así, ¿no?"), y asumir metalenguaje gramatical.
- **Ejemplos:**
  - Henk: `["Inglés", "Francés"]`
  - Ana Seed (portuguesa aprendiendo inglés): `["Español"]`
- **No sirve para:** Nivel de dominio de cada idioma. De momento es una lista plana. Si hace falta "inglés B2, francés A1", lo añadimos más tarde.
- **Quién lo ve:** Profesor. Alimenta prompts de generación.

### ReasonForStudying
- **Qué es:** Por qué este alumno está aprendiendo español. Una o dos frases, en tus palabras.
- **Por qué está aquí:** Es el ancla del curso. Un alumno que aprende "para poder pedir una cerveza cuando visita Barcelona" no necesita el mismo programa que uno que aprende "para presentar informes a su jefe español". Cuando tengas que decidir entre dos materiales, vuelves aquí.
- **Ejemplos:**
  - Henk: "Se jubila en 2 años y quiere vivir parte del año en Alicante. Necesita español para el día a día, no para trabajar."
  - Lucia: "Quiere sacar el DELE B2 para homologar su título en España. Motivada, ritmo alto."
  - Un ejecutivo: "Su empresa le ha puesto español como objetivo del año. Poco tiempo, poca motivación propia, cumple por trabajo."
- **No sirve para:** Objetivos a corto plazo ("el examen es en 3 semanas", eso va en `ShortTermObjective`) ni objetivos de aprendizaje concretos ("dominar el subjuntivo", eso va en `LearningGoals`).
- **Quién lo ve:** Profesor. Alimenta prompts de generación.

### PersonalNotes
- **Qué es:** Lo que necesitas saber del alumno como persona. Texto libre. El campo "para que no metas la pata en la siguiente clase".
- **Por qué está aquí:** Porque hoy el campo `Notes` se usa para mezclar cosas de la persona ("es autoconsciente con la pronunciación, ir suave", "tiene dos hijos pequeños, evitar clases muy tarde") con cosas del aprendizaje ("confunde ser y estar"), y eso lo hace inútil. Separándolo, cada tipo de información tiene su sitio y se puede leer sin ruido.
- **Ejemplos:**
  - "Tiene dos hijos pequeños. A veces hay ruido de fondo, no es desatención."
  - "Problemas de vista, usa fuente grande. Evitar PDFs densos."
  - "Es autoconsciente con la pronunciación. Ir suave con las correcciones orales."
  - "Se jubila pronto y está emocionalmente sensible por el cambio. Las clases son también un espacio social."
- **No sirve para:** Observaciones pedagógicas ("le cuesta el subjuntivo", eso va en `Difficulties`) ni cosas que hay que trabajar ("tengo que explicar ser/estar", eso va en `TeachingTodos`).
- **Quién lo ve:** Solo el profesor. Es información sensible.

---

## Sección 2 — Su nivel

El anclaje pedagógico. Dónde está hoy, dónde está en papel, y dónde desviamos la norma.

### LearningLanguage
- **Qué es:** El idioma que el alumno está aprendiendo contigo.
- **Por qué está aquí:** Porque LangTeach soporta varios idiomas meta (español, inglés, otros), y toda la generación de contenido depende de saberlo.
- **Ejemplos:** "Spanish", "English".
- **No sirve para:** El idioma del profesor ni el del alumno. Solo el idioma meta.
- **Quién lo ve:** Profesor.

### CefrLevel (nivel del profesor)
- **Qué es:** El nivel del MCER que tú, el profesor, crees que tiene el alumno realmente. A1, A2, B1, B2, C1, C2.
- **Por qué está aquí:** Porque es la referencia que usas a diario para decidir materiales, vocabulario y estructuras. Es **tu** juicio, no el de un examen. Puede ser distinto del nivel oficial.
- **Ejemplos:**
  - Lucia: `B2` (tú crees que está en B2 sólido)
  - Henk: `A2` (lleva 6 meses, es honesto A2)
- **No sirve para:** El resultado de un examen oficial. Eso es `OfficialCefrLevel`.
- **Quién lo ve:** Profesor. Es la base de toda la generación de contenido y de los prompts.

### OfficialCefrLevel (nivel oficial)
- **Qué es:** El nivel MCER según el último examen o test reconocido que el alumno ha hecho. Nullable (la mayoría de alumnos no lo tendrán).
- **Por qué está aquí:** Porque Jordi repite que "Preply dice A2 pero yo creo que es B1" (round 12). La plataforma de origen, o un DELE, o un test de colocación dan un número. Ese número existe y el profesor lo quiere ver, pero no es el que guía la clase. Es útil para tres cosas: (1) recordarle al alumno de dónde partía, (2) justificar ante el alumno por qué trabajan cosas de un nivel determinado, (3) detectar desalineación (si oficial dice A2 y tú dices B1, es información).
- **Ejemplos:**
  - Lucia: `B1` (viene con un certificado B1 del año pasado, pero hoy está en B2)
  - Henk: `null` (nunca se ha examinado)
  - Un alumno nuevo de Preply: `A2` (lo dice la plataforma)
- **No sirve para:** Sustituir al `CefrLevel` del profesor. La generación de materiales sigue guiándose por `CefrLevel`, no por este campo.
- **Quién lo ve:** Profesor. (Futuro: el alumno, como prueba de su progreso oficial.)

### SkillLevelOverrides
- **Qué es:** Excepciones por destreza. Si el `CefrLevel` general es B1 pero el alumno comprende como B2 y escribe como A2, aquí lo marcas.
- **Por qué está aquí:** Porque el MCER global es una media que oculta diferencias reales. Los alumnos con años de exposición pasiva (series, lectura) comprenden mucho más de lo que producen. Los alumnos migrantes hablan mejor de lo que escriben. Un número global miente.
- **Ejemplos:**
  - Alumna brasileña viviendo en España: `{ reading: "B2", writing: "A2" }` sobre una base B1.
  - Alumno de Preply muy técnico: `{ listening: "B2", speaking: "A2" }` sobre una base B1.
- **No sirve para:** Trackear progreso en el tiempo. Esto es una foto del desalineamiento actual, no un historial.
- **Quién lo ve:** Profesor. Alimenta prompts de generación por destreza.

### Difficulties
- **Qué es:** Lista estructurada de las dificultades concretas del alumno. Cada entrada tiene competencia (gramática, léxico, pronunciación...), subcategoría (ser/estar, pretéritos, la /r/...), severidad, tendencia y estado.
- **Por qué está aquí:** Porque "le cuesta el subjuntivo" es demasiado vago para hacer nada útil con ello. Estructurando las dificultades podemos decirle al alumno dónde mejora, generar ejercicios específicos, y saber cuándo una dificultad ya está "cubierta" (trabajada en clase, no necesariamente dominada).
- **Ejemplos:**
  - `{ competency: "grammar", subcategory: "ser/estar", severity: "alta", trend: "stable", status: "working" }`
  - `{ competency: "pronunciation", subcategory: "/r/ múltiple", severity: "media", trend: "improving", status: "working" }`
  - `{ competency: "lexicon", subcategory: "conectores formales", severity: "baja", trend: "stable", status: "covered" }`
- **No sirve para:** Temas sueltos que quieres trabajar ("tengo que explicarle el uso del pretérito en narraciones"). Eso es un `TeachingTodo`. La diferencia: un `Difficulty` es algo que al alumno le CUESTA; un `TeachingTodo` es algo que tú quieres trabajar con él, le cueste o no.
- **Quién lo ve:** Profesor. (Futuro: versión simplificada visible al alumno como "áreas de mejora".)

---

## Sección 3 — El plan

Lo que queremos conseguir con este alumno y lo que tenemos pendiente de trabajar con él.

### LearningGoals
- **Qué es:** Los objetivos de aprendizaje del alumno. Lista editable. En esta primera versión es una lista plana; más adelante podrá ser jerárquica (Sophy ha recomendado no meter el árbol todavía).
- **Por qué está aquí:** Porque los objetivos dirigen el curso. "Poder mantener una conversación informal de 10 minutos sin rebloquearse" es un objetivo operativo. "Aprender español" no es un objetivo, es un deseo.
- **Ejemplos:**
  - Lucia (DELE B2): "Dominar el subjuntivo en oraciones subordinadas", "Redactar una carta formal de 200 palabras sin errores", "Defender una opinión en oral con conectores C1".
  - Henk: "Pedir comida en un restaurante sin ayuda", "Entender el parte meteorológico en la radio", "Mantener conversación básica con vecinos en Alicante".
- **No sirve para:** Dificultades concretas ("ser/estar", eso es `Difficulties`), ni tareas a corto plazo que hay que recordar hacer ("mandarle el artículo sobre la huerta", eso es `TeachingTodos`), ni el objetivo puntual con fecha ("aprobar el DELE en junio", eso es `ShortTermObjective`).
- **Quién lo ve:** Profesor. (Futuro: visible al alumno como "tu plan".)
- **Nota para Jordi:** "No se pueden editar" se arregla aquí: en esta sprint la lista pasa a ser editable. Que sea un árbol (categoría → sub-objetivos) lo dejamos para después, cuando veamos cómo la usas de verdad.

### ShortTermObjectives (lista)
- **Qué es:** Lista de objetivos con fecha que aprietan. No son objetivos de aprendizaje abstractos, son compromisos temporales. Puede haber uno, dos, o ninguno. Cada entrada tiene un texto corto y una fecha opcional.
- **Por qué está aquí:** Porque los exámenes, los viajes y las reuniones cambian completamente el plan del curso. Si sé que Lucia tiene el DELE B2 el 15 de junio, durante los próximos dos meses mis clases tienen que girar en torno a eso aunque "el programa" dijera otra cosa. Y un alumno puede tener dos a la vez: el viaje a Madrid en dos semanas Y el examen en junio. Isaac lo llama "micro-ESP" (español con fines específicos, versión corta) superpuesto al curso general.
- **Ejemplos:**
  - Lucia: `[{ text: "Aprobar DELE B2 primera convocatoria", targetDate: "2026-06-15" }]`
  - Henk: `[{ text: "Poder hacer la compra solo en Alicante", targetDate: "2026-07-01" }]`
  - Un ejecutivo con dos: `[{ text: "Reunión en Madrid", targetDate: "2026-05-08" }, { text: "Viaje familiar a Valencia", targetDate: "2026-07-20" }]`
- **No sirve para:** La motivación global del alumno (eso es `ReasonForStudying`) ni para objetivos de aprendizaje abstractos sin fecha (eso es `LearningGoals`).
- **Quién lo ve:** Profesor. Alimenta prompts de generación con prioridad alta cuando la fecha está a menos de 6 semanas vista.
- **Decisión (Robert, 2026-04-10):** Múltiples objetivos confirmados. JSON array, no un par de campos escalares.

### TeachingTodos — "ideas para próximas clases"
- **Qué es:** Lista acumulativa de cosas que tú quieres trabajar con este alumno en algún momento. Cada entrada es texto corto, tiene fecha de creación, estado (pendiente, cubierto, descartado) y, opcionalmente, un enlace a la sesión en la que se te ocurrió.
- **Por qué está aquí:** Este es el campo que Jordi pidió directamente en el audio del 9 de abril. Su dolor literal: "en una clase le surge, oye tengo que trabajar con esta persona la pronunciación, la diferencia entre el artículo determinado y el indeterminado, y lo quiero apuntar para que en algún momento lo trabaje. Pero si lo pongo en la nota de una clase como que va desapareciendo, porque va bajando y si lo pongo en la presentación inicial, no creo que sea para que aparezca ahí, porque son cosas que van surgiendo en las clases." Exactamente eso. Se apuntan desde dentro de una sesión, pero viven en la ficha del alumno y no se entierran.
- **Ejemplos:**
  - Entrada 1: "Trabajar la diferencia entre artículo determinado e indeterminado. Surgió en la clase del 8 de abril cuando dijo 'compré *el* pan' donde debería haber dicho 'compré pan'." *(status: pending, createdAt: 2026-04-08, sourceSessionLogId: ...)*
  - Entrada 2: "Mandarle un artículo sobre la huerta valenciana. Me lo recordó cuando habló de su afición a la jardinería." *(status: pending)*
  - Entrada 3: "Repasar el pretérito perfecto en narraciones personales." *(status: covered, coveredInSessionLogId: ...)* — ya cubierto, pero seguimos viéndolo en la historia por si hace falta reforzar.
- **No sirve para:**
  - Dificultades estructuradas ("le cuesta ser/estar con severidad alta"); eso es `Difficulties`.
  - El plan para la siguiente clase concreta ("mañana empezamos con un warm-up sobre viajes"); eso es `SessionLog.NextSessionTopics` y es de una sola sesión.
  - Objetivos del curso ("aprobar el DELE B2"); eso es `LearningGoals` o `ShortTermObjective`.
  - Compromisos operativos no pedagógicos ("le prometí facturar el mes a final de mes"); eso no existe todavía y probablemente viva en el futuro "TeacherFollowup" del rediseño del dashboard, no aquí.
- **Quién lo ve:** Profesor. (Futuro: posiblemente visible al alumno filtrado, como "cosas que vamos a ver".)
- **Nota para Jordi:** La diferencia entre esto y `NextSessionTopics` de una sesión es la que nos has pedido tú. `NextSessionTopics` vive dentro de una sesión y dice "qué tocaré en la siguiente"; `TeachingTodos` vive en la ficha del alumno y acumula todo lo que has ido anotando a lo largo del tiempo, sin enterrarse cuando añades sesiones nuevas. Se escriben desde la sesión (cuando surge la idea) pero se consultan desde la ficha.

### TeachingNotes
- **Qué es:** Observaciones pedagógicas generales sobre el alumno. Texto libre. Lo que no cabe en un `Difficulty` estructurado ni en un `TeachingTodo` concreto.
- **Por qué está aquí:** Porque hay cosas útiles que son más ambientales que operativas. "Aprende mejor con imágenes que con texto", "responde bien a las correcciones directas, no se ofende", "los primeros 5 minutos de cada clase están perdidos, necesita warm-up largo", "le funciona el humor, usarlo". No son tareas ni dificultades; son la personalidad pedagógica del alumno.
- **Ejemplos:**
  - "Prefiere explicaciones inductivas. Si le doy la regla antes de los ejemplos, se bloquea."
  - "Necesita homework escrito cada semana, si no se descompone el ritmo."
  - "Cuando trae temas de actualidad política se desvía 20 minutos. Acotarlo."
- **No sirve para:** Datos personales ("tiene hijos", eso es `PersonalNotes`), ni para dificultades concretas (`Difficulties`), ni para tareas pendientes (`TeachingTodos`).
- **Quién lo ve:** Profesor. Es el complemento del `PersonalNotes`: uno es quién es, el otro es cómo enseñarle.

---

## Sección 4 — El lado comercial

Los campos que no son pedagogía pero afectan a cómo Jordi organiza su semana.

### IsActive
- **Qué es:** Booleano. Por defecto `true` al crear un alumno.
- **Por qué está aquí:** Porque los alumnos cambian. Uno puede estar de baja temporal por un viaje, otro ha terminado sus clases, otro ha dejado Preply. No queremos borrarlos (se pierde la historia) ni seguirlos mostrando en la lista activa (ocupa espacio mental). Un flag los archiva sin destruir nada.
- **Ejemplos:** Henk: `true` (cliente activo). Un exalumno que terminó en marzo: `false`. Un alumno que volverá en septiembre: `false` de momento.
- **No sirve para:** Borrar alumnos. `IsDeleted` es otra cosa y significa "este registro se borró, ignóralo completamente". `IsActive=false` significa "este alumno existe y tiene historia, pero ahora mismo no está en mi lista de trabajo".
- **Quién lo ve:** Profesor.

### IsCorporate
- **Qué es:** Booleano. Si es `true`, las clases de este alumno las paga su empresa, no el propio alumno.
- **Por qué está aquí:** Porque cambia la dinámica. Los alumnos corporativos suelen tener menos motivación interna, horarios más rígidos, y a veces un informe periódico a RRHH. Querrás verlos agrupados (¿cuántos corporativos tengo activos?) y quizá cobrarles una tarifa distinta.
- **Ejemplos:** Un ejecutivo al que la empresa le paga 2 clases semanales: `true`. Henk, que paga de su bolsillo: `false`.
- **No sirve para:** Identificar la empresa concreta. Si hace falta "todos los alumnos de X empresa", añadimos un campo `Company` más adelante. Hoy el boolean es suficiente.
- **Quién lo ve:** Profesor.

### Rate
- **Qué es:** Tu tarifa con este alumno, escrita como tú la dirías. Texto libre.
- **Por qué está aquí:** Porque no todos los alumnos pagan lo mismo (antigüedad, corporativo, descuentos, moneda distinta) y cuando la semana aprieta quieres poder ordenar la lista por lo que ganas. Jordi lo ha pedido tres veces: es un campo de priorización mental, no de contabilidad.
- **Ejemplos:** "12 euros", "15€/h", "20 USD", "corporativo-mensual", "gratis (intercambio)".
- **No sirve para:** Facturación ni pagos ni impuestos. Nada que tenga que sumar automáticamente. Si quisiéramos eso, sería un número con moneda y un sistema de pagos, que es Fase 2+.
- **Quién lo ve:** Solo el profesor. Nunca el alumno.
- **Nota para Jordi:** El campo es texto libre pero cuando lo rellenes te sugerirá los valores que ya hayas usado antes, para que no tengas que escribir "12 euros" 27 veces. Es el autocompletado de toda la vida.

---

## Lo que NO está aquí (y por qué)

Cosas que Jordi ha mencionado en distintas rondas pero que no viven en el perfil del alumno:

- **Curso, programa, syllabus.** Eso es `Course` y `CurriculumEntry`. Un alumno tiene 0, 1 o varios cursos activos. El perfil enlaza a ellos pero no los contiene.
- **Examen objetivo y fecha de examen.** Vive en `Course.TargetExam` + `Course.ExamDate`, no en el alumno. Un alumno puede preparar dos exámenes distintos (DELE + SIELE) en cursos paralelos; si pusiéramos el examen en el alumno, se limitaría a uno.
- **Historial de sesiones.** Vive en `SessionLog`. La ficha del alumno *muestra* las sesiones como lista, pero no las guarda dentro.
- **Dificultades "cubiertas"** como sistema de repaso espaciado. Hoy tenemos estado "covered" en `Difficulties` pero no lo usamos para re-surfacing. Isaac lo tiene anotado como mejora futura.
- **Feedback emocional por sesión.** Existe en `LessonNote.EmotionalSignals` pero no en `SessionLog`. Hay una inconsistencia del modelo anotada; no la tocamos en este sprint.
- **Notas operativas "tengo que mandarle el PDF".** Eso va al futuro `TeacherFollowup` / promesas bandeja que Isaac propone para el rediseño del dashboard. NO va en `TeachingTodos`. Diferencia clave: `TeachingTodos` es pedagógico ("trabajar ser/estar con Ana"), `TeacherFollowup` es operativo ("mandar el PDF a Marco"). Si alguna vez acaban siendo lo mismo en la práctica, los unimos; hoy es prematuro.

---

## Decisiones tomadas (Robert, 2026-04-10)

Decididas por Robert sin consultar a Jordi. Criterio: "si le pido todo eso solo de leerlo se me asusta." Se cambian luego si Jordi lo pide.

1. **Tarifa:** Una tarifa por alumno. Texto libre. Sin tarifas por tipo de clase.
2. **Objetivos a corto plazo:** Múltiples, con fecha. JSON array en vez de un par de campos escalares. Cada entrada: `{ id, text, targetDate? }`.
3. **Ideas para próximas clases (TeachingTodos):** Texto libre por entrada, sin campo de urgencia. Si el profesor quiere poner "para la próxima clase" que lo escriba en el texto. Sin etiquetas ni `dueHint`.
4. **Razón para estudiar:** Una frase, texto libre. Sin lista.
5. **Objetivos de aprendizaje (LearningGoals):** Plano y editable en este sprint. Jerarquía (categorías) en un issue aparte para más adelante. No se puede perder: queremos que quede registrado.
6. **Notas:** Dos cajas: `PersonalNotes` + `TeachingNotes`.

---

## Cambios en el modelo resumidos

Para que Robert pueda mapear esto a migraciones sin volver a leer las discusiones:

| Campo | Acción | Tipo | Sprint |
|---|---|---|---|
| `IsActive` | ADD | bool NOT NULL default true | Este |
| `IsCorporate` | ADD | bool NOT NULL default false | Este |
| `Rate` | ADD | string? (32) | Este |
| `BirthYear` | ADD | int? | Este |
| `Profession` | ADD | string? (128) | Este |
| `CountryOfOrigin` | ADD | string? (64) | Este |
| `CityOfOrigin` | ADD | string? (64) | Este |
| `CountryOfResidence` | ADD | string? (64) | Este |
| `CityOfResidence` | ADD | string? (64) | Este |
| `ReasonForStudying` | ADD | string? (512) | Este |
| `ShortTermObjectives` | ADD | JSON array NOT NULL default `"[]"` (each: `{ id, text, targetDate? }`) | Este |
| `OfficialCefrLevel` | ADD | string? | Este |
| `NativeLanguage` → `NativeLanguages` | CHANGE | JSON array NOT NULL default `"[]"` | Este |
| `SpokenLanguages` | ADD | JSON array NOT NULL default `"[]"` | Este |
| `Notes` → `PersonalNotes` + `TeachingNotes` | SPLIT | string? + string? | Este |
| `LearningGoals` | CHANGE shape (sigue JSON, pasa a editable) | JSON | Este (plano) |
| `TeachingTodos` | ADD | JSON array NOT NULL default `"[]"` | Este |
| `CefrLevel`, `SkillLevelOverrides`, `Difficulties`, `Weaknesses`, `Interests` | LEAVE | — | — |

Todas las columnas nuevas son nullables o tienen default, así que la migración es segura con datos existentes. Los dos CHANGE (NativeLanguages y Notes) necesitan copia de datos antes de borrar la columna antigua, pero es una copia trivial.

---

*Documento de trabajo. Decisiones cerradas 2026-04-10. Actualizar si Jordi da feedback.*
