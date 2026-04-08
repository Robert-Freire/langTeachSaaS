# Task 513 — Audio file magic bytes validation

## Issue
#513: security: validate audio file magic bytes on upload to prevent MIME spoofing

## Context
`VoiceNoteService.UploadAsync` currently validates the upload using `baseContentType` (derived from the client-supplied `Content-Type` header). A non-audio payload can be mislabeled and flow to blob storage and Azure Speech. The fix is to read the first 16 bytes of the buffered stream and verify they match expected magic bytes for the declared content type.

## Files to change

| File | Change |
|------|--------|
| `backend/LangTeach.Api/Services/VoiceNoteService.cs` | Add `MagicByteValidators` dict + call `ValidateMagicBytes` after `CopyToAsync` |
| `backend/LangTeach.Api.Tests/Services/VoiceNoteServiceTests.cs` | Update existing tests to use valid magic bytes; add 6 happy-path + 1 spoofed test |

No new files, no migrations, no DTOs.

## Implementation

### VoiceNoteService.cs

Add a static readonly dictionary mapping each allowed content type to a validator:

```
audio/webm      => bytes[0..3] == 1A 45 DF A3
audio/mp4       => bytes[4..7] == "ftyp"
audio/x-m4a     => bytes[4..7] == "ftyp"
audio/wav       => bytes[0..3] == "RIFF" && bytes[8..11] == "WAVE"
audio/ogg       => bytes[0..3] == "OggS"
audio/mpeg      => bytes[0..2] == "ID3"  OR  bytes[0] == 0xFF && bytes[1] in {0xFB, 0xF3, 0xF2}
```

**Exact insertion order** (between the existing `CopyToAsync` call and the blob upload):

```csharp
await audio.CopyToAsync(buffer, ct);
buffer.Position = 0;                          // existing line -- seek to start for header read

var header = new byte[16];
_ = await buffer.ReadAsync(header, 0, header.Length, ct);
ValidateMagicBytes(baseContentType, header);  // throws InvalidOperationException on mismatch

buffer.Position = 0;                          // reset again for upload and transcription
await _blobStorage.UploadAsync(...);
```

Throw `InvalidOperationException($"File content does not match the declared type '{baseContentType}'.")` on mismatch.

### VoiceNoteServiceTests.cs

- Update `MakeStream` to accept an optional `byte[]? header` param that is prepended to the zero-filled payload.
- Update existing `UploadAsync_ValidStream_ReturnsTranscribedNote` to pass webm magic bytes.
- Update any other existing test that calls `UploadAsync` with `"audio/webm"` to also pass magic bytes.
- Add:
  - `UploadAsync_WebmMagicBytes_Passes`
  - `UploadAsync_Mp4MagicBytes_Passes`
  - `UploadAsync_XM4aMagicBytes_Passes` (same ftyp header, declared as `audio/x-m4a`)
  - `UploadAsync_WavMagicBytes_Passes`
  - `UploadAsync_OggMagicBytes_Passes`
  - `UploadAsync_MpegId3MagicBytes_Passes`
  - `UploadAsync_MpegSyncWordMagicBytes_Passes`
  - `UploadAsync_SpoofedMimeType_ThrowsInvalidOperation` (ogg bytes declared as audio/webm)

Note: `MakeStream(int zeroPaddingBytes, byte[]? header = null)` -- `zeroPaddingBytes` is the count of zero-fill bytes appended after the header (not total size). The `sizeBytes` arg passed to `UploadAsync` should be `header.Length + zeroPaddingBytes`.

## Acceptance criteria

- [x] All 5 allowed types (webm, mp4/x-m4a, wav, ogg, mpeg) validate successfully with correct magic bytes
- [x] Spoofed payload (wrong magic bytes for declared type) throws `InvalidOperationException`
- [x] `buffer.Position` is reset to 0 after the check so upload and transcription still work
- [x] Existing unit tests still pass (updated to use valid streams)
- [x] Build and tests green

## Out of scope
- E2E test (endpoint requires authenticated teacher; this is a backend-only defense-in-depth unit; no UI change)
- audio/mpeg MIME type validation with `\xFF\xE3` (not in issue spec)
