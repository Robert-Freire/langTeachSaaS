# T11 — Claude API Client

**Branch**: `task/t11-claude-api-client`
**Priority**: Must | **Effort**: 1 day
**Blocks**: T12 (prompt service), T13 (generation endpoints), T14 (streaming SSE)

---

## Goal

Introduce `IClaudeClient` as a typed abstraction over the Anthropic Messages API, with both
non-streaming and streaming modes, model routing, structured error handling, and logging.
Also add the `IsApproved` field to `Teachers` (deferred from T10) so future generation
endpoints can gate access.

---

## Files to Create

| File | Purpose |
|------|---------|
| `backend/LangTeach.Api/AI/IClaudeClient.cs` | Interface + request/response/enum types |
| `backend/LangTeach.Api/AI/ClaudeApiClient.cs` | HttpClient implementation |
| `backend/LangTeach.Api/AI/ClaudeClientOptions.cs` | Config POCO (bound to `Claude:` section) |
| `backend/LangTeach.Api/AI/ClaudeApiException.cs` | Base exception |
| `backend/LangTeach.Api/AI/ClaudeRateLimitException.cs` | 429 exception |
| `backend/LangTeach.Api/Migrations/<timestamp>_AddTeacherIsApproved.cs` | EF migration |
| `backend/LangTeach.Api.Tests/AI/ClaudeApiClientIntegrationTests.cs` | Integration test (real API call) |
| `backend/LangTeach.Api.Tests/AI/ClaudeApiClientUnitTests.cs` | Unit tests (fake HTTP handler) |
| `backend/LangTeach.Api.Tests/Helpers/FakeHttpMessageHandler.cs` | Test helper for mocking HTTP responses |

---

## Files to Modify

| File | Change |
|------|--------|
| `backend/LangTeach.Api/Data/Models/Teacher.cs` | Add `bool IsApproved { get; set; }` (default false) |
| `backend/LangTeach.Api/appsettings.json` | Add `Claude:` section stub (empty key) |
| `backend/LangTeach.Api/appsettings.Development.json` | Add `Claude:ApiKey` as `""` (real key via user-secrets) |
| `backend/LangTeach.Api/Program.cs` | Register named HTTP client + `IClaudeClient` + typed config |

---

## Step-by-Step Implementation

### Step 1 — Types (`backend/LangTeach.Api/AI/IClaudeClient.cs`)

```csharp
namespace LangTeach.Api.AI;

public interface IClaudeClient
{
    Task<ClaudeResponse> CompleteAsync(ClaudeRequest request, CancellationToken ct = default);
    IAsyncEnumerable<string> StreamAsync(ClaudeRequest request, CancellationToken ct = default);
}

public record ClaudeRequest(
    string SystemPrompt,
    string UserPrompt,
    ClaudeModel Model,
    int MaxTokens = 2048
);

public record ClaudeResponse(
    string Content,
    string ModelUsed,
    int InputTokens,
    int OutputTokens
);

public enum ClaudeModel { Haiku, Sonnet }
```

### Step 2 — Config POCO (`backend/LangTeach.Api/AI/ClaudeClientOptions.cs`)

```csharp
namespace LangTeach.Api.AI;

public class ClaudeClientOptions
{
    public const string SectionName = "Claude";
    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.anthropic.com";
}
```

### Step 3 — Custom Exceptions

`backend/LangTeach.Api/AI/ClaudeApiException.cs`:
```csharp
using System.Net;

namespace LangTeach.Api.AI;

public class ClaudeApiException(HttpStatusCode statusCode, string responseBody)
    : Exception($"Claude API error {(int)statusCode}: {responseBody}")
{
    public HttpStatusCode StatusCode { get; } = statusCode;
    public string ResponseBody { get; } = responseBody;
}
```

`backend/LangTeach.Api/AI/ClaudeRateLimitException.cs`:
```csharp
using System.Net;

namespace LangTeach.Api.AI;

public class ClaudeRateLimitException(TimeSpan? retryAfter)
    : ClaudeApiException(HttpStatusCode.TooManyRequests, "Rate limit exceeded")
{
    public TimeSpan? RetryAfter { get; } = retryAfter;
}
```

### Step 4 — Implementation (`backend/LangTeach.Api/AI/ClaudeApiClient.cs`)

Use `IHttpClientFactory` with the named client `"Claude"`.

Model ID mapping:
- `ClaudeModel.Haiku` -> `"claude-haiku-4-5-20251001"`
- `ClaudeModel.Sonnet` -> `"claude-sonnet-4-6"`

**`CompleteAsync`:**
- POST `/v1/messages` with JSON body:
  ```json
  {
    "model": "<model-id>",
    "max_tokens": <MaxTokens>,
    "system": "<SystemPrompt>",
    "messages": [{ "role": "user", "content": "<UserPrompt>" }]
  }
  ```
