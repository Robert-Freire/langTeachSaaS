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
