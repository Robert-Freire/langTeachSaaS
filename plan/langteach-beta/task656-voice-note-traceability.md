# Task 656: Add voice note traceability

## Goal

Link `SessionLog` to the `VoiceNote` that produced it, and store the raw AI extraction JSON, so a misbehaving voice note can be fully reproduced.

## Acceptance Criteria

- `SessionLog.VoiceNoteId` nullable FK to `VoiceNote`, populated when draft comes from voice extraction; null otherwise.
- `SessionLog.RawExtractionJson` nullable `nvarchar(max)`, storing the raw Claude response (before JSON parsing) from extraction.
- Both fields populated in the voice extraction flow.
- `OnDelete(DeleteBehavior.SetNull)` on the FK.
- EF Core migration added.
- Manually-created session logs unaffected (both fields remain null).

## Architecture

### Flow analysis

**Web frontend flow:**
1. `POST /api/voice-notes` -> `VoiceNoteService.UploadAsync` -> VoiceNote entity created, Id returned.
2. `POST /api/students/{id}/sessions/extract` with transcription text -> `ReflectionExtractionService.ExtractAsync` -> `ExtractedReflectionDto` returned to frontend.
3. Frontend calls `POST /api/students/{id}/sessions` with `CreateSessionLogRequest` -> `SessionLogService.CreateAsync` creates the SessionLog.

**Telegram flow:**
- `TelegramConversationService.BuildSessionLogRequestAsync` calls `ExtractAsync` internally, then builds `CreateSessionLogRequest` and calls `SessionLogService.CreateAsync`.
- No `VoiceNote` entity is created in the Telegram flow; `VoiceNoteId` stays null.
- `RawExtractionJson` can still be set from the raw Claude response.

### Key insight: surfacing raw JSON

`ReflectionExtractionService.ExtractAsync` currently returns only the parsed `ExtractedReflectionDto`. The raw Claude response (`response.Content`) is discarded after `ParseResponse`. We must surface it so callers can store it.

**Approach:** Add `string? RawJson` to `ExtractedReflectionDto`. `ExtractAsync` sets it to `response.Content` (exactly as returned by Claude, before fence-stripping or parsing). Error path (Claude failure) keeps it null.

This does not require a new interface method or breaking callers — the new field is additive.

## Changes

### 1. `SessionLog.cs`
- Add `public Guid? VoiceNoteId { get; set; }`
- Add `public string? RawExtractionJson { get; set; }`
- Add nav property `public VoiceNote? VoiceNote { get; set; }`

### 2. `AppDbContext.cs`
Inside the `SessionLog` entity config block, add:
```csharp
e.HasOne(sl => sl.VoiceNote)
 .WithMany()
 .HasForeignKey(sl => sl.VoiceNoteId)
 .IsRequired(false)
 .OnDelete(DeleteBehavior.SetNull);
```

### 3. `ReflectionExtractionDtos.cs`
Add `string? RawJson` to `ExtractedReflectionDto` record (append to end so existing positional callers are not broken — or switch to named args if they exist).

Check: existing callers use named args (`WhatWasCovered: ..., AreasToImprove: ...` etc.), so adding a new positional member with a default is safe, or simply append with a default value.

### 4. `ReflectionExtractionService.cs`
In `ExtractAsync`, after `response = await _claude.CompleteAsync(...)`:
```csharp
var dto = ParseResponse(response.Content);
return dto with { RawJson = response.Content };
```
Also update the two error-path positional constructors (lines 65 and 93) that currently read
`new ExtractedReflectionDto(null, null, null, null, null, null, [])` to add `RawJson: null` as a named trailing parameter (or keep fully positional by appending `null`).

### 5. `StubReflectionExtractionService.cs`
Already uses named args — no change needed for compilation; `RawJson` defaults to null.

### 6. `SessionLogDtos.cs` — `CreateSessionLogRequest`
Add:
```csharp
public Guid? VoiceNoteId { get; set; }
public string? RawExtractionJson { get; set; }
```
No validation attributes needed (internal traceability fields, not user-editable).

### 7. `SessionLogService.cs` — `CreateAsync`
Wire in the entity construction:
```csharp
VoiceNoteId = request.VoiceNoteId,
RawExtractionJson = request.RawExtractionJson,
```

If `VoiceNoteId` is provided, validate it belongs to the same teacher (to prevent cross-teacher VoiceNote references). Do a quick `AnyAsync` check.

### 8. `TelegramConversationService.cs`
In `BuildSessionLogRequestAsync`, after extraction, set:
```csharp
RawExtractionJson = extracted?.RawJson
```

### 9. EF Migration
```bash
cd backend && dotnet ef migrations add AddVoiceNoteTraceability --project LangTeach.Api --startup-project LangTeach.Api
```

### 10. Tests
**`ReflectionExtractionServiceTests`** — add test: `ExtractAsync_SetsRawJson_FromClaudeResponse`.

**New `SessionLogServiceTests`** — using in-memory EF or mock DbContext:
- `CreateAsync_WithVoiceNoteId_PersistsVoiceNoteId`
- `CreateAsync_WithRawExtractionJson_PersistsRawJson`
- `CreateAsync_WithoutVoiceNoteFields_BothNull`

Look at existing `SessionLogServiceTests` pattern (none exist yet) — use `InMemoryDatabase` as done in `DashboardServiceTests.cs`.

## Migration cascade safety

`VoiceNote` cascades delete from `Teacher`. `SessionLog.TeacherId` is `NoAction`. New FK `SessionLog.VoiceNoteId -> VoiceNote` must be `SetNull` (not Cascade) to avoid a second cascade path from Teacher -> VoiceNote -> SessionLog. The issue explicitly calls this out.

## Out of scope

- No API endpoint changes for reading these fields (internal traceability only).
- `UpdateSessionLogRequest` does not get these fields (immutable after creation).
- No frontend changes.
