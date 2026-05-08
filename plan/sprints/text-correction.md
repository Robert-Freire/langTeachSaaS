# Sprint: Text Correction (Redacción)

## The teacher's story

Gavin (B1, German L1) emails Jordi a redacción: a short letter to an extraterrestre. Jordi opens Atelier, finds Gavin in his student list, pastes the text, hits "Corregir". Ten seconds later he's reading the same letter back, marked up exactly the way he marks them by hand: bold for *muy bien*, inline tags for (C) Cohesión, (G) Gramática, (L) Léxico, (O) Ortografía. Each tag expands into a short explanation and the corrected form. At the top, a CEFR-aligned verdict: *Suficiente para B1, con avances claros en cohesión*.

He skims it, tweaks one tag, copies it into a reply, and sends it back to Gavin. The whole thing took the time it takes to drink half a coffee.

The same paragraph from Sofía (A2) would come back graded harder on the same errors, with simpler explanations and different priorities, because Atelier corrects relative to the student's level, not in the abstract. That is the part ChatGPT cannot do.

## What changes for Jordi

Before: he hand-marks redacciones, or pastes them into ChatGPT and re-explains his C/G/L/O system every single time, then accepts whatever generic feedback comes back. The output reads like the AI, not like him.

After: corrections read like *his* corrections, calibrated to *this* student's level, with his categorization system enforced. The tool fits into his real flow (student emails text → he pastes → he reviews → he sends), and a record of every correction lives on the student's profile so he can see Gavin's recurring (G) preposition trouble three weeks from now.

## What this sprint delivers

**Core feature: corregir redacción**
- Entry point lives on the student profile (working assumption: a "Homeworks" tab or attachment slot, final shape pending Vera review).
- Inputs: pasted student text, CEFR level (auto-filled from the student, editable), optional context note ("topic was the environment", "letter to an extraterrestre").
- Output: the original text rendered with inline markup. **Bold** spans for muy bien. Inline error tags by category (C/G/L/O) that expand to a short explanation and the corrected form.
- Optional CEFR-aligned verdict: **Insuficiente / Suficiente / Notable / Excelente**, calibrated to the student's CEFR level (a B1 redacción graded against B1 expectations, not C1). Teacher can show or hide.

**CEFR-relative grading is the differentiator**
The same redacción submitted under different CEFR levels MUST produce different markups, different verdicts, and different priority of corrections. This is the feature, not a side effect. Prompt design and acceptance criteria need to enforce it: dual-level smoke tests on every prompt change, asserting that the same text at A2 vs B2 returns substantively different output. If we can't see this difference clearly, the feature is not done.

**Per-category prompt fidelity**
The AI must understand the four categories the way Jordi defines them:
- **Cohesión (C):** missing connector, missing temporal marker, wrong connector, repetitive structure.
- **Gramática (G):** verb conjugation, prepositions, gender/number agreement, word order, articles.
- **Léxico (L):** wrong vocabulary, literal translations from L1, unnatural usage.
- **Ortografía (O):** accents (tildes), misspelled words, punctuation.

A misspelling tagged as (G) is wrong. The teacher loses trust the first time it happens. Prompt guards and pedagogy review must catch this.

**Personalization hooks**
- Student CEFR level drives calibration.
- L1 (e.g. Gavin = German) surfaces interference-pattern context in explanations when applicable.
- Tracked difficulties get extra emphasis when the correction touches a known weak point.

**Storage: new `Correction` entity** (Sophy approved)
- Own DB table, FK to Student (required), FK to Lesson/Session (nullable, optional link when launched from a session view).
- Payload includes a `schemaVersion` field from day one, so we can evolve the tag taxonomy without a migration.
- Error tags persisted as their own queryable rows (FK to Correction, indexed by category) so Phase 3 pattern analytics ("Gavin's recurring G:prepositions") is a query, not a JSON scan.
- Not a typed ContentBlock. Lessons are teacher-authored plans; Corrections are student-submitted artifacts. Different lifecycle, different ownership, different rendering target.
- Not folded into a shared `StudentArtifact` abstraction with AudioReflection. Two instances is not a pattern; revisit when a third arrives.

**Student profile surface**
- Correction history visible on the student profile, ordered by date, showing date, title or first line, and the verdict at a glance.
- One-click reopen to view the full marked-up correction.
- Final placement (tab vs section vs Homeworks-as-new-concept) pending Vera review.

## Carry-over collateral bugfixing (already in milestone #21)

These are leftovers from Hardening that ride along with this sprint:
- `#1146` /dashboard route renders blank white page (urgent: post-deploy regression, do first).
- `#1147` externalize extraction config, align field naming.
- `#1148` post-Hardening frontend polish sweep.
- `#1149` post-Hardening backend, e2e, ops cleanup.
- `#1150` teacher-qa navigation helper race causing Sprint Reviewer timeout.
- `#1151` atelier-1029 e2e spec clicks disabled FAB.

These do not block the redacción feature; they get fixed opportunistically as part of the same sprint.

## What we're NOT building

- Student-facing rendering of the correction (that's Phase 3, with the rest of the student portal).
- Bulk or batch correction of multiple texts at once.
- Voice or audio submission. Text only.
- Automated grading of larger writing exams (DELE-style with rubric scoring).
- A writing-prompts library. Jordi assigns the prompt outside Atelier; we accept whatever text he pastes.
- Cross-student or cross-correction analytics dashboards (the data model supports them, the UI doesn't ship this sprint).

## Open design questions still to resolve

1. **Vera review (Q1 + Q4):** entry point shape (student profile tab vs Homeworks concept vs both), and rendering pattern (inline tags vs side-margin annotations vs hover popovers). Working assumption: student profile + Homeworks tab + inline tags. Confirm with Vera before opening the frontend issue.
2. **Schema versioning approach:** is `schemaVersion` a string ("v1") or a number? Pick one and stick to it across Correction and any future versioned payloads.

## How to use this document

Every task plan, review, and reviewer should be checked against one question: **does the same redacción, submitted at A2 vs B2, return substantively different markup, verdict, and priority?** If the answer is "kind of" or "the words change but the substance doesn't", the feature is not done. CEFR-relative grading is the moat; everything else is plumbing for it.
