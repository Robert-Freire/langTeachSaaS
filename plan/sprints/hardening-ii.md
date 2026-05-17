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

---

## Smoke Test Appendix

*Added 2026-05-13 during sprint close Stage 0A. Five mid-sprint issues (#1225, #1231, #1234, #1237, #1239) and one explicit pass on #1222 are not exercised by the main story walkthrough. Scenarios below close that gap.*

*Issues with no browser-testable surface (#1224 prompt-builder refactor, #1228 DB hardening, #1229 prompt externalization, #1230 Atelier DTO cleanup, #1232 test infra, #1233 prompt-health sweep, #1235 Telegram dedup, #1236 voice recording audit) are internal changes with no UI change; they are not smoke-testable via browser walkthrough.*

**A1: File / photo upload into Redacciones (#1237)**
Teacher opens a student's Redacciones tab and clicks Nueva redacción. An upload button is visible next to the student text area. Teacher uploads an image of handwritten text (JPG or PNG). The OCR result populates the student text field as editable text. The text is NOT automatically submitted for correction -- teacher can review and edit before hitting Corregir.

**A2: Atelier overlay does not blur background content (#1234)**
Teacher navigates to a screen with visible content (e.g. student profile or session detail). Teacher opens Atelier via the FAB. The background content behind the Atelier panel remains fully readable -- no blur effect applied.

**A3: Correction detail -- chip legend and breadcrumb (#1225)**
Teacher opens a completed correction from the Redacciones list. The correction detail header shows a static chip legend with C, G, L, O labels. The breadcrumb trail includes the student's name (e.g. "Gavin > Redacciones > [title]").

**A4: Correction list -- status badges (#1225)**
Teacher opens the Redacciones list for any student. Each correction entry shows a status badge (Pendiente, Corregida, Fallida, etc.) that matches the correction's actual state. Badges are consistent with the detail view status.

**A5: Thumbs feedback label (#1231)**
Teacher views a completed correction. The thumbs up/down feedback component shows the label "¿Fue útil esta corrección?" adjacent to the thumbs icons.

**A6: Atelier session picker row contrast (#1231)**
Teacher opens Atelier and triggers the session picker (e.g. starting a voice note or selecting a session to associate). Session rows in the picker are legible -- text contrast is sufficient against the background (visually readable, not washed out).

**A7: Correction tag placement on repeated words (#1239)**
Teacher submits a redacción that contains the word "es" or another common Spanish word appearing multiple times. The correction result highlights the tagged errors on the correct occurrences -- not on nearby uses of the same word that are grammatically correct (e.g. a ser/estar fix should not land on "Barcelona es una ciudad" when the actual error is in a different clause).

**A8: B1 scope precision, cuando + subjuntivo not softened (#1263)**
Teacher submits a 100+ word B1 redacción for a B1 student containing:
- One correct ``cuando + presente de subjuntivo`` construction (e.g. ``Cuando llegues a casa, dime``).
- One ser/estar error (e.g. ``Estoy ingeniero`` instead of ``Soy ingeniero``).

After correction completes:
- The ``cuando llegues`` construction is NOT softened, NOT removed, NOT flagged as "fuera de nivel". It is recognized as in-scope for B1 receptive validation.
- The ser/estar error IS tagged G.

**A9: A1 scope NOT auto-softening correct above-level usage (#1263, current behavior)**
Teacher submits an A1 redacción containing ``ojalá vengas`` or another correct subjuntivo construction. After correction: the construction does NOT receive any soften/MuyBien/error tag from Pass 2 + level filter. The pipeline only operates on Pass-2-tagged tokens; correct above-scope usage produces no Pass 2 tag, so nothing reaches the filter. This is the CURRENT behavior; affirming above-level correct usage is tracked separately in #1297 (Groups milestone, ScopeAffirmer-style enhancement). For this sprint, A9 verifies the pipeline does not incorrectly raise an error on a correct above-scope construction.

**A10: B1.1 Grammar Focus ceiling still holds (#1263 + #1227)**
Teacher generates a new lesson for a B1.1 student with Grammar Focus enabled. After generation: no subjuntivo (any mood), no pluscuamperfecto, no indirect-speech tense shifts appear in the Grammar Focus exercises. The ceiling promise from #1227 is unbroken by the scope split. *(Known regression in some topics, tracked in #1285 -- if A10 fails on this run, log it but do not block sprint close; #1285 is in Groups.)*

**A11: Real A1 long-content correction completes end-to-end (#1293 + #1296)**
Teacher submits a 150+ word redacción for an A1 student that contains 20+ realistic learner errors (omitted articles, gender mismatches, wrong verb conjugations, ser/estar confusion, missing accents). Click Corregir. Within 2 seconds the status flips to Corrigiendo. Within 7 minutes the status flips to Corregida. The detail view shows the marked-up text with tags. **No CorreccionFallida.** This was the Marton K failure case before #1293 (max_tokens cap) and #1296 (HttpClient timeout) shipped.

**A12: ETA hint visible during long correction (#1293 frontend polling UX)**
While A11 is running, after approximately 60 seconds elapsed in Corrigiendo state, a hint appears below the spinner: *"Esto puede tardar hasta 3 minutos para textos largos. Puedes esperar aquí."* This is the polling-state UX added in #1293 to set teacher expectation during the multi-minute wait window.

**A13: Real JPG OCR upload end-to-end (#1237 + #1279 + #1280 + #1292)**
Teacher opens Nueva redacción, clicks Subir archivo, selects a real JPG photo of handwritten Spanish text (any reasonable image, not a synthetic test fixture). The OCR pipeline calls Azure Computer Vision via the dev stack (now wired per #1292), extracts text, and populates the student text field. **No OCR_FORMAT_UNSUPPORTED, no generic red banner.** Teacher can review and edit the extracted text before clicking Corregir.

**A14: Backend OCR errors surface specifically, not generically (#1290)**
Teacher attempts to upload an unsupported file format (e.g. a .txt file or a .gif). The error banner shows the specific backend message *"Formato no compatible. Usa JPG, PNG, WEBP, PDF o DOCX."* (or other specific backend error), NOT the generic *"No se pudo extraer el texto. Inténtalo de nuevo..."* fallback. The data-error-code attribute is set on the banner for testability.
