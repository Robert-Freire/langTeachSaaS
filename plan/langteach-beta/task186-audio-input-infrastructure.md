# Task 186 - Audio Input Infrastructure

**Issue:** #186 Audio input infrastructure: record, upload, and transcribe voice notes  
**Sprint:** Adaptive Replanning (`sprint/adaptive-replanning`)  
**Priority:** P1:must  
**Labels:** area:frontend, area:backend, area:ai

## Goal

Build a reusable audio recording/upload + transcription component that other features (post-class reflections, voice-driven lesson planning) can embed. Teachers record a voice note directly in the browser or upload an existing audio file; the system transcribes it via OpenAI Whisper API.

## Acceptance Criteria

- [ ] Teacher can record audio directly in the browser
- [ ] Teacher can upload an existing audio file
- [ ] Audio is transcribed automatically within 30 seconds of upload
- [ ] Transcription is displayed and editable by the teacher
- [ ] Audio and transcription are persisted and retrievable
- [ ] Recording works on desktop and mobile browsers
- [ ] Max duration enforced with clear feedback (5 minutes)

## Approach

### Architecture

The audio infrastructure is a **standalone concern** -- a new `VoiceNote` entity linked to `Teacher` (and optionally to a context entity via a polymorphic-style nullable FK). This task delivers the infrastructure layer; #187 (post-class reflection) will wire it to SessionLog.

The transcription endpoint is a backend API call (`POST /api/voice-notes`). Frontend uploads the audio file as `multipart/form-data`; backend stores it in Blob Storage and calls OpenAI Whisper, returning the new `VoiceNote` record.

### OpenAI Whisper

OpenAI Whisper API is the transcription service (`POST https://api.openai.com/v1/audio/transcriptions`). The existing Claude API key is Anthropic-only; we need a separate `OpenAI:ApiKey` config key. We add an `ITranscriptionService` / `WhisperTranscriptionService` following the same IHttpClientFactory pattern as `ClaudeApiClient`.

### Data model

New `VoiceNote` entity:

```csharp
public class VoiceNote
{
    public Guid Id { get; set; }
    public Guid TeacherId { get; set; }
    public string BlobPath { get; set; }       // audio in Blob Storage
    public string OriginalFileName { get; set; }
    public string ContentType { get; set; }
    public long SizeBytes { get; set; }
    public int DurationSeconds { get; set; }   // 0 if unknown
    public string? Transcription { get; set; }  // null until transcribed
    public bool TranscriptionComplete { get; set; }
    public DateTime CreatedAt { get; set; }
    public Teacher Teacher { get; set; } = null!;
}
```

Stored in a new blob container `voice-notes` (separate from `materials`).

EF migration: `AddVoiceNote`.

### Backend API

`POST /api/voice-notes` (multipart/form-data):
- Field `file`: audio file
- Returns `VoiceNoteDto` (id, transcription, transcriptionComplete, blobPath, ...)

`GET /api/voice-notes/{id}` -- retrieve with latest transcription

`PATCH /api/voice-notes/{id}/transcription` -- update transcription text (teacher edit)
- Request body: `UpdateTranscriptionRequest { string Transcription }` (explicit DTO in `VoiceNoteDtos.cs`)

`GET /api/voice-notes/{id}/audio` -- redirect to SAS download URL (same pattern as materials)

Validation:
- Allowed content types: `audio/webm`, `audio/mp4`, `audio/mpeg`, `audio/wav`, `audio/ogg`
- Max size: 50 MB (5-min @ reasonable bitrate)
- Transcription happens synchronously in the same request (Whisper is fast for short clips; 30s timeout is achievable for <= 5 min audio)

### Frontend: AudioRecorder component

New shared component `frontend/src/components/audio/AudioRecorder.tsx`:

```tsx
interface AudioRecorderProps {
  onVoiceNote: (note: VoiceNote) => void
  disabled?: boolean
}
```

Internals:
- Uses `MediaRecorder` API (webm/opus on Chrome, mp4/aac on Safari)
- Shows: idle / recording / uploading states
- Real-time duration counter; stops and warns at 5:00
- "Upload file" button as alternative to recording
- On stop: calls `uploadVoiceNote(file)` API function, shows spinner, then calls `onVoiceNote` with the result

Frontend API client: `frontend/src/api/voiceNotes.ts`

### Blob Storage for Voice Notes

`VoiceNoteService` will instantiate its own `BlobContainerClient` directly from the injected `BlobServiceClient` singleton (the same approach used in `BlobStorageService` for the `materials` container). The container is named `voice-notes`. `BlobStorageService` is NOT modified -- it retains its single-container assumption. `VoiceNoteService` calls `_voiceNotesContainer.CreateIfNotExistsAsync()` in a one-time init path at startup (via a hosted service or via lazy-init on first upload).

Concretely: `Program.cs` will call a `VoiceNoteService.InitializeAsync()` in the startup block alongside `BlobStorageService.InitializeAsync()`.

### Configuration

New config keys:
- `OpenAI:ApiKey` -- added to `appsettings.json` (empty default), `.env` for dev, Key Vault for prod
- Startup validator: add `OpenAI:ApiKey` to required keys list in `Program.cs` (production only, same block as other keys)
- **Dev note**: `OpenAI:ApiKey` is NOT validated in dev/E2ETesting environments. In E2ETesting the stub is used so no key is needed. In dev, a missing key will cause the first real transcription call to fail with a clear HTTP 401 from OpenAI -- this is acceptable.

