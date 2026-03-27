# Task 305: Filter content type dropdown per lesson section

## Problem
WarmUp sections generate vocabulary drills. Prompt-based "NEVER do X" fixes have failed twice. The structural fix: prevent teachers from selecting pedagogically invalid content types per section.

## Approach
Frontend dropdown filter (primary UX) + backend validation (safety net). Also adds `freeText` as a new content type (the issue's allowlist requires it; it doesn't currently exist).

## Key files
- `frontend/src/components/lesson/GeneratePanel.tsx` — TASK_TYPES dropdown (lines 199-212), `sectionType` and `cefrLevel` already available as props; `SectionType` imported from `'../../api/lessons'`
- `frontend/src/types/contentTypes.ts` — ContentBlockType union (no `freeText` today)
- `backend/LangTeach.Api/Data/Models/ContentBlockType.cs` — ContentBlockType enum (no `FreeText` today)
- `backend/LangTeach.Api/DTOs/GenerateRequest.cs` — GenerateRequest model (no SectionType today)
- `backend/LangTeach.Api/Controllers/GenerateController.cs` — Stream action (line ~70) + Generate private method (line ~240)
- `backend/LangTeach.Api/AI/PromptService.cs` — prompt builder methods

## Section allowlist (from issue)

| Section | Allowed types |
|---|---|
| WarmUp | `freeText`, `conversation` (B1+ only) |
| Presentation | `grammar`, `vocabulary`, `reading`, `conversation`, `freeText` |
| Practice | `exercises`, `conversation` |
| Production | `freeText`, `conversation`, `reading` |
| WrapUp | `freeText` only (auto-select, hide dropdown) |

## Implementation

### Step 1 — Add `freeText` ContentBlockType (frontend + backend)

`freeText` does not exist today but is required by the allowlist. Add it as a proper type.

**Frontend `frontend/src/types/contentTypes.ts`:** add `'freeText'` to the union.

**Backend `backend/LangTeach.Api/Data/Models/ContentBlockType.cs`:** add `FreeText` to the enum.

**Backend `ContentBlockTypeExtensions.cs`** (or wherever the kebab-case mapping lives): add `FreeText -> "free-text"` mapping.

**Backend `PromptService.cs`:** add `BuildFreeTextPrompt(GenerationContext ctx)` — a general-purpose activity prompt: "Generate an appropriate in-class activity for the [section] section at [CEFR level] on [topic] in [language]. The activity should be brief, engaging, and match the pedagogical purpose of the section. Return as clear prose instructions for the teacher." The `sectionType` from the request (added in Step 3) provides the section context to this prompt.

**Frontend `GeneratePanel.tsx` TASK_TYPES array:** add `{ value: 'freeText', label: 'Free activity' }` entry.

**Backend `GenerateController.cs` `PromptBuilders` dict (lines 57-67):** add `[ContentBlockType.FreeText] = (svc, ctx) => svc.BuildFreeTextPrompt(ctx)`. Without this, `free-text` requests hit the 404 branch and the new type never dispatches.

### Step 2 — Frontend utility: `getAllowedContentTypes`

Create `frontend/src/utils/sectionContentTypes.ts`:

```ts
import { ContentBlockType } from '../types/contentTypes';
import { SectionType } from '../api/lessons'; // actual import path

function isB1Plus(cefrLevel: string): boolean {
  return !cefrLevel.startsWith('A');
}

export function getAllowedContentTypes(
  sectionType: SectionType,
  cefrLevel: string
): ContentBlockType[] {
  switch (sectionType) {
    case 'WarmUp':
      return isB1Plus(cefrLevel) ? ['freeText', 'conversation'] : ['freeText'];
    case 'Presentation':
      return ['grammar', 'vocabulary', 'reading', 'conversation', 'freeText'];
    case 'Practice':
      return ['exercises', 'conversation'];
    case 'Production':
      return ['freeText', 'conversation', 'reading'];
    case 'WrapUp':
      return ['freeText'];
    default:
      return ['vocabulary', 'grammar', 'exercises', 'conversation', 'reading', 'homework', 'freeText'];
  }
}
```

Note: SectionType values are PascalCase (`'WarmUp'`, `'WrapUp'`, etc.) — match exactly.

### Step 3 — Add `SectionType` to GenerateRequest (frontend + backend)

**Backend `GenerateRequest.cs`:** add `public string? SectionType { get; set; }`.

**Frontend `GeneratePanel.tsx`:** in the `useMemo` that builds the GenerateRequest object (line ~116-126), add `SectionType: sectionType` so the backend receives it. (`sectionType` is already typed as non-nullable; no `?? null` needed.)

### Step 4 — Filter dropdown + handle invalid default state

