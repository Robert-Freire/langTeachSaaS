# Task 553 — refactor: ITranscriptionService — accept Stream instead of IFormFile

## Status
In progress

## Issue
[#553](https://github.com/Robert-Freire/langTeachSaaS/issues/553)

## Current State (after sprint/adaptive-replanning sync)

`ITranscriptionService.TranscribeAsync` already uses the Stream-based signature:
```csharp
Task<string> TranscribeAsync(Stream audio, string fileName, string contentType, CancellationToken ct = default);
```

Both `AzureSpeechTranscriptionService` and `StubTranscriptionService` already implement this.

**What remains:**
- `IVoiceNoteService.UploadAsync` and `VoiceNoteService.UploadAsync` still accept `IFormFile` (web-transport concern)
- `VoiceNoteServiceTests` still use `MakeFormFile` helper (IFormFile mocks), not streams
- AC 4 ("New signature tested with a stream-based unit test, not IFormFile mock") is unmet

## Acceptance Criteria

1. ✅ `ITranscriptionService` signature takes `Stream, fileName, contentType` — no `IFormFile`
2. `VoiceNoteService` compiles and passes all existing tests
3. No behaviour change: upload flow (browser voice input) works identically
4. New signature tested with a stream-based unit test (not `IFormFile` mock)

## Changes Required

### 1. `IVoiceNoteService` — new signature

```csharp
Task<VoiceNoteDto> UploadAsync(
    Guid teacherId,
    Stream audio,
    string fileName,
    string contentType,
    long sizeBytes,
    CancellationToken ct = default);
```

Remove `using Microsoft.AspNetCore.Http;` from the interface file.

### 2. `VoiceNoteService.UploadAsync` — update implementation

- Accept `Stream audio, string fileName, string contentType, long sizeBytes` instead of `IFormFile`
- Validation: use `sizeBytes` for size check, use `contentType` for allowed-type check (strip codec params)
- Buffering: copy `audio` to `MemoryStream` buffer (needed for two reads: blob upload + transcription)
- Remove `file.CopyToAsync`, `file.Length`, `file.FileName`, `file.ContentType` references
- Remove `using Microsoft.AspNetCore.Http;`

### 3. `VoiceNotesController.Upload` — extract from IFormFile

The controller is the HTTP boundary — it still accepts `IFormFile` from ASP.NET:
```csharp
[HttpPost]
[RequestSizeLimit(51 * 1024 * 1024)]
public async Task<IActionResult> Upload(IFormFile file, CancellationToken ct)
{
    // ...
    using var stream = file.OpenReadStream();
    var note = await _voiceNoteService.UploadAsync(
        teacherId, stream, file.FileName, file.ContentType, file.Length, ct);
    // ...
}
```

No change to the endpoint contract (same HTTP multipart upload).

### 4. `VoiceNoteServiceTests` — update to stream-based

Replace `MakeFormFile(...)` helper with `MakeStream(sizeBytes)` that returns `(Stream, string fileName, string contentType, long sizeBytes)`.

All calls to `_sut.UploadAsync(_teacherId, file)` become `_sut.UploadAsync(_teacherId, stream, "recording.webm", "audio/webm", sizeBytes)`.

Remove `MakeFormFile` helper and `using Microsoft.AspNetCore.Http;` from the test file.

## Files to Change

| File | Change |
|------|--------|
| `backend/LangTeach.Api/Services/IVoiceNoteService.cs` | New UploadAsync signature, remove IFormFile import |
| `backend/LangTeach.Api/Services/VoiceNoteService.cs` | Update UploadAsync to accept Stream+metadata, remove IFormFile |
| `backend/LangTeach.Api/Controllers/VoiceNotesController.cs` | Extract from IFormFile, call service with stream |
| `backend/LangTeach.Api.Tests/Services/VoiceNoteServiceTests.cs` | Replace IFormFile helpers with stream helpers |

## E2E Impact

None — endpoint contract unchanged. Existing `session-log-voice.spec.ts` and `voice-note.spec.ts` e2e tests cover the HTTP upload path end-to-end; no new e2e tests needed.

## Out of Scope

- No blob storage logic changes
- No transcription logic changes
- No migration changes
- No new endpoints
