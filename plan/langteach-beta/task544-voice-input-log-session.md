# Task 544: Voice Input in Log Session Dialog

**Issue:** #544 — feat: voice input in Log Session dialog — extract and save as draft  
**Sprint:** Adaptive Replanning (`sprint/adaptive-replanning`)  
**Branch:** `task/t544-voice-input-log-session`

---

## Goal

Add a microphone button to the Log Session dialog. Teacher records or uploads audio; the system transcribes, extracts structured session fields, auto-saves a Draft session log, then the teacher reviews and confirms.

---

## What Already Exists (do not rebuild)

- `frontend/src/components/audio/AudioRecorder.tsx` — handles recording/upload, calls `POST /api/voice-notes`, returns `VoiceNote` with `transcription`
- `POST /api/students/{studentId}/sessions/extract` — exists (task 546), accepts `{ text }`, returns `ExtractedReflectionDto` with `WhatWasCovered`, `AreasToImprove`, `EmotionalSignals`, `HomeworkAssigned`, `NextLessonIdeas`
- `StubReflectionExtractionService` — used in E2ETesting env, returns fixed "[Extracted] ..." strings

---

## Extraction Field Mapping

| Extracted field | Form field |
|---|---|
| `WhatWasCovered` | `actualContent` |
| `HomeworkAssigned` | `homeworkAssigned` |
| `NextLessonIdeas` | `nextSessionTopics` |
| `AreasToImprove` + `\n` + `EmotionalSignals` | `generalNotes` |

---

## Backend Changes

### 1. `SessionLogStatus` enum

New file `backend/LangTeach.Api/Data/Models/SessionLogStatus.cs`:
```csharp
public enum SessionLogStatus { Confirmed = 0, Draft = 1 }
```

Default `Confirmed` for all existing records (value 0).

### 2. `SessionLog` model — add `Status` field

`backend/LangTeach.Api/Data/Models/SessionLog.cs`:
```csharp
public SessionLogStatus Status { get; set; } = SessionLogStatus.Confirmed;
```

### 3. EF Migration — `AddSessionLogStatus`

SQL: `ALTER TABLE SessionLogs ADD Status int NOT NULL DEFAULT 0`

Run: `dotnet ef migrations add AddSessionLogStatus --project backend/LangTeach.Api`

### 4. DTOs (`backend/LangTeach.Api/DTOs/SessionLogDtos.cs`)

- Add `SessionLogStatus Status` and `string StatusName` to `SessionLogDto` **at the end** (after `IsCancelled`), so the positional record constructor matches `ToDto` in step 5.
- Add `SessionLogStatus Status { get; set; } = SessionLogStatus.Confirmed` to `CreateSessionLogRequest` only. `UpdateSessionLogRequest` is declared as `public class UpdateSessionLogRequest` (separate class) — add there too. (Note: in the frontend API, `UpdateSessionLogRequest` is a **type alias** of `CreateSessionLogRequest`; only `CreateSessionLogRequest` needs the field there.)

### 5. `SessionLogService` — use Status

- `CreateAsync`: set `Status = request.Status` in the entity initializer
- `UpdateAsync`: set `entity.Status = request.Status`
- `ToDto`: include `sl.Status, sl.Status.ToString()` in the record constructor

### 6. Backend test — `SessionsControllerTests.cs`

Add 2 tests to the existing controller test file:
- Create with `Status: Draft` → response body has `status: "Draft"`
- Create without specifying Status → response body has `status: "Confirmed"` (default)

---

## Frontend Changes

### 7. `frontend/src/api/sessionLogs.ts`

Add to `SessionLog` interface:
```ts
status: 'Draft' | 'Confirmed'
statusName: string
```

Add to `CreateSessionLogRequest` only:
```ts
status?: 'Draft' | 'Confirmed'
```

`UpdateSessionLogRequest` is declared as `export type UpdateSessionLogRequest = CreateSessionLogRequest` (type alias), so it inherits `status` automatically. Do NOT add it separately.

**Impact on existing tests:** All existing `SessionLog` mock objects in `SessionLogDialog.test.tsx` and `SessionHistoryTab.test.tsx` must have `status: 'Confirmed'` added to avoid TypeScript compile errors after the interface change.

