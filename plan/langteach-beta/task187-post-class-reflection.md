# Task 187 - Post-class reflection: structured input (text + voice) after a lesson

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/187

## What already exists (from T186 + prior work)
- `LessonNote` model with 4 fields: `WhatWasCovered`, `HomeworkAssigned`, `AreasToImprove`, `NextLessonIdeas`
- `LessonNotesController` with GET + PUT endpoints at `/api/lessons/{lessonId}/notes`
- `LessonNoteService` with get/upsert/history methods
- `LessonNotesCard` frontend component (4 textarea fields, auto-save on blur)
- `LessonHistoryCard` frontend component (shows notes history per student)
- `AudioRecorder` component (record + upload voice notes, returns `VoiceNote` with transcription)
- `IClaudeClient` (CompleteAsync, model selection)

## What needs to be built

### AC coverage map
| AC | Status | Work needed |
|----|--------|-------------|
| Open reflection from lesson view | Exists | None - LessonNotesCard already in LessonEditor |
| Type structured notes | Exists | Add EmotionalSignals field |
| Record voice note | Missing | Embed AudioRecorder in LessonNotesCard |
| Transcribe + AI extract | Missing | New extraction service + endpoint |
| Show extracted data for review | Missing | AI suggestion preview UI |
| Save linked to lesson/student | Exists | None |
| View past reflections (history) | Exists | Add EmotionalSignals to history |

## Backend changes

### 1. Add `EmotionalSignals` to `LessonNote` model
- File: `backend/LangTeach.Api/Data/Models/LessonNote.cs`
- Add: `public string? EmotionalSignals { get; set; }`
- EF migration: `AddEmotionalSignalsToLessonNote`

### 2. Update DTOs
- `LessonNotesDto` - add `EmotionalSignals`
- `SaveLessonNotesRequest` - add `EmotionalSignals` (MaxLength 2000)
- `LessonHistoryEntryDto` - add `EmotionalSignals`

### 3. Update `LessonNoteService`
- `GetByLessonIdAsync`: include `EmotionalSignals` in projection
- `UpsertAsync`: read/write `EmotionalSignals`
- `GetLessonHistoryAsync`: include `EmotionalSignals` in Select projection

### 4. New: `IReflectionExtractionService` + `ReflectionExtractionService`
File: `backend/LangTeach.Api/Services/ReflectionExtractionService.cs`

Uses `IClaudeClient` with `ClaudeModel.Haiku` to extract structured notes from free text.

Input: `string text` (transcription or typed reflection)
Output: `ExtractedReflectionDto` (same fields as SaveLessonNotesRequest)

Prompt design:
- System: "You are helping a language teacher structure post-class notes. Extract structured information from the teacher's reflection. Return JSON only."
- User: "[teacher's text]"
- Parse JSON response into DTO fields
- If a field cannot be extracted, return null for that field

```csharp
public record ExtractedReflectionDto(
    string? WhatWasCovered,
    string? StudentDifficulties,
    string? EmotionalSignals,
    string? HomeworkAssigned,
    string? NextLessonIdeas
);
```

Note: `StudentDifficulties` maps to `AreasToImprove` in the save request.

### 5. New endpoint in `LessonNotesController`
`POST /api/lessons/{lessonId}/notes/extract`

Request body: `{ "text": "..." }` (max 10000 chars)
Response: `ExtractedReflectionDto`
- Does NOT save anything
- Validates lesson belongs to teacher (same as PUT)
- Returns 200 with extracted fields (nulls allowed for undetectable fields)

### 6. Register service in `Program.cs`
`services.AddScoped<IReflectionExtractionService, ReflectionExtractionService>()`

### 7. Backend unit tests
File: `backend/LangTeach.Api.Tests/Services/ReflectionExtractionServiceTests.cs`
- Mock `IClaudeClient`, test JSON parsing, test graceful handling of bad JSON

## Frontend changes

### 1. Update types in `frontend/src/api/lessons.ts`
- `LessonNotesDto`: add `emotionalSignals: string | null`
- `SaveLessonNotesRequest`: add `emotionalSignals?: string | null`
- New function: `extractReflectionNotes(lessonId: string, text: string): Promise<ExtractedReflection>`
- New interface: `ExtractedReflection` (whatWasCovered, studentDifficulties, emotionalSignals, homeworkAssigned, nextLessonIdeas - all nullable strings)

### 2. Update `frontend/src/api/students.ts`
- `LessonHistoryEntry`: add `emotionalSignals: string | null`

### 3. Update `LessonNotesCard.tsx`
New fields array includes `emotionalSignals` ("Emotional observations").

New voice input section (below the text fields, before save indicator):
- `AudioRecorder` component with `onVoiceNote` callback
- When voice note received with transcription: show "Extract notes from transcription" button
- Also: show the raw transcription in a collapsible/small text area for reference

Extraction flow:
1. Click "Extract notes" -> loading state
2. Call `extractReflectionNotes(lessonId, transcription)`
3. Show `SuggestedNotesOverlay` (or inline): each suggested field shown with "Use" button next to it
4. "Apply all suggestions" button populates all form fields at once
5. Individual field suggestions can be accepted one by one
6. After applying, teacher can still edit before save triggers on blur

State additions to `LessonNotesCard`:
```tsx
const [voiceNote, setVoiceNote] = useState<VoiceNote | null>(null)
const [extracting, setExtracting] = useState(false)
const [suggestions, setSuggestions] = useState<ExtractedReflection | null>(null)
```

### 4. New component: `SuggestedNotesPanel`
File: `frontend/src/components/lesson/SuggestedNotesPanel.tsx`

Compact panel that appears below the recorder when suggestions are available.
Shows each non-null suggestion with a label and "Use" button.
"Apply all" button at bottom.
"Dismiss" to clear suggestions.

### 5. Update `LessonHistoryCard.tsx`
- Add `emotionalSignals` to the display in each history entry (show if not null)
- Add testid `lesson-history-emotional-signals`

### 6. Frontend unit tests
- `LessonNotesCard.test.tsx`: add tests for voice note recording triggering suggestions, apply all, dismiss
- `SuggestedNotesPanel.test.tsx`: basic render + interaction tests

## E2E test
File: `e2e/tests/post-class-reflection.spec.ts`

Test 1: Teacher types all note fields and saves
- Navigate to lesson with student
- Scroll to lesson notes card
- Fill in `whatWasCovered`, `areasToImprove`, `homeworkAssigned`, `nextLessonIdeas`, `emotionalSignals`
- Blur (tab away) -> verify saved indicator appears
- Reload -> verify fields persisted

Test 2: History card shows reflection
- Navigate to student detail
- Verify lesson history card shows the reflection fields from Test 1

Test 3: Voice input UI is present
- Navigate to lesson with student
- Verify AudioRecorder component is visible within lesson notes card

(Note: AI extraction not tested e2e due to Claude API dependency - covered by unit test)

## Migration command
```bash
cd backend/LangTeach.Api && dotnet ef migrations add AddEmotionalSignalsToLessonNote
```

## Implementation order
1. Backend model + migration
2. Backend DTO + service updates
3. ReflectionExtractionService + extract endpoint
4. Backend tests
5. Frontend API layer updates
6. LessonNotesCard updates (add fields + voice + extraction flow)
7. SuggestedNotesPanel component
8. LessonHistoryCard update
9. Frontend unit tests
10. E2E tests
11. Build verify
