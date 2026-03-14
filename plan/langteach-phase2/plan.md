# LangTeach Phase 2 — AI Core Plan

> **Goal**: End-to-end AI content generation inside the lesson editor. Teacher can generate, stream, edit inline, and regenerate individual content blocks without losing their work.
> **Timeline**: Weeks 4-6
> **Depends on**: Phase 1 complete (auth, lesson CRUD, student profiles, teacher profile)
> **Outcome**: A teacher opens a lesson, clicks "Generate", and receives streamed AI content she can edit, regenerate per-section, and save — with free-tier limits enforced.

---

## Deliverables Checklist

- [ ] Claude API client service (model routing: Haiku / Sonnet, streaming support)
- [ ] Prompt construction service (language + level + topic + style + student context assembled server-side)
- [ ] Generation endpoints for: lesson plan, vocabulary, grammar, exercises, conversation prompts, homework
- [ ] Generation caching layer (cache hit skips Claude call; teacher can bust cache)
- [ ] Free-tier usage enforcement (25 generations/month; hard cap server-side)
- [ ] Streaming SSE responses piped from .NET to React
- [ ] Lesson editor: "Generate" button per section with streaming display
- [ ] Inline editing of generated content (AI output vs. teacher edits stored separately)
- [ ] Regenerate individual section without losing other sections
- [ ] Generation usage indicator visible in UI

---

## Database Schema Changes (Phase 2 additions)

New tables added via EF Core migration on top of Phase 1 schema:

```sql
-- Generation cache: identical inputs return cached output
GenerationCache (
  Id                Guid PK,
  CacheKey          varchar(512) UNIQUE,   -- hash of {taskType+language+level+topic+style+extras}
  TaskType          varchar(50),           -- "LessonPlan" | "Vocabulary" | "Grammar" | ...
  RequestPayload    nvarchar(max),         -- JSON of original request (for audit/debug)
  OutputJson        nvarchar(max),         -- structured AI output, JSON
  ModelUsed         varchar(50),           -- "claude-haiku-4-5" | "claude-sonnet-4-6"
  InputTokens       int,
  OutputTokens      int,
  CreatedAt         datetime2,
  HitCount          int DEFAULT 0
)

-- Per-section content blocks: each generated/edited chunk lives here
LessonContentBlocks (
  Id                Guid PK,
  LessonId          Guid FK -> Lessons,
  LessonSectionId   Guid FK -> LessonSections nullable,   -- null = standalone block
  BlockType         varchar(50),           -- "LessonPlan" | "Vocabulary" | "Grammar" | "Exercises" | "Conversation" | "Homework"
  GeneratedContent  nvarchar(max),         -- raw AI output (immutable after generation)
  EditedContent     nvarchar(max),         -- teacher's version (starts as copy of GeneratedContent)
  GenerationParams  nvarchar(max),         -- JSON of params used (for regenerate)
  CacheKey          varchar(512),          -- FK into GenerationCache.CacheKey (nullable)
  Rating            int nullable,          -- 1 = thumbs up, -1 = thumbs down, null = unrated
  CreatedAt         datetime2,
  UpdatedAt         datetime2
)

-- Monthly usage counters per teacher (enforces free-tier limits)
GenerationUsage (
  Id                Guid PK,
  TeacherId         Guid FK -> Teachers,
  YearMonth         char(7),               -- "2026-04"
  GenerationCount   int DEFAULT 0,
  LastGeneratedAt   datetime2
  UNIQUE (TeacherId, YearMonth)
)
```

---

## Task Breakdown

### T1 — Claude API Client Service

**Priority**: Must | **Effort**: 1 day

Install `Anthropic.SDK` NuGet package (or use `HttpClient` if SDK unavailable; prefer SDK).

**`IClaudeClient` interface:**
```csharp
public interface IClaudeClient
{
    Task<string> CompleteAsync(ClaudeRequest request, CancellationToken ct = default);
    IAsyncEnumerable<string> StreamAsync(ClaudeRequest request, CancellationToken ct = default);
}

public record ClaudeRequest(
    string SystemPrompt,
    string UserPrompt,
    ClaudeModel Model,        // enum: Haiku | Sonnet
    int MaxTokens = 2048
);
```

