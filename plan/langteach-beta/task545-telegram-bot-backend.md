# Task 545 — Telegram Bot Backend: Webhook, Conversation State, Connect Code, Session Log Creation

## Issue
#545 — feat: Telegram bot backend — webhook, conversation state, connect code, session log creation

## Goal
Allow Jordi (teacher) to log session notes by sending a voice or text message to a Telegram bot.
Covers the full backend: DB link table, conversation state machine, connect/disconnect REST endpoints,
and the webhook handler that transcribes audio and creates a session log.

## Prerequisites verified
- #553 (ITranscriptionService stream refactor) is merged and present in sprint branch.

---

## Files to create

### Data model
- `backend/LangTeach.Api/Data/Models/TelegramLink.cs`
  - `long ChatId` (PK), `Guid TeacherId` (FK), `DateTime CreatedAt`

### Options
- `backend/LangTeach.Api/Services/TelegramOptions.cs`
  - `SectionName = "Telegram"`, `BotToken`, `WebhookSecret`

### State store
- `backend/LangTeach.Api/Services/ITelegramStateStore.cs`
  - `SetConnectCodeAsync(code, teacherId, expiry)` / `ConsumeConnectCodeAsync(code)` -> `Guid?`
  - `SetConversationStateAsync(chatId, state, expiry)` / `GetConversationStateAsync(chatId)` / `RemoveConversationStateAsync(chatId)`
- `backend/LangTeach.Api/Services/TelegramStateStore.cs`
  - Wraps `IMemoryCache`. Keys: `"TgCode:{code}"` and `"TgConv:{chatId}"`.

### Bot HTTP wrapper
- `backend/LangTeach.Api/Services/ITelegramBotService.cs`
  - `SendMessageAsync(chatId, text, ct)` — sends a text message via Telegram Bot API
  - `DownloadFileAsync(fileId, ct)` — returns `Stream`
- `backend/LangTeach.Api/Services/TelegramBotService.cs`
  - Uses named `HttpClient("Telegram")`. Base URL `https://api.telegram.org/bot{token}/`.
  - `SendMessageAsync`: `POST sendMessage`
  - `DownloadFileAsync`: `GET getFile` then `GET file/bot{token}/{filePath}`
- `backend/LangTeach.Api/Services/StubTelegramBotService.cs`
  - No-ops for E2ETesting/Testing. `DownloadFileAsync` returns `Stream.Null`.

### Conversation service
- `backend/LangTeach.Api/Services/TelegramConversationService.cs`
  - Injects: `AppDbContext`, `ITelegramStateStore`, `ITelegramBotService`, `ITranscriptionService`,
    `ISessionLogService`, `IStudentService`, `ILogger<TelegramConversationService>`
  - `HandleUpdateAsync(TelegramUpdate, ct)` — entry point from webhook controller
  - Parses update: extracts `chat_id`, text, or `voice.file_id`
  - **Correct flow order:**
    1. **Check `/connect <code>` first** (before any link lookup) — this is the only valid action for an unlinked chat.
       If text starts with `/connect`: call `HandleConnectCodeAsync(chatId, code, ct)` and return.
    2. Look up `TelegramLink` by `ChatId`. If not found -> send "not connected" instructions (how to connect via the app), return.
    3. Check existing conversation state for this `ChatId`:
       - If `WaitingForStudent`: parse reply as student selection (number or name), create session log, confirm, clear state, return.
    4. New message (voice or text):
       - Voice: download via `ITelegramBotService.DownloadFileAsync` + transcribe via `ITranscriptionService.TranscribeAsync`.
       - Text: use as notes directly.
       - Fetch student list: `IStudentService.ListAsync(teacherId, new StudentListQuery { PageSize = 100 }, ct)`.
         (Teachers realistically have <100 students; this covers all in one call.)
       - If no students: reply telling teacher to add a student, return.
       - Try to match student name (case-insensitive contains) against fetched list.
       - If matched: create session log immediately, send confirmation, return.
       - If not matched: store state `{WaitingForStudent, transcribedText, studentList}` with 10 min absolute expiry, reply with numbered list.
    5. Transcription fails: reply offering to save text manually.
  - `HandleConnectCodeAsync(chatId, code, ct)` — validates code via `ITelegramStateStore.ConsumeConnectCodeAsync`,
    inserts `TelegramLink` row, replies with confirmation
