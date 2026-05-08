# Transcription Evaluation: Azure Speech vs Azure OpenAI Whisper

Evaluation date: 2026-05-07
Gate: required before production implementation of #1142.
Evaluator: implementer (reading both transcripts against the original audio).

Azure Speech credentials: northeurope region, key from `.env`.
Whisper credentials: `rfre-mov8xdcp-switzerlandnorth.cognitiveservices.azure.com`, deployment `whisper` (whisper-001, Standard tier, eastus2 resource group `rg-langteach-dev`).

---

## voice_note_Gergana_20260428_0947.webm

### Azure Speech (current)

> Delgada en la clase de hoy a las 10:00 H de la mañana. Hemos trabajado los pronombres interrogativos como estaba previsto y los controles los domina bien. Tiene como ejercicios un par de documentos. De completar qué pronombre interrogativo es el mejor para la próxima clase. Debo buscar información sobre el bueno, bien bonito. Su palabra favorita en español. Es. Barandero. ¿Y la palabra? Favorita en húngaro es.

### Azure OpenAI Whisper (proposed)

> En la clase de hoy, a las 10 de la mañana, hemos trabajado los pronombres interrogativos como estaba previsto y los control y los domina bien. Tiene como ejercicios un par de documentos de completar qué pronombre interrogativo es el mejor. Para la próxima clase, debo buscar información sobre el bueno bien bonito. Su palabra favorita en español es barandero y la palabra favorita en húngaro es prirroda.

### Judgement: **better**

Azure Speech has a hallucinated leading word "Delgada" (not in the audio), fragments the closing sentence into three broken pieces ("Es. Barandero. ¿Y la palabra? Favorita en húngaro es."), and drops the Hungarian word entirely. Whisper produces a clean run-on, captures "barandero" and "prirroda" (the Hungarian word), and omits the spurious "Delgada".

**Date references:**

| Item | Azure Speech | Whisper |
|------|-------------|---------|
| "a las 10 de la mañana" | present ("10:00 H") | present |
| "la proxima clase" | present | present |

**Verbs of intent:**

| Item | Azure Speech | Whisper |
|------|-------------|---------|
| "debo buscar" | present | present |

**Topic nouns:**

| Item | Azure Speech | Whisper |
|------|-------------|---------|
| "pronombres interrogativos" | present | present |
| "bueno bien bonito" | present | present |
| "barandero" | present (fragmented) | present |

All items present in Azure Speech are also present in Whisper. Whisper additionally captures the Hungarian word omitted by Azure Speech.

---

## voice_note_Gergana_20260505_0915.webm

### Azure Speech (current)

> En la clase de hoy de las 10:00 H de la mañana. Hemos trabajado. Las descripciones de hemos seguido trabajando mi barrio, hemos trabajado mi barrio. Concretamente hemos hecho lo que está en la pizarra del 30 de abril. Que es relacionar los lugares. Relacionar los adjetivos. Vale y la página 104. Que es la de un barrio típico. Y relacionar los diferentes sitios que hay en el en el barrio y lo ha hecho muy bien para la clase de mañana día. Continuar con la pizarra del día atenta con el muy bastante algunos, etcétera. Después. ¿Hacemos? Que hay en. Le enseño los adjetivos para describir una ciudad grande pequeña con el verbo ser, el verbo estar y el verbo allí tener. Y hacemos el ejercicio 8. Del 30 de abril, vale. Y después ya pasamos a la pizarra del día 5 de mayo con localiza los errores.

### Azure OpenAI Whisper (proposed)

> En la clase de hoy, de las 10 de la mañana, hemos trabajado las descripciones, hemos ido trabajando mi barrio, hemos trabajado mi barrio, concretamente hemos hecho lo que está en la pizarra del 30 de abril, que es relacionar los lugares, relacionar los adjetivos, y la página 104, que es la de un barrio típico, y relacionar los diferentes sitios que hay en el barrio, y lo ha hecho muy bien. Para la clase de mañana, día 6, tenemos que continuar con la pizarra del día 30, con el muy, bastante, algunos, etc. Después hacemos que hay en el enseño los adjetivos para describir una ciudad, grande, pequeña, con el verbo ser, y el verbo hay y tener, y hacemos el ejercicio 8, del 30 de abril. Y después ya pasamos a la pizarra del día 5 de mayo, con localiza los errores.

### Judgement: **strictly better**