**Model routing logic** (in `ClaudeClientService`):

| Task | Model |
|------|-------|
| Vocabulary list | claude-haiku-4-5-20251001 |
| Fill-in-blank / MCQ exercises | claude-haiku-4-5-20251001 |
| Conversation prompts | claude-haiku-4-5-20251001 |
| Grammar explanation | claude-sonnet-4-6 |
| Reading text + questions | claude-sonnet-4-6 |
| Full lesson plan | claude-sonnet-4-6 |
| Homework assignment | claude-sonnet-4-6 |

**Error handling:**
- Wrap API calls in try/catch; surface `ClaudeApiException` with status code
- 429 (rate limit): return 503 to caller with `Retry-After` header
- Log all calls: task type, model, token counts, latency, cache hit/miss

**Registration:** `builder.Services.AddSingleton<IClaudeClient, ClaudeClientService>()`

API key stored in: `appsettings.Development.json` (`Claude:ApiKey`) and Azure Key Vault in production. Never hardcoded.

**Done when:** Unit tests mock `IClaudeClient`; integration test hits real Claude API with a minimal prompt and returns non-empty string.

---

### T2 — Prompt Construction Service

**Priority**: Must | **Effort**: 0.5 days

Centralises all prompt assembly. No raw string building scattered across controllers.

**`IPromptService` interface:**
```csharp
public interface IPromptService
{
    ClaudeRequest BuildLessonPlanPrompt(GenerationContext ctx);
    ClaudeRequest BuildVocabularyPrompt(GenerationContext ctx);
    ClaudeRequest BuildGrammarPrompt(GenerationContext ctx);
    ClaudeRequest BuildExercisesPrompt(GenerationContext ctx, ExerciseTypes types);
    ClaudeRequest BuildConversationPrompt(GenerationContext ctx);
    ClaudeRequest BuildHomeworkPrompt(GenerationContext ctx, string lessonSummary);
}

public record GenerationContext(
    string Language,          // "English", "Spanish", etc.
    string CefrLevel,         // "B1"
    string Topic,             // "ordering food at a restaurant"
    string Style,             // "Conversational" | "Formal" | "Business" | "Academic"
    string? StudentName,
    string[]? StudentInterests,
    string? ReferenceText     // optional free-text context
);
```

**System prompt template (shared across all tasks):**
```
You are an expert language teacher creating materials for a {Language} lesson at {CefrLevel} level.
Teaching style: {Style}.
{if student} Student name: {StudentName}. Student interests: {StudentInterests}. {/if}
{if reference} Reference context: {ReferenceText} {/if}
Respond in valid JSON matching the schema provided. No prose outside the JSON block.
```

Each task method appends a user prompt with the specific output schema.

**Output schemas** (examples):

Vocabulary:
```json
{ "items": [{ "word": "", "definition": "", "exampleSentence": "", "translation": "" }] }
```

Grammar:
```json
{ "title": "", "explanation": "", "examples": [{ "sentence": "", "note": "" }], "commonMistakes": [] }
```

Exercises:
```json
{
  "fillInBlank": [{ "sentence": "", "answer": "", "distractors": [] }],
  "multipleChoice": [{ "question": "", "options": [], "correctIndex": 0 }],
  "matching": [{ "left": "", "right": "" }]
}
```

Full lesson plan:
```json
{
  "title": "",
  "objectives": [],
  "sections": {
    "warmUp": { "activity": "", "duration": 5, "notes": "" },
    "presentation": { "content": "", "duration": 15, "notes": "" },
    "practice": { "activities": [], "duration": 15, "notes": "" },
    "production": { "task": "", "duration": 10, "notes": "" },
    "wrapUp": { "activity": "", "duration": 5, "notes": "" }
  }
}
```

