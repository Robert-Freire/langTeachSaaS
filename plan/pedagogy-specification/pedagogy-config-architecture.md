# Model Design: Pedagogical Configuration Architecture

**Author:** Sophy (Model Designer)
**Input:** Isaac's 908-line pedagogy specification (`pedagogy-model-spec.md`)
**Date:** 2026-03-28
**Revised:** 2026-03-28 (corrections from Isaac and Arch review)

---

## Current State

The system has five section profile JSON files (`data/section-profiles/{warmup,presentation,practice,production,wrapup}.json`), each keyed by CEFR band (A1-C2), containing `contentTypes`, `guidance`, `duration`, `competencies`, `scaffolding`, and `interactionPattern`. These are loaded at startup as embedded resources by `SectionProfileService.cs` and consumed by `PromptService.cs` for two things: (1) fetching a guidance string to inject into the AI prompt, and (2) gating which `ContentBlockType` values are valid per section/level via `IsAllowed()`.

The `ContentBlockType` enum has 8 values: `LessonPlan`, `Vocabulary`, `Grammar`, `Exercises`, `Conversation`, `Reading`, `Homework`, `FreeText`. The frontend mirrors this with a `contentRegistry.tsx` mapping each type to a renderer triplet (Editor/Preview/Student). The frontend also hardcodes section-to-content-type rules in `sectionContentTypes.ts`.

The curricula data (`data/curricula/iberia/*.json`) holds per-sub-level metadata (institution, textbook, communicative objectives) but no exercise type mappings, no grammar scope lists, and no vocabulary load targets.

Template-specific behavior (Reading & Comprehension, Exam Prep) is hardcoded as string concatenation in `PromptService.cs`'s `LessonPlanUserPrompt` method.

**Bottom line:** All pedagogical intelligence is either baked into prompt strings or flattened into a single `guidance` text field. Isaac's spec defines 72 exercise types, section allowlists/blocklists with reasons, CEFR grammar scopes, template structural overrides, L1 family adjustments, and course-level variety rules. None of this structure exists in the data layer today.

---

## Proposed Model

The constraint from the user is clear: push everything into JSON configuration files, and code only handles (a) reading the JSON, (b) composing it into prompts, and (c) mapping exercise types to UI renderers. Seven layers, each a flat JSON file or small set of files. No inheritance hierarchies, no abstract factories, no plugin systems.

### Layer 1: Exercise Type Catalog

One file. 72 entries. This is the single source of truth for every exercise type the system knows about.

**File:** `data/pedagogy/exercise-types.json`

**Schema:**
```json
{
  "exerciseTypes": [
    {
      "id": "string",                    // e.g. "GR-01"
      "name": "string",                  // e.g. "Fill-in-the-blank"
      "nameEs": "string",                // e.g. "Rellenar huecos"
      "category": "string",             // Primary competency: CE|CO|EE|EO|GR|VOC|PRAG|LUD
      "secondaryCompetencies": ["string"], // e.g. ["EE", "VOC"]
      "description": "string",           // One-sentence description
      "cefrRange": [2, "string"],        // ["A1", "C2"] = valid from A1 to C2
      "specialResources": ["string"],    // e.g. ["audio"], [] if none
      "uiRenderer": "string|null"        // The ContentBlockType that renders this, or null if not yet supported
    }
  ]
}
```

**Real example (5 of 63):**
```json
{
  "exerciseTypes": [
    {
      "id": "GR-01",
      "name": "Fill-in-the-blank",
      "nameEs": "Rellenar huecos",
      "category": "GR",
      "secondaryCompetencies": [],
      "description": "Complete sentences with the correct grammatical form.",
      "cefrRange": ["A1", "C2"],
      "specialResources": [],
      "uiRenderer": "exercises"
    },
    {
      "id": "GR-02",
      "name": "Multiple choice",
      "nameEs": "Seleccion multiple",
      "category": "GR",
      "secondaryCompetencies": [],
      "description": "Choose the correct form from 3-4 options.",
      "cefrRange": ["A1", "C2"],
      "specialResources": [],
      "uiRenderer": "exercises"
    },
    {
      "id": "CE-07",
      "name": "Inference and deduction",
      "nameEs": "Inferencia y deduccion",
      "category": "CE",
      "secondaryCompetencies": ["PRAG"],
      "description": "Answer questions whose answer is implicit, not explicit, in the text.",
      "cefrRange": ["B2", "C2"],
      "specialResources": [],
      "uiRenderer": "reading"
    },
    {
      "id": "LUD-01",
      "name": "Crossword",
      "nameEs": "Crucigrama",
      "category": "LUD",
      "secondaryCompetencies": ["VOC"],
      "description": "Complete a crossword puzzle with lesson vocabulary.",
      "cefrRange": ["A1", "B2"],
      "specialResources": [],
      "uiRenderer": null
    },
    {
      "id": "EO-02",
      "name": "Open role-play",
      "nameEs": "Role-play abierto",
      "category": "EO",
      "secondaryCompetencies": ["PRAG"],
      "description": "Communicative situation with a goal but no fixed script.",
      "cefrRange": ["A2", "C2"],
      "specialResources": [],
      "uiRenderer": "conversation"
    }
  ]
}
```

**Why one flat file:** 72 entries is about 250 lines of JSON. That fits in a single file. Splitting by category (8 files for 8 categories) would create friction for every lookup and cross-reference. One file, one `Dictionary<string, ExerciseType>` at load time.

**Count verification (Isaac review):** CE:9 + CO:8 + EE:11 + EO:10 + GR:10 + VOC:11 + PRAG:5 + LUD:8 = 72 types total. The implementer must verify all 72 are transcribed by counting each category table in Isaac's spec.

**The `uiRenderer` field** is the bridge between pedagogy and code. Today most exercise types map to one of the existing 7 renderers (exercises, vocabulary, grammar, conversation, reading, homework, free-text). Types that have no current UI support (CO-*, LUD-*, some PRAG-*) get `null`, meaning the system can reference them in prompts and guidance but won't try to render structured content for them yet. When new renderers are built, update the JSON, not the code.

---

### Layer 2: Section Profiles (enhanced)

Same 5 files as today, same location, but extended with exercise type references. Backward compatible: the existing `guidance`, `duration`, `contentTypes`, etc. fields stay.

**File pattern:** `data/section-profiles/{warmup,presentation,practice,production,wrapup}.json`

**New fields added to each level entry:**

```json
{
  "sectionType": "practice",
  "levels": {
    "A1": {
      "contentTypes": ["exercises", "conversation"],
      "guidance": "Prefer matching and categorization tasks...",
      "duration": { "min": 8, "max": 12 },
      "competencies": ["reading", "writing"],
      "scaffolding": "high",
      "interactionPattern": "teacher-led",

      "validExerciseTypes": [
        "GR-01", "GR-02", "GR-05", "GR-06", "GR-07", "GR-09",
        "VOC-02", "VOC-03", "VOC-05",
        "CE-02",
        "EE-01", "EE-02",
        "EO-01",
        "PRAG-01",
        "LUD-01", "LUD-02", "LUD-06", "LUD-07"
      ],
      "forbiddenExerciseTypes": [
        { "id": "GR-03", "pattern": null, "reason": "Transformation too cognitively demanding at A1" },
        { "id": "GR-04", "pattern": null, "reason": "Error correction requires system knowledge student lacks" },
        { "id": "GR-08", "pattern": null, "reason": "Inductive discovery needs higher metalinguistic awareness" },
        { "id": "EO-05", "pattern": null, "reason": "Sustained monologue exceeds A1 productive capacity" },
        { "id": "EO-06", "pattern": null, "reason": "Debate requires argumentation resources not yet available" }
      ],
      "levelSpecificNotes": {
        "GR-01": "Always provide a word bank in the hint field.",
        "GR-02": "Maximum 3 options, not 4.",
        "VOC-05": "Use only high-frequency words the student has seen before."
      },
      "minExerciseVariety": 1
    },
    "B1": {
      "contentTypes": ["exercises", "conversation"],
      "guidance": "Use at least 2 different exercise formats...",
      "duration": { "min": 10, "max": 15 },
      "competencies": ["reading", "writing", "speaking"],
      "scaffolding": "low",
      "interactionPattern": "student-led",

      "validExerciseTypes": [
        "GR-01", "GR-02", "GR-03", "GR-04", "GR-05", "GR-06", "GR-07", "GR-09", "GR-10",
        "VOC-02", "VOC-03", "VOC-04", "VOC-05", "VOC-06", "VOC-07", "VOC-08", "VOC-11",
        "CE-02", "CE-03", "CE-04", "CE-05", "CE-06",
        "EE-01", "EE-02",
        "EO-01", "EO-02",
        "CO-04",
        "PRAG-01", "PRAG-02",
        "LUD-01", "LUD-02", "LUD-03", "LUD-04", "LUD-05", "LUD-06", "LUD-07", "LUD-08"
      ],
      "forbiddenExerciseTypes": [
        { "id": "EO-05", "pattern": null, "reason": "Monologue is Production, not Practice" },
        { "id": "EO-06", "pattern": null, "reason": "Debate is Production, not Practice" },
        { "id": "EE-07", "pattern": null, "reason": "Opinion essay is free production, not controlled practice" },
        { "id": "GR-08", "pattern": null, "reason": "Inductive discovery belongs in Presentation" }
      ],
      "levelSpecificNotes": {
        "GR-03": "Use sentence-level transformations: change person, change tense.",
        "GR-04": "Introduce error correction. Start with single-error sentences."
      },
      "minExerciseVariety": 2
    }
  }
}
```

