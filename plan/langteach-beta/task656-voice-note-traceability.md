# Task 656: Voice Note Traceability via VoiceNoteApplication Table

## Issue
#656 — Add voice note traceability via VoiceNoteApplication table

## Context

Currently, when a voice note creates a session log (web UI or Telegram), nothing records
which voice note was used, what transcription was sent to Claude, or what Claude returned.
This makes it impossible to reproduce failures.

The fix: introduce a `VoiceNoteApplication` table that records every time a voice note is
applied to a session log. `SessionLog` itself does NOT get `VoiceNoteId` or `RawExtractionJson`
fields.

## Flows to Cover

**Web UI (SessionLogDialog.tsx):**
1. User records voice note -> `uploadVoiceNote()` -> returns `VoiceNote { id, transcription }`
2. `extractSessionReflection(studentId, transcription)` -> POST `/api/students/{id}/sessions/extract`
   -> returns `ExtractedReflectionDto` (currently no raw JSON)
3. `createSession(studentId, {...})` -> POST `/api/students/{id}/sessions`
   -> backend creates `SessionLog`

**Telegram:**
1. Audio downloaded -> `TranscribeAsync()` -> `notes` string
2. `_extractionService.ExtractAsync(notes)` -> `ExtractedReflectionDto`
3. `_sessionLogService.CreateAsync(...)` -> `SessionLog`

## Design

### Capture Raw JSON from Claude

Add `string? RawExtractionJson` to `ExtractedReflectionDto` (as a positional parameter at the end).
`ReflectionExtractionService.ExtractAsync` captures `response.Content` before parsing and
includes it in the returned DTO. The stub returns `null`.

This field flows through the extract endpoint back to the frontend, which passes it in the
create session log request.

### Pass VoiceNote Context Through Create Request

Add three optional fields to `CreateSessionLogRequest`:

```csharp
public Guid? VoiceNoteId { get; set; }          // null for Telegram
public string? VoiceNoteTranscription { get; set; }  // text sent to extractor
public string? RawExtractionJson { get; set; }  // raw Claude response
```

Only when at least one of these is non-null does `SessionLogService.CreateAsync` write a
`VoiceNoteApplication` row. `ApplicationType = Create` always (Update is future scope).

### VoiceNoteApplication Model

```csharp
public class VoiceNoteApplication
{
    public Guid Id { get; set; }
    public Guid SessionLogId { get; set; }
    public Guid? VoiceNoteId { get; set; }         // null for Telegram
    public string? Transcription { get; set; }
    public string? RawExtractionJson { get; set; }
    public ApplicationType ApplicationType { get; set; }
    public DateTime AppliedAt { get; set; }

    public SessionLog SessionLog { get; set; } = null!;
    public VoiceNote? VoiceNote { get; set; }
}

public enum ApplicationType { Create, Update }
```

### EF Configuration (AppDbContext)

```csharp
modelBuilder.Entity<VoiceNoteApplication>(e =>
{
    e.HasKey(a => a.Id);
    e.HasIndex(a => a.SessionLogId);
    e.HasOne(a => a.SessionLog)
     .WithMany()
     .HasForeignKey(a => a.SessionLogId)
     .OnDelete(DeleteBehavior.Cascade);
    e.HasOne(a => a.VoiceNote)
     .WithMany()
     .HasForeignKey(a => a.VoiceNoteId)
     .IsRequired(false)
     .OnDelete(DeleteBehavior.SetNull);
});
```

**Note on SQL Server multi-cascade-path:** `VoiceNote` cascades from `Teacher` (Cascade).
`SessionLog` is NoAction from Teacher/Student. `VoiceNoteApplication.SessionLogId` is Cascade
(from SessionLog, not from Teacher directly), so no cycle conflict. `VoiceNoteId` is SetNull
(not Cascade), so also fine.

### Telegram flow change

In `TelegramConversationService.BuildSessionLogRequestAsync`, capture `rawExtractionJson` from
the extracted DTO and populate the new request fields. Since Telegram voice notes are not
stored as `VoiceNote` entities, `VoiceNoteId` stays null; `Transcription` is the `notes`
string passed into the method.

Pass `notes` parameter down to `BuildSessionLogRequestAsync` (already there) and add
`VoiceNoteTranscription = notes` and `RawExtractionJson = extracted?.RawExtractionJson`
to the returned `CreateSessionLogRequest`.

### Frontend changes

1. `frontend/src/api/sessionLogs.ts`: Add `rawExtractionJson?: string` to `ExtractedReflection`
   interface and `voiceNoteId?: string`, `voiceNoteTranscription?: string`,
   `rawExtractionJson?: string` to `CreateSessionLogRequest` interface.
