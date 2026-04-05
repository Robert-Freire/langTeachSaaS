# Code Review Backlog

Unfixed notes from code review (review agent) runs. When reviewing this backlog, be critical: if a finding has real risk (future breakage, i18n issues, security), create an issue. If it's superficial or speculative, delete it.

---

*Cleared 2026-04-04 during Post-Class Tracking sprint close. Findings from PRs #440, #441, #442, #444, #445, #450, #431, #481 triaged: batched into #492 (SessionLog DTO hardening), #494 (lessons studentId filter). Sophy findings on prompt redundancy added to #422. All remaining entries deleted (one-time migration tool caveats, pre-existing patterns, cosmetic DTO sharing).*

## PR #186 (Audio input infrastructure) - 2026-04-05

| PR | Severity | Finding | Decision |
|----|----------|---------|----------|
| #186 | medium | `VoiceNoteService`: blob upload happens before `SaveChangesAsync()`. If DB commit fails, blob is orphaned. Same pattern as `MaterialService`. | Deferred: consistent with existing pattern; orphaned blobs are recoverable. |
| #186 | low | `VoiceNotesController`/`VoiceNoteService`: hardcoded English error strings returned to client ("File exceeds maximum allowed size", etc.). Same pattern as `MaterialsController`. | Deferred: consistent with existing project convention. |
| #186 | low | `VoiceNote.DurationSeconds` field always 0 on upload. Duration extraction not implemented. | Deferred: commented in code; field reserved for future use. |