- On 429: read `Retry-After` header, throw `ClaudeRateLimitException`
- On other non-2xx: throw `ClaudeApiException(statusCode, body)`
- Deserialize: `content[0].text`, `usage.input_tokens`, `usage.output_tokens`, `model`
- Return `ClaudeResponse`
- Log: model, input tokens, output tokens, latency (ms)

**`StreamAsync`:**
- POST `/v1/messages` with `"stream": true`, use `HttpCompletionOption.ResponseHeadersRead`
- Read SSE lines from response stream
- Yield `delta.text` from `content_block_delta` events
- Stop on `message_stop` event
- Same error handling as `CompleteAsync`

### Step 5 — `IsApproved` on Teacher

Add to `backend/LangTeach.Api/Data/Models/Teacher.cs`:
```csharp
public bool IsApproved { get; set; } = false;
```

Generate migration (run from repo root):
```
dotnet ef migrations add AddTeacherIsApproved --project backend/LangTeach.Api --startup-project backend/LangTeach.Api
```

The migration sets `defaultValue: false` — existing rows get false (no approval yet).

### Step 6 — Config wiring

`appsettings.json` — add:
```json
"Claude": {
  "ApiKey": "",
  "BaseUrl": "https://api.anthropic.com"
}
```

`appsettings.Development.json` — add (value stays `""`, real key goes in user-secrets):
```json
"Claude": {
  "ApiKey": ""
}
```

Real key: `dotnet user-secrets set "Claude:ApiKey" "sk-ant-..." --project backend/LangTeach.Api`

The API key must NOT be committed. `UserSecretsId` is already set in the `.csproj` (`langteach-api-dev`).

### Step 7 — DI Registration (`backend/LangTeach.Api/Program.cs`)

Add after the existing `builder.Services.AddHttpClient();` line:

```csharp
using LangTeach.Api.AI;
using Microsoft.Extensions.Options;

// ...

builder.Services.Configure<ClaudeClientOptions>(
    builder.Configuration.GetSection(ClaudeClientOptions.SectionName));

builder.Services.AddHttpClient("Claude", (sp, client) =>
{
    var opts = sp.GetRequiredService<IOptions<ClaudeClientOptions>>().Value;
    client.BaseAddress = new Uri(opts.BaseUrl);
    client.DefaultRequestHeaders.Add("x-api-key", opts.ApiKey);
    client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
});

builder.Services.AddScoped<IClaudeClient, ClaudeApiClient>();
```

The existing `builder.Services.AddHttpClient();` on line 69 remains — it registers the default
factory. The named `AddHttpClient("Claude", ...)` is additive.

### Step 8 — Test Helper (`backend/LangTeach.Api.Tests/Helpers/FakeHttpMessageHandler.cs`)

No HTTP mocking library is in the project. Create a hand-rolled handler:

```csharp
namespace LangTeach.Api.Tests.Helpers;

public class FakeHttpMessageHandler(HttpResponseMessage response) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
        => Task.FromResult(response);
}
```

### Step 9 — Tests

**Integration test** (`backend/LangTeach.Api.Tests/AI/ClaudeApiClientIntegrationTests.cs`):
- No `[Collection("ApiTests")]` — these tests are standalone (no WebApplicationFactory needed)
- At the start of each test, read `IConfiguration["Claude:ApiKey"]` from user-secrets or env.
  If empty/null, call `return` early (test passes trivially — CI skips cleanly without extra packages).
- Build a real `ClaudeApiClient` directly (new up with a real `HttpClient` from `IHttpClientFactory`)
- Test `CompleteAsync`: minimal prompt, assert `Content` non-empty, `InputTokens > 0`, `OutputTokens > 0`
- Test `StreamAsync`: collect chunks, assert joined string non-empty

**Unit tests** (`backend/LangTeach.Api.Tests/AI/ClaudeApiClientUnitTests.cs`):
- Use `FakeHttpMessageHandler` to return canned responses
- Test 429 response -> `ClaudeRateLimitException` thrown, `RetryAfter` populated from header
- Test 500 response -> `ClaudeApiException` thrown with correct `StatusCode`
- Test successful non-streaming response -> correct `ClaudeResponse` fields
- Test successful streaming response -> correct chunk sequence from SSE data

---

## Verification Checklist

- [ ] `dotnet build` (from `backend/`) — zero warnings
- [ ] `dotnet test` (from `backend/`) — all tests pass (integration tests return early if no key)
- [ ] `IClaudeClient` resolves from DI (no startup exceptions)
- [ ] Real API call (integration test with key set) returns valid content
- [ ] 429 scenario: `ClaudeRateLimitException` with `RetryAfter`
- [ ] `IsApproved` migration applies cleanly on local SQL container
- [ ] API key NOT in any committed file

---

## Notes

- The `IsApproved` 403 enforcement in generation endpoints is T13 work — T11 only adds the DB field.
- `ClaudeApiClient` uses `IHttpClientFactory` — consistent with existing `UserInfoService` pattern.
- Namespace for all AI types: `LangTeach.Api.AI` (matches existing `LangTeach.Api.*` convention).
