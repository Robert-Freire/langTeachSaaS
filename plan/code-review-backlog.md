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

## PR #484 (Homework status badge) - 2026-04-05

| PR | Severity | Finding | Decision |
|----|----------|---------|----------|
| #484 | low | `LessonHistoryEntryDto.FollowingSessionHomeworkStatus` returns `NotApplicable` (non-null) when following session exists but status is N/A; frontend filters display-side. Reviewer suggests backend filter. | Deferred: returning the actual recorded value is accurate data; display logic is the right filter boundary. |
| #484 | low | `LessonHistoryCard` badge falls through silently for unknown enum string values (no defensive default style). Badge guard `HOMEWORK_STATUS_STYLES[name] &&` already prevents rendering. | Deferred: current guard is sufficient; new enum values would require frontend update anyway. |
| #484 | low | `LessonHistoryEntryDto` references `HomeworkStatus` data-model enum directly. Existing `SessionLogDtos.cs` follows same pattern. | Deferred: consistent with existing project convention. |
