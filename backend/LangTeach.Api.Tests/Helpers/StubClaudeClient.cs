using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using LangTeach.Api.AI;

namespace LangTeach.Api.Tests.Helpers;

/// <summary>
/// A stub IClaudeClient for integration tests. Lets the test queue up the next response
/// content (or use a default empty JSON object). Records the last request so tests can
/// assert prompt content.
/// </summary>
public class StubClaudeClient : IClaudeClient
{
    private readonly ConcurrentQueue<string> _responses = new();
    private string _defaultContent = "{\"schemaVersion\":1,\"originalText\":\"\",\"tags\":[]}";

    public ClaudeRequest? LastRequest { get; private set; }
    public int CompleteCallCount { get; private set; }

    /// <summary>
    /// Optional hook that runs INSIDE CompleteAsync, between recording the request
    /// and returning the response. Use this to simulate concurrent-state changes
    /// (e.g. another request completing the correction during the LLM round-trip).
    /// </summary>
    public Func<Task>? DuringCompleteAsync { get; set; }

    public void EnqueueResponse(string content) => _responses.Enqueue(content);

    public void SetDefaultResponse(string content) => _defaultContent = content;

    public void Reset()
    {
        while (_responses.TryDequeue(out _)) { }
        LastRequest = null;
        CompleteCallCount = 0;
        _defaultContent = "{\"schemaVersion\":1,\"originalText\":\"\",\"tags\":[]}";
    }

    public async Task<ClaudeResponse> CompleteAsync(ClaudeRequest request, CancellationToken ct = default)
    {
        CompleteCallCount++;
        LastRequest = request;
        if (DuringCompleteAsync is not null)
            await DuringCompleteAsync();
        var content = _responses.TryDequeue(out var queued) ? queued : _defaultContent;
        return new ClaudeResponse(content, "claude-stub", 10, 20);
    }

    public async IAsyncEnumerable<string> StreamAsync(ClaudeRequest request,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        CompleteCallCount++;
        LastRequest = request;
        await Task.Yield();
        yield return _responses.TryDequeue(out var queued) ? queued : _defaultContent;
    }
}
