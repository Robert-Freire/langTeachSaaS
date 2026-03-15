using System.Net;

namespace LangTeach.Api.AI;

public class ClaudeApiException(HttpStatusCode statusCode, string responseBody)
    : Exception($"Claude API error {(int)statusCode}: {responseBody}")
{
    public HttpStatusCode StatusCode { get; } = statusCode;
    public string ResponseBody { get; } = responseBody;
}
