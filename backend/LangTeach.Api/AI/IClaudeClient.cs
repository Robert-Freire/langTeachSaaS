namespace LangTeach.Api.AI;

public interface IClaudeClient
{
    Task<ClaudeResponse> CompleteAsync(ClaudeRequest request, CancellationToken ct = default);
    Task<T> CompleteWithToolAsync<T>(ClaudeRequest request, ClaudeToolDefinition tool, CancellationToken ct = default);
    IAsyncEnumerable<string> StreamAsync(ClaudeRequest request, CancellationToken ct = default);
}

// Tool definition for forced single-tool calls. InputSchema must be a JSON Schema object (type=object).
public record ClaudeToolDefinition(string Name, string Description, object InputSchema);

public record ContentAttachment(string MediaType, byte[] Data, string FileName);

// ClaudeRequest carries both the wire payload and call context (CallSite, CorrelationId).
// Full prompts and raw responses are logged unconditionally: PII boundary is already crossed
// when text is sent to Claude; Azure Log Analytics is inside the same trust boundary.
public record ClaudeRequest(
    string SystemPrompt,
    string UserPrompt,
    ClaudeModel Model,
    int MaxTokens = 2048,
    IReadOnlyList<ContentAttachment>? Attachments = null,
    double? Temperature = null,
    string CallSite = "unknown",
    Guid? CorrelationId = null
);

public record ClaudeResponse(
    string Content,
    string ModelUsed,
    int InputTokens,
    int OutputTokens
);

public enum ClaudeModel { Haiku, Sonnet, Opus }