Add `ExtractedReflection` interface and `extractSessionReflection` function:
```ts
export interface ExtractedReflection {
  whatWasCovered: string | null
  areasToImprove: string | null
  emotionalSignals: string | null
  homeworkAssigned: string | null
  nextLessonIdeas: string | null
}

export async function extractSessionReflection(
  studentId: string,
  text: string,
): Promise<ExtractedReflection> {
  const res = await apiClient.post<ExtractedReflection>(
    `/api/students/${studentId}/sessions/extract`,
    { text },
  )
  return res.data
}
```

### 8. `SessionLogDialog.tsx`

**New state variables:**
```ts
const [isExtracting, setIsExtracting] = useState(false)
const [draftSessionId, setDraftSessionId] = useState<string | null>(null)
const [extractionFailed, setExtractionFailed] = useState(false)
```

**AudioRecorder placement:** shown in create mode only (`!isEditMode`), above the date field, with label "Record session notes". Hidden once `draftSessionId` is set (recording phase is complete).

**Voice note handler (`handleVoiceNote`):**
```
1. setIsExtracting(true)
2. Call extractSessionReflection(studentId, voiceNote.transcription ?? '')
3. On success:
   a. Pre-fill form fields using mapping above (combine AreasToImprove + EmotionalSignals into generalNotes)
   b. Call createSession(studentId, { actualContent, homeworkAssigned, nextSessionTopics, generalNotes, status: 'Draft', previousHomeworkStatus: 'NotApplicable', linkedLessonId: selectedLessonId || null })
   c. setDraftSessionId(created.id)
4. On failure (extraction or draft save): setExtractionFailed(true) — form stays blank
5. setIsExtracting(false)
```

**Submit handler change:**
```ts
// Instead of createSession / updateSession unconditionally:
if (draftSessionId) {
  // Update the existing Draft to Confirmed
  return updateSession(studentId, draftSessionId, { ...payload, status: 'Confirmed' })
} else if (isEditMode) {
  return updateSession(studentId, initialSession.id, { ...payload, status: 'Confirmed' })
} else {
  return createSession(studentId, { ...payload, status: 'Confirmed' })
}
```

**Submit button label:** `draftSessionId ? 'Confirm' : isEditMode ? 'Save changes' : 'Log session'`

**Pending indicator during extraction:** While `isExtracting`, show a spinner/text "Extracting session notes..." where AudioRecorder was.

**Reset on close:** clear `draftSessionId`, `extractionFailed`, `isExtracting` in the close reset effect.

**Validation note:** The existing "at least one content field" validation still applies when teacher clicks Confirm. If extraction succeeded, `actualContent` will be set, so validation passes automatically.

**No changes to edit mode for Draft sessions:** When a Draft session is opened via the history "Edit" button, the dialog opens in `isEditMode` with `initialSession.status === 'Draft'`. The submit sends `status: 'Confirmed'`, transitioning it. Button label in that case: "Save changes" (consistent with edit mode behavior — the status transition is implicit).

### 9. `SessionHistoryTab.tsx`

In `SessionEntry`, add "Pending review" badge next to the cancelled badge when `session.status === 'Draft'`:

```tsx
{session.status === 'Draft' && (
  <Badge
    variant="outline"
    className="text-xs bg-amber-50 text-amber-700 border-amber-300"
    data-testid="draft-badge"
  >
    Pending review
  </Badge>
)}
```

---

## Unit Tests

### 10. `SessionLogDialog.test.tsx` — new tests

Mock `AudioRecorder`, `extractSessionReflection`, and `createSession`.

Tests to add:
1. **Voice extraction success**: AudioRecorder onVoiceNote called → extractSessionReflection called → form fields pre-filled → createSession called with `status: 'Draft'` → submit button shows "Confirm"
2. **Voice extraction failure**: AudioRecorder onVoiceNote called → extract throws → form stays blank → extractionFailed flag shown → submit button still shows "Log session"
3. **Confirm after voice**: after Draft auto-save, submit → updateSession called with draftSessionId + `status: 'Confirmed'`
4. **Manual create (no voice)**: submit → createSession called with `status: 'Confirmed'`
5. **Edit Draft from history**: initialSession with `status: 'Draft'` → submit → updateSession called with `status: 'Confirmed'`
6. **Existing mock objects updated**: All `SAMPLE_SESSION` and inline session objects in both test files must include `status: 'Confirmed', statusName: 'Confirmed'` to satisfy the updated TypeScript interface.

