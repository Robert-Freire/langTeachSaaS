# Code Review Backlog

Unfixed notes from code review (review agent) runs. When reviewing this backlog, be critical: if a finding has real risk (future breakage, i18n issues, security), create an issue. If it's superficial or speculative, delete it.

---

*Cleared 2026-04-08 during Adaptive Replanning sprint close. All entries deleted (low/info severity, all already deferred with sound reasoning) or batched into #603-#609.*

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

## #656 — 2026-04-11

| Reviewer | Severity | Finding |
|---|---|---|
| review | minor | `RawJson` as optional trailing parameter on `ExtractedReflectionDto` positional record is fragile: future positional parameters added before it would shift meaning. Low risk right now (all callers use named args), but worth converting to a named property if the record grows. |
