# Sprint: Hardening II

## The teacher's story

Jordi has been using the Redacciones correction feature for two weeks. It works, but cracks are showing:

A student submits a long redacción -- 200 words. The correction comes back, but it feels slightly off. The C category marked a sentence for "missing connector" but the real problem was that the paragraph had no clear topic sentence. Jordi knows this is an "organización" issue, not just a connector issue. He wonders if the tool actually understands the difference.

Meanwhile, he notices that his Portuguese student Catarina's corrections never include any notes about language interference -- the system seems to silently skip the L1 context for her. And one of his B1 students, Gavin, got a correction lesson plan with a grammar exercise using "imperfecto de subjuntivo" -- a B2 structure. Gavin was lost.

Jordi still trusts the tool, but these small wrongnesses are starting to add up.

After this sprint: those cracks are sealed. The C category covers discourse organization as well as connectors. Portuguese L1 notes work correctly. B1 lesson generation stays within B1 scope. The correction pipeline is rate-protected so the system stays reliable under load.

## What changes for Jordi

Before: occasional mystery corrections (C tag that doesn't match what he'd call a cohesion error), silent L1 skips for some students, and above-level grammar appearing in generated lessons.

After: the system's pedagogical decisions match Jordi's instincts. What it calls C, he would call C. What it skips for level, he would skip. What it generates for B1, he can hand to a B1 student without confusion.

## What this sprint delivers

### Correction prompt robustness (#1222, #1226, #1233)

- Pass 2 ser/estar rule made mechanically enforceable (add `isSerEstar` flag to input schema so Haiku doesn't have to infer from natural language)
- C category expanded to include discourse organization errors (paragraph structure, logical sequencing) alongside connector errors -- aligned with EOI CCoh rubric
- Portuguese L1 additionalNotes wording fixed (detection preserved, only the contrastive explanation is suppressed)
- OFFSETS prompt verbosity fixed (post-JSON verification work eliminated)
- Cross-pass register-mismatch contradiction resolved

### Security (#1223)

- Rate limit on `/corregir` endpoint (per-teacher, fixed-window)
- Claude 429 results in retriable Entregada state, not permanent CorreccionFallida

### Architecture cleanup (#1224, #1228, #1229, #1230)

- Correction prompt builders moved into IPromptService pattern
- Stale-recovery extracted from read path into a background sweeper
- TOCTOU race on /corregir hardened with RowVersion concurrency token
- Soft-delete convention unified (DeletedAt vs IsDeleted -- pick one)
- C/G/L/O taxonomy externalized to `data/pedagogy/correction-categories.json`
- Per-CEFR calibration cues externalized
- Conflict response shape standardized across all controllers
- Atelier naming asymmetries and CEFR regex duplication resolved

### Generation quality gates (#1227)

- Grammar Focus B1.1 hard ceiling: no pluscuamperfecto, no subjuntivo in any mood, no indirect speech tense shifts
- Warm-up icebreaker enforcement: no right/wrong answer evaluation in warm-up at any level

### Frontend polish (#1225, #1231)

- Correction status badge map unified into `correction-status.ts` (used by list + detail)
- Static chip legend added to correction detail header
- Breadcrumb includes student name
- Thumbs feedback label added ("¿Fue útil esta corrección?")
- Atelier session picker instruction text contrast raised to WCAG AA
- DS spec updated: thumbs feedback micro-states, Atelier picker rows

### Test infrastructure (#1232)

- `corrections-sprint.spec.ts` Playwright spec for teacher-qa: exercises Redacciones tab end-to-end, asserts moat criterion (A2 vs B1 correction differences)
- Test helper consolidation (StubClaudeClient, RunCorregirAsync)

## What we're NOT building

- Student-facing correction view (Phase 3)
- Batch correction
- Correction history analytics
- Rerun at different CEFR

## How to use this document

The quality criterion for this sprint is: **does Jordi trust what the tool calls a correction?** Not just "does it work technically" but "does the category label match what he would label it, and does the level calibration match his professional instinct?" If the answer is "mostly" rather than "yes", the prompt work is not done.
