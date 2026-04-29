# UI Review Backlog

Non-blocking findings from review-ui runs. Periodically review this file and batch related items into polish GitHub issues.

---

*Cleared 2026-04-22 during UI Redesign & Student Profile Polish sprint close. Seeder coverage gaps batched into #834. UX polish items (combobox summary, Focus Areas description) batched into #840. Remaining entries deleted (intentional per Stitch spec, covered by unit tests, or pre-existing infrastructure).*

*Cleared 2026-04-27 during Student Profile Voice Input sprint close. DS/component findings batched into #989 (DS component polish batch). Seeder coverage gap (#904) batched into #991 (e2e test fixes). Environment-only entry (#906) deleted. Navigation findings batched into #992.*

## #1008 (2026-04-28) — Atelier Assistant panel (new patterns, not violations)

- [1] Inline discard confirm (amber-50 bg, "Close and discard?" + Discard/Keep editing): new pattern for inline confirmation inside a Sheet panel — not covered in design-system.md. Works visually, needs Vera review before it becomes a repeated pattern.
- [2] Transcription blockquote display (`border-l-2 border-indigo-300 italic`): new pattern for AI-returned verbatim content — not covered in design-system.md. Looks correct but no spec for content display blocks.
- [3] "READY" status indicator (green dot + all-caps Label-SM in panel header): new pattern for live panel status — not covered in design-system.md.
- [4] "PROPOSED UPDATES / (coming soon)" placeholder section: new pattern for pending-feature sections — acceptable for part 1 stub, will be replaced in #1009.

## #1005 (2026-04-28) — New Student proposal card (novel pattern)

- [1] Inline mini-form inside a proposal card (NewStudentFields): label-above + Input component + select inside a proposal card body. Design system covers autosave-on-blur for detail screens (Pattern A) but does not address editable fields embedded in action/proposal cards in the assistant panel. This pattern should be reviewed by Vera before it becomes a template for other compound proposals.

## #1004 (2026-04-28) — Atelier Assistant voice input (new patterns)

- [1] Ghost mic button paired with filled-primary send button in the same input row. design-system.md §5 forbids ghost + filled primary in the same row, but the mic is a mode-toggle affordance and the send is a submit CTA — semantically different roles. Compound input bar pattern not covered by design-system.md. Needs Vera discussion before it becomes a reusable pattern.

| #1010 | 2026-04-28 | ProposalCard: three-button action row (Apply/Dismiss/Modify) is a new pattern in AI-generated cards with no DS spec. Document via Vera discussion before reusing. |
