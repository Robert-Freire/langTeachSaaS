# UI Review Backlog

Non-blocking findings from review-ui runs. Periodically review this file and batch related items into polish GitHub issues.

---

*Cleared 2026-04-22 during UI Redesign & Student Profile Polish sprint close. Seeder coverage gaps batched into #834. UX polish items (combobox summary, Focus Areas description) batched into #840. Remaining entries deleted (intentional per Stitch spec, covered by unit tests, or pre-existing infrastructure).*

*Cleared 2026-04-27 during Student Profile Voice Input sprint close. DS/component findings batched into #989 (DS component polish batch). Seeder coverage gap (#904) batched into #991 (e2e test fixes). Environment-only entry (#906) deleted. Navigation findings batched into #992.*

*Cleared 2026-05-03 during Unified Voice & Chat sprint close. All Atelier Assistant pattern findings (#997, #1008 [4 patterns], #1005, #1004, #1010, #1029) batched into #1064 (Vera DS canonicalization pass — Hardening milestone). Deleted: #1030 close-guard fix (no visual to track per inline note).*

## #1111 UI Review findings (2026-05-05)

**Pre-existing DS violation (out of scope):** AtelierAssistantPanel discard confirm -- "Keep editing" button uses `text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50` but DS §11.11 specifies secondary action text should be `text-zinc-500 hover:text-zinc-700`. Pre-existing before this PR; batch into next DS canonicalization pass.

**DS gap (document):** The thumbs-up / thumbs-down feedback pair and its micro-states (Thanks / Reporting... / Reported) are not yet documented in DS. Pattern is coherent with existing ghost icon controls. Add a §11.x entry before the pattern spreads to other panels.

**SQL Server note (resolved):** SetNull on VoiceNote→AssistantTurnFeedback FK causes error 1785 (cascade cycle via Teacher). Fixed to NoAction. Standalone VoiceNote deletion must null VoiceNoteId at application level if/when a DELETE /voice-notes/{id} endpoint is added.