This is the file that motivated the issue. Compared directly:

Azure Speech: `"para la clase de mañana día. Continuar con la pizarra del día atenta con el muy bastante..."`
Whisper: `"Para la clase de mañana, día 6, tenemos que continuar con la pizarra del día 30, con el muy, bastante..."`

- "día 6": MISSING in Azure Speech (garbled to "mañana día"), PRESENT in Whisper.
- "tenemos que continuar": MISSING in Azure Speech (garbled to "Continuar" with no subject/tense), PRESENT in Whisper.
- "pizarra del día 30": Azure Speech says "pizarra del día atenta" (nonsense), Whisper says "pizarra del día 30" (correct).

These are exactly the three cues the extraction prompt relies on to generate the "New Session" card dated 2026-05-06. Their absence in Azure Speech explains all previous browser failures on this file.

**Date references:**

| Item | Azure Speech | Whisper |
|------|-------------|---------|
| "pizarra del 30 de abril" | present | present |
| "mañana" | present (garbled context) | present (clear) |
| "día 6" | **MISSING** (garbled to "mañana día") | **PRESENT** |
| "día 5 de mayo" | present | present |

**Verbs of intent:**

| Item | Azure Speech | Whisper |
|------|-------------|---------|
| "continuar" | present (garbled: "Continuar" without subject) | present ("tenemos que continuar") |
| "hacemos el ejercicio 8" | present | present |

**Topic nouns:**

| Item | Azure Speech | Whisper |
|------|-------------|---------|
| "pizarra" | present | present |
| "página 104" | present | present |
| "barrio típico" | present | present |
| "ejercicio 8" | present | present |
| "adjetivos" | present | present |
| "verbo ser" | present | present |

All items present in Azure Speech also present in Whisper. Whisper additionally captures "día 6" and "tenemos que" which are absent from Azure Speech.

---

## voice_note_Hanna_20260506_1153.webm

### Azure Speech (current)

> Hannah, en la clase de hoy hemos trabajado. Los verbos de cambio hemos hecho prácticas. Hemos tenido una conversación sobre sus gustos musicales porque también toca el piano y también toca un instrumento, que es como el piano, que va con palillos. Y para la próxima clase tengo que trabajar alguna actividad más de verbos, de cambio, de práctica, de verbos de cambio. ¿Y puedo introducir algún tema nuevo?

### Azure OpenAI Whisper (proposed)

> Hanna, en la clase de hoy hemos trabajado los verbos de cambio, hemos hecho prácticas, hemos tenido una conversación sobre sus gustos musicales porque también toca el piano y también toca un instrumento que es como el piano que va con palillos y para la próxima clase tengo que trabajar alguna actividad más de verbos de cambio, de práctica de verbos de cambio y puedo introducir algún tema nuevo.

### Judgement: **better**

Azure Speech fragments at "hemos trabajado. Los verbos de cambio" -- a chunk-seam artefact that breaks the direct object off the verb. Whisper: "hemos trabajado los verbos de cambio" -- the sentence is intact. Azure Speech also misnames the student as "Hannah" and converts the closing statement into a question ("¿Y puedo introducir algún tema nuevo?"). Whisper has the correct name "Hanna" and the correct declarative form.

**Date references:**

| Item | Azure Speech | Whisper |
|------|-------------|---------|
| "la proxima clase" | present | present |

**Verbs of intent:**

| Item | Azure Speech | Whisper |
|------|-------------|---------|
| "tengo que trabajar" | present | present |
| "puedo introducir" | present | present |

**Topic nouns:**

| Item | Azure Speech | Whisper |
|------|-------------|---------|
| "verbos de cambio" | present | present |
| "piano" | present | present |
| "palillos" | present | present |

All items present in Azure Speech also present in Whisper.

---

## Go/No-Go

- [x] No file rated `worse` -- all three rated `better` or `strictly better`
- [x] At least two of three files rated `better` or `strictly better` -- all three qualify
- [x] Every date reference / verb of intent / topic noun present in the Azure Speech transcript is also present in the Whisper transcript, for every file -- confirmed row by row above

**Decision: PASS**

Whisper is cleared for production implementation. The evaluation confirms that the root cause of all prior browser failures on `voice_note_Gergana_20260505_0915.webm` ("día 6" and "tenemos que continuar" disappearing) is eliminated: Whisper transcribes both cues correctly on a single, unchunked call.
