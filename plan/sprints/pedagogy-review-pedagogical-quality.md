# Pedagogy Review: Pedagogical Quality Sprint

**Date:** 2026-04-02
**Reviewer:** Isaac (EOI Pedagogy Reviewer)

---

## Pedagogy Review

### Context
Evaluated the Pedagogical Quality sprint's new pedagogical features: practice scaffolding stages, L1 contrastive notes, grammar validation rules, section profile CEFR calibration, and new content types (NoticiingTask, GuidedWriting, ErrorCorrection). Also evaluated generated content from 3 Teacher QA runs (Sprint Reviewer B1, Ana A1, Marco B1).

### Verdict
SOUND — the sprint makes substantive pedagogical improvements. Core methodology is correct. Minor issues below.

### Level Accuracy
**Practice stages (practice-stages.json):**
- A1/A2: controlled + meaningful (no guided_free) — correct per PCIC. Mechanical and semi-guided practice before free production is developmentally appropriate at these levels.
- B1: controlled + meaningful + guided_free — correct. B1 is the pivot level where guided free practice bridges toward genuine communicative production.
- C1/C2: meaningful + guided_free (controlled optional) — correct. At C1, controlled mechanical practice is a pedagogical regression; PCIC C-level competencies require discourse-level mastery, not form manipulation.

**Grammar validation rules (grammar-validation-rules.json):**
- `ser-estar-de-acuerdo`: correct. "Ser de acuerdo" is a persistent learner error at A2–B1 for Germanic and Romance L1 speakers.
- `ser-estar-state-adjective`: correct. Temporary state adjectives with ser is a high-frequency error across all L1 backgrounds.
- `haber-impersonal-plural`: correct. "Habían personas" is pervasive in written and spoken Spanish learner output at B1–B2.
- `ojala-indicative`: correct. Ojalá + indicative is a B1-B2 error particularly for Romance L1 speakers who pattern-match to similar-looking structures.
- **Gap**: the grammar validation rules are only 4. Common additional candidates for a next sprint: "ser/estar" + past participle confusion in passive vs. resultant state (está roto vs. fue roto), and "haber de + infinitive" used as obligation (correctly hay que / tener que at B1).

**L1 influence data:**
- Romance language family correctly excludes Portuguese from the ser/estar contrastive note (Portuguese has the same distinction). This is a precise and expert correction that many resources get wrong. Excellent.
- Germanic family contrastive patterns correctly cover ser/estar, subjunctive, and gender — the three highest-frequency interference areas for English speakers.

### Methodological Assessment
The sprint's PPP scaffolding implementation is methodologically sound. The three-stage model (controlled → meaningful → guided_free) maps directly to the PPP model and the Instituto Cervantes's own progression framework (práctica controlada → práctica libre guiada → producción libre).

The stage `guided_free` mapping to GR-03 (sentence transformation), EE-01/EE-03/EE-09 (written production types) is correct — these are appropriate bridging activities.

The placement of `guided_free` in Production section remains correct and separate from Practice. The two stages serve different lesson functions: Practice's `guided_free` stage is the bridge within the practice stage; Production is fully communicative.

### Competency Coverage
The sprint correctly maintains competency distribution:
- WarmUp: interaction only (correct — speaking/listening activation, not skill-building)
- Presentation: reading + listening (correct — input-heavy)
- Practice: reading + writing ± speaking (correct for written practice modes)
- Production: writing + speaking (correct — output stage)
- WrapUp: interaction (correct — reflection and closure)

### L1 and Personalization
The L1 contrastive note implementation (issue #276) is a significant pedagogical improvement. The data model correctly separates:
1. L1 adjustments (exercise type weighting, emphasis shifts) — from `l1-influence.json`
2. Contrastive patterns (specific structural contrasts to explain) — from contrastivePatterns array

The `ser-estar` pattern for Italian correctly identifies "essere" as the coverage issue, not just "ser/estar confusion" in generic terms. This is the level of specificity that generates genuinely useful pedagogical content.

### Specific Findings

1. [severity: minor] [practice-stages.json:C1:stages] The `optionalStages: ["controlled"]` field exists but is not clearly communicated in the prompt — the PRACTICE SCAFFOLDING STAGES block lists only required stages (meaningful + guided_free for C1) without flagging controlled as optional. A teacher or the AI may not understand controlled is still permitted but not expected. *Reference: PCIC C-level competency descriptors recommend reducing mechanical practice progressively.*

2. [severity: minor] [grammar-validation-rules.json:ojala-indicative] The ojalá rule regex does not cover `ojalá haya` (present perfect subjunctive) — this is a gap in the validation, not a bug. Adding it would improve the rule's completeness. *Reference: PCIC B2 subjunctive inventory.*

3. [severity: minor] [Ana A1.1 generated content] The grammar block includes gustar with plural agreement (gustan) — this is A1.2/A2 territory per PCIC notional-grammatical inventory. At A1.1, gustar should be introduced with singular nouns only (me gusta el café). *Reference: A1.1 PCIC grammar scope: gusta (singular) is A1; gustan (plural agreement) enters at A1.2.*

4. [severity: minor] [Sprint Reviewer B1 generated content, WarmUp] The roleB model phrases include "debería haber tenido más cuidado" — this is the conditional perfect (B2 production target, not B1). As a scripted model phrase in roleB it is borderline acceptable but sets a production expectation above B1 level. *Reference: PCIC B1 grammar inventory excludes condicional compuesto as a production target.*

### Suggested Resources
- Plan Curricular del Instituto Cervantes (free online): grammar inventories by level are the canonical reference for validation rule scope decisions — consult these before adding new grammar validation rules
- PCIC A1.1 Grammatical inventory for gustar (page 38): confirms singular-only at A1.1
- MarcoELE.com — research articles on error correction in ELE at different levels

### Recommendations

1. Add 2-3 additional grammar validation rules for the next sprint targeting haber + past participle (passive vs. resultant state) and ser with temporary state adjectives in the preterite ("fue cansado" instead of "estuvo cansado").
2. Clarify `optionalStages` in the prompt output — consider adding a brief note like "(optional, use when mechanical consolidation is needed)" to the C1/C2 stage block.
3. Limit gustar introduction to singular at A1.1 — add a level-specific note to the grammar scope block.
4. Consider adding an A1-specific scope constraint on gustar plural to the section profile guidance for Presentation at A1.
5. For the next review cycle, test the B2 Reading template (Carmen persona) and C1 Grammar (Ricardo persona) which could not be tested this sprint due to API credit exhaustion.