**Key decisions:**

1. **`validExerciseTypes` is a whitelist, not computed from the exercise catalog's cefrRange.** The catalog says GR-03 is valid A2-C2, but the *section* rules say it's forbidden in Practice at A1. The section profile is the authority on "what goes here at this level," not the catalog. The catalog defines the universe; section profiles slice it.

2. **`forbiddenExerciseTypes` with reasons.** The reasons serve two purposes: (a) they get injected into the AI prompt so the LLM understands *why* not just *what* is forbidden, and (b) they are the machine-readable version of Isaac's rationale, which makes future audits trivial.

3. **`levelSpecificNotes`** are per-exercise-type overrides within a section/level. "GR-01 always needs a word bank at A1" is too specific for the main guidance string but too important to lose.

4. **`minExerciseVariety`** is the minimum number of distinct exercise format types required in this section. Isaac says 2 for Practice from B1 onward. This is a simple integer, not a complex rule engine.

**WarmUp and WrapUp profiles** stay simpler because they have very few valid types:

```json
{
  "sectionType": "warmup",
  "levels": {
    "A1": {
      "contentTypes": ["conversation"],
      "guidance": "yes/no or either/or questions using only known vocabulary...",
      "duration": { "min": 2, "max": 3 },
      "competencies": ["interaction"],
      "scaffolding": "high",
      "interactionPattern": "teacher-led",

      "validExerciseTypes": ["EO-08", "LUD-07"],
      "forbiddenExerciseTypes": [
        { "id": null, "pattern": "GR-*", "reason": "Grammar exercises break warm-up anxiety reduction" },
        { "id": null, "pattern": "EE-*", "reason": "Writing is slow and silent, opposite of warm-up purpose" },
        { "id": null, "pattern": "CO-*", "reason": "Formal listening requires concentration, not warming up" }
      ],
      "levelSpecificNotes": {}
    },
    "A2": {
      "contentTypes": ["conversation"],
      "guidance": "Open personal questions using preterite/present tense...",
      "duration": { "min": 2, "max": 4 },
      "competencies": ["interaction"],
      "scaffolding": "medium",
      "interactionPattern": "teacher-led",

      "validExerciseTypes": ["EO-08", "EO-04", "PRAG-03", "LUD-07"],
      "forbiddenExerciseTypes": [
        { "id": null, "pattern": "GR-*", "reason": "Grammar exercises break warm-up anxiety reduction" },
        { "id": null, "pattern": "EE-*", "reason": "Writing is slow and silent, opposite of warm-up purpose" },
        { "id": null, "pattern": "CO-*", "reason": "Formal listening requires concentration, not warming up" }
      ],
      "levelSpecificNotes": {}
    }
  }
}
```

**Uniform schema for `forbiddenExerciseTypes` (Arch review):** Each entry uses the same shape `{id, pattern, reason}` where `id` and `pattern` are both nullable strings, exactly one set per entry. This avoids polymorphic deserialization. When `pattern` is set (glob, e.g. `"GR-*"`), the code expands it against the exercise catalog. When `id` is set, it's a single type. This avoids listing all 10 GR-* types individually when the whole category is forbidden.

---

### Layer 3: CEFR Level Rules

One file per CEFR band. These capture what Isaac defined in Section 3: grammar scope, appropriate/inappropriate exercise types at the level regardless of section, vocabulary load, instruction language, and error correction strategy.

**File pattern:** `data/pedagogy/cefr-levels/{a1,a2,b1,b2,c1,c2}.json`

**Schema:**
```json
{
  "level": "string",
  "grammarInScope": ["string"],
  "grammarOutOfScope": ["string"],
  "appropriateExerciseTypes": ["string"],
  "inappropriateExerciseTypes": [
    { "id": "string", "reason": "string" }
  ],
  "vocabularyPerLesson": {
    "productive": { "min": 8, "max": 12 },
    "receptive": { "min": 0, "max": 5 }
  },
  "instructionLanguage": "string",
  "metalanguageLevel": "string",
  "errorCorrection": "string",
  "scaffoldingDefault": "string"
}
```

**Real example (`a1.json`):**
```json
{
  "level": "A1",
  "grammarInScope": [
    "Presente de indicativo: regulares (-ar, -er, -ir)",
    "Presente de indicativo: irregulares frecuentes (ser, estar, tener, ir, hacer, poder, querer)",
    "Genero y numero de sustantivos y adjetivos",
    "Articulos determinados e indeterminados",
    "Posesivos (mi, tu, su, nuestro)",
    "Pronombres personales sujeto",
    "Interrogativos (que, quien, donde, como, cuando, cuanto, por que)",
    "Hay vs esta/estan",
    "Gustar + infinitivo / sustantivo (A1.2)",
    "Demostrativos (este, ese, aquel) (A1.2)",
    "Tambien/tampoco (A1.2)",
    "Verbos reflexivos frecuentes (llamarse, levantarse) (A1.2)",
    "Ir a + infinitivo (planes), tener que + infinitivo (obligacion)",
    "Preposiciones basicas (en, de, a, con, por, para)",
    "Numeros, hora, dias, meses"
  ],
  "grammarOutOfScope": [
    "Preterito indefinido (A2.1)",
    "Preterito imperfecto (A2.2-B1)",
    "Imperativo (A2.2)",
    "Subjuntivo (B1.2+)",
    "Pronombres OD/OI (A2)",
    "Subordinadas con que + subjuntivo (B1)",
    "Condicional (B1.2)",
    "Perifrasis verbales excepto ir a + inf y tener que + inf"
  ],
  "appropriateExerciseTypes": [
    "GR-01", "GR-02", "GR-05", "GR-06", "GR-07", "GR-09",
    "VOC-01", "VOC-02", "VOC-03", "VOC-05", "VOC-09",
    "CE-01", "CE-02",
    "EE-01", "EE-02", "EE-03",
    "EO-01", "EO-03", "EO-04",
    "LUD-01", "LUD-02", "LUD-06", "LUD-07"
  ],
  "inappropriateExerciseTypes": [
    { "id": "GR-03", "reason": "Transformation too cognitively demanding" },
    { "id": "GR-04", "reason": "Error correction requires system knowledge to detect errors" },
    { "id": "GR-08", "reason": "Inductive discovery only possible at end of A1.2 with heavy scaffolding" },
    { "id": "CE-04", "reason": "Texts too long" },
    { "id": "CE-05", "reason": "Texts too long" },
    { "id": "CE-06", "reason": "Texts too abstract" },
    { "id": "CE-07", "reason": "Inference requires reading skills not yet developed" },
    { "id": "CE-08", "reason": "Register identification requires pragmatic awareness" },
    { "id": "CE-09", "reason": "Critical reading requires argumentation" },
    { "id": "EO-02", "reason": "Open role-play: insufficient linguistic resources" },
    { "id": "EO-05", "reason": "Sustained monologue exceeds capacity" },
    { "id": "EO-06", "reason": "Debate requires argumentation" },
    { "id": "EO-07", "reason": "Negotiation too complex" }
  ],
  "vocabularyPerLesson": {
    "productive": { "min": 8, "max": 12 },
    "receptive": { "min": 0, "max": 5 }
  },
  "instructionLanguage": "L1 for procedural instructions, L2 for linguistic content",
  "metalanguageLevel": "Minimal: verbo, nombre, adjetivo only",
  "errorCorrection": "Immediate and explicit. Teacher provides correct form. Brief explanation.",
  "scaffoldingDefault": "high"
}
```

