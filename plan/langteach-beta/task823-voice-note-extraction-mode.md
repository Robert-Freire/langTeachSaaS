# Task 823 — Voice Note Extraction: append/replace/skip mode

**Issue:** #823
**Branch:** `worktree-task-t823-voice-note-extraction-mode`
**Sprint:** `sprint/ui-redesign-student-polish`

## Problem

All extracted text fields use a blunt fill-if-empty rule (`existing || extracted`). If a field already has content, the extracted value is silently ignored. This breaks append and replace workflows.

## Solution Overview

Add a `mode` field (`"append"` | `"replace"` | `"skip"`) to the 4 mode-aware text extraction fields. The mode originates in Claude's response and flows through prompt -> backend DTO/parser -> frontend handler.

- **append**: concatenate with `" "` separator (or just use extracted value if existing is empty)
- **replace**: overwrite regardless of existing content
- **skip**: leave field unchanged (same as current null behavior)

Fields with mode: `whatWasCovered`, `areasToImprove`, `homeworkAssigned`, `nextLessonIdeas`
Fields without mode (unchanged behavior):
- `sessionTitle`: always replaces if non-null
- `topicTags`: always merges + deduplicates

## Files to Change

| File | Change |
|------|--------|
| `backend/LangTeach.Api/DTOs/ReflectionExtractionDtos.cs` | Add `ExtractedTextFieldDto` record; change 4 fields from `string?` to `ExtractedTextFieldDto?` |
| `backend/LangTeach.Api/AI/PromptService.cs` (lines 1525-1552) | Update prompt: 4 fields now return `{ value, mode }` object; add signal words |
| `backend/LangTeach.Api/Services/ReflectionExtractionService.cs` | Add `ParseTextFieldOrNull()` helper; update ParseResponse to use it for 4 fields |
| `backend/LangTeach.Api/Services/StubReflectionExtractionService.cs` | Return `ExtractedTextFieldDto` for the 4 mode fields; use distinct modes for e2e testability |
| `backend/LangTeach.Api/Services/TelegramConversationService.cs` | Update any reads of the 4 changed fields to use `.Value` |
| `backend/LangTeach.Api.Tests/Services/TelegramConversationServiceTests.cs` | Update 4+ test methods that construct `ExtractedReflectionDto` with plain strings for the 4 changed fields |
| `frontend/src/api/sessionLogs.ts` | Update `ExtractedReflection` interface: 4 fields become `{ value: string \| null; mode: 'append' \| 'replace' \| 'skip' } \| null` |
| `frontend/src/pages/LogSession.tsx` (lines 916-941) | Replace fill-if-empty with mode-aware logic for the 4 fields |
| `backend/LangTeach.Api.Tests/Services/ReflectionExtractionServiceTests.cs` | Update JSON fixtures to new shape; add tests for append/replace/skip parsing |
| `e2e/tests/session-log-voice.spec.ts` | Add 2 new tests: append scenario + replace scenario |
| `.claude/skills/teacher-qa/output/prior-findings.md` | Update with changed extraction prompt |

## Implementation Steps

### Step 1: Backend DTO

In `ReflectionExtractionDtos.cs`, add:
```csharp
public record ExtractedTextFieldDto(string? Value, string Mode); // Mode: "append" | "replace" | "skip"
```

Change 4 fields in `ExtractedReflectionDto` from `string?` to `ExtractedTextFieldDto?`:
- `WhatWasCovered`
- `AreasToImprove`
- `HomeworkAssigned`
- `NextLessonIdeas`

### Step 2: Prompt

In `PromptService.cs` `BuildReflectionExtractionPrompt`, replace the 4 field descriptions:

```
- whatWasCovered: object or null — { "value": string, "mode": "append" | "replace" | "skip" }
    mode "append" if teacher adds to existing coverage notes (signal: "además", "también", "y también cubrimos")
    mode "replace" if teacher corrects or restates (signal: "me equivoqué", "en realidad", "no, mejor dicho", "quiero decir")
    mode "skip" if this field should not be updated
    Return null if nothing about coverage is mentioned.
```
Same pattern for areasToImprove, homeworkAssigned, nextLessonIdeas.

### Step 3: Parser

In `ReflectionExtractionService.cs`, add:
```csharp
private static ExtractedTextFieldDto? ParseTextFieldOrNull(JsonElement root, string key)
{
    if (!root.TryGetProperty(key, out var prop)) return null;
    if (prop.ValueKind == JsonValueKind.Null) return null;
    if (prop.ValueKind == JsonValueKind.Object)
    {
        var value = GetStringOrNull(prop, "value");
        var mode = GetStringOrNull(prop, "mode") ?? "skip";
        if (mode is not ("append" or "replace" or "skip")) mode = "skip";
        return new ExtractedTextFieldDto(value, mode);
    }
    // Legacy fallback: plain string (treat as replace)
    if (prop.ValueKind == JsonValueKind.String)
    {
        var value = prop.GetString();
        return string.IsNullOrWhiteSpace(value) ? null : new ExtractedTextFieldDto(value, "replace");
    }
    return null;
}
```

Use `ParseTextFieldOrNull` for the 4 fields in `ParseResponse`.

### Step 4: Stub Service

Update `StubReflectionExtractionService.cs` to return `ExtractedTextFieldDto` values:
- `WhatWasCovered`: `new ExtractedTextFieldDto("[Extracted] What was covered", "replace")`
- `AreasToImprove`: `new ExtractedTextFieldDto("[Extracted] Areas to improve", "replace")`
- `HomeworkAssigned`: `new ExtractedTextFieldDto("[Extracted] Homework assigned", "replace")`
- `NextLessonIdeas`: `new ExtractedTextFieldDto("[Extracted] Next lesson ideas", "append")`

(NextLessonIdeas uses "append" mode so e2e tests can verify the concatenation path.)

### Step 5: TelegramConversationService

Find all reads of `WhatWasCovered`, `AreasToImprove`, `HomeworkAssigned`, `NextLessonIdeas` in `TelegramConversationService.cs` and change to `?.Value`.

### Step 6: Frontend interface

In `sessionLogs.ts`, change `ExtractedReflection`:
```ts
whatWasCovered: { value: string | null; mode: 'append' | 'replace' | 'skip' } | null
areasToImprove: { value: string | null; mode: 'append' | 'replace' | 'skip' } | null
homeworkAssigned: { value: string | null; mode: 'append' | 'replace' | 'skip' } | null
nextLessonIdeas: { value: string | null; mode: 'append' | 'replace' | 'skip' } | null
```

### Step 7: Frontend handler (LogSession.tsx)

Helper to apply mode (inline or small local fn):
```ts
function applyMode(existing: string, extracted: { value: string | null; mode: string } | null): string | null {
  if (!extracted || !extracted.value || extracted.mode === 'skip') return null  // null = no change
  if (extracted.mode === 'replace') return extracted.value
  // append
  return existing ? `${existing} ${extracted.value}` : extracted.value
}
```

Replace the 4 fill-if-empty blocks with mode-aware calls. Example for actualContent:
```ts
const nextActualContent = applyMode(actualContent, extracted.whatWasCovered)
if (nextActualContent !== null) {
  saveOverride.actualContent = nextActualContent
  setActualContent(nextActualContent)
}
```

