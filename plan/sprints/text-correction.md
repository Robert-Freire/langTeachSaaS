# Sprint: Text Correction (Redacción)

## The teacher's story

Jordi asked Gavin (B1, German L1) to write him a letter to an extraterrestre. A few days later Gavin emails it back. Jordi opens Atelier, finds Gavin in his student list, clicks the **Redacciones** tab.

There's already a card waiting: *"Carta a un extraterrestre, B1"*, status *Pendiente*, the prompt he wrote when he assigned it. He pastes Gavin's text in, hits **Corregir**, ten seconds later the card flips to *Corregida*.

He opens it. The same letter is back, marked the way he marks them by hand: words underlined in color by category with a tiny **C / G / L / O** chip floating next to them, *muy bien* phrases in bold. He clicks a green-underlined word and a popover shows the explanation and the corrected form. He skims through, agrees with most of it, downloads the **.docx**, opens it in Word, tweaks two of the explanations, attaches it to a reply, sends it to Gavin.

The next day Sofía (A2, French L1) sends him *her* redacción on the same letter prompt. Same Atelier, same flow, completely different correction: harder grading on basic agreement, simpler explanations, different priorities. That's the part ChatGPT cannot do.

## What changes for Jordi

Before: he hand-marks redacciones on paper, or pastes them into ChatGPT and re-explains his C/G/L/O system every single time, then accepts whatever generic feedback comes back. The output reads like the AI, not like him.

After: corrections read like *his* corrections, calibrated to *this* student's level, with his categorization system enforced. The tool fits into his real flow (assign a redacción, student emails text, paste, corrige, download, adjust, send). A record of every redacción for every student lives on the student's profile, so three weeks from now he can see Gavin's recurring (G) preposition trouble.

## The moat (acceptance criterion #1)

The same redacción submitted under different CEFR levels MUST produce substantively different markup, different explanations, and different priority of corrections. Same input + different student level = different output. This is demonstrated across students (Sofía's A2 redacción vs Gavin's B1 redacción), not via a rerun button on the same text. If the dual-level smoke test on prompt changes can't show this clearly, the feature is not done.

## What this sprint delivers

### Redacciones tab on the student profile

A new tab on the student profile, after Sessions, before any settings-ish tabs. Lists redacciones as cards showing title, status (*Pendiente / Entregada / Corregida*), date. Click a card to open the detail view. Empty state with a clear primary CTA *Corregir una redacción*.

### Two entry paths, same data model

**Pre-assign then attach** (the typical flow):
1. Jordi clicks **Nueva redacción**, enters a title and a prompt note (*"Carta a un extraterrestre, ~150 palabras"*). The card is saved with status *Pendiente*.
2. When the student's text arrives, Jordi opens the card, pastes the text. Status moves to *Entregada*.
3. He hits **Corregir**. Status moves to *Corregida*.

**Cold paste** (the fallback):
1. Jordi clicks **Nueva redacción**, fills in title + prompt + pastes the text in one go, hits **Corregir**. Card saves at *Corregida* directly.

Both paths land on the same `Correction` record. The state machine is the same; only the entry pace differs.

Title defaults to *"Redacción YYYY-MM-DD"* if Jordi leaves it blank.

### The marked-up correction

Output is structured JSON, rendered as the original text with:
- **Bold** spans for *muy bien* (rendered as plain `<strong>`, no popover, no chip).
- Spans **underlined in category color** for errors, with a small superscript **C / G / L / O** chip next to the spanned text. Click or hover the span to open a popover containing: the spanned text, a short explanation, and the corrected form.
- Color family follows the existing CEFR palette in `docs/design-system.md`. Underline only, no background fill, to stay inside the no-line tonal aesthetic.

No CEFR verdict, no 1-4 score. The corrections themselves are the value, not a grade.

### Per-category prompt fidelity

The AI must understand the four categories the way Jordi defines them:
- **Cohesión (C):** missing connector, missing temporal marker, wrong connector, repetitive structure.
- **Gramática (G):** verb conjugation, prepositions, gender/number agreement, word order, articles.
- **Léxico (L):** wrong vocabulary, literal translations from L1, unnatural usage.
- **Ortografía (O):** accents (tildes), misspelled words, punctuation.