Note: for E2ETesting environment the transcription service should short-circuit (return a fake transcription) to avoid real API calls during tests. We add `ITranscriptionService` with a `StubTranscriptionService` for E2ETesting, controlled by environment check in `Program.cs`.

## Implementation Steps

1. **Backend: VoiceNote entity + migration**
   - `Data/Models/VoiceNote.cs`
   - `AppDbContext`: add `DbSet<VoiceNote>`, add FK config + blob container init
   - Run `dotnet ef migrations add AddVoiceNote` via docker

2. **Backend: Voice notes blob container**
   - `VoiceNoteService` holds its own `_voiceNotesContainer` (BlobContainerClient for `"voice-notes"`) instantiated from the injected `BlobServiceClient` singleton
   - Register `VoiceNoteService` as singleton (like `BlobStorageService`) and call `InitializeAsync()` in the startup block

3. **Backend: ITranscriptionService**
   - `ITranscriptionService` interface: `Task<string> TranscribeAsync(Stream audio, string contentType, CancellationToken ct)`
   - `WhisperTranscriptionService`: calls OpenAI `/v1/audio/transcriptions` multipart
   - `StubTranscriptionService`: returns `"[Test transcription]"` immediately
   - Register in `Program.cs`: Whisper in prod/dev, Stub in E2ETesting

4. **Backend: VoiceNotesController + VoiceNoteService**
   - `VoiceNoteService` / `IVoiceNoteService`
   - `VoiceNotesController`: POST, GET, PATCH transcription, GET audio

5. **Backend: Config + startup validation**
   - `appsettings.json`: add `OpenAI:ApiKey: ""`
   - `StartupConfigValidator`: add `OpenAI:ApiKey` to required keys
   - `.claude/procedures/`: document new secret

6. **Frontend: voiceNotes API client**
   - `frontend/src/api/voiceNotes.ts`

7. **Frontend: AudioRecorder component**
   - `frontend/src/components/audio/AudioRecorder.tsx`
   - Unit tests: `AudioRecorder.test.tsx` (mock MediaRecorder, mock API)

8. **E2E test: voice-note.spec.ts**
   - Upload an audio file (use a tiny test fixture)
   - Verify transcription appears (stub returns `[Test transcription]`)
   - Verify transcription is editable and saved

## Files Changed

### New
- `backend/LangTeach.Api/Data/Models/VoiceNote.cs`
- `backend/LangTeach.Api/Migrations/<timestamp>_AddVoiceNote.cs` (+ Designer + snapshot update)
- `backend/LangTeach.Api/Services/ITranscriptionService.cs`
- `backend/LangTeach.Api/Services/WhisperTranscriptionService.cs`
- `backend/LangTeach.Api/Services/StubTranscriptionService.cs`
- `backend/LangTeach.Api/Services/IVoiceNoteService.cs`
- `backend/LangTeach.Api/Services/VoiceNoteService.cs`
- `backend/LangTeach.Api/Controllers/VoiceNotesController.cs`
- `backend/LangTeach.Api/DTOs/VoiceNoteDtos.cs` (VoiceNoteDto, UpdateTranscriptionRequest)
- `backend/LangTeach.Api.Tests/VoiceNoteServiceTests.cs` (validation: file-too-large, unsupported content type, happy path)
- `frontend/src/api/voiceNotes.ts`
- `frontend/src/components/audio/AudioRecorder.tsx`
- `frontend/src/components/audio/AudioRecorder.test.tsx`
- `e2e/tests/voice-note.spec.ts`
- `e2e/fixtures/test-audio.webm` (tiny silent audio for test)

### Modified
- `backend/LangTeach.Api/Data/AppDbContext.cs`
- `backend/LangTeach.Api/Services/BlobStorageService.cs`
- `backend/LangTeach.Api/Program.cs`
- `backend/LangTeach.Api/Infrastructure/StartupConfigValidator.cs`
- `backend/LangTeach.Api/appsettings.json`

## E2E Coverage

The `AudioRecorder` component is reusable infrastructure with no dedicated page. The e2e test exercises the **API directly** (not through the UI component -- that is covered by frontend unit tests). This avoids the need for a dedicated test-harness page before #187 lands.

Happy path (API-level):
1. POST multipart audio (tiny `test-audio.webm` fixture) to `POST /api/voice-notes`
2. Verify response 201 with `transcription = "[Test transcription]"` (stub)
3. PATCH `/api/voice-notes/{id}/transcription` with edited text
4. GET `/api/voice-notes/{id}` -- verify updated transcription is returned

Frontend unit tests (`AudioRecorder.test.tsx`) cover:
- Idle / recording / uploading state transitions
- Duration limit warning at 5 minutes
- onVoiceNote callback called with returned VoiceNote

## Out of Scope for This Task

- Wiring AudioRecorder into SessionLogDialog (issue #187)
- Voice-driven lesson planning (future)
- Azure Speech Services (future, after Whisper)
- Mobile MediaRecorder polyfills beyond standard WebM/MP4 support