**Real example (`b2.json`):**
```json
{
  "level": "B2",
  "grammarInScope": [
    "Subjuntivo presente: todos los usos (duda, emocion, valoracion, finalidad, concesion)",
    "Subjuntivo imperfecto: todos los usos (deseo irreal, condiciones contrafactuales, cortesia)",
    "Contraste indicativo/subjuntivo en subordinadas",
    "Condicionales complejas (si hubiera sabido, habria...)",
    "Voz pasiva con ser y pasiva refleja",
    "Estilo indirecto completo",
    "Conectores discursivos avanzados (ahora bien, es decir, dicho de otro modo)",
    "Oraciones concesivas (aunque + subjuntivo, a pesar de que, por mas que)",
    "Oraciones consecutivas (tan... que, tanto... que, de modo que)",
    "Perifrasis verbales ampliadas (ponerse a, acabar por, llegar a, venir a)",
    "Valores del se (reflexivo, reciproco, impersonal, pasiva refleja, dativo de interes)",
    "Subjuntivo perfecto (es posible que haya venido)"
  ],
  "grammarOutOfScope": [
    "Subjuntivo pluscuamperfecto en usos literarios",
    "Futuro perfecto de conjetura en registros muy formales",
    "Usos retoricos avanzados del subjuntivo",
    "Arcaismos gramaticales"
  ],
  "appropriateExerciseTypes": [
    "GR-01", "GR-02", "GR-03", "GR-04", "GR-05", "GR-06", "GR-07", "GR-08", "GR-09", "GR-10",
    "VOC-01", "VOC-02", "VOC-03", "VOC-04", "VOC-05", "VOC-06", "VOC-07", "VOC-08", "VOC-09", "VOC-10", "VOC-11",
    "CE-01", "CE-02", "CE-03", "CE-04", "CE-05", "CE-06", "CE-07", "CE-08",
    "EE-01", "EE-02", "EE-03", "EE-04", "EE-05", "EE-06", "EE-07", "EE-08", "EE-09",
    "EO-01", "EO-02", "EO-03", "EO-04", "EO-05", "EO-06", "EO-07", "EO-08", "EO-09",
    "CO-01", "CO-02", "CO-03", "CO-04", "CO-05", "CO-08",
    "PRAG-01", "PRAG-02", "PRAG-03", "PRAG-04", "PRAG-05",
    "LUD-01", "LUD-02", "LUD-03", "LUD-04", "LUD-05", "LUD-06", "LUD-07", "LUD-08"
  ],
  "inappropriateExerciseTypes": [],
  "vocabularyPerLesson": {
    "productive": { "min": 15, "max": 20 },
    "receptive": { "min": 10, "max": 15 }
  },
  "instructionLanguage": "Entirely in L2 with varied register",
  "metalanguageLevel": "Full: advanced grammatical metalanguage expected",
  "errorCorrection": "Mostly deferred. Student self-corrects with teacher cues. Recasting.",
  "scaffoldingDefault": "low"
}
```

**Why not merge this into section profiles?** Because CEFR rules apply across all sections. "GR-03 is inappropriate at A1" is true whether you're in Practice, Production, or anywhere else. The section profile adds the *section-specific* layer on top. Two orthogonal dimensions, two separate files.

**The grammar scope lists** serve the same purpose as the current `GrammarConstraints` in `GenerationContext`, but now they come from data instead of requiring the curriculum planner to enumerate them every time. The prompt builder reads the CEFR level file and injects the in-scope grammar automatically.

---

### Layer 4: Template Overrides