Mock `AudioRecorder` to call `onVoiceNote` with `{ transcription: 'test transcription' }` synchronously on trigger.

### 11. `SessionHistoryTab.test.tsx` — new test

- Draft session: `session.status === 'Draft'` → `data-testid="draft-badge"` rendered
- Confirmed session: no draft badge
- Update all existing inline session mocks to include `status: 'Confirmed', statusName: 'Confirmed'`

---

## E2E Test

### 12. `e2e/tests/session-log-voice.spec.ts` (new file)

The E2ETesting environment uses `StubTranscriptionService` (returns fixed transcription text) and `StubReflectionExtractionService` (returns `"[Extracted] ..."` values).

**E2E constraints:** Browser `getUserMedia` is unavailable in headless Playwright. Use the **upload path** (`upload-audio-button`) with a test audio file (`e2e/fixtures/test-audio.webm`).

Tests:
1. **Happy path — upload audio, confirm:**
   - Navigate to student detail page
   - Click "Log session"
   - Upload `test-audio.webm` via `upload-audio-button`
   - Wait for `data-testid="draft-badge"` to appear in session history (Draft auto-saved)
   - Verify form fields show "[Extracted] ..." values
   - Click Confirm
   - Verify session saved, no draft badge in history

   Wait — actually the dialog is still open after upload+extraction. The draft badge would appear in the history tab which isn't visible while dialog is open. Better approach:
   - Upload audio → `await expect(page.getByTestId('submit-session-log')).toHaveText('Confirm', { timeout: 15000 })` (extraction + draft-save are async; must wait for button label change)
   - Verify form fields pre-filled with "[Extracted] ..." values
   - Click Confirm → dialog closes → navigate to session history tab → verify no draft badge

2. **Draft badge visible:**
   - Create a session log via API with `status: 'Draft'`
   - Navigate to student detail → session history tab
   - Verify `data-testid="draft-badge"` present

3. **Edit Draft confirms it:**
   - Create Draft via API
   - Navigate to student detail → session history tab
   - Click Edit on the Draft session
   - Click "Save changes"
   - Verify no draft badge in history

---

## Acceptance Criteria Traceability

| AC | Coverage |
|---|---|
| Mic button in Log Session dialog | AudioRecorder rendered in create mode |
| Recording → transcription → extraction | `handleVoiceNote` flow |
| Extracted fields pre-fill form | field mapping in handler |
| Session saved as Draft before confirm | `createSession({status: 'Draft'})` auto-save |
| Teacher confirms → Confirmed | submit sends `status: 'Confirmed'` |
| Draft shows "Pending review" badge | `SessionHistoryTab` badge |
| Works from student detail and lesson editor | both use `SessionLogDialog` in create mode |
| Extraction fails → blank form → saves as Confirmed | `extractionFailed` path |
| Manual logs always save as Confirmed | `createSession({status: 'Confirmed'})` default |

---

## Files Changed

**Backend:**
- `backend/LangTeach.Api/Data/Models/SessionLogStatus.cs` (new)
- `backend/LangTeach.Api/Data/Models/SessionLog.cs`
- `backend/LangTeach.Api/DTOs/SessionLogDtos.cs`
- `backend/LangTeach.Api/Services/SessionLogService.cs`
- `backend/LangTeach.Api/Migrations/` (new migration files)
- `backend/LangTeach.Api.Tests/Controllers/SessionsControllerTests.cs`

**Frontend:**
- `frontend/src/api/sessionLogs.ts`
- `frontend/src/components/session/SessionLogDialog.tsx`
- `frontend/src/components/session/SessionLogDialog.test.tsx`
- `frontend/src/components/session/SessionHistoryTab.tsx`
- `frontend/src/components/session/SessionHistoryTab.test.tsx`

**E2E:**
- `e2e/tests/session-log-voice.spec.ts` (new)

---

## Out of Scope

- Lesson editor voice input (same dialog component, covered implicitly)
- Real Azure Speech transcription (already wired, stub used in E2E)
- Re-recording after Draft is saved (teacher can delete the draft from history and try again)