Apply same pattern for generalNotes (combine areasToImprove + emotionalSignals first, then apply areasToImprove's mode), homeworkAssigned, nextSessionTopics.

**Note on generalNotes**: `emotionalSignals` has no mode field (remains `string?`). The governing mode always comes from `areasToImprove`. Exact rules for all 4 cases:

| areasToImprove | emotionalSignals | Result |
|----------------|-----------------|--------|
| null | null | no change |
| null | non-null | treat as mode "replace" for the emotionalSignals value only (emotionalSignals always appends to generalNotes or replaces if empty -- use "replace" since no mode available) |
| non-null (any mode) | null | apply areasToImprove's mode with only areasToImprove.value |
| non-null (any mode) | non-null | combine `areasToImprove.value + " " + emotionalSignals`, then apply areasToImprove's mode |

When combining: build `combinedNew = [areasToImprove?.value, emotionalSignals].filter(Boolean).join(' ')`. Then apply mode (append/replace) of `areasToImprove` (or "replace" if only emotionalSignals) to determine the final generalNotes value.

### Step 8: Unit tests

Update `TelegramConversationServiceTests.cs`: find all 4+ test methods that construct `ExtractedReflectionDto` with plain strings for the 4 changed fields and update to `new ExtractedTextFieldDto(value, mode)`. Use `"replace"` for the mode in these tests (behavior is unchanged, they test Telegram flow not extraction logic).

Update `ReflectionExtractionServiceTests.cs`:
- Change JSON fixtures: `"whatWasCovered": "Past tense verbs"` -> `"whatWasCovered": { "value": "Past tense verbs", "mode": "replace" }`
- Update assertions: `result.WhatWasCovered.Value.Should().Be("Past tense verbs")` and `result.WhatWasCovered.Mode.Should().Be("replace")`
- Add tests:
  - `ParseResponse_ParsesModeAppend` (verifies append mode parsed correctly)
  - `ParseResponse_ParsesModeSkip` (verifies skip mode)
  - `ParseResponse_HandlesLegacyStringFallback` (plain string -> mode "replace")
  - `ParseResponse_ReturnsNullForNullField` (null -> null)

### Step 9: E2E tests

Add to `session-log-voice.spec.ts`:

**Append scenario:**
1. Create a Draft session via API with `nextSessionTopics = "Existing topics"`
2. Navigate to student detail, open session history tab
3. Open the Draft in edit mode (the dialog pre-populates form fields from the saved session on open -- verify `next-session-topics` field shows "Existing topics" before uploading)
4. Upload audio file (stub returns `nextLessonIdeas` with mode "append", value "[Extracted] Next lesson ideas")
5. Wait for extraction to complete (extracting indicator appears then clears)
6. Verify `next-session-topics` field = `"Existing topics [Extracted] Next lesson ideas"`

**Replace scenario:**
1. Create a Draft session via API with `actualContent = "Old content"`
2. Open Draft in edit mode
3. Upload audio file (stub returns `whatWasCovered` with mode "replace", value "[Extracted] What was covered")
4. Wait for extraction
5. Verify `actual-content` field = `"[Extracted] What was covered"` (not "Old content [Extracted]...")

### Step 10: Update prior-findings.md

Update `.claude/skills/teacher-qa/output/prior-findings.md` to record that the extraction prompt now returns `{ value, mode }` objects for text fields, and what signal words are used.

## Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| Prompt returns mode per text field | Step 2 |
| DTO/parser handle { value, mode } | Steps 1, 3 |
| Frontend applies append/replace/skip | Step 7 |
| Fields in scope: actualContent, nextLessonIdeas, homeworkAssigned, generalNotes, areasToImprove | Steps 1-7 |
| sessionTitle always replaces | Already true (not changed) |
| topicTags always merges+deduplicates | Already true (not changed) |
| E2E: append scenario | Step 9 |
| E2E: replace scenario | Step 9 |
| Update prior-findings.md | Step 10 |

## Risk

**TelegramConversationService.cs** uses `ExtractedReflectionDto` - need to audit how it reads the 4 changed fields and update to `.Value`.

**Existing unit tests** assert on plain string values - all must be updated to `.Value` and `.Mode`.

**Existing e2e test** (`voice upload: extracted fields pre-fill form`) starts with an empty form, so mode="replace" and mode="append" both produce the stub value -> test still passes unchanged.
