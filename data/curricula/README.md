# Curricula Data

Structured JSON extractions of Spanish-as-a-Foreign-Language (ELE) course programs from three partner institutions. Used by the LangTeach recommendation engine (issue #164).

## Directory Structure

```
data/curricula/
  schema.json                        JSON Schema (draft/2020-12) for level files
  validate.py                        Validation script
  README.md                          This file

  iberia/                            Iberia Language Academy (15 files)
    A1.1.json ... C1.2+.json

  instituto_educativo/               Instituto Educativo Espanol (30 files)
    A1.1.json ... C2.6.json

  grammar_maps/                      Cross-level grammar + vocabulary maps
    kingsbrook_by_cefr_level.json    Kingsbrook Idiomas (A1-C2 grammar map)

  systematization_examples/         Format documentation for supplementary materials
    la_casa.md                       Vocabulary image card example
    gustar.md                        Grammar worksheet example
```

## Source Institutions

### Iberia Language Academy
- **Files:** 15 (A1.1 through C1.2+)
- **Format:** 1-page PROGRAMA per level listing flat communicative objectives
- **Hours:** A-B levels 40h, C1 levels 80h
- **Textbook:** Aula Internacional (A1-A2 levels only)
- **Structure:** `communicative_objectives[]`, empty `units[]`

### Instituto Educativo Español
- **Files:** 30 (A1.1-A1.3, A2.1-A2.4, B1.1-B1.5, B2.1-B2.6, C1.1-C1.6, C2.1-C2.6)
- **Format:** 24-page multi-level document with 6-column per-unit table
- **Textbook:** Aula Internacional (A1-B2); no textbook for C1-C2
- **Hours:** Not specified in source document; `hours` field is absent from all Instituto Educativo files
- **Structure:** `units[]` with `communicative_functions`, `grammar`, `vocabulary_themes`, `learning_strategies`, `cultural_content`
- **Note:** C1-C2 source columns differ: `textbook_ref` and `overall_goal` are absent (null); `vocabulary_themes` maps to "Tipos de texto y léxico"; C2 `grammar` maps to "Contenidos lingüísticos"

### Kingsbrook Idiomas
- **Files:** 1 (grammar_maps/kingsbrook_by_cefr_level.json)
- **Format:** Per-CEFR-level bullet lists of grammar structures and vocabulary themes
- **Coverage:** A1-C2 (broad levels, no sub-levels)
- **Note:** C1-C2 vocabulary themes are empty by institutional policy; determined per teacher/textbook

## JSON Schema

All files in `iberia/` and `instituto_educativo/` validate against `schema.json`. Grammar map files use a different structure and are excluded from schema validation.

### Level file required fields

| Field | Type | Description |
|-------|------|-------------|
| `level` | string | Sub-level ID (e.g. `"A1.1"`, `"B1.2+"`) |
| `cefr_level` | string | Broad CEFR level (`"A1"` ... `"C2"`) |
| `institution` | string | Institution name |
| `source_file` | string | Source PDF filename |

### Level file optional fields

| Field | Type | Description |
|-------|------|-------------|
| `hours` | integer | Contact hours |
| `textbook` | object or null | `{name, units_covered[]}` |
| `communicative_objectives` | string[] | Flat objectives list (Iberia) |
| `units` | object[] | Per-unit breakdown (Instituto Educativo) |
| `exam_prep` | object or null | Reserved for DELE/DALF prep courses |

## Validation

Requires Python 3.10+ and `jsonschema`:

```bash
pip install jsonschema
python data/curricula/validate.py           # all files
python data/curricula/validate.py --file iberia/A1.1.json  # single file
```

## Extraction Notes

- All data extracted from source PDFs manually during task #163
- Grammar maps (Kingsbrook) extracted from "Contenidos gramaticales por nivel.pdf"
- Systematization examples (la_casa, gustar) are Iberia supplementary materials not tied to a specific level file
- `exam_prep` is `null` throughout; reserved for future DELE/DALF program data
- The `+` in filenames (e.g. `A2.2+.json`, `B1.1+.json`) reflects the institution's own naming convention for intermediate sub-levels