**Done when:** All prompt methods return valid `ClaudeRequest` objects; JSON schema strings match frontend expectations (agreed contract before T5/T6 start).

---

### T3 — Generation Caching Layer

**Priority**: Must | **Effort**: 0.5 days

Sits between the generation endpoints and `IClaudeClient`. Checks DB before calling Claude; stores result after.

**Cache key construction:**
```csharp
string BuildCacheKey(string taskType, GenerationContext ctx, string? extras = null)
{
    var raw = $"{taskType}|{ctx.Language}|{ctx.CefrLevel}|{ctx.Topic.ToLower().Trim()}|{ctx.Style}|{extras}";
    return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
}
```

**`ICacheService` interface:**
```csharp
Task<string?> GetAsync(string cacheKey);
Task SetAsync(string cacheKey, string taskType, string requestJson, string outputJson,
              string modelUsed, int inputTokens, int outputTokens);
```

**Bust cache:** Client sends `force: true` in request body. Service skips `GetAsync`, calls Claude, stores new result (overwrites existing row by `CacheKey`).

**Notes:**
- Cache is never invalidated by time — content is deterministic for given inputs. "Regenerate" is the only bust mechanism.
- `HitCount` incremented on cache hit (useful for understanding what teachers commonly generate).
- `ReferenceText` is hashed into the key if present; student interests are sorted before hashing for stability.

**Done when:** Two identical generation requests: second returns cached output and no Claude API call is made (verified by log or counter).

---

### T4 — Generation API Endpoints

**Priority**: Must | **Effort**: 1.5 days

All endpoints live under `/api/generate`. All require `[Authorize]`.

**Common request base:**
```json
{
  "language": "Spanish",
  "cefrLevel": "B1",
  "topic": "ordering food",
  "style": "Conversational",
  "studentId": "optional-guid",
  "referenceText": "optional free text",
  "force": false
}
```

**Endpoints:**

| Method | Path | Request extras | Haiku/Sonnet |
|--------|------|----------------|--------------|
| POST | `/api/generate/lesson-plan` | `durationMinutes` | Sonnet |
| POST | `/api/generate/vocabulary` | `wordCount` (default 15) | Haiku |
| POST | `/api/generate/grammar` | `grammarPoint` | Sonnet |
| POST | `/api/generate/exercises` | `types[]` (fillInBlank, multipleChoice, matching) | Haiku |
| POST | `/api/generate/conversation` | `scenarioCount` (default 3) | Haiku |
| POST | `/api/generate/homework` | `lessonSummary` | Sonnet |

**Per-endpoint flow:**
1. Validate request (language + level + topic required)
2. Check free-tier limit via `IUsageService` — return 402 with `{ "error": "monthly_limit_reached", "limit": 25, "used": 25 }` if exceeded
3. Resolve student context from DB if `studentId` provided
4. Build cache key; check cache
5. If cache miss: call `IClaudeClient.CompleteAsync`, parse JSON output, store in cache
6. Increment usage counter in `GenerationUsage`
7. Persist `LessonContentBlock` row if `lessonId` provided in request (optional)
8. Return structured JSON response

**Usage service:**
```csharp
public interface IUsageService
{
    Task<bool> CanGenerateAsync(Guid teacherId);         // checks monthly count vs. plan limit
    Task IncrementAsync(Guid teacherId);
    Task<UsageSummary> GetSummaryAsync(Guid teacherId);  // for UI display
}
```

Limits by plan (hardcoded for V1, move to DB/config later):
- Free: 25/month
- Solo: 200/month
- Pro: 1000/month

**Done when:** All 6 endpoints return valid JSON; limit enforcement tested with a seeded teacher at cap; 402 returned correctly.

---

### T5 — Streaming SSE Endpoint

**Priority**: Must | **Effort**: 1 day

Wraps `IClaudeClient.StreamAsync` and pipes tokens to the client over Server-Sent Events.

**Endpoint:** `POST /api/generate/{taskType}/stream`

