# Task 320: Create CEFR Level Rules JSON Files (A1-C2)

**Issue:** #320
**Branch:** worktree-task-t320-cefr-level-rules
**Sprint:** Student-Aware Curriculum

## Goal

Create 6 JSON files under `data/pedagogy/cefr-levels/` that encode per-level grammar scope, appropriate/inappropriate exercise types, vocabulary load, instruction language, metalanguage level, error correction strategy, and scaffolding default.

## Source Documents

- Isaac's spec: `/c/ws/PersonalOS/03_Workspace/langTeachSaaS/plan/pedagogy-specification/pedagogy-model-spec.md` (Section 3) -- main repo only, not in worktree
- Sophy's architecture: `/c/ws/PersonalOS/03_Workspace/langTeachSaaS/plan/pedagogy-specification/pedagogy-config-architecture.md` (Layer 3) -- main repo only
- Exercise catalog: `data/pedagogy/exercise-types.json` (IDs already validated)

## Schema (Layer 3 from Sophy's architecture)

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
    "productive": { "min": 0, "max": 0 },
    "receptive": { "min": 0, "max": 0 }
  },
  "instructionLanguage": "string",
  "metalanguageLevel": "string",
  "errorCorrection": "string",
  "scaffoldingDefault": "string"
}
```

C1 and C2 use `vocabularyApproach` (string) instead of `vocabularyPerLesson` (object), since vocabulary at advanced levels is measured by depth, not item count.

## File Output

All 6 files go under `data/pedagogy/cefr-levels/`:
- `a1.json`
- `a2.json`
- `b1.json`
- `b2.json`
- `c1.json`
- `c2.json`

## Data Summary per Level

### A1
- grammarInScope: 15 items (present indicative regular+irregular, gender/number, articles, demonstratives A1.2, possessives, subject pronouns, interrogatives, hay vs esta/estan, gustar A1.2, tambien/tampoco A1.2, basic prepositions, reflexives A1.2, ir a + inf / tener que + inf, numbers/time/days/months)
- grammarOutOfScope: preterito indefinido, imperfecto, imperativo, subjuntivo, OD/OI pronouns, subordinadas con subjuntivo, condicional, perifrasis verbales except ir a/tener que
- appropriateExerciseTypes: GR-01/02/05/06/07/09, VOC-01/02/03/05/09, CE-01/02, EE-01/02/03, EO-01/03/04, LUD-01/02/06/07
- inappropriateExerciseTypes: GR-03/04/08, CE-04 through CE-09, EO-02/05/06/07
- vocabulary: productive 8-12, receptive 0-5
- instructionLanguage: "L1 for procedural instructions, L2 for linguistic content"
- metalanguageLevel: "Minimal: verbo, nombre, adjetivo only"
- errorCorrection: "Immediate and explicit. Teacher provides correct form. Brief explanation."
- scaffoldingDefault: "high"

### A2
- grammarInScope: All A1 + preterito indefinido/perfecto, contraste perfecto/indefinido, estar+gerundio, imperativo afirmativo (tu, usted), pronombres OD (lo, la, los, las), pronombres OI (le, les), comparativos/superlativos, conectores basicos (porque, pero, y, o, tambien, ademas, sin embargo), por/para (basics), marcadores temporales (ayer, la semana pasada, hace+tiempo, desde hace), ir a+inf, acabar de+inf, tener que/hay que
- grammarOutOfScope: preterito imperfecto (intro at end A2.2 but contraste with indefinido is B1), subjuntivo, condicional, oraciones relativas con subjuntivo, voz pasiva, estilo indirecto, conectores complejos
- appropriateExerciseTypes: all A1 + GR-03/08, VOC-04/06, CE-03/06, EE-04/05/06, EO-02/08, PRAG-01/05, LUD-03/04/05/08
- inappropriateExerciseTypes: GR-04, CE-07/08/09, EO-05/06
- vocabulary: productive 10-15, receptive 5-8
- instructionLanguage: "Mostly in L2, with L1 clarifications if the task type is new"
- metalanguageLevel: "Basic metalanguage in L2: pasado, presente, verbo, adjetivo"
- errorCorrection: "Immediate for systemic errors (fossilization risk). Deferred for performance errors. Begin encouraging self-correction: Are you sure? Think again."
- scaffoldingDefault: "high"

### B1
- grammarInScope: All A2 + preterito imperfecto and contrast with indefinido, pluscuamperfecto, futuro simple (including irregulars), condicional simple, subjuntivo presente (introduction: ojala, quiero que, cuando+subj, para que, es necesario que), imperativo negativo, oraciones temporales (cuando, mientras, antes de que, despues de que), causales y finales (porque, como, para que), estilo indirecto basico (dijo que + imperfecto), conectores: sin embargo, no obstante, en primer lugar, por un lado/otro, en conclusion, perifrasis verbales (llevar+gerundio, dejar de, seguir, volver a+inf), oraciones relativas con indicativo (que, donde, quien), condiciones reales (si+presente, futuro), hipotesis (si+imperfecto de subjuntivo, condicional) (B1.2)
- grammarOutOfScope: subjuntivo imperfecto (except si-clause introduction B1.2), subjuntivo perfecto y pluscuamperfecto, oraciones concesivas complejas (aunque+subj is B1.2/B2 border), voz pasiva con ser, construcciones impersonales complejas, perifrasis modales sofisticadas (venir a+inf, dar por+participio)
- appropriateExerciseTypes: all A2 + GR-04/10, CE-04/05, VOC-07/11, EE-07/08, EO-05/06/07, CO-05, PRAG-04
- inappropriateExerciseTypes: CE-08, EE-09, EE-11
- vocabulary: productive 12-18, receptive 8-10
- instructionLanguage: "Entirely in L2. Grammatical metalanguage may be used freely in L2."
- metalanguageLevel: "Full grammatical metalanguage in L2: subjuntivo, condicional, oracion subordinada"
- errorCorrection: "Preferably deferred. Note errors during production, correct at end. Foster self-correction. Distinguish errors of competence (does not know the rule) from errors of performance (knows but fails in spontaneous production)."
- scaffoldingDefault: "medium"

### B2
- grammarInScope: All B1 + subjuntivo presente (all uses: duda, emocion, valoracion, finalidad, concesion), subjuntivo imperfecto (all uses: deseo irreal, condiciones contrafactuales, cortesia), contraste indicativo/subjuntivo en subordinadas, condicionales complejas (si hubiera/hubiese sabido habria...), voz pasiva con ser y pasiva refleja, estilo indirecto completo (con cambios de tiempo y deicticos), conectores discursivos avanzados (ahora bien, es decir, dicho de otro modo, en definitiva), oraciones concesivas (aunque+subj, a pesar de que, por mas que), oraciones consecutivas (tan...que, tanto...que, de modo que), perifrasis verbales ampliadas (ponerse a, acabar por, llegar a, venir a), valores del se (reflexivo, reciproco, impersonal, pasiva refleja, dativo de interes), subjuntivo perfecto
- grammarOutOfScope: subjuntivo pluscuamperfecto en usos literarios, futuro perfecto de conjetura en registros muy formales, usos retoricos avanzados del subjuntivo, arcaismos gramaticales
- appropriateExerciseTypes: all GR, all VOC, CE-01 to CE-08, EE-01 to EE-09, EO-01 to EO-09, CO-01 to CO-05+CO-08, all PRAG, all LUD
- inappropriateExerciseTypes: []
- vocabulary: productive 15-20, receptive 10-15
- instructionLanguage: "Entirely in L2 with varied register"
- metalanguageLevel: "Full: advanced grammatical metalanguage expected"
- errorCorrection: "Mostly deferred. Student self-corrects with teacher cues. Recasting."
- scaffoldingDefault: "low"

### C1
- grammarInScope: All grammar in scope. Focus shifts to pragmatic nuances (por que quisiera suena mas cortes que queria), sociolinguistic variation (vos vs tu vs usted across countries), advanced collocations and lexico-grammatical constraints, textual cohesion mechanisms, pragmatic values of verb tenses (presente historico, futuro de probabilidad, imperfecto de cortesia), register differences (espanol escrito formal vs oral formal vs coloquial vs literario)
- grammarOutOfScope: (nothing out of scope)
- appropriateExerciseTypes: same as B2 minus the 6 inappropriate types, plus CE-09, EE-10/11, EO-09/10, CO-06/07
- inappropriateExerciseTypes: GR-01 (mechanical fill-in-the-blank -- too simple unless content is genuinely C1), GR-02 (mechanical multiple choice), GR-05 (pure conjugation paradigms -- no longer the focus), VOC-01 (word lists without context), LUD-01 (crossword -- too childish for cognitive level), LUD-02 (word search -- too childish), LUD-06 (memory/pairs -- too childish)
- vocabularyApproach: "Depth over quantity: collocations of the same root, register variants, connotations. Student already has broad vocabulary; objective is precision and richness, not item count."
- instructionLanguage: "L2 exclusively. Formal/academic register."
- metalanguageLevel: "Metalanguage is a learning tool, not an obstacle. Full academic and rhetorical terms."
- errorCorrection: "Mostly deferred. Student self-corrects with teacher cues. Recasting. Focus on register and style precision."
- scaffoldingDefault: "low"

### C2
- grammarInScope: Full mastery. C2 is not more grammar -- it is pragmatic, stylistic, and cultural mastery at the level of a cultured native speaker. Literary, essayistic, technical texts as base material. Stylistic and rhetorical analysis. Complex mediation (summarizing a technical report for a general audience). Multi-register production. Humor, irony, intertextuality. Deep dialectal variation (rioplatense, andino, caribeno, peninsular).
- grammarOutOfScope: (nothing out of scope)
- appropriateExerciseTypes: same as C1
- inappropriateExerciseTypes: same as C1
- vocabularyApproach: "Academic and literary depth: precision, stylistic register, dialectal awareness, rhetorical figures, intertextual references."
- instructionLanguage: "L2 exclusively"
- metalanguageLevel: "Full academic, rhetorical, and stylistic metalanguage"
- errorCorrection: "Self-correction with teacher recasting. Focus on register, style, and dialectal precision. Seminar-style feedback."
- scaffoldingDefault: "low"

## Implementation Steps

1. Create `data/pedagogy/cefr-levels/` directory
2. Write a1.json
3. Write a2.json
4. Write b1.json
5. Write b2.json
6. Write c1.json
7. Write c2.json
8. Validate all 6 files parse as valid JSON and IDs reference exercise-types.json

## No Code Changes

Pure data task. No backend or frontend changes needed. These files will be consumed by future issues that add CefrRulesService and prompt integration.

## Out of Scope

- C# model classes for CefrLevel (separate issue)
- Loading files at startup (separate issue)
- Prompt integration (separate issue)
- Validation logic checking IDs against exercise catalog (separate issue)
