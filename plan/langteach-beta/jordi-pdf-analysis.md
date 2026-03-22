# Jordi PDF Analysis: Las partes del día y las horas

**Source:** `feedback/raw/2026-03-22-jordi-pdf-partes-del-dia.pdf`
**Date:** 2026-03-22
**Issue:** #208

---

## 1. What the PDF Is

A single-page visual explainer (infographic-style reference card) for Spanish language learners on two related grammar points:

- **"por + parte del día"** (e.g., _estudio por la mañana_) to express a general time period
- **"de + parte del día"** (e.g., _a las 9 de la mañana_) to specify which period a clock time belongs to

The material is self-contained and designed for self-study or classroom handout use.

---

## 2. Visual Structure and Layout

The page has five distinct zones stacked vertically:

### Zone 1: Header banner
- Large bold title: "LAS PARTES DEL DÍA Y LAS HORAS"
- Decorative sun, clouds, stars imagery
- High contrast, immediately communicates the topic

### Zone 2: Timeline infographic (central visual)
- A horizontal arc/timeline representing the full day
- Labeled sections: POR LA MAÑANA, POR EL MEDIODÍA, POR LA NOCHE, POR LA TARDE
- Sun and moon icons at each period boundary for visual anchoring
- Time range subtitles under each label (e.g., "Desde el amanecer hasta el mediodía")
- Color bands distinguish each period (warm/cool tones)

### Zone 3: Clock row
- Eight analog clock illustrations showing specific times
- Each clock labeled below with the full Spanish expression:
  - "Son las ocho de la mañana", "Son las nueve y cuarto de la mañana", etc.
- Clocks span from 8am through midnight to show the full system in action

### Zone 4: IMPORTANTE callout
- Boxed section with two grammar rules formatted as color-highlighted formulas:
  - Para hablar de momentos generales: **POR + parte del día**
  - Para decir la hora exacta: **SON LAS + hora + de la/del + parte del día**

### Zone 5: Numbered contrasting examples
- Example 1 (green circle): "Nos vemos a las 9 **de** la mañana" + grammatical explanation
- Example 2 (blue circle): "Estudio **por** la mañana" + grammatical explanation
- Each example has a warning/attention icon callout explaining the semantic distinction

---

## 3. What Makes This Pedagogically Appealing

1. **Self-contained reference** - the entire concept fits on one page; students can keep it as a study aid
2. **Multiple representations of the same concept** - timeline + clock row + formula + contrasting examples all encode the same grammar rule from different angles
3. **Contrast-based structure** - the two examples directly pit "de" vs "por" against each other, which is exactly the confusion students have
4. **Grammar formulas made explicit** - "POR + parte del día" is shown as a pattern template, not buried in prose
5. **Color and visual hierarchy** - different colors for time periods, bold for key terms, the hierarchy (concept → rule → formula → example) is immediately scannable
6. **Decorative engagement** - the sun/moon/star imagery makes the material appealing vs a plain grammar table
7. **Teacher-visible reasoning** - annotations explain WHY ("la hora pertenece al periodo"), not just WHAT

