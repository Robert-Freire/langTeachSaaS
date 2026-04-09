# Code Review Backlog

Unfixed notes from code review (review agent) runs. When reviewing this backlog, be critical: if a finding has real risk (future breakage, i18n issues, security), create an issue. If it's superficial or speculative, delete it.

---

*Cleared 2026-04-08 during Adaptive Replanning sprint close. All entries deleted (low/info severity, all already deferred with sound reasoning) or batched into #603-#609.*

## #620 — 2026-04-09

| Reviewer | Severity | Note |
|---|---|---|
| review | minor | `TelegramBotService.DownloadFileAsync:45` interpolates Telegram-supplied `file_path` into a URL without `Uri.EscapeDataString`. Defensive only — Telegram's documented file_path format is safe. |
| architecture-reviewer | minor | `TelegramBotServiceTests.cs` uses static `BuildService` factory instead of constructor + `IDisposable` (sibling pattern in `VoiceNoteServiceTests`/`TelegramConversationServiceTests`). Matches the closer reference `ClaudeApiClientUnitTests.cs`, which also uses a static `BuildClient` factory for HttpClient-based service tests. No cleanup needed. |