Templates (Conversation, Grammar Focus, Reading & Comprehension, Writing Skills, Exam Prep, and Isaac's proposed additions) modify the default PPP+ structure. Today these are hardcoded string blocks in `PromptService.cs`. They should be JSON.

**File:** `data/pedagogy/template-overrides.json`

**Schema:**
```json
{
  "templates": [
    {
      "id": "string",
      "name": "string",
      "sections": {
        "warmUp": {
          "required": true,
          "overrideGuidance": "string|null",
          "priorityExerciseTypes": ["string"],
          "notes": "string|null"
        },
        "presentation": {
          "required": true,
          "overrideGuidance": "string|null",
          "priorityExerciseTypes": ["string"],
          "minExerciseVarietyOverride": "number|null",
          "notes": "string|null"
        },
        "practice": { "..." : "..." },
        "production": { "..." : "..." },
        "wrapUp": { "..." : "..." }
      },
      "levelVariations": {
        "A1": { "notes": "string" },
        "B2+": { "notes": "string" }
      },
      "restrictions": "string"
    }
  ]
}
```

**Real example (all 5 existing + 2 proposed):**
```json
{
  "templates": [
    {
      "id": "conversation",
      "name": "Conversation",
      "sections": {
        "warmUp": {
          "required": true,
          "overrideGuidance": "Natural entry point to the topic. Oral only.",
          "priorityExerciseTypes": ["EO-08"],
          "notes": null
        },
        "presentation": {
          "required": false,
          "overrideGuidance": "Only if specific vocabulary or functions need pre-teaching. Brief (5 min max), functional not grammatical. Omit at B2+.",
          "priorityExerciseTypes": ["VOC-01", "PRAG-01"],
          "notes": "Optional. Skip when student already has resources."
        },
        "practice": {
          "required": true,
          "overrideGuidance": "Guided oral practice: structured role-plays, conversation with frames.",
          "priorityExerciseTypes": ["EO-01", "EO-02", "EO-08"],
          "notes": null
        },
        "production": {
          "required": true,
          "overrideGuidance": "Heart of the lesson. Free conversation, debate, or negotiation.",
          "priorityExerciseTypes": ["EO-08", "EO-06", "EO-07"],
          "notes": null
        },
        "wrapUp": {
          "required": true,
          "overrideGuidance": "Includes error correction slot for oral errors noted during Production.",
          "priorityExerciseTypes": ["EO-08"],
          "notes": null
        }
      },
      "levelVariations": {
        "A1": { "notes": "Conversation is problematic at A1. Use EO-01 (guided) with heavy scaffolding. Closer to guided oral practice than free conversation." },
        "A2-B1": { "notes": "Works well. Gradual transition from guided Practice to free Production." },
        "B2+": { "notes": "Presentation often omitted. Lesson is mostly Production with corrective feedback." }
      },
      "restrictions": "Written exercises (EE-*) secondary. Grammar (GR-*) only to unblock oral production. Reading (CE-*) only as input stimulus."
    },
    {
      "id": "grammar-focus",
      "name": "Grammar Focus",
      "sections": {
        "warmUp": {
          "required": true,
          "overrideGuidance": "Activate prior knowledge about the target structure.",
          "priorityExerciseTypes": ["EO-08"],
          "notes": null
        },
        "presentation": {
          "required": true,
          "overrideGuidance": "Central section. Explicit rule presentation (A1-A2) or inductive discovery (B1+). Paradigm, examples, L1 interference notes.",
          "priorityExerciseTypes": ["GR-08", "GR-09", "VOC-01"],
          "notes": "This is the reason for the lesson."
        },
        "practice": {
          "required": true,
          "overrideGuidance": "Extensive. Minimum 3 distinct exercise types. Progress from controlled to semi-free.",
          "priorityExerciseTypes": ["GR-01", "GR-02", "GR-03", "GR-06"],
          "minExerciseVarietyOverride": 3,
          "notes": null
        },
        "production": {
          "required": true,
          "overrideGuidance": "Communicative task that requires (not just allows) the target structure.",
          "priorityExerciseTypes": ["EE-06", "EE-07", "EO-02"],
          "notes": "Not 'use subjunctive freely' but 'write an email advising a friend about a trip' (which naturally requires subjunctive)."
        },
        "wrapUp": {
          "required": true,
          "overrideGuidance": "Recap the rule and frequent errors.",
          "priorityExerciseTypes": ["EO-08"],
          "notes": null
        }
      },
      "levelVariations": {
        "A1": { "notes": "Explicit grammar with clear paradigms. Minimal metalanguage. Many examples." },
        "A2-B1": { "notes": "Guided discovery. Give examples, student formulates rule, teacher confirms." },
        "B2+": { "notes": "Not presenting new rules but exploring nuance. Indicative vs subjunctive after aunque, etc." }
      },
      "restrictions": "Vocabulary only as support for examples. Listening only if input is audio. Lesson must not drift to reading comprehension."
    },
    {
      "id": "reading-comprehension",
      "name": "Reading & Comprehension",
      "sections": {
        "warmUp": {
          "required": true,
          "overrideGuidance": "Pre-reading task. Predict content from title/image. Activate topic vocabulary.",
          "priorityExerciseTypes": ["EO-08", "EO-04"],
          "notes": null
        },
        "presentation": {
          "required": true,
          "overrideGuidance": "Contains the main text. Two phases: (1) first read for gist (CE-01), (2) second read for detail (CE-02). Pre-teach 3-5 blocking vocabulary items.",
          "priorityExerciseTypes": ["CE-01", "CE-02", "VOC-01"],
          "notes": "The text MUST be in Presentation. Never generate a Reading lesson without text here."
        },
        "practice": {
          "required": true,
          "overrideGuidance": "Comprehension exercises on the text.",
          "priorityExerciseTypes": ["CE-02", "CE-03", "CE-04", "CE-05", "CE-06", "VOC-04"],
          "notes": null
        },
        "production": {
          "required": false,
          "overrideGuidance": "Optional but recommended. Task using the text as springboard: opinion, personal connection, creative extension.",
          "priorityExerciseTypes": ["EE-07", "EE-05", "EO-08"],
          "notes": null
        },
        "wrapUp": {
          "required": true,
          "overrideGuidance": "Summary of text and key vocabulary.",
          "priorityExerciseTypes": ["EO-08", "VOC-09"],
          "notes": null
        }
      },
      "levelVariations": {
        "A1": { "notes": "Texts 40-60 words. Simplified, not authentic. Literal questions only." },
        "A2": { "notes": "Texts 80-120 words. Adapted from real sources. Detail and vocabulary questions." },
        "B1": { "notes": "Texts 150-250 words. Semi-authentic. True/false, ordering, cloze." },
        "B2+": { "notes": "Texts 300-500 words. Authentic (press, essay). Inference, intention, register." }
      },
      "restrictions": "Grammar exercises secondary unless the structure is a lesson objective."
    },
    {
      "id": "thematic-vocabulary",
      "name": "Thematic Vocabulary",
      "sections": {
        "warmUp": {
          "required": true,
          "overrideGuidance": "Brainstorm. What words do you already know about [topic]?",
          "priorityExerciseTypes": ["EO-08"],
          "notes": null
        },
        "presentation": {
          "required": true,
          "overrideGuidance": "Organized vocabulary by subfields with visual support.",
          "priorityExerciseTypes": ["VOC-01", "VOC-02", "VOC-03"],
          "notes": null
        },
        "practice": {
          "required": true,
          "overrideGuidance": "Vocabulary in context, gap-fill, synonyms, games.",
          "priorityExerciseTypes": ["VOC-04", "VOC-05", "VOC-06", "GR-01", "LUD-01", "LUD-05"],
          "notes": null
        },
        "production": {
          "required": true,
          "overrideGuidance": "Use vocabulary in a communicative task: describe your house, write about your job.",
          "priorityExerciseTypes": ["EE-04", "EO-04", "EO-08"],
          "notes": null
        },
        "wrapUp": {
          "required": true,
          "overrideGuidance": "Quick flashcards, self-assessment.",
          "priorityExerciseTypes": ["VOC-09"],
          "notes": null
        }
      },
      "levelVariations": {},
      "restrictions": "Grammar only as incidental support for vocabulary sentences."
    },
    {
      "id": "culture-society",
      "name": "Culture & Society",
      "sections": {
        "warmUp": {
          "required": true,
          "overrideGuidance": "What do you know about [cultural topic]?",
          "priorityExerciseTypes": ["EO-08", "PRAG-03"],
          "notes": null
        },
        "presentation": {
          "required": true,
          "overrideGuidance": "Cultural content via text, discussion prompt, or image. Culture-specific vocabulary.",
          "priorityExerciseTypes": ["PRAG-03", "VOC-01", "CE-01"],
          "notes": null
        },
        "practice": {
          "required": true,
          "overrideGuidance": "Comprehension, intercultural comparison, vocabulary in context.",
          "priorityExerciseTypes": ["CE-02", "PRAG-04", "VOC-04"],
          "notes": null
        },
        "production": {
          "required": true,
          "overrideGuidance": "Opinion, discussion, intercultural comparison with own culture.",
          "priorityExerciseTypes": ["EE-07", "EO-06", "PRAG-04"],
          "notes": null
        },
        "wrapUp": {
          "required": true,
          "overrideGuidance": "Intercultural reflection.",
          "priorityExerciseTypes": ["EO-08"],
          "notes": null
        }
      },
      "levelVariations": {},
      "restrictions": "Grammar is incidental, not the focus."
    },
    {
      "id": "writing-skills",
      "name": "Writing Skills",
      "sections": {
        "warmUp": {
          "required": true,
          "overrideGuidance": "Discuss the text genre and its real-world use. 'When was the last time you wrote a formal email?'",
          "priorityExerciseTypes": ["EO-08"],
          "notes": null
        },
        "presentation": {
          "required": true,
          "overrideGuidance": "Analyze a model text of the target genre. Structure, register, connectors, formulae.",
          "priorityExerciseTypes": ["CE-01", "CE-02", "VOC-01", "PRAG-02"],
          "notes": null
        },
        "practice": {
          "required": true,
          "overrideGuidance": "Controlled writing practice: reorder paragraphs, fill connectors, match formal/informal equivalents.",
          "priorityExerciseTypes": ["CE-04", "CE-05", "EE-01", "EE-02", "PRAG-02"],
          "notes": null
        },
        "production": {
          "required": true,
          "overrideGuidance": "Central section. Student produces own text following the model. Peer review if possible.",
          "priorityExerciseTypes": ["EE-03", "EE-04", "EE-05", "EE-06", "EE-07", "EE-08", "EE-09", "EE-10", "EE-11"],
          "notes": "Feedback format: 2 strengths + 1 improvement."
        },
        "wrapUp": {
          "required": true,
          "overrideGuidance": "Share one sentence or paragraph, teacher feedback.",
          "priorityExerciseTypes": ["EO-08"],
          "notes": null
        }
      },
      "levelVariations": {
        "A1": { "notes": "Fill in forms, write a 30-word postcard." },
        "A2": { "notes": "Notes, informal email, short description." },
        "B1": { "notes": "Formal/informal email, opinion paragraph, narration." },
        "B2": { "notes": "Article, formal letter, summary, short essay." },
        "C1-C2": { "notes": "Argumentative essay, creative text, written mediation." }
      },
      "restrictions": "Oral exercises (EO-*) only as topic discussion, not as objective. Grammar (GR-*) only if a structure is needed for the genre."
    },
    {
      "id": "exam-prep",
      "name": "Exam Prep",
      "sections": {
        "warmUp": {
          "required": true,
          "overrideGuidance": "Strategic orientation. Review exam format and today's task type. NOT free conversation.",
          "priorityExerciseTypes": ["EO-08"],
          "notes": "This is orientation, not icebreaker. Different from other templates."
        },
        "presentation": {
          "required": true,
          "overrideGuidance": "Teach strategy for the task type: skimming, elimination, time management, note-taking. Show solved examples.",
          "priorityExerciseTypes": ["CE-01", "CE-02", "GR-08"],
          "notes": null
        },
        "practice": {
          "required": true,
          "overrideGuidance": "TIMED practice under exam conditions. Correct with explanations and feedback.",
          "priorityExerciseTypes": ["CE-02", "CE-03", "CE-06", "CO-01", "CO-02", "CO-03", "EE-06", "EE-07"],
          "minExerciseVarietyOverride": null,
          "notes": "Timer is mandatory. Simulate real exam pressure."
        },
        "production": {
          "required": true,
          "overrideGuidance": "Complete independent task simulating the real exam. Self-assessment against scoring criteria.",
          "priorityExerciseTypes": ["EE-06", "EE-07", "EO-04", "EO-05"],
          "notes": null
        },
        "wrapUp": {
          "required": true,
          "overrideGuidance": "Identify one strength and one area for improvement.",
          "priorityExerciseTypes": ["EO-08"],
          "notes": null
        }
      },
      "levelVariations": {
        "A1-A2": { "notes": "DELE A1, A2. Simple tasks, generous timing." },
        "B1-B2": { "notes": "DELE B1, B2. Complex tasks, time management is critical." },
        "C1-C2": { "notes": "DELE C1, C2. Open-ended tasks, nuance and register make the pass/fail difference." }
      },
      "restrictions": "LUD-* inappropriate in Exam Prep except as warm-up relaxation. The goal is familiarity with real exam format, not gamification."
    }
  ]
}
```

**Why one file instead of one per template?** There are 5-7 templates. Each is about 30-50 lines of JSON. That's under 350 lines total. One file means one read, one parse, one cache. If it grows past 10 templates someday, split it. Not today.

---

### Layer 5: L1 Influence Rules

Language family adjustments affect exercise selection, presentation strategy, and difficulty anticipation. Isaac defined these in Section 5.

**File:** `data/pedagogy/l1-influence.json`

**Schema:**
```json
{
  "languageFamilies": {
    "string": {
      "languages": ["string"],
      "strengths": ["string"],
      "weaknesses": ["string"],
      "adjustments": {
        "increaseEmphasis": ["string"],
        "decreaseEmphasis": ["string"],
        "additionalExerciseTypes": ["string"],
        "templatePreference": ["string"],
        "notes": "string"
      }
    }
  },
  "specificLanguages": {
    "string": {
      "family": "string",
      "falseFriends": ["string"],
      "positiveTransfer": ["string"],
      "additionalNotes": "string"
    }
  }
}
```

**Real example:**
```json
{
  "languageFamilies": {
    "romance": {
      "languages": ["italian", "portuguese", "french", "romanian", "catalan"],
      "strengths": ["Cognates", "Similar verb system", "Grammatical gender exists"],
      "weaknesses": ["False friends", "Interference by similarity"],
      "adjustments": {
        "increaseEmphasis": ["VOC-10", "PRAG-02"],
        "decreaseEmphasis": ["GR-05", "GR-09"],
        "additionalExerciseTypes": [],
        "templatePreference": ["conversation", "reading-comprehension"],
        "notes": "Reduce grammar presentation time. Increase practice on false friends and subtle register differences."
      }
    },
    "germanic": {
      "languages": ["english", "german", "dutch", "swedish", "norwegian", "danish"],
      "strengths": ["High motivation", "Good resource access"],
      "weaknesses": ["Subjunctive", "Ser/estar", "Grammatical gender", "Prepositions"],
      "adjustments": {
        "increaseEmphasis": ["GR-08", "GR-01", "GR-04"],
        "decreaseEmphasis": [],
        "additionalExerciseTypes": [],
        "templatePreference": [],
        "notes": "Explicit explanation of concepts not in L1. Extra ser/estar practice at every level until B2."
      }
    },
    "sinitic-japonic": {
      "languages": ["mandarin", "cantonese", "japanese"],
      "strengths": ["Study discipline", "Strong memory"],
      "weaknesses": ["Entire inflectional system", "Phonology", "Gender", "Articles", "Subjunctive"],
      "adjustments": {
        "increaseEmphasis": ["CO-06", "GR-01", "GR-05", "GR-06", "GR-09"],
        "decreaseEmphasis": [],
        "additionalExerciseTypes": ["CO-06"],
        "templatePreference": ["grammar-focus"],
        "notes": "Very gradual approach. Heavy repetition. Strong visual support. CO-06 in every lesson during A1-A2."
      }
    },
    "slavic": {
      "languages": ["russian", "polish", "czech", "ukrainian", "serbian", "croatian"],
      "strengths": ["Verbal inflection accepted", "Aspectual distinctions"],
      "weaknesses": ["Articles (don't exist)", "Prepositions", "Silent h"],
      "adjustments": {
        "increaseEmphasis": ["GR-01", "VOC-05"],
        "decreaseEmphasis": ["GR-05"],
        "additionalExerciseTypes": [],
        "templatePreference": [],
        "notes": "Heavy emphasis on article use/omission. Preposition practice in every lesson."
      }
    },
    "arabic": {
      "languages": ["arabic"],
      "strengths": ["Grammatical gender exists", "Verbal inflection"],
      "weaknesses": ["Vowels (Arabic has 3, Spanish 5)", "LTR writing", "Articles"],
      "adjustments": {
        "increaseEmphasis": ["CO-06", "EE-01", "EE-02"],
        "decreaseEmphasis": [],
        "additionalExerciseTypes": ["CO-06"],
        "templatePreference": [],
        "notes": "Intensive phonetic discrimination for vowels. Additional writing exercises."
      }
    }
  },
  "specificLanguages": {
    "italian": {
      "family": "romance",
      "falseFriends": ["guardare (mirar, no guardar)", "burro (mantequilla, no burro)", "salire (subir, no salir)", "carta (papel, no carta postal)"],
      "positiveTransfer": ["R/RR pronunciation similar", "Subjunctive exists and functions similarly"],
      "additionalNotes": "Critical interference on ser/estar (Italian essere covers both). Student will say '*Soy cansado'. Needs specific GR-02 and GR-04 for ser/estar from A1."
    },
    "french": {
      "family": "romance",
      "falseFriends": [],
      "positiveTransfer": ["Similar verb system", "Grammatical gender"],
      "additionalNotes": "Less false friend interference than Italian. Good cognate base. Watch for preposition transfer errors."
    },
    "persian": {
      "family": null,
      "falseFriends": [],
      "positiveTransfer": [],
      "additionalNotes": "Persian is Indo-European, NOT Semitic like Arabic. Unlike Arabic, Persian has 6 vowels (closer to Spanish). CO-06 is less critical than for Arabic speakers. Shares some script patterns with Arabic but phonological profile is different. Treat as its own case, do not apply Arabic vowel rules."
    },
    "mandarin": {
      "family": "sinitic-japonic",
      "falseFriends": [],
      "positiveTransfer": [],
      "additionalNotes": "No grammatical gender, no articles, no conjugations in L1. Everything is new. Functional approach (for expressing wishes/doubts we use this special form) rather than rule-based."
    }
  }
}
```

**Why family + specific language?** Because the family gives you 80% of the adjustments (all Slavic speakers struggle with articles), and the specific language gives you the remaining 20% (Italian speakers have specific ser/estar interference patterns that Portuguese speakers handle differently). The system reads both: match on specific language first, fall back to family.

**How it's used:** When building the prompt, if the student's native language is known, look up the language (or its family), and append the `adjustments.notes` to the system prompt. If `additionalExerciseTypes` includes `CO-06`, add it to the valid exercise types for relevant sections. If `templatePreference` is non-empty, weight those templates higher in curriculum generation.

---

### Layer 6: Course Distribution Rules

These govern variety and skill balance across multiple sessions in a curriculum. Isaac's Section 6.

**File:** `data/pedagogy/course-rules.json`

**Schema and real content (this file is small enough to show in full):**

```json
{
  "varietyRules": {
    "practiceTypeCombination": {
      "noRepeatWithinSessions": 3,
      "description": "Do not repeat the same combination of Practice exercise types in 3 consecutive sessions."
    },
    "productionTypeAlternation": {
      "alternateWrittenOral": true,
      "description": "Alternate between written and oral production in consecutive lessons."
    },
    "warmUpFormat": {
      "maxConsecutiveRepeats": 2,
      "description": "Do not repeat the same warm-up format more than 2 times in a row."
    },
    "competencyCoverage": {
      "windowSize": 5,
      "requiredCompetencies": ["CE", "CO", "EE", "EO"],
      "description": "In every 5 consecutive lessons, all 4 macro-skills must appear as primary competency at least once."
    },
    "exerciseTypeCoverage": {
      "sessions20": "All level-appropriate exercise types should appear at least once in a 20-session course.",
      "sessions10": "All Production types used at the level should appear at least once."
    }
  },
  "skillDistribution": {
    "general": {
      "CE": { "min": 0.20, "max": 0.25 },
      "CO": { "min": 0.15, "max": 0.20 },
      "EE": { "min": 0.20, "max": 0.25 },
      "EO": { "min": 0.30, "max": 0.35 }
    },
    "conversational": {
      "CE": { "min": 0.10, "max": 0.15 },
      "CO": { "min": 0.10, "max": 0.15 },
      "EE": { "min": 0.10, "max": 0.15 },
      "EO": { "min": 0.55, "max": 0.65 }
    }
  },
  "grammarProgression": {
    "model": "spiral",
    "recyclingRules": [
      {
        "trigger": "Systematic errors in a previously-taught structure",
        "action": "Dedicate 1-2 exercises in Practice to the structure within the current lesson context"
      },
      {
        "trigger": "Correct in exercises but not in free production",
        "action": "Create more production opportunities with that structure, not more exercises"
      },
      {
        "trigger": "Mastered in free production",
        "action": "Advance. No more dedicated time except as natural input."
      },
      {
        "trigger": "5+ lessons without using a key structure for the level",
        "action": "Include recycling: a sentence or two in a text, a couple of mixed exercises"
      }
    ],
    "validRecyclingExamples": [
      "Reviewing indefinido in a travel vocabulary lesson using past-tense sentences",
      "Using indefinido in a B1 role-play where before it was only practiced in written exercises"
    ],
    "lazyRecyclingExamples": [
      "Repeating the same fill-in-blank indefinido exercises from 3 lessons ago",
      "Re-explaining regular indefinido endings at B1"
    ]
  }
}
```

**Why one file?** This is a small rule set that the curriculum generator reads once. It's not per-level, not per-section, not per-template. It's cross-cutting. One file, about 80 lines. If the system later supports different course "modes" (intensive, exam-prep-only, summer-camp), each could have its own course-rules file or a `courseType` discriminator added to this one.

---

### Layer 7: Exercise-to-UI Mapping (THE CODE BOUNDARY)

This is where JSON configuration ends and code begins.

The `uiRenderer` field in the exercise type catalog (Layer 1) points to a `ContentBlockType` string. The frontend's `contentRegistry.tsx` already maps `ContentBlockType` to a renderer triplet (Editor/Preview/Student). That's the full chain:

```
exercise type ID (e.g. "GR-01")
  -> uiRenderer field in exercise-types.json (e.g. "exercises")
  -> contentRegistry.tsx lookup (e.g. ExercisesRenderer)
  -> Editor/Preview/Student components
```

**What changes in code:**

1. **`contentRegistry.tsx`** stays as-is for existing renderers. When new renderers are needed (e.g., for `listening` or `activity` content types), a new renderer is added to the registry and the `ContentBlockType` union is extended. This is the only code change required when adding new exercise categories.

2. **`ContentBlockType` enum (backend) and type union (frontend)** may grow over time (adding `Listening`, `Activity`, `Pragmatics`), but the exercise type catalog already anticipates this: types with `uiRenderer: null` are pedagogically known but not yet renderable. The system can reference them in prompt guidance without the UI needing to handle them.

3. **No runtime code maps exercise type IDs to renderers.** The `uiRenderer` field in the catalog JSON is the map. Code reads it. If someone adds a new exercise type `LUD-09` with `uiRenderer: "exercises"`, it renders as exercises. If they set `uiRenderer: null`, it's for prompt-only use. No code change.

**What the code looks like** (the simplest possible thing):

```typescript
// In a future ExerciseTypeService or similar
function getRendererForExerciseType(exerciseTypeId: string): ContentBlockType | null {
  const catalog = loadExerciseTypeCatalog(); // cached singleton
  const entry = catalog[exerciseTypeId];
  return entry?.uiRenderer ?? null;
}
```

That's it. A dictionary lookup. The complexity lives in the JSON, not the code.

---

### Composition: How the Layers Combine at Generation Time

When `PromptService.BuildLessonPlanPrompt` (or any content prompt) fires, the layers compose in this order:

```
1. READ INPUTS
   - GenerationContext: level, topic, template, student profile, section
   - CurriculumContext (if curriculum generation): course mode, session count

2. LOAD BASE RULES
   cefrRules = load("data/pedagogy/cefr-levels/{level}.json")
   sectionProfile = load("data/section-profiles/{section}.json")[level]
   exerciseCatalog = load("data/pedagogy/exercise-types.json")  // cached

3. APPLY TEMPLATE OVERLAY (if template specified)
   templateOverride = load("data/pedagogy/template-overrides.json")[templateId]
   for each section in PPP+:
     if templateOverride.sections[section].overrideGuidance exists:
       replace or append to sectionProfile.guidance
     if templateOverride.sections[section].required == false:
       mark section as optional in prompt instructions
     merge priorityExerciseTypes into valid types list

4. APPLY L1 ADJUSTMENTS (if student native language known)
   l1Rules = load("data/pedagogy/l1-influence.json")
   family = l1Rules.specificLanguages[nativeLang]?.family
          ?? matchFamily(nativeLang, l1Rules.languageFamilies)
   if family found:
     append family.adjustments.notes to system prompt
     merge family.adjustments.additionalExerciseTypes into valid types
     // THEN re-apply forbidden filter (step 5) to prevent L1 additions
     // from overriding section-level forbidden rules
     append specific language notes (false friends, transfer)

5. COMPOSE THE EXERCISE GUIDANCE BLOCK
   validTypes = intersect(
     cefrRules.appropriateExerciseTypes,
     sectionProfile.validExerciseTypes
   )
   forbiddenTypes = union(
     cefrRules.inappropriateExerciseTypes,
     sectionProfile.forbiddenExerciseTypes
   )
   // Remove any forbidden types from valid list
   validTypes = validTypes.except(forbiddenTypes.map(f => f.id))

   // Build guidance text:
   "Valid exercise types for this section: [list with names]"
   "Forbidden and why: [list with reasons]"
   "Level-specific notes: [from sectionProfile.levelSpecificNotes]"
   "Minimum variety: {sectionProfile.minExerciseVariety} distinct formats"

6. COMPOSE THE GRAMMAR SCOPE BLOCK
   "Grammar structures in scope for {level}: [cefrRules.grammarInScope]"
   "Structures OUT of scope (do not use): [cefrRules.grammarOutOfScope]"

7. COMPOSE VOCABULARY CONSTRAINTS
   "Vocabulary load: {cefrRules.vocabularyPerLesson.productive} productive items,
    {cefrRules.vocabularyPerLesson.receptive} receptive items"
   "Instruction language: {cefrRules.instructionLanguage}"

8. BUILD FINAL PROMPT
   systemPrompt = existing teacher/student profile block (unchanged)
                 + grammar scope block (step 6)
                 + vocabulary constraints (step 7)
                 + L1 notes (step 4)

   userPrompt = existing section-specific prompt
               + exercise guidance block (step 5)
               + template-specific instructions (step 3)

9. FOR CURRICULUM GENERATION (BuildCurriculumPrompt):
   courseRules = load("data/pedagogy/course-rules.json")
   Append skill distribution targets to the prompt.
   Append variety rules.
   Append recycling guidance from grammarProgression.
```

**Pseudocode for the core composition (not real C#, showing the logic):**

```
function composePromptGuidance(level, section, template, nativeLang):
  cefr = cefrLevels[level]
  profile = sectionProfiles[section][level]

  validTypes = intersection(cefr.appropriate, profile.valid)

  if template:
    overlay = templateOverrides[template].sections[section]
    if overlay.priorityTypes:
      validTypes = prioritize(overlay.priorityTypes, validTypes)

  forbidden = union(
    cefr.inappropriate,
    profile.forbidden
  )
  validTypes = validTypes.minus(forbidden.ids)

  if nativeLang:
    l1 = l1Influence.lookup(nativeLang)
    validTypes = validTypes.plus(l1.additionalTypes)
    // CRITICAL (Isaac review): re-filter after L1 additions.
    // Without this, CO-06 added for Mandarin speakers would bypass
    // WarmUp's "all CO-* forbidden" rule.
    validTypes = validTypes.minus(forbidden.ids)

  // Apply template minExerciseVarietyOverride if present
  variety = overlay?.minExerciseVarietyOverride ?? profile.minExerciseVariety

  return {
    validTypes:    validTypes.map(id => catalog[id].name),
    forbidden:     forbidden.map(f => f.id + ": " + f.reason),
    notes:         profile.levelSpecificNotes,
    minVariety:    variety,
    grammarScope:  cefr.grammarInScope,
    grammarNoGo:   cefr.grammarOutOfScope,
    vocabLoad:     cefr.vocabularyPerLesson,
    l1Notes:       l1?.notes ?? "",
    templateNotes: overlay?.notes ?? ""
  }
```

**Key point:** The composition is a series of set operations (intersect, union, subtract) and string concatenation. No inheritance, no polymorphism, no visitor pattern. Sets and strings.

---

## File Organization

```
data/
  pedagogy/
    exercise-types.json                  # Layer 1: 72 exercise types (catalog)
    template-overrides.json              # Layer 4: 5-7 template definitions
    l1-influence.json                    # Layer 5: language family adjustments
    course-rules.json                    # Layer 6: cross-session variety rules
    cefr-levels/
      a1.json                            # Layer 3: CEFR A1 rules
      a2.json
      b1.json
      b2.json
      c1.json
      c2.json
  section-profiles/                      # Layer 2: existing location, enhanced
    warmup.json
    presentation.json
    practice.json
    production.json
    wrapup.json
  curricula/
    iberia/                              # Existing curricula data (unchanged)
      A1.1.json
      ...
```

**Naming convention:** lowercase, hyphens for multi-word names. No nesting deeper than one directory inside `pedagogy/`. The CEFR levels get their own subdirectory because there are 6 of them and they share a schema; the rest are singletons.

**All files are embedded resources** in the backend assembly, same as the current section profiles. Loaded once at startup, cached in a singleton service. No file I/O at runtime.

---

## Migration Path

This is not a rewrite. The current system works. The migration adds data files and modifies two services to read them. Each step is independently deployable.

### Step 1: Create the exercise type catalog

Create `data/pedagogy/exercise-types.json` with all 72 entries from Isaac's spec. This is pure data entry, no code changes. The file exists but nothing reads it yet.

**Effort:** 1-2 hours of data entry. Mechanical transcription from the spec tables.

### Step 2: Create CEFR level files

Create 6 files under `data/pedagogy/cefr-levels/`. Extract grammar scope, exercise appropriateness, and vocabulary load from Isaac's Section 3. Again, pure data entry.

**Effort:** 2-3 hours. More judgment needed to ensure grammar scope lists are complete.

### Step 3: Enhance section profiles with exercise type references

Add `validExerciseTypes`, `forbiddenExerciseTypes`, `levelSpecificNotes`, and `minExerciseVariety` to each level in each section profile. The existing fields stay untouched (backward compatible).

**Effort:** 3-4 hours. Cross-referencing Isaac's Section 2 with the exercise catalog.

### Step 4: Create template overrides file

Move the hardcoded template logic from `PromptService.cs` into `data/pedagogy/template-overrides.json`. Add Isaac's two new templates (Thematic Vocabulary, Culture & Society).

**Effort:** 2 hours.

### Step 5: Create L1 influence and course rules files

Transcribe Isaac's Sections 5 and 6. Pure data entry.

**Effort:** 1-2 hours.

### Step 6: Build PedagogyConfigService

Create a new service (`PedagogyConfigService`) that:
- Loads all Layer 1-6 files at startup (embedded resources, same pattern as `SectionProfileService`)
- Exposes methods like `GetValidExerciseTypes(section, level, template?)`, `GetGrammarScope(level)`, `GetL1Adjustments(nativeLang)`
- The existing `SectionProfileService` can delegate to this or be absorbed into it

**Effort:** Half a day of coding. It's dictionary lookups and set operations.

### Step 7: Modify PromptService to use PedagogyConfigService

Replace the hardcoded template strings in `LessonPlanUserPrompt` with calls to `PedagogyConfigService`. The prompt construction logic stays in `PromptService`; it just reads from config instead of string literals.

The `GrammarConstraints` field in `GenerationContext` can be populated from `PedagogyConfigService.GetGrammarScope(level)` as a fallback when the curriculum doesn't provide specific constraints.

**Effort:** Half a day. The prompt composition is string building with different inputs.

### Step 8: Update frontend sectionContentTypes.ts

Replace the hardcoded `getAllowedContentTypes` switch statement with data driven from the backend (either from section profiles or a new `/api/pedagogy/section-rules` endpoint). Or, simpler: generate a static TypeScript file from the JSON at build time.

**Effort:** A few hours. The frontend change is small.

### Step 9: Wire course rules into curriculum generation

Modify `BuildCurriculumPrompt` to inject variety rules and skill distribution targets from `course-rules.json` into the curriculum prompt.

**Effort:** A few hours.

### Total migration effort: roughly 5-6 working days (revised from 3-4 per Arch review).

Steps 1-5 can be done in a single session (pure data entry, 1-1.5 days). Steps 6-9 are code changes that can be individual PRs (3-4 days including tests, C# record extension, and touching 6-8 prompt methods). No big bang. No flag day.

---

## Additional Layers (from Isaac and Arch review)

### Section Coherence Rules (prompt-level, not a separate JSON file)

Isaac's spec Section 2.7 defines 5 critical inter-section coherence rules that prevent the AI from generating incoherent lessons. These are not data-layer rules (they don't filter exercise types), they are prompt constraints. The composition logic (Step 8) must inject them as a fixed prompt block:

```
SECTION COHERENCE RULES (mandatory, never omit):
1. The THEME of Warm Up must relate to the THEME of Presentation (same field, not identical).
2. Practice MUST use EXCLUSIVELY content from Presentation. No new grammar or vocabulary.
3. Production MUST be achievable with the language practiced in Practice.
4. Wrap Up MUST refer to lesson content, not external topics.
5. Linguistic level must NOT increase between sections. If Presentation is A2, Practice cannot demand B1.
```

This is a static string, not configurable. It applies to every lesson at every level with every template. No JSON needed.

### Declared Difficulty Integration

When a student has declared difficulties (e.g., "struggles with subjunctive"), the composition logic should add a step between L1 adjustments and final prompt assembly:

```
if student.weaknesses is not empty:
  for each weakness:
    append to Practice guidance: "Include at least 1 exercise targeting: {weakness}"
    append to Production guidance: "Create a context where {weakness} is natural to use"
    append to WrapUp guidance: "Reference progress on: {weakness}"
  // But do NOT overload: max 1-2 weakness-targeted exercises per lesson
```

This is prompt-level logic, not a new JSON file. The student's weaknesses already exist in the data model (student profile). The composition just needs to read them and append targeted guidance.

### Learning Style Substitution Rules

When a teacher notes style preferences ("hates role-play", "very visual"), the system needs valid substitution paths. This is a small addition to `l1-influence.json` or a new file `data/pedagogy/style-substitutions.json`:

```json
{
  "substitutions": [
    {
      "rejects": ["EO-01", "EO-02"],
      "label": "role-play",
      "substituteWith": ["EO-04", "EO-08", "EO-03"],
      "neverSubstituteWith": ["EE-*"],
      "rule": "Never replace an oral activity with a written one. Preserve the competency."
    },
    {
      "rejects": ["EE-07", "EE-09", "EE-10"],
      "label": "long writing",
      "substituteWith": ["EE-03", "EE-06", "EO-10"],
      "neverSubstituteWith": [],
      "rule": "Always keep some writing. Shorten, don't eliminate."
    },
    {
      "rejects": ["GR-01", "GR-02", "GR-05"],
      "label": "mechanical grammar",
      "substituteWith": ["GR-08", "GR-03", "PRAG-01"],
      "neverSubstituteWith": [],
      "rule": "Change format, don't eliminate grammar practice."
    },
    {
      "rejects": ["CO-01", "CO-02", "CO-03"],
      "label": "listening",
      "substituteWith": ["CO-04", "CO-07"],
      "neverSubstituteWith": [],
      "rule": "Never eliminate listening comprehension entirely."
    }
  ]
}
```

### C1/C2 Vocabulary Approach

The `vocabularyPerLesson` schema uses numeric min/max, which is appropriate for A1-B2. For C1 and C2, Isaac's spec says vocabulary is NOT measured in items per lesson but in depth (collocations, register variants, connotations). The CEFR level files for C1 and C2 should use an alternative field:

```json
{
  "level": "C1",
  "vocabularyPerLesson": null,
  "vocabularyApproach": "Depth over quantity. Focus on collocations of known roots, register variants (formal/informal/literary), connotations, and pragmatic nuance. The student already has broad vocabulary; the goal is precision and richness."
}
```

The composition logic checks: if `vocabularyPerLesson` is null, use `vocabularyApproach` string in the prompt instead of numeric constraints.

### Production and Presentation Profile Examples

For completeness, the section profiles for Production and Presentation must capture these forbidden types (from Isaac's spec Sections 2.3 and 2.5):

**Presentation forbidden (all levels):**
- `GR-01`, `GR-02`, `GR-03` (controlled production belongs in Practice, not Presentation)
- `EO-02`, `EO-05`, `EO-06` (student cannot produce freely before receiving input)
- `EE-04` through `EE-10` (free written production belongs in Production)
- `LUD-*` pattern (games are for Practice/reinforcement, not for presenting new content)

**Production forbidden (all levels):**
- `GR-01` through `GR-07` (controlled grammar exercises belong in Practice)
- `VOC-01` through `VOC-03` (vocabulary presentation belongs in Presentation)
- `CE-*` pattern (comprehension is about the text, Production is about the student)
- `LUD-*` pattern (games are for Practice, not for free production)

### Grammar Scope Relationship with Curricula Data (Arch review)

**Clarification:** The CEFR-level grammar scope (Layer 3, `data/pedagogy/cefr-levels/`) is the **universal** scope defining what grammar is valid at each CEFR level per the MCER standard. The curricula data (`data/curricula/iberia/`) is **institution-specific**, mapping grammar to specific textbook units and teaching sequences at a particular academy.

When both are available, they compose: the curricula provides the *sequence* (which unit covers which grammar point), and the CEFR level provides the *boundary* (what's valid at this level, regardless of unit). If the curricula says Unit 3 of A2 covers preterito indefinido, and the CEFR level file says indefinido is valid at A2, that's consistent. If the curricula tried to put subjunctive in A1, the CEFR level file would flag it as out of scope.

`CurriculumTemplateService.GetGrammarForCefrPrefix()` aggregates grammar from curriculum template units. This should continue to work as the curriculum-specific source. `PedagogyConfigService.GetGrammarScope()` provides the universal CEFR boundary. The prompt builder uses both: curriculum grammar for specific lesson targets, CEFR grammar scope for validation constraints.

### Interface and Validation Requirements (Arch review)

1. **`IPedagogyConfigService` interface** must be defined following the `IFoo/Foo` pattern used by all services in the codebase (`ISectionProfileService`, `ICurriculumTemplateService`, etc.).

2. **Startup validation:** The service must validate cross-layer referential integrity at load time:
   - Every exercise type ID in section profile `validExerciseTypes` must exist in the exercise catalog
   - Every `id` in `forbiddenExerciseTypes` must exist in the exercise catalog
   - Every `pattern` in `forbiddenExerciseTypes` must match at least one entry in the catalog
   - Every exercise type in CEFR `appropriateExerciseTypes` must exist in the catalog
   - Fail fast with descriptive errors on any dangling reference

3. **Embedded resources in csproj:** New files need `EmbeddedResource` entries with `Link="Pedagogy\%(Filename)%(Extension)"` (and `Link="Pedagogy\CefrLevels\%(Filename)%(Extension)"` for the subdirectory).

4. **Diagnostic logging:** When building prompt guidance, log the full composition chain (which layers contributed which types) at Debug level. This makes "why did exercise X appear/disappear" traceable without a debugger.

---

## What I Would NOT Do

### 1. Do not create a generic "rule engine"

It would be tempting to build a system where pedagogical rules are expressed as conditions and actions (`if level == A1 and section == Practice then exclude GR-03`). This creates a DSL that nobody except the author can debug, that needs its own test suite, and that gives you maybe 5% flexibility gain over flat JSON lists. The flat lists are readable by Isaac, by the developer, and by the AI that interprets them.

### 2. Do not normalize exercise types into a relational schema

72 exercise types with a handful of fields each is a JSON array, not a database table. Don't create an `ExerciseType` table, a `CompetencyMap` join table, a `CefrRange` table. The data changes once every few months when Isaac updates the spec. It's configuration, not transactional data.

### 3. Do not build inheritance between templates and sections

"A Grammar Focus lesson's Practice section inherits from the base Practice profile and overrides the priority types." No. Just read the base profile, read the template override, merge. Two dictionary lookups and an array concatenation. Inheritance implies a type hierarchy, and type hierarchies imply someone has to understand the hierarchy to debug it.

### 4. Do not create per-language JSON files for L1 influence

Isaac provided data for 5 language families and 3 specific languages. That's one small file, not 8 files. When it grows to 20 specific languages, it's still one file because each entry is 10-15 lines. File-per-language would create directory clutter with no retrieval benefit.

### 5. Do not add exercise type validation at the database level

The exercise type IDs (GR-01, CE-07) should NOT be stored as foreign keys or validated by the database. They are prompt guidance, not data integrity constraints. The AI generates content; the backend validates the content type (vocabulary, exercises, grammar), not the specific exercise subtype. If the AI ignores the prompt and generates a GR-04 where GR-01 was requested, that's a prompt quality issue, not a data integrity issue. Don't confuse the two.

### 6. Do not version the JSON files per language (Spanish vs French)

Isaac's spec notes differences between ELE (Spanish) and FLE (French), but the structure is the same. The exercise catalog is universal. What changes between languages is: (a) which exercises are more/less important (CO-06 is critical for FLE, less so for ELE), and (b) where CEFR boundaries fall for specific grammar concepts. Both can be handled with a `language` field on specific entries in the CEFR level files, or with a language-specific overlay file when French is actually implemented. Don't build the French support until there's a French course. YAGNI.

### 7. Do not try to make the AI "select" exercise types by ID

The temptation: pass the AI a list of valid exercise type IDs and ask it to return which ones it chose. The reality: the AI is generating lesson content (texts, exercises, conversations), not selecting from a menu. The exercise types in the prompt serve as constraints and inspiration, not as a pick-list. The AI should understand "create fill-in-the-blank exercises with a word bank" (which happens to be GR-01 at A1), not "select GR-01 from the following options." The IDs are for the system's internal bookkeeping and validation, not for the AI's output format.

---

## Summary

Eight JSON files (plus 6 small CEFR-level files, plus 1 style-substitutions file). One new service (`IPedagogyConfigService`/`PedagogyConfigService`) that reads them with startup validation. Modifications to PromptService to use the service instead of hardcoded strings. The frontend gets one small change (data-driven content type rules). Total effort: 5-6 days, no rewrites, no new abstractions.

Isaac's 908 lines of pedagogical wisdom (72 exercise types, not 63) become machine-readable configuration. Code stays dumb: load JSON, merge sets, build strings, hand to AI.
