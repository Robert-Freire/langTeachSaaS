# Task 188: Extract Student Difficulties from Session Notes

## Issue
feat: extract student difficulties from session notes and update student profile on confirm

## Goal
When a session log is confirmed, difficulties extracted from session text (via AI) are upserted into the student's difficulty profile. The teacher reviews extracted difficulties in the draft session log form and can remove wrong entries before confirming.

## Context

### Existing infrastructure
- `ReflectionExtractionService` uses Claude Haiku to extract structured fields from free-text session notes.
- `ExtractedReflectionDto` has: WhatWasCovered, AreasToImprove, EmotionalSignals, HomeworkAssigned, NextLessonIdeas.
- `POST /api/students/{studentId}/sessions/extract` calls `IReflectionExtractionService.ExtractAsync(text)`.
- `SessionLogService.CreateAsync/UpdateAsync` handles status transitions (Draft -> Confirmed).
- `PropagateReassessment` in `SessionLogService` directly accesses `_db.Students` - same pattern to use for difficulty upsert.
- `Student.Difficulties` is a JSON string column storing `List<DifficultyDto>`.
- `DifficultyDto`: Id (uuid string), Description, Competency, Subcategory, Severity, Trend, Status.
- Allowed competencies: Grammar, Vocabulary, Pronunciation, Fluency, Discourse.
- Allowed severity: low, medium, high.
- Allowed status: Active, Covered.
- Trend is system-computed (always reset to "stable" on write, recomputed by DifficultyTrendService).
- `SessionLog` has `MentionedDifficultyPairs` JSON column (DifficultyPairDto[]) - similar JSON column approach to use.
- `StubReflectionExtractionService` is used in integration tests (E2ETesting environment).

### Voice note flow (where extraction triggers)
1. Teacher records audio -> `VoiceNoteService` transcribes
2. Frontend calls `extractSessionReflection(studentId, transcription)`
3. `handleVoiceNote` in `SessionLogDialog` populates form fields
4. Draft session created with populated fields
5. Teacher reviews form, confirms -> session upserted to Confirmed

## Implementation Plan

### Step 1: New DTO
In `backend/LangTeach.Api/DTOs/ReflectionExtractionDtos.cs`:
- Add `SuggestedDifficultyDto(string Description, string Competency, string Subcategory, string Severity)`
- Extend `ExtractedReflectionDto` to include `List<SuggestedDifficultyDto> SuggestedDifficulties`
  - Default to empty list (not nullable) for safe deserialization

### Step 2: New SessionLog column
In `backend/LangTeach.Api/Data/Models/SessionLog.cs`:
- Add `public string SuggestedDifficulties { get; set; } = "[]";`

Create migration:
```bash
cd backend && dotnet ef migrations add AddSuggestedDifficultiesToSessionLog --project LangTeach.Api --startup-project LangTeach.Api
```

### Step 3: Extend Session Log DTOs
In `backend/LangTeach.Api/DTOs/SessionLogDtos.cs`:
- `SessionLogDto`: add `string SuggestedDifficulties` (JSON string, raw)
- `CreateSessionLogRequest`: add `List<SuggestedDifficultyDto>? SuggestedDifficulties`
- `UpdateSessionLogRequest`: add `List<SuggestedDifficultyDto>? SuggestedDifficulties`
- Update the `ToDto` private static helper **in `SessionLogService.cs`** (not the DTO file): add `sl.SuggestedDifficulties` as the final positional argument of the `SessionLogDto` constructor call

### Step 4: Update AI extraction
In `backend/LangTeach.Api/Services/ReflectionExtractionService.cs`:
- Extend system prompt to also extract `suggestedDifficulties` as a JSON array:
  ```
  - suggestedDifficulties: array of objects (can be empty). Each object:
    - description: full sentence describing the difficulty, extracted verbatim from the teacher's notes
    - competency: one of Grammar, Vocabulary, Pronunciation, Fluency, Discourse
    - subcategory: specific item (e.g. "ser/estar", "subjunctive", "past tense"), free text
    - severity: low | medium | high (inferred from language; "mucho"/"siempre" -> high, "a veces" -> medium, "un poco"/"algo" -> low; default medium)
  Only include difficulties explicitly mentioned. Do not invent.
  ```
- Update `ParseResponse` to deserialize `suggestedDifficulties` array
- Sanitize in `ParseResponse`: silently skip entries with unknown competency or severity (not in allowed sets). This keeps the response valid even if the AI drifts.
- **Update ALL three fallback return sites** in this file:
  - Line ~74 (Claude API exception catch): `return new ExtractedReflectionDto(null, null, null, null, null)` -> add `[]` as 6th arg
  - Line ~79 (ParseResponse JSON exception catch): same
  - The constructor call in `ParseResponse` success path: add the deserialized list