A misspelling tagged as (G) is wrong. The teacher loses trust the first time it happens. Prompt guards and pedagogy review must catch this before merge.

### Personalization hooks

- Student CEFR level drives calibration relative to that level's expectations.
- L1 (e.g. Gavin = German, Sofía = French) surfaces interference-pattern context in explanations when applicable.
- Tracked difficulties get extra emphasis when the correction touches a known weak point.
- The teacher's prompt note (e.g. *"topic was the environment"*) is fed into the prompt as context.

### Read-only in-app, edit via .docx export

The detail view shows the marked-up correction read-only. No tag editing, no reclassification, no in-app text edits in this sprint. The "adjust" affordance is **Download .docx**: Jordi opens the file in Word, tweaks whatever he wants (an explanation, a wording, a tag), attaches it to his email reply, sends it.

The .docx renders the colored underlined spans as colored bold text inline, with the explanation and corrected form rendered as parenthetical inline footnotes after each tagged span. Loses the popover elegance; preserves enough information that the document is usable as a returned correction.

### Loading state during the AI call

The card detail uses the existing Live-Status pattern in `docs/design-system.md` (§11.13) while the AI is generating. No blocking spinner. Failure state offers Retry.

### Storage: new `Correction` entity (Sophy approved)

- Own DB table, FK to Student (required), FK to Lesson/Session (nullable, optional link when launched from a session view, not used in v1 UI).
- `schemaVersion` integer field (start at `1`) so the tag taxonomy can evolve without a migration.
- Error tags persisted as their own queryable rows (FK to Correction, indexed by category) so Phase 3 pattern analytics is a query, not a JSON scan.
- Status enum: *Pendiente | Entregada | Corregida*.
- Stores: assignmentTitle, assignmentPrompt, studentText, markedUpOutput JSON, createdAt, correctedAt.
- Not a typed ContentBlock. Lessons are teacher-authored plans; Corrections are student-submitted artifacts. Different lifecycle, different ownership, different rendering target.
- Not folded into a shared `StudentArtifact` abstraction with AudioReflection. Two instances is not a pattern.

## Carry-over collateral bugfixing (already in milestone #21)

These are leftovers from Hardening that ride along with this sprint:
- `#1146` /dashboard route renders blank white page. **Confirmed dead route, not the dashboard the system actually shows (default route renders dashboard).** Low priority cleanup, not a regression.
- `#1147` externalize extraction config, align field naming.
- `#1148` post-Hardening frontend polish sweep.
- `#1149` post-Hardening backend, e2e, ops cleanup.
- `#1150` teacher-qa navigation helper race causing Sprint Reviewer timeout.
- `#1151` atelier-1029 e2e spec clicks disabled FAB.

These do not block the redacción feature; they get fixed opportunistically as part of the same sprint.

## What we're NOT building

- Student-facing rendering of the correction (Phase 3, with the rest of the student portal).
- PDF export. Defer; teachers can print the .docx if they want a PDF.
- In-app editing of the marked-up correction (no tag reclassification, no inline text edits, no explanation rewrites). Adjustment happens in Word after download.
- Rerun-at-different-CEFR. Real teacher flow doesn't re-correct an already-corrected redacción when the student's level changes; corrections are dated artifacts.
- A CEFR-aligned verdict or 1-4 score. The corrections themselves are the value.
- Bulk or batch correction.
- Voice or audio submission.
- A writing-prompts library. Jordi assigns the prompt outside Atelier or types it into the assignment field.
- Cross-student or cross-correction analytics dashboards (data model supports them, UI ships in Phase 3).

## How to use this document

Every task plan, review, and reviewer should be checked against one question: **does the same redacción, submitted by a real A2 student vs a real B2 student, return substantively different markup and explanations?** If the answer is "kind of" or "the words change but the substance doesn't", the feature is not done. CEFR-relative grading is the moat; everything else is plumbing for it.

The .docx is the deliverable Jordi sends to his student. If it doesn't open cleanly in Word and read like a correction he'd hand back, the feature is not done either.