2. `frontend/src/components/session/SessionLogDialog.tsx`: In `handleVoiceNote`, after
   getting `extracted`, pass `voiceNote.id`, `voiceNote.transcription`, and
   `extracted.rawExtractionJson` in the `createSession` call.

## Files to Change

| File | Change |
|------|--------|
| `backend/LangTeach.Api/Data/Models/VoiceNoteApplication.cs` | NEW — entity + enum |
| `backend/LangTeach.Api/Data/AppDbContext.cs` | Add `VoiceNoteApplications` DbSet + config |
| `backend/LangTeach.Api/Migrations/<ts>_AddVoiceNoteApplication.cs` | EF migration (generated) |
| `backend/LangTeach.Api/DTOs/ReflectionExtractionDtos.cs` | Add `RawExtractionJson?` as 8th positional param |
| `backend/LangTeach.Api/Services/ReflectionExtractionService.cs` | Capture raw JSON; update 2 error-path `new ExtractedReflectionDto(...)` calls (lines 40 and 68) to add `null` as 8th arg |
| `backend/LangTeach.Api/Services/StubReflectionExtractionService.cs` | Add `null` as 8th arg |
| `backend/LangTeach.Api/DTOs/SessionLogDtos.cs` | Add 3 optional fields to `CreateSessionLogRequest` |
| `backend/LangTeach.Api/Services/SessionLogService.cs` | Create `VoiceNoteApplication` row in `CreateAsync` |
| `backend/LangTeach.Api/Services/TelegramConversationService.cs` | Populate new request fields |
| `backend/LangTeach.Api.Tests/Services/TelegramConversationServiceTests.cs` | Update 3 `new ExtractedReflectionDto(...)` positional calls (all need 8th `null` arg) |
| `backend/LangTeach.Api.Tests/Services/ReflectionExtractionServiceTests.cs` | Extend existing tests to assert `RawExtractionJson` |
| `frontend/src/api/sessionLogs.ts` | Extend interfaces |
| `frontend/src/components/session/SessionLogDialog.tsx` | Pass voiceNoteId, voiceNoteTranscription, rawExtractionJson in createSession call |
| `frontend/src/components/session/SessionLogDialog.test.tsx` | NEW — verify 3 new fields flow into createSession |

## Notes on Fields

- `VoiceNoteTranscription` and `RawExtractionJson` on `CreateSessionLogRequest`: intentionally no
  `[MaxLength]` attribute, because the raw Claude JSON and transcription can be arbitrarily large.
  SQL Server `nvarchar(max)` columns (no length constraint in EF = max). These are internal fields
  not exposed via public update endpoints.
- `voiceNote` is already in scope in `handleVoiceNote` in `SessionLogDialog.tsx`. The three new
  fields are added directly to the object literal passed to `createSession` at line ~335:
  `voiceNoteId: voiceNote.id`, `voiceNoteTranscription: voiceNote.transcription ?? undefined`,
  `rawExtractionJson: extracted.rawExtractionJson ?? undefined`.

## Tests to Write

1. `SessionLogServiceTests`: new test verifies that calling `CreateAsync` with
   `VoiceNoteTranscription` set writes a `VoiceNoteApplication` row with `ApplicationType=Create`.
2. `SessionLogServiceTests`: test that calling `CreateAsync` without voice note fields writes NO
   `VoiceNoteApplication` row.
3. `TelegramConversationServiceTests`: verify that `CreateAsync` is called with populated
   `VoiceNoteTranscription` and `RawExtractionJson` when extraction succeeds.
4. `ReflectionExtractionServiceTests`: verify `RawExtractionJson` on returned DTO matches
   the raw Claude response content (extend existing `ParseResponse` tests).
5. `SessionLogDialog.test.tsx`: new test verifies that after `handleVoiceNote`, the
   `createSession` call includes `voiceNoteId`, `voiceNoteTranscription`, and `rawExtractionJson`.

## Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| New `VoiceNoteApplication` entity and EF migration | Model + migration |
| `ApplicationType` enum: Create, Update | Enum in model file |
| `VoiceNoteId` nullable FK with SetNull on delete | EF config |
| `SessionLogId` FK with cascade delete | EF config |
| Row written on web UI voice note create | SessionLogService + frontend passing voiceNoteId |
| Row written on Telegram voice note create (VoiceNoteId=null) | TelegramConversationService + SessionLogService |
| Future Update flow also writes row | ApplicationType enum exists; Update path is future scope (not implemented now) |
| No new public API endpoints | Confirmed: extending existing DTOs only |

## Out of Scope

- The "update via voice note" flow (AC deliberately deferred)
- Lesson notes voice note path (LessonNotesCard / LessonNotesController) — not a session log
- Any read/admin endpoint for VoiceNoteApplication
