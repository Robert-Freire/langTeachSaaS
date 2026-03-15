# T14 — Streaming SSE Endpoint + useGenerate Hook

**Branch**: `task/t14-streaming-sse`
**Effort**: 0.5 days
**Depends on**: T13 merged (GenerateController, IClaudeClient.StreamAsync all in place)

---

## Goal

Add a single streaming SSE endpoint `POST /api/generate/{taskType}/stream` plus a `useGenerate` frontend hook. T15 (lesson editor AI UI) consumes both — T14 is pure infrastructure.

---

## What Already Exists (from T13)

- `IClaudeClient.StreamAsync` fully implemented in `ClaudeApiClient`
- `FakeClaudeClient.StreamAsync` in test fixtures (yields fixed content once)
- `GenerateController` with 7 non-streaming POST actions and private `Generate` helper
- `GenerateRequest` DTO, `GenerationContext`, all prompt builders in `IPromptService`

---

## Backend Changes

### 1. Add streaming action to `GenerateController`

Add a private dispatch dictionary mapping `taskType` string to prompt builder:

```csharp
private static readonly IReadOnlyDictionary<string, Func<IPromptService, GenerationContext, ClaudeRequest>> PromptBuilders =
    new Dictionary<string, Func<IPromptService, GenerationContext, ClaudeRequest>>
    {
        ["lesson-plan"]  = (svc, ctx) => svc.BuildLessonPlanPrompt(ctx),
        ["vocabulary"]   = (svc, ctx) => svc.BuildVocabularyPrompt(ctx),
        ["grammar"]      = (svc, ctx) => svc.BuildGrammarPrompt(ctx),
        ["exercises"]    = (svc, ctx) => svc.BuildExercisesPrompt(ctx),
        ["conversation"] = (svc, ctx) => svc.BuildConversationPrompt(ctx),
        ["reading"]      = (svc, ctx) => svc.BuildReadingPrompt(ctx),
        ["homework"]     = (svc, ctx) => svc.BuildHomeworkPrompt(ctx),
    };
```

Add the streaming action:

```csharp
[HttpPost("{taskType}/stream")]
public async Task<IActionResult> Stream(
    string taskType,
    [FromBody] GenerateRequest request,
    CancellationToken ct)
{
    if (!PromptBuilders.TryGetValue(taskType, out var buildPrompt))
        return NotFound($"Unknown task type: {taskType}");

    if (Auth0Id is null) return Unauthorized();
    if (!ModelState.IsValid) return BadRequest(ModelState);

    // Same validation as Generate helper: teacher approved, lesson exists, optional student
    var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
    var teacher = await _db.Teachers.FindAsync(new object[] { teacherId }, ct);
    if (teacher is null || !teacher.IsApproved) return Forbid();

    var lesson = await _db.Lessons.FindAsync(new object[] { request.LessonId }, ct);
    if (lesson is null || lesson.TeacherId != teacherId || lesson.IsDeleted)
        return NotFound("Lesson not found.");

    StudentDto? student = null;
    if (request.StudentId.HasValue)
    {
        student = await _studentService.GetByIdAsync(teacherId, request.StudentId.Value, ct);
        if (student is null) return NotFound("Student not found.");
    }

    var language = request.Language.Trim();
    var cefrLevel = request.CefrLevel.Trim();
    var topic = request.Topic.Trim();
    if (language.Length == 0 || cefrLevel.Length == 0 || topic.Length == 0)
        return BadRequest("Language, CefrLevel, and Topic must not be blank.");

    var ctx = new GenerationContext(
        Language: language, CefrLevel: cefrLevel, Topic: topic,
        Style: request.Style, DurationMinutes: lesson.DurationMinutes,
        StudentName: student?.Name, StudentNativeLanguage: student?.NativeLanguage,
        StudentInterests: student?.Interests.ToArray(),
        StudentGoals: student?.LearningGoals.ToArray(),
        StudentWeaknesses: student?.Weaknesses.ToArray(),
        ExistingNotes: request.ExistingNotes
    );

    var claudeRequest = buildPrompt(_promptService, ctx);

    Response.ContentType = "text/event-stream";
    Response.Headers["Cache-Control"] = "no-cache";
    Response.Headers["X-Accel-Buffering"] = "no"; // disable nginx buffering in prod

    try
    {
        await foreach (var token in _claudeClient.StreamAsync(claudeRequest, ct))
        {
            await Response.WriteAsync($"data: {JsonSerializer.Serialize(token)}\n\n", ct);
            await Response.Body.FlushAsync(ct);
        }
        await Response.WriteAsync("data: [DONE]\n\n", ct);
        await Response.Body.FlushAsync(ct);
    }
    catch (OperationCanceledException)
    {
        // Client aborted — normal, no error logging needed
    }
    catch (ClaudeRateLimitException ex)
    {
        _logger.LogWarning(ex, "Stream/{TaskType} rate limited. LessonId={LessonId}", taskType, lesson.Id);
        await Response.WriteAsync("data: {\"error\":\"rate_limit\"}\n\n", ct);
        await Response.Body.FlushAsync(ct);
    }
    catch (ClaudeApiException ex)
    {
        _logger.LogError(ex, "Stream/{TaskType} provider error. LessonId={LessonId}", taskType, lesson.Id);
        await Response.WriteAsync("data: {\"error\":\"provider_error\"}\n\n", ct);
        await Response.Body.FlushAsync(ct);
    }

    return new EmptyResult();
}
```