In `GeneratePanel.tsx`:
- Import `getAllowedContentTypes`
- Compute `allowedTypes = getAllowedContentTypes(sectionType, cefrLevel)` (or full list when `sectionType` is null)
- Filter TASK_TYPES: `const filteredTaskTypes = TASK_TYPES.filter(t => allowedTypes.includes(t.value))`
- **State reset:** after computing `allowedTypes`, if the current `taskType` is not in `allowedTypes`, reset it to `allowedTypes[0]`. Use a `useEffect` keyed on `[sectionType, cefrLevel]`.
- **WrapUp auto-select:** if `filteredTaskTypes.length === 1`, render a read-only label instead of the Select component, with the single value pre-selected.

### Step 5 — Backend validation on BOTH Stream and Generate endpoints

Create `backend/LangTeach.Api/AI/SectionContentTypeAllowlist.cs`:

```csharp
public static class SectionContentTypeAllowlist
{
    private static readonly Dictionary<string, HashSet<string>> _allowlist = new(StringComparer.OrdinalIgnoreCase)
    {
        ["warmup"]       = new(StringComparer.OrdinalIgnoreCase) { "free-text", "conversation" },
        ["presentation"] = new(StringComparer.OrdinalIgnoreCase) { "grammar", "vocabulary", "reading", "conversation", "free-text" },
        ["practice"]     = new(StringComparer.OrdinalIgnoreCase) { "exercises", "conversation" },
        ["production"]   = new(StringComparer.OrdinalIgnoreCase) { "free-text", "conversation", "reading" },
        ["wrapup"]       = new(StringComparer.OrdinalIgnoreCase) { "free-text" },
    };

    public static bool IsAllowed(string sectionType, string contentType)
    {
        // Normalize: strip spaces, lowercase for lookup
        var key = sectionType.Replace(" ", "").ToLowerInvariant();
        if (!_allowlist.TryGetValue(key, out var allowed)) return true;
        return allowed.Contains(contentType);
    }
}
```

Note: WarmUp CEFR split (A1 = no conversation) is enforced by the frontend. Backend allows `conversation` for all WarmUp requests since it does not have the CEFR level in scope at validation time without a DB read. The frontend is the primary line of defense.

In `GenerateController.cs`:
- **Stream action:** insert after the 404 block (line ~77, after `TryFromKebabCase` check) and before the blank-field checks (~line 79). At this point `taskType` is the raw kebab string, which `IsAllowed` accepts.
- **Generate private method:** insert after existing validation (~line 240+).

Add in both places:

```csharp
if (!string.IsNullOrEmpty(request.SectionType) &&
    !SectionContentTypeAllowlist.IsAllowed(request.SectionType, taskType))
{
    return BadRequest($"Content type '{taskType}' is not allowed for section '{request.SectionType}'.");
}
```

### Step 6 — Frontend unit tests (extend `GeneratePanel.test.tsx`)

Four new tests:
1. `sectionType="WarmUp" cefrLevel="A1"` → vocabulary, grammar, exercises, conversation absent; freeText present
2. `sectionType="WarmUp" cefrLevel="B1"` → conversation present; vocabulary absent
3. `sectionType="WrapUp"` → only freeText rendered; no Select dropdown (auto-select label shown)
4. `sectionType="Practice"` → only exercises + conversation visible

Utility unit tests in `sectionContentTypes.test.ts`:
- Each section returns the correct array
- WarmUp A1 excludes conversation; B1 includes it
- Default (unknown sectionType) returns full list

### Step 7 — Backend unit tests (`SectionContentTypeAllowlistTests.cs`)

- WarmUp + vocabulary → false
- WarmUp + free-text → true
- Practice + grammar → false
- WrapUp + exercises → false
- Unknown section → true (pass-through)
- Case-insensitive: `"WarmUp"` and `"warmup"` and `"WARMUP"` all resolve the same

### Step 8 — E2E test

Extend `frontend/e2e/` lesson generation tests (find existing lesson e2e file). Add:
- Open a lesson, open the WarmUp section's Generate panel
- Assert the content type dropdown does NOT contain "Vocabulary" or "Grammar"
- Assert "Free activity" IS present

## Acceptance criteria mapping

| AC | Implementation |
|---|---|
| WarmUp shows only freeText + conversation (B1+) | Steps 2, 4 |
| Presentation excludes exercises | Steps 2, 4 |
| Practice shows only exercises + conversation | Steps 2, 4 |
| Production excludes exercises | Steps 2, 4 |
| WrapUp auto-selects freeText, no dropdown | Step 4 |
| Backend returns 400 for disallowed type | Step 5 (both endpoints) |
| Frontend unit tests per section | Step 6 |
| Backend unit tests | Step 7 |
| E2E: WarmUp has no Vocabulary option | Step 8 |
| Teacher QA confirms icebreaker | Post-merge QA run (not in PR scope) |

## Out of scope
- Prompt changes (issue explicitly forbids prompt patching as primary fix; #306 tracks cleanup)
- DB migrations
- Removing existing prompt negative constraints (tracked in #306)
