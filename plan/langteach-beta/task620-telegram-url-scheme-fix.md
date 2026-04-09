# Task 620 — Fix Telegram bot URL scheme bug

**Issue:** #620 (P1, type:bug, area:backend, milestone: UI Redesign & Student Profile Polish)
**Branch:** `task/t620-telegram-url-scheme`
**Worktree:** `.claude/worktrees/task-t620-telegram-url-scheme`

## Problem

`TelegramBotService` throws `System.NotSupportedException: The 'bot<TOKEN_PREFIX>' scheme is not supported.` on every outbound Telegram call in `app-langteach-api-dev`. Root cause: relative request paths begin with `bot{token}/...`, and because the bot token contains `:`, `HttpClient` URI composition parses `bot<prefix>` as a URI scheme.

Verified in the current code:
- `backend/LangTeach.Api/Services/TelegramBotService.cs:23` — `client.PostAsync($"bot{_token}/sendMessage", ...)`
- `:32` — `client.GetAsync($"bot{_token}/getFile?file_id=...")`
- `:44` — `client.GetAsync($"file/bot{_token}/{filePath}")`
- `Program.cs:198-202` — `Telegram` HttpClient has `BaseAddress = https://api.telegram.org/` with no token.

## Fix

1. **`Program.cs` (Telegram HttpClient registration)** — bake the token into the base address so relative URLs no longer contain a colon.
   ```csharp
   builder.Services.AddHttpClient("Telegram", (sp, client) =>
   {
       var token = sp.GetRequiredService<IOptions<TelegramOptions>>().Value.BotToken;
       client.BaseAddress = new Uri($"https://api.telegram.org/bot{token}/");
       client.Timeout = TimeSpan.FromSeconds(30);
   });
   ```

2. **`TelegramBotService.cs`** — switch relative URLs to no-token form, build the file-download URL as an absolute `Uri` (it lives under `/file/bot{token}/...`, a different base path).
   - Keep `_token` field because file-download URL still needs it (absolute URI).
   - `SendMessageAsync`: `client.PostAsync("sendMessage", content, ct)`
   - `DownloadFileAsync` step 1: `client.GetAsync($"getFile?file_id={Uri.EscapeDataString(fileId)}", ct)`
   - `DownloadFileAsync` step 2: `client.GetAsync(new Uri($"https://api.telegram.org/file/bot{_token}/{filePath}"), ct)`

3. **New unit test** `TelegramBotServiceTests.cs`:
   - Uses a stub `HttpMessageHandler` to intercept requests.
   - Registers the `Telegram` HttpClient the same way Program.cs does (with token in base address).
   - Asserts: after `SendMessageAsync(chatId, "hi")`, the captured `RequestUri.AbsoluteUri` equals `https://api.telegram.org/bot{token}/sendMessage`.
   - Asserts: the request does not throw `NotSupportedException`.
   - Optional second test for `DownloadFileAsync` URL composition if straightforward.

## Acceptance criteria mapping

- [x] `SendMessageAsync` posts without `NotSupportedException` — fix + unit test.
- [x] `/connect <code>` reply works — same fix, verified via unit test (live verification is post-merge manual smoke).
- [x] Text / voice flows proceed — same fix (no other logic touched).
- [x] URL composition test — the new unit test.
- [x] Existing unit tests pass — `TelegramConversationServiceTests` does not hit `TelegramBotService` directly; pre-push `dotnet test` validates.
- [x] `e2e/tests/telegram-connect.spec.ts` still passes — E2ETesting environment uses `StubTelegramBotService`, unchanged.

## Out of scope

- Retry/backoff on Telegram failures.
- Logging Telegram response bodies on failure.
- Refactoring `_token` out entirely (file-download URL still needs it).

## Test plan

- `dotnet test backend/LangTeach.Api.Tests` — new unit test + existing suite.
- Pre-push build verify script.
- No frontend changes, no `review-ui` needed (backend-only; no `area:frontend` or `area:design` label).

## Risk

Low. Single service, bounded change, covered by new unit test. No DB, no API contract change, no frontend.