### Step 5: Update StubReflectionExtractionService
Return `SuggestedDifficulties: []` (empty list) in the stub. Integration tests that don't test difficulty extraction should not be affected.

### Step 6: Update SessionLogService
In `backend/LangTeach.Api/Services/SessionLogService.cs`:

**CreateAsync:**
- Store `SuggestedDifficulties` as JSON in the entity:
  `entity.SuggestedDifficulties = SerializeSuggestedDifficulties(request.SuggestedDifficulties);`
- If `request.Status == SessionLogStatus.Confirmed` and `request.SuggestedDifficulties` has entries:
  - Call `UpsertDifficultiesAsync(student, request.SuggestedDifficulties, cancellationToken)` (student already loaded)

**UpdateAsync:**
- Update `entity.SuggestedDifficulties`
- If `request.Status == SessionLogStatus.Confirmed` and `request.SuggestedDifficulties` has entries:
  - The existing code only loads `student` when `LevelReassessmentSkill` is non-null.
  - Add explicit load: if student was not loaded above, issue a separate `_db.Students.FirstOrDefaultAsync(s => s.Id == studentId && s.TeacherId == teacherId)`.
  - Call `UpsertDifficulties(student, request.SuggestedDifficulties, _logger)`

**New private method `UpsertDifficulties`** (synchronous, matching `PropagateReassessment` pattern - no DB calls, mutates the student entity):
```csharp
private static readonly HashSet<string> ValidUpsertCompetencies =
    new(StringComparer.OrdinalIgnoreCase) { "Grammar", "Vocabulary", "Pronunciation", "Fluency", "Discourse" };
private static readonly HashSet<string> ValidUpsertSeverities =
    new(StringComparer.OrdinalIgnoreCase) { "low", "medium", "high" };

private static void UpsertDifficulties(Student student, List<SuggestedDifficultyDto> suggested, ILogger logger)
{
    var existing = JsonStorageHelper.DeserializeList<DifficultyDto>(student.Difficulties);
    foreach (var s in suggested)
    {
        // Guard: skip entries with invalid competency or severity (AI may drift)
        if (!ValidUpsertCompetencies.Contains(s.Competency) || !ValidUpsertSeverities.Contains(s.Severity))
        {
            logger.LogWarning("Skipping suggested difficulty with invalid fields: Competency={Competency}, Severity={Severity}", s.Competency, s.Severity);
            continue;
        }
        var match = existing.FirstOrDefault(d =>
            string.Equals(d.Competency, s.Competency, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(d.Subcategory, s.Subcategory, StringComparison.OrdinalIgnoreCase));
        if (match is not null)
        {
            var idx = existing.IndexOf(match);
            existing[idx] = match with { Description = s.Description, Severity = s.Severity, Status = "Active" };
        }
        else
        {
            existing.Add(new DifficultyDto(
                Id: Guid.NewGuid().ToString(),
                Description: s.Description,
                Competency: s.Competency,
                Subcategory: s.Subcategory,
                Severity: s.Severity,
                Trend: "stable",
                Status: "Active"
            ));
        }
    }
    student.Difficulties = JsonStorageHelper.Serialize(existing);
    student.UpdatedAt = DateTime.UtcNow;
}
```
Note: `SaveChangesAsync` is called once at the end of `CreateAsync`/`UpdateAsync`, so no extra save needed.

**New private helper:**
```csharp
private static string SerializeSuggestedDifficulties(List<SuggestedDifficultyDto>? items) =>
    items is null or { Count: 0 } ? "[]" : JsonStorageHelper.Serialize(items);
```

### Step 7: Update IReflectionExtractionService interface
No change needed (signature unchanged).

### Step 8: Frontend API types
In `frontend/src/api/sessionLogs.ts`:
- Add `SuggestedDifficulty` interface:
  ```ts
  export interface SuggestedDifficulty {
    description: string
    competency: string
    subcategory: string
    severity: string
  }
  ```
- Extend `ExtractedReflection`: add `suggestedDifficulties: SuggestedDifficulty[]`
- Extend `SessionLog`: add `suggestedDifficulties: string` (raw JSON, like `mentionedDifficultyPairs`)
- Extend `CreateSessionLogRequest`/`UpdateSessionLogRequest`: add `suggestedDifficulties?: SuggestedDifficulty[]`

### Step 9: Update SessionLogDialog
In `frontend/src/components/session/SessionLogDialog.tsx`:

**New state:**
```ts
const [suggestedDifficulties, setSuggestedDifficulties] = useState<SuggestedDifficulty[]>([])
```

**Populate from extraction (in `handleVoiceNote`):**
```ts
setSuggestedDifficulties(extracted.suggestedDifficulties ?? [])
```
Also store in draft create payload: `suggestedDifficulties: extracted.suggestedDifficulties ?? []`

**Load in edit mode (useEffect):**
```ts
try {
  const parsed = JSON.parse(initialSession.suggestedDifficulties || '[]') as SuggestedDifficulty[]
  setSuggestedDifficulties(parsed)
} catch {
  setSuggestedDifficulties([])
}
```

**Reset on close:**
```ts
setSuggestedDifficulties([])
```

**Render suggested difficulties section** (only when `suggestedDifficulties.length > 0`):
```tsx
<div className="space-y-2" data-testid="suggested-difficulties">
  <Label className="text-sm">
    Suggested difficulties
    <span className="text-zinc-400 font-normal ml-1">(from session notes)</span>
  </Label>
  <div className="space-y-1">
    {suggestedDifficulties.map((d, i) => (
      <div key={`${d.competency}|${d.subcategory}|${i}`} className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm"
           data-testid="suggested-difficulty-item">
        <div>
          <span className="text-zinc-800">{d.description}</span>
          <span className="ml-2 text-xs text-zinc-400">
            {d.competency}{d.subcategory ? ` / ${d.subcategory}` : ''} · {d.severity}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSuggestedDifficulties(prev => prev.filter((_, j) => j !== i))}
          className="text-zinc-400 hover:text-zinc-600"
          aria-label="Remove difficulty"
          data-testid="remove-suggested-difficulty"
        >
          ×
        </button>
      </div>
    ))}
  </div>
</div>
```
Place this section after the "General notes" field and before "Topic tags".

**Include in confirm payload (submitLog mutation):**
```ts
suggestedDifficulties: suggestedDifficulties.length > 0 ? suggestedDifficulties : undefined,
```

**Include in draft save (handleVoiceNote):**
```ts
suggestedDifficulties: extracted.suggestedDifficulties?.length ? extracted.suggestedDifficulties : undefined,
```

### Step 10: Backend tests

**`ReflectionExtractionServiceTests`:** Add tests:
- `ParseResponse_ExtractsSuggestedDifficulties`: valid JSON with `suggestedDifficulties` array -> correct mapping
- `ParseResponse_SkipsInvalidCompetency`: entry with unknown competency is silently dropped
- `ParseResponse_HandlesMissingSuggestedDifficulties`: JSON without the key -> empty list

**`SessionLogServiceTests`:** Add tests for `UpsertDifficultiesAsync` behavior (or test via integration):
- New difficulty inserted with Active status
- Existing difficulty (matched by competency+subcategory) updated: description/severity updated, status reset to Active

**`SessionLogsStatusTests`:** Add integration test:
- Confirm session with suggested difficulties -> student's Difficulties JSON contains the entries

### Step 11: Frontend tests
In `frontend/src/components/session/SessionLogDialog.test.tsx`:
- Add test: when `extractSessionReflection` returns `suggestedDifficulties`, they render in the dialog
- Add test: clicking remove button removes an item from the list
- Add test: `suggestedDifficulties` included in the submit payload when present
- Add test: section hidden when `suggestedDifficulties` is empty

### Step 12: E2E test
In `e2e/tests/sessions-extract.spec.ts`: extend the existing test to assert `suggestedDifficulties` field in response (array property present).

New test in `e2e/tests/session-log.spec.ts` (add to existing file, separate `test` block):
- Create student with no difficulties
- Create confirmed session log with `suggestedDifficulties` array via API
- Fetch student -> difficulties array contains upserted entries with correct competency/severity
- Create another session log (same competency+subcategory, different severity) confirmed -> difficulty updated in place
- Verify status reset to Active

## AC Checklist
- [ ] `ExtractedReflectionDto` includes `SuggestedDifficulties` array
- [ ] Difficulties section visible and editable in draft session log form
- [ ] Severity is pre-filled by AI (no severity selector)
- [ ] On confirm, difficulties upserted matching on competency+subcategory
- [ ] Match: description, severity updated, status reset to Active
- [ ] No match: inserted as new Active entry
- [ ] No separate approval flow

## Migration
```
20260406XXXXXX_AddSuggestedDifficultiesToSessionLog
```
Column: `SuggestedDifficulties nvarchar(max) NOT NULL DEFAULT '[]'`
