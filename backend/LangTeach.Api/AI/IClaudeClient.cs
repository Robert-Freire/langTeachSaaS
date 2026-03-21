namespace LangTeach.Api.AI;

public interface IClaudeClient
{
    Task<ClaudeResponse> CompleteAsync(ClaudeRequest request, CancellationToken ct = default);
    IAsyncEnumerable<string> StreamAsync(ClaudeRequest request, CancellationToken ct = default);
}

public record ContentAttachment(string MediaType, byte[] Data, string FileName);

public record ClaudeRequest(
    string SystemPrompt,
    string UserPrompt,
    ClaudeModel Model,
    int MaxTokens = 2048,
    IReadOnlyList<ContentAttachment>? Attachments = null
);

public record ClaudeResponse(
    string Content,
    string ModelUsed,
    int InputTokens,
    int OutputTokens
);

public enum ClaudeModel { Haiku, Sonnet }
