# Task 163: Extract and Structure Curriculum Data into JSON

## Source documents (19 files)

Three distinct institutions with different formats:

### Iberia Language Academy - PROGRAMA files (15 files)
Format: 1-page. Numbered list of communicative objectives + textbook reference + evaluation.
No per-unit breakdown. Levels: A1.1, A1.2, A2.1, A2.2, A2.2+, B1.1, B1.1+, B1.2, B1.2+, B2.1, B2.2, C1.1, C1.1+, C1.2, C1.2+

### Instituto Educativo Español - `Contenidos gramaticales por nivel y subnivel.pdf` (1 file, 24 pages)
Format: Table with columns per unit: Objetivo, Contenidos funcionales, Contenidos gramaticales, Contenidos léxicos, Componente estratégico, Contenidos culturales.
Levels (own sub-level system): A1.1-A1.3, A2.1-A2.4, B1.1-B1.5, B2.1-B2.6, C1.1-C1.6, C2.1-C2.6

### Kingsbrook Idiomas - `Contenidos gramaticales por nivel.pdf` (1 file, 6 pages)
Format: Bullet lists of grammar resources + vocabulary per broad CEFR level (A1, A2, B1, B2, C1, C2).

### Supplementary (2 files)
- `Sistematizacion la casa.pdf`: Iberia vocabulary card with house room images and labels
- `4.Gustar.pdf`: Iberia grammar systematization card (gustar verb)

---

## JSON Schema

### Main level schema (per course file)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12",
  "type": "object",
  "required": ["level", "cefr_level", "institution", "source_file"],
  "properties": {
    "level": { "type": "string", "description": "Sub-level identifier as used in the source (e.g. 'A1.1', 'B1.2+')" },
    "cefr_level": { "type": "string", "enum": ["A1","A2","B1","B2","C1","C2"] },
    "institution": { "type": "string" },
    "source_file": { "type": "string" },
    "hours": { "type": "integer", "description": "Course duration in hours (40 for Iberia)" },
    "textbook": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "units_covered": { "type": "array", "items": { "type": "integer" } }
      }
    },
    "communicative_objectives": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Flat list of course-level objectives (from Iberia programs)"
    },
    "units": {
      "type": "array",
      "description": "Per-unit breakdown (from Instituto Educativo)",
      "items": {
        "type": "object",
        "required": ["unit_number"],
        "properties": {
          "unit_number": { "type": ["integer","string"] },
          "title": { "type": "string" },
          "textbook_ref": { "type": "string", "description": "e.g. 'AULA 3 U.4'" },
          "overall_goal": { "type": "string" },
          "communicative_functions": { "type": "array", "items": { "type": "string" } },
          "grammar": { "type": "array", "items": { "type": "string" } },
          "vocabulary_themes": { "type": "array", "items": { "type": "string" } },
          "learning_strategies": { "type": "array", "items": { "type": "string" } },
          "cultural_content": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "exam_prep": {
      "type": ["object","null"],
      "description": "Reserved for DELE/DALF exam prep data. null for general-learning curricula.",
      "properties": {
        "exam_type": { "type": "string", "description": "e.g. 'DELE', 'DALF'" },
        "exam_level": { "type": "string" },
        "exam_components": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

### Grammar map schema (per institution, per CEFR level)

```json
{
  "cefr_level": "B1",
  "institution": "Kingsbrook Idiomas",
  "source_file": "Contenidos gramaticales por nivel.pdf",
  "grammar_resources": ["Pretérito Imperfecto de Indicativo", "..."],
  "vocabulary_themes": ["Trabajo", "Periodos históricos", "..."]
}
```

---

## File organization

```
data/curricula/
  schema.json                          # JSON Schema for level files
  README.md                            # Structure, schema, gaps
  iberia/
    A1.1.json ... C1.2+.json           # 15 files
  instituto_educativo/
    A1.1.json ... C2.6.json            # 30 files (own sub-level numbering)
  grammar_maps/
    kingsbrook_by_cefr_level.json      # 6 levels A1-C2 in one file
  systematization_examples/
    la_casa.md                         # Vocabulary card description
    gustar.md                          # Grammar card description
```

**Note on level naming**: Instituto Educativo uses more granular sub-levels (A1.3, B1.5, C2.6 etc.) that don't map 1:1 to Iberia's sub-levels. Files are named per the source document's own identifiers. The README documents the mapping.

---

## Implementation steps

### 1. Create directory structure
```
mkdir -p data/curricula/{iberia,instituto_educativo,grammar_maps,systematization_examples}
```

### 2. Write schema.json
Document the JSON schema above.

### 3. Extract Instituto Educativo curriculum
Source already fully read in this session (all 24 pages). Direct transcription into JSON:
- A1.1 (units 0-3), A1.2 (units 4-6), A1.3 (units 7-9)
- A2.1 (units 1-3), A2.2 (units 4-6), A2.3 (units 7-8), A2.4 (units 9-11)
- B1.1 (units 1-3), B1.2 (units 4-5), B1.3 (units 6-8), B1.4 (units 9-11), B1.5 (units 12-13)
- B2.1 (units 1-2), B2.2 (units 3-4), B2.3 (units 5-6), B2.4 (units 7-8), B2.5 (units 9-10), B2.6 (units 11-12)
- C1.1 (units 1-2), C1.2 (units 3-4), C1.3 (units 5-6), C1.4 (units 7-8), C1.5 (units 9-10), C1.6 (units 11-12)
- C2.1 (units 1-2), C2.2 (units 3-4), C2.3 (units 5-6), C2.4 (units 7-8), C2.5 (units 9-10), C2.6 (units 11-12)

### 4. Extract Iberia PROGRAMA files
Read each PDF, extract: level, hours (40), textbook, objectives list.
Files already partially read (A1.1, B1.1 confirmed). Remaining 13 to read.

### 5. Extract Kingsbrook grammar map
Source already read (6 pages). Transcribe into `grammar_maps/kingsbrook_by_cefr_level.json`.

### 6. Document systematization examples
`la_casa.pdf` is a vocabulary image card. `4.Gustar.pdf` (to be read) is a grammar summary card.
Document format and content in markdown.

### 7. Manual verification (POC levels)
- **A1.1**: Cross-check iberia/A1.1.json objectives vs instituto_educativo/A1.1.json units vs source PDFs
- **B1.1**: Verify all 3 units, all 6 columns match source
- **B2.1**: Verify all 2 units match source

### 8. Spot-check remaining 16 PDFs
For each: verify no missing required fields, no empty arrays for grammar/vocabulary, units present.

### 9. Write README
- Schema explanation with field descriptions
- Institution overview and level mapping notes
- Known gaps and unmapped content
- How to use in Issue 164 (Course Planner templates)

---

## Known gaps / unmapped content

- **Systematization examples** don't fit the per-level schema; documented separately in markdown
- **Kingsbrook data** operates at coarse CEFR level granularity (no sub-levels), stored in grammar_maps/ not levels/
- **Instituto Educativo sub-levels** (A1.3, A2.3, A2.4, B1.3-B1.5, etc.) have no direct Iberia equivalent
- **`componente estrategico` column**: learning strategies, not directly used for generation but preserved
- C1/C2 Instituto Educativo column is labeled "Tipos de texto y léxico" instead of "Contenidos léxicos" - mapped to `vocabulary_themes` and noted

---

## Validation approach

A simple Python validation script at `data/curricula/validate.py` that:
1. Loads all JSON files
2. Verifies required fields present
3. Verifies arrays non-empty where expected (grammar, vocabulary_themes for Instituto Educativo files)
4. Reports any issues

No production integration - purely a data-quality check tool.
