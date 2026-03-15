namespace LangTeach.Api.AI;

public class ClaudeClientOptions
{
    public const string SectionName = "Claude";
    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.anthropic.com";
}