Same request body as non-streaming endpoints. Response content-type: `text/event-stream`.

**.NET streaming response:**
```csharp
Response.Headers.Add("Cache-Control", "no-cache");
Response.ContentType = "text/event-stream";

await foreach (var token in _claude.StreamAsync(request, ct))
{
    await Response.WriteAsync($"data: {JsonSerializer.Serialize(token)}\n\n");
    await Response.Body.FlushAsync(ct);
}
await Response.WriteAsync("data: [DONE]\n\n");
```

**Cache interaction:** If cache hit, simulate streaming by chunking the cached string into ~5 word pieces with a 20ms delay per chunk (so the UI does not behave differently on cache vs. live calls).

**Frontend consumption (React):**
```typescript
const stream = await fetch('/api/generate/vocabulary/stream', {
  method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(params)
});
const reader = stream.body!.getReader();
// append tokens to local state as they arrive
```

Use a custom `useGenerate` hook that manages: `status` (idle | loading | streaming | done | error), `output` (accumulated string), `abort` (AbortController).

**Done when:** Frontend displays tokens appearing word-by-word within 200ms of generation start; AbortController cancels mid-stream cleanly.

---

### T6 — Lesson Editor: Generate Button + Streaming UI

**Priority**: Must | **Effort**: 2 days

Adds generation capability to the existing lesson editor (`/lessons/{id}`).

**Per-section generate button:**
Each of the 5 lesson section panels gets a "Generate" button in the top-right corner. Clicking opens a **generation drawer/panel** (not a modal — stays on screen while teacher reviews output).

**Generation drawer contents:**
- Task type selector: "Vocabulary" | "Grammar" | "Exercises" | "Conversation" | "Full Lesson Plan"
- Style selector: Formal / Conversational / Business / Academic
- Optional free-text reference field
- Student selector (pre-populated if lesson already links a student)
- "Generate" button (primary) + "Regenerate" (secondary, force=true)

**Streaming display area:**
- Spinner + "Generating..." label while waiting for first token
- Token-by-token text render once stream starts (monospace or card layout depending on content type)
- "Cancel" link aborts stream

**Accept / Discard flow:**
- "Insert into section" button: copies output into the section's `EditedContent` field and saves `LessonContentBlock` to DB
- "Discard" closes the drawer without saving
- Previously generated (accepted) content shown in section with a subtle "AI-generated" badge

**Full lesson plan generation:**
- Special flow: generates all 5 sections at once
- Prompts teacher to confirm before overwriting existing section notes
- Maps JSON output sections to the 5 `LessonSection` records

**Done when:** Teacher can open a lesson, generate vocabulary for the Practice section, see it stream in, and click "Insert". Section content persists on page refresh.

---

### T7 — Inline Editing and Regenerate

**Priority**: Must | **Effort**: 1 day

**Inline editing:**
- All accepted AI content renders in a `<textarea>` or `contentEditable` div — immediately editable
- Changes to `EditedContent` auto-save on blur (same pattern as Phase 1 section notes)
- Visual diff indicator: if `EditedContent !== GeneratedContent`, show a "modified" dot next to the AI badge
- "Reset to original" link restores `EditedContent = GeneratedContent` (with confirmation)

**Regenerate individual block:**
- "Regenerate" button appears on any existing `LessonContentBlock`
- Sends same `GenerationParams` JSON stored on the block, plus `force: true`
- New output replaces `GeneratedContent` and resets `EditedContent` to new output
- Teacher's previous edits are discarded (warn with a confirmation dialog before proceeding)

**Block-level actions toolbar** (shown on hover over any generated block):
`[Edit] [Regenerate] [Reset to original] [Delete block] [Rate: 👍 👎]`

Rating (thumbs up/down) updates `LessonContentBlock.Rating` via `PATCH /api/content-blocks/{id}/rating`.

**Done when:** Teacher can edit generated text, see the "modified" indicator, reset to original, and regenerate (confirmed that old content is replaced).

---

### T8 — Usage Tracking and Limit UI