This is materially different from what "ChatGPT can easily generate" (Jordi's words): it is a structured visual artifact, not a prose explanation.

---

## 4. Errors Jordi Mentioned

Based on visual inspection of the PDF:

1. **Typo in clock row:** "Son las **sinco** de la tarde" (the 5:00 pm clock) should be "Son las **cinco**"
2. **Garbled formula:** The IMPORTANTE box ends with "SON LAS + hora + de la / del **←d+parte del día**" -- the "←d+" is a layout/formatting artifact that makes the formula unreadable in the PDF

These are minor errors that don't undermine the pedagogical value but would embarrass a teacher if distributed to students.

---

## 5. Gap Analysis: Current Content Types

| Type | Can it produce this? | Gap |
|---|---|---|
| `vocabulary` | No | Vocabulary lists isolated words with translation/example. Cannot encode timeline, clock diagrams, or formula patterns. |
| `grammar` | Partial | Grammar blocks are prose explanations with examples. Can express the rules in text but loses all visual structure -- no timeline, no clock row, no formula highlighting. |
| `exercises` | No | Practice-oriented (fill-in-the-blank, multiple choice). Orthogonal purpose. |
| `conversation` | No | Dialogue template. No reference material function. |
| `reading` | No | Linear prose passage. Opposite of a visual reference card. |
| `homework` | No | Assignment instructions. |
| `freeText` | Possible but inadequate | Could dump raw HTML/markdown but: (a) loses structured data, (b) AI has no schema to follow so output is inconsistent, (c) not editable by teacher in the block editor, (d) PDF export would need a special template. |

**Verdict:** No existing content type can produce this class of material in a structured, consistent, editable way.

---

## 6. Recommendation: New Content Type Needed

### Proposed type: `visualExplainer`

**Rationale:** This material belongs to a distinct pedagogical genre: a visual reference card that combines a central concept diagram, grammar formulas, and contrasting examples into a self-contained one-page artifact. Forcing it into `grammar` (prose) or `freeText` (unstructured HTML) would produce inconsistent, non-editable output and miss the key value -- the visual layout is the pedagogy.

**What a `visualExplainer` block would contain (proposed schema):**

```json
{
  "blockType": "visual-explainer",
  "concept": "Las partes del día y las horas",
  "targetLanguage": "es",
  "level": "A2",
  "centralVisual": {
    "type": "timeline",
    "periods": [
      { "label": "por la mañana", "range": "amanecer - mediodía", "icon": "sun-rising" },
      { "label": "por el mediodía", "range": "~12:00", "icon": "sun-high" },
      { "label": "por la tarde", "range": "12:00 - anochecer", "icon": "sun-setting" },
      { "label": "por la noche", "range": "anochecer - medianoche", "icon": "moon" }
    ]
  },
  "examples": [
    {
      "label": "de + parte del día",
      "sentence": "Nos vemos a las 9 de la mañana",
      "explanation": "Se usa de + parte del día para aclarar la hora exacta."
    },
    {
      "label": "por + parte del día",
      "sentence": "Estudio por la mañana",
      "explanation": "Se usa para hablar del periodo del día cuando ocurre una acción."
    }
  ],
  "formulas": [
    "POR + parte del día → momento general",
    "SON LAS + hora + de la/del + parte del día → hora exacta"
  ]
}
```

**What rendering would require:**
- A dedicated `VisualExplainerBlock` React component with multiple sub-renderers: `Timeline`, `ClockRow`, `FormulaBox`, `ContrastExamples`
- SVG or CSS-based clock illustration (or a library), or an image-generation step via AI
- A specialized PDF export template for this block type
- A Claude prompt that generates the schema above rather than prose

**Alternative (lower cost, lower fidelity):** Generate styled HTML inside a `freeText` block, with a specific AI prompt instructing Claude to output a complete HTML+CSS visual card. This avoids new renderers but: the output is non-editable in the block editor, inconsistent across runs, and harder to quality-check. It could serve as a prototype to validate teacher demand before investing in the full type.

---

## 7. Impact on Future Content Type Expansion

This analysis suggests the content type system should eventually support a **presentation/visual** tier alongside the current **prose/exercise** tier:

| Tier | Types today | Future additions |
|---|---|---|
| Prose/exercise | vocabulary, grammar, exercises, conversation, reading, homework | (mostly complete) |
| Visual/reference | (none) | visualExplainer, infographic, presentationSlide |

Jordi's signal is clear: he values this visual tier more than additional grammar exercises. Before building the full `visualExplainer` type, the right next step is a **freeText prototype** to validate that AI-generated visual explainers are useful to him in practice, then invest in structured rendering if he confirms it.

---

## 8. Proposed Follow-up Issues

| Priority | Issue | Rationale |
|---|---|---|
| P2 | Prototype `visualExplainer` via freeText + AI prompt | Low-cost validation; ship something Jordi can react to |
| P2 | Define `visualExplainer` schema and renderer | Only after prototype validates demand |
| P3 | PDF export template for visual blocks | After renderer exists |