Note: Streaming responses do NOT save a `LessonContentBlock`. The block is saved by T15 when the teacher clicks "Insert".

---

## Backend Tests

Add to `GenerateControllerTests.cs`:

**`Stream_Returns200WithSseContentType_WhenRequestIsValid`**
- Seed approved teacher + lesson
- POST to `/api/generate/vocabulary/stream`
- Assert response status 200, `Content-Type` starts with `text/event-stream`

**`Stream_ReturnsBodyWithDoneMarker`**
- Same setup as above
- Read full response body
- Assert body contains `data: [DONE]`

**`Stream_Returns404_ForUnknownTaskType`**
- POST to `/api/generate/nonexistent/stream`
- Assert 404

**`Stream_Returns403_WhenTeacherNotApproved`**
- Seed unapproved teacher + lesson
- Assert 403

The `FakeClaudeClient.StreamAsync` already exists and yields the fixed content string once — tests can use it as-is.

To read the full streaming body in tests, use `HttpCompletionOption.ResponseHeadersRead` then `ReadAsStringAsync`. The test client body will be complete since it buffers in-process.

---

## Frontend Changes

### 1. `frontend/src/api/generate.ts`

```typescript
export interface GenerateRequest {
  lessonId: string
  studentId?: string
  language: string
  cefrLevel: string
  topic: string
  style?: string
  existingNotes?: string
}

export type GenerateStatus = 'idle' | 'streaming' | 'done' | 'error'
```

### 2. `frontend/src/hooks/useGenerate.ts`

```typescript
import { useState, useRef, useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import type { GenerateRequest, GenerateStatus } from '../api/generate'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

export function useGenerate() {
  const { getAccessTokenSilently } = useAuth0()
  const [status, setStatus] = useState<GenerateStatus>('idle')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const abort = useCallback(() => {
    controllerRef.current?.abort()
    setStatus('idle')
  }, [])

  const generate = useCallback(async (taskType: string, request: GenerateRequest) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setStatus('streaming')
    setOutput('')
    setError(null)

    try {
      const token = await getAccessTokenSilently()
      const response = await fetch(`${BASE_URL}/api/generate/${taskType}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      })

      if (!response.ok) {
        setError(`Request failed: ${response.status}`)
        setStatus('error')
        return
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop()! // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') {
            setStatus('done')
            return
          }
          try {
            const parsed = JSON.parse(data)
            if (typeof parsed === 'object' && parsed.error) {
              setError(parsed.error)
              setStatus('error')
              return
            }
            setOutput(prev => prev + (typeof parsed === 'string' ? parsed : ''))
          } catch {
            // skip malformed line
          }
        }
      }

      setStatus('done')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatus('idle')
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setStatus('error')
      }
    }
  }, [getAccessTokenSilently])

  return { status, output, error, generate, abort }
}
```

### 3. Frontend unit test: `frontend/src/hooks/useGenerate.test.ts`

Use vitest + `@testing-library/react` `renderHook`. MSW handler returns a mock SSE stream.

Tests:
- `generate sets status to streaming then done`
- `abort resets status to idle`
- `error response sets status to error`

The MSW handler for SSE: return a `ReadableStream` with `text/event-stream` content type, sending a couple of tokens then `[DONE]`.

---

## E2E Note

The visible streaming UI (tokens appearing word-by-word) is part of T15 (lesson editor AI integration). The T15 Playwright test will cover the end-to-end happy path: generate vocabulary for a section, watch tokens stream, insert. T14 has no standalone UI to test.

---

## Done When

- [ ] `POST /api/generate/{taskType}/stream` returns `text/event-stream` and streams tokens followed by `[DONE]`
- [ ] `POST /api/generate/unknown-type/stream` returns 404
- [ ] AbortController on the frontend cancels the stream cleanly (status resets to `idle`)
- [ ] `useGenerate` hook manages `status`, `output`, `error` state correctly
- [ ] All backend integration tests pass
- [ ] Frontend unit test for `useGenerate` passes
- [ ] `dotnet build`, `dotnet test`, `npm run build` all clean

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `backend/LangTeach.Api/Controllers/GenerateController.cs` | Add `PromptBuilders` dict + `Stream` action |
| `backend/LangTeach.Api.Tests/Controllers/GenerateControllerTests.cs` | Add 4 streaming tests |
| `frontend/src/api/generate.ts` | Create (types only) |
| `frontend/src/hooks/useGenerate.ts` | Create |
| `frontend/src/hooks/useGenerate.test.ts` | Create |
