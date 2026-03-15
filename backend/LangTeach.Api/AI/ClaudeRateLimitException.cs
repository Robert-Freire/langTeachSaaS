using System.Net;

namespace LangTeach.Api.AI;

public class ClaudeRateLimitException(TimeSpan? retryAfter)
    : ClaudeApiException(HttpStatusCode.TooManyRequests, "Rate limit exceeded")
{
    public TimeSpan? RetryAfter { get; } = retryAfter;
}