**Priority**: Must | **Effort**: 0.5 days

**API endpoint:**
```
GET /api/usage/current-month
```
Response:
```json
{ "used": 12, "limit": 25, "plan": "Free", "resetsOn": "2026-05-01" }
```

**UI placement:**
- Persistent usage bar in the sidebar or top navigation: "12 / 25 generations used this month"
- Bar turns amber at 80%, red at 100%
- "Upgrade" link next to bar on Free plan

**Limit reached state:**
- Generate buttons disabled when `used >= limit`
- Tooltip on disabled button: "You've used all 25 free generations this month. Upgrade to continue."
- API still returns 402 as a backstop (never trust UI-only enforcement)

**Done when:** Usage bar reflects actual count; generate buttons disabled at cap; 402 from API when teacher at cap hits generate programmatically.

---

## Dependency Order

```
T1 (Claude client)
  └── T2 (prompt service)
        └── T3 (cache layer)
              └── T4 (generation endpoints) ─── T5 (streaming endpoint)
                    └── T8 (usage tracking)          └── T6 (editor UI + generate button)
                                                           └── T7 (inline edit + regenerate)
```

T1 and T2 can be worked in parallel (T2 only needs the `ClaudeRequest` type from T1, not the implementation).
T3 depends on T1's interface being defined.
T4 depends on T2 and T3 being complete.
T5 depends on T1's `StreamAsync` method.
T6 and T8 depend on T4 and T5 being deployed (or mockable).
T7 depends on T6 (blocks exist in DB before editing/regenerating is meaningful).

---

## API Contract Summary

All generation endpoints follow the same response envelope:

```json
{
  "blockId": "guid",
  "cacheHit": false,
  "modelUsed": "claude-sonnet-4-6",
  "data": { /* task-specific JSON schema — defined in T2 */ },
  "usage": { "used": 13, "limit": 25 }
}
```

Streaming endpoint emits raw token strings as SSE events; `[DONE]` signals end of stream. Final structured JSON is only available via the non-streaming endpoint (client assembles it or requests it after stream ends).

---

## Definition of Done — Phase 2

Manual QA scenario using a Free-tier teacher account:

1. Open an existing lesson (created in Phase 1 testing)
2. Click "Generate" on the Practice section; select "Vocabulary"; topic pre-filled from lesson
3. Confirm tokens stream in and display progressively
4. Click "Insert" — vocabulary block appears in section; page refresh confirms it persists
5. Edit two words in the vocabulary list; "modified" dot appears
6. Click "Reset to original" — edits discarded, original AI output restored
7. Click "Regenerate" on the same block — new vocabulary appears (different from first run due to temperature)
8. Click "Generate" for the Presentation section; select "Grammar Explanation"
9. Confirm Sonnet is used (visible in response or log); grammar explanation streams and inserts
10. Click "Full Lesson Plan" — all 5 sections populated; confirm before overwrite warning shown
11. Trigger 25 generations (or seed the DB to count=25); confirm 26th is blocked in UI and returns 402
12. Usage bar shows 25/25 in red; generate buttons are disabled

---

## Open Questions for Phase 2

- [ ] Should the streaming endpoint be a separate route (`/stream`) or a header flag (`Accept: text/event-stream`)? Recommend separate route for simplicity.
- [ ] Should `LessonContentBlock` be linkable to a specific `LessonSection`, or is it always free-floating and displayed by block type? Recommend section-linked to support "regenerate section" UX cleanly.
- [ ] Grammar explanation and reading text can exceed 2048 tokens for C1/C2. Set `MaxTokens` per task type (grammar: 1024, lesson plan: 3000, others: 1024).
- [ ] Should we persist the raw SSE stream to S3/Blob for debugging, or is storing the final output in `GenerationCache.OutputJson` sufficient? Recommend final output only for V1.
- [ ] Confirm final JSON output schemas with frontend before T2 implementation starts — schema mismatch is the most common integration bug.

---

*Created: March 2026 | Phase 2 — AI Core*