- Conversation state model (internal record, not persisted to DB):
  ```
  TelegramConversationState:
    TranscribedText: string
    Students: (int Index, Guid Id, string Name)[]
  ```

### Action filter
- `backend/LangTeach.Api/Infrastructure/TelegramWebhookSecretFilter.cs`
  - Implements `IActionFilter` (not `Attribute`). Constructor takes `IOptions<TelegramOptions>`.
  - Checks `X-Telegram-Bot-Api-Secret-Token` header against `TelegramOptions.WebhookSecret`.
  - Returns `StatusCode(401)` before binding if header is absent or wrong.
  - Applied via `[TypeFilter(typeof(TelegramWebhookSecretFilter))]` on the webhook action. No explicit DI registration needed; `TypeFilter` resolves constructor args from the DI container.

### Controller
- `backend/LangTeach.Api/Controllers/TelegramController.cs`
  ```
  POST /api/telegram/webhook          [AllowAnonymous] [TelegramWebhookSecretFilter]
  POST /api/telegram/connect-code     [Authorize] -> { code, expiresAt }
  GET  /api/telegram/status           [Authorize] -> { connected, linkedAt? }
  DELETE /api/telegram/link           [Authorize] -> 204
  ```

### DTOs
- `backend/LangTeach.Api/DTOs/TelegramDtos.cs`
  - `TelegramConnectCodeResponse(string Code, DateTime ExpiresAt)`
  - `TelegramStatusResponse(bool Connected, DateTime? LinkedAt)`
  - Minimal Telegram `Update` model (just enough fields: message.from.id, message.text, message.voice.file_id)

### Migration
- One EF migration: `AddTelegramLink` (timestamp ~20260406...)
  - Creates `TelegramLinks` table: `ChatId bigint PK`, `TeacherId uniqueidentifier FK -> Teachers.Id (Cascade)`, `CreatedAt datetime2`

### Tests (unit)
- `backend/LangTeach.Api.Tests/Services/TelegramStateStoreTests.cs`
  - Connect code: set, consume (returns teacherId), consume again (returns null — one-time)
  - Conversation state: set, get, remove
  - Uses `MemoryCache` directly (no in-memory DB needed)

- `backend/LangTeach.Api.Tests/Services/TelegramConversationServiceTests.cs`
  - Pattern: in-memory AppDbContext + real StudentService/SessionLogService + StubTelegramBotService
    (follows same pattern as VoiceNoteServiceTests using in-memory DB and concrete services)
  - StubTelegramBotService is concrete: `SendMessageAsync` records last sent message; `DownloadFileAsync` returns empty stream
  - Scenarios:
    - `/connect` with valid code: TelegramLink row inserted, confirmation sent
    - `/connect` with invalid code: error reply sent, no DB row
    - Unlinked chat (no /connect): sends not-connected reply
    - Voice message, no matching student: state saved, numbered list sent
    - Voice message, matching student name: session log created, confirmation sent
    - Text message while WaitingForStudent (student selection reply): session log created
    - No students on account: correct reply
    - Transcription failure (StubTranscriptionService throws): correct reply

### Tests (integration)
- `backend/LangTeach.Api.Tests/Controllers/TelegramControllerTests.cs`
  - `POST /api/telegram/connect-code`: authenticated -> 200 with code+expiry
  - `GET /api/telegram/status`: no link -> `{ connected: false }`
  - `DELETE /api/telegram/link`: no link -> 404; with link -> 204
  - `POST /api/telegram/webhook`: wrong secret -> 401; valid secret + unlinked chat -> 200 (bot replies handled by stub)

