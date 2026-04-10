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


## #627 — 2026-04-10

| Reviewer | Severity | Note |
|---|---|---|
| review | minor | `AllowedTodoStatuses` uses case-sensitive comparer. Client sending `"Pending"` gets a validation error. Consistent with `AllowedStatuses` (difficulties) which also omits `OrdinalIgnoreCase`. |
| architecture-reviewer | minor | Same case-sensitivity note as above. |
| Sophy | minor | Dual mutation path (PUT full-replace + POST/PATCH sub-resource) -- intentional per issue spec. Sophy asked to document intent. Both paths are valid: PUT for import/sync, POST/PATCH for incremental UI. |
| Sophy | info | `UpdateTeachingTodoAsync` returns null for both student-not-found and todo-not-found; controller maps both to 404. Minor ambiguity for callers; consistent with existing not-found handling. |
