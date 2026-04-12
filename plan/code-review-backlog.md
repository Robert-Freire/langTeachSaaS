# Code Review Backlog

Unfixed notes from code review (review agent) runs. When reviewing this backlog, be critical: if a finding has real risk (future breakage, i18n issues, security), create an issue. If it's superficial or speculative, delete it.

---

*Cleared 2026-04-08 during Adaptive Replanning sprint close. All entries deleted (low/info severity, all already deferred with sound reasoning) or batched into #603-#609.*

## #656 — 2026-04-11

| Reviewer | Severity | Note |
|---|---|---|
| review | minor | `VoiceNoteApplication.RawExtractionJson` stores the raw Claude response before markdown-fence stripping, so it may contain ````json` fences. Field name implies clean JSON. Rename to `RawExtractionResponse` if it causes confusion in future tooling. |
| sophy | minor | `SessionLogService` guard writes VoiceNoteApplication if any of three fields is non-null, so half-populated rows (e.g. only RawExtractionJson) are possible. In practice all callers provide at least Transcription; add explicit validation if partial rows become a problem. |
| sophy | info | `ApplicationType.Update` is unused but retained as the issue AC explicitly requires it for the future update flow. Drop in a future sprint if Update is never wired. |

## #653 — 2026-04-11

| Reviewer | Severity | Note |
|---|---|---|
| architecture-reviewer | minor | `SessionLogService.SanitizeSuggestedDifficulties` and `UpsertDifficulties` each independently call `_pedagogy.GetValidDifficultyCompetencies/Severities()` once and hoist to locals. Pattern is correct (no per-loop overhead). Could be reduced to one call by passing sets as parameters, but would add complexity for negligible gain. |

## #623 — 2026-04-09

| Reviewer | Severity | Note |
|---|---|---|
| architecture-reviewer | minor | `FakeReflectionExtractionService` is a private inner class in `TelegramConversationServiceTests`; project convention is top-level stub files in `Services/` folder (`StubReflectionExtractionService.cs`, `StubTelegramBotService.cs`, etc.). Single-class scope for now; extract if another test class needs it. |

## #620 — 2026-04-09

| Reviewer | Severity | Note |
|---|---|---|
| review | minor | `TelegramBotService.DownloadFileAsync:45` interpolates Telegram-supplied `file_path` into a URL without `Uri.EscapeDataString`. Defensive only — Telegram's documented file_path format is safe. |
| architecture-reviewer | minor | `TelegramBotServiceTests.cs` uses static `BuildService` factory instead of constructor + `IDisposable` (sibling pattern in `VoiceNoteServiceTests`/`TelegramConversationServiceTests`). Matches the closer reference `ClaudeApiClientUnitTests.cs`, which also uses a static `BuildClient` factory for HttpClient-based service tests. No cleanup needed. |


## #643 — 2026-04-10

| Reviewer | Severity | Note |
|---|---|---|
| review | info | `SeedAnaVisualSessionLogAsync` is called after the early-return `SaveChangesAsync`; any unsaved tracked changes before that line would be committed by the helper's own `SaveChangesAsync`. Verified safe: no mutations precede the call in the early-return path. |
| architecture-reviewer | info | New helper method diverges from Diego Seed's inline guard style. Helper is the correct choice because Ana Visual belongs to a different method scope. |

## #627 — 2026-04-10

| Reviewer | Severity | Note |
|---|---|---|
| review | minor | `AllowedTodoStatuses` uses case-sensitive comparer. Client sending `"Pending"` gets a validation error. Consistent with `AllowedStatuses` (difficulties) which also omits `OrdinalIgnoreCase`. |
| architecture-reviewer | minor | Same case-sensitivity note as above. |
| Sophy | minor | Dual mutation path (PUT full-replace + POST/PATCH sub-resource) -- intentional per issue spec. Sophy asked to document intent. Both paths are valid: PUT for import/sync, POST/PATCH for incremental UI. |
| Sophy | info | `UpdateTeachingTodoAsync` returns null for both student-not-found and todo-not-found; controller maps both to 404. Minor ambiguity for callers; consistent with existing not-found handling. |

## #688 — 2026-04-12

| Reviewer | Severity | Note |
|---|---|---|
| architecture-reviewer | minor | `UpdateTeachingTodoAsync` text validation fires after `index < 0` guard; passing invalid text with nonexistent todo ID returns null instead of ValidationException. Not blocking: 404 on unknown ID is correct behavior regardless. Could align with AppendTeachingTodoAsync (validate first) in a future cleanup. |
| Sophy | minor | `[MaxLength(500)]` on `UpdateTeachingTodoDto.Text` + manual length check in service is redundant. Same pattern exists in `AppendTeachingTodoAsync`. Fix both together in a cleanup pass. |

## Task #667 — Focus Areas table: description field not displayed

**Source:** CodeRabbit on PR #693  
**Date:** 2026-04-12  
**Severity:** Low  

`d.description` (e.g. "Separable vs inseparable phrasal verbs") is not shown anywhere in the Focus Areas table. The Subcategory column now shows `d.subcategory || d.description`, so description is only visible when subcategory is empty. Consider adding a tooltip or secondary line in the Subcategory cell for the full description.
