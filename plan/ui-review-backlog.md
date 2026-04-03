# UI Review Backlog

Non-blocking findings from review-ui runs. Periodically review this file and batch related items into polish GitHub issues.

---

*Cleared 2026-04-02 during Pedagogical Quality sprint close. All entries triaged: 10 findings batched into #425 (new exercise format UX polish). Remaining entries deleted (minor placeholder wording, role selector pill, grammar catalog autocomplete, discovery questions read-only affordance).*

| PR | Date | Severity | Finding |
|----|------|----------|---------|
| #442 | 2026-04-03 | low | SessionLogDialog "What was actually done" field has no (optional) label while adjacent fields do -- implied required. Pre-existing in #441 code. |
| #442 | 2026-04-03 | low | HW preview text truncates mid-word (CSS text-overflow behavior). Pure Tailwind `truncate` uses character-level ellipsis; word-boundary truncation requires JS. Acceptable for sprint. |