### E2E test
- `e2e/tests/telegram-connect.spec.ts`
  - Setup: mock teacher + mock auth
  - `POST /api/telegram/connect-code`: returns code (10-char string) and future expiresAt
  - `GET /api/telegram/status`: returns `{ connected: false }`
  - `DELETE /api/telegram/link`: 404 (no link yet)
  - Simulate connect: POST webhook with valid secret + `/connect <code>` from a fake chat_id (stub bot noop)
  - `GET /api/telegram/status`: now returns `{ connected: true, linkedAt: ... }`
  - `DELETE /api/telegram/link`: 204

---

## Files to modify

### `backend/LangTeach.Api/Data/AppDbContext.cs`
- Add `DbSet<TelegramLink> TelegramLinks => Set<TelegramLink>();`
- In `OnModelCreating`:
  ```csharp
  modelBuilder.Entity<TelegramLink>(e =>
  {
      e.HasKey(t => t.ChatId);
      e.HasOne<Teacher>()
       .WithMany()
       .HasForeignKey(t => t.TeacherId)
       .OnDelete(DeleteBehavior.Cascade);
  });
  ```

### `backend/LangTeach.Api/Program.cs`
- Add `builder.Services.AddMemoryCache();`
- Add `builder.Services.AddHttpClient("Telegram", ...)` with base URL from TelegramOptions
- Register `ITelegramStateStore`, `TelegramConversationService`
- E2ETesting/Testing: register `StubTelegramBotService`, else `TelegramBotService`
- `StartupConfigValidator`: add `"Telegram:BotToken"`, `"Telegram:WebhookSecret"` to required keys list
- Register `TelegramWebhookSecretFilter` as a scoped service (so it can be resolved by attribute/DI)

### `backend/LangTeach.Api/appsettings.json`
- Add `"Telegram": { "BotToken": "", "WebhookSecret": "" }` section

### `backend/LangTeach.Api/appsettings.Development.json` (if it exists)
- Also add `"Telegram": { "BotToken": "", "WebhookSecret": "" }` so local dev doesn't crash at startup.
  (Same pattern as AzureSpeech keys in this file.)

---

## Infrastructure (manual/deploy steps — not in code)

- Add Key Vault secrets: `Telegram--BotToken`, `Telegram--WebhookSecret`
- Register webhook URL once via Telegram API:
  `POST https://api.telegram.org/bot{token}/setWebhook?url={apiBaseUrl}/api/telegram/webhook&secret_token={secret}`
- Document in `docs/dev-workflow.md` under "Telegram bot setup"

---

## Acceptance criteria mapping

| AC | Implementation |
|----|----------------|
| POST /api/telegram/connect-code | TelegramController.GenerateConnectCode -> stores in IMemoryCache |
| GET /api/telegram/status | TelegramController.GetStatus -> queries TelegramLinks table |
| DELETE /api/telegram/link | TelegramController.DeleteLink -> removes TelegramLink row |
| /connect <code> in bot | TelegramConversationService.HandleConnectCodeAsync |
| Voice message -> transcribe | DownloadFileAsync + ITranscriptionService.TranscribeAsync |
| Student list reply | Conversation state WaitingForStudent, numbered list |
| Session log created | ISessionLogService.CreateAsync with GeneralNotes = transcription |
| Text messages accepted | text directly as notes |
| Name matching | fuzzy contains check against student names |
| State expiry (10 min) | IMemoryCache sliding expiry on conversation state |
| Unlinked account | Reply with instructions |
| No students | Reply with add-student instruction |
| Transcription fails | Reply offering manual text |

---

## Not in scope (this PR)
- Frontend settings UI (#554)
- WhatsApp integration
- Multi-student sessions
- Proactive bot messages
- Lesson generation from bot
