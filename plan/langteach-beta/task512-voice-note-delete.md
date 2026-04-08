# Task 512 — VoiceNote delete endpoint with blob cleanup

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/512

## What
Add `DELETE /api/voice-notes/{id}` that deletes the DB row and then removes the blob from Azure storage (idempotent blob delete — ignore "not found").

## Files to change

| File | Change |
|------|--------|
| `backend/LangTeach.Api/Services/IVoiceNoteBlobStorage.cs` | Add `DeleteAsync(string blobPath, CancellationToken ct = default)` |
| `backend/LangTeach.Api/Services/VoiceNoteBlobStorage.cs` | Implement `DeleteAsync` using `BlobClient.DeleteIfExistsAsync` |
| `backend/LangTeach.Api.Tests/Helpers/InMemoryVoiceNoteBlobStorage.cs` | Add `DeleteAsync` stub (removes from `_blobs` dict) |
| `backend/LangTeach.Api/Services/IVoiceNoteService.cs` | Add `DeleteAsync(Guid teacherId, Guid id, CancellationToken ct)` returning `bool` |
| `backend/LangTeach.Api/Services/VoiceNoteService.cs` | Implement: load note, return false if not found, capture `note.BlobPath`, delete DB row, then call `_blobStorage.DeleteAsync(blobPath)` — path must be captured before `SaveChangesAsync` so it is never lost |
| `backend/LangTeach.Api/Controllers/VoiceNotesController.cs` | Add `[HttpDelete("{id:guid}")]` returning 204/404 |
| `backend/LangTeach.Api.Tests/Services/VoiceNoteServiceTests.cs` | Add `DeleteAsync_ExistingNote_DeletesRowAndBlob`, `DeleteAsync_OtherTeacherNote_ReturnsFalse`, `DeleteAsync_NotFound_ReturnsFalse` |
| `e2e/tests/voice-note.spec.ts` | Add delete test: upload, delete (expect 204), GET returns 404 |

## Acceptance criteria (from issue)
- `IVoiceNoteBlobStorage.DeleteAsync` implemented and idempotent
- `InMemoryVoiceNoteBlobStorage.DeleteAsync` stub added
- `DELETE /api/voice-notes/{id}` returns 204 on success, 404 when not found or owned by different teacher
- Unit test and e2e test pass

## Sequence
1. Add `DeleteAsync` to interface + implementations
2. Add `DeleteAsync` to service interface + implementation
3. Add controller endpoint
4. Add unit tests
5. Add e2e test
