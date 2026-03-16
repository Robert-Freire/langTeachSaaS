namespace LangTeach.Api.Helpers;

public static class ContentJsonHelper
{
    /// <summary>
    /// Strips markdown code fences (e.g. ```json ... ```) that the AI may wrap around JSON content.
    /// Returns the trimmed inner content, or the original trimmed string if no fences are found.
    /// </summary>
    public static string? StripFences(string? content)
    {
        if (string.IsNullOrWhiteSpace(content)) return null;
        var trimmed = content.Trim();
        if (trimmed.StartsWith("```"))
        {
            var firstNewline = trimmed.IndexOf('\n');
            var lastFence = trimmed.LastIndexOf("```");
            if (firstNewline >= 0 && lastFence > firstNewline)
                trimmed = trimmed[(firstNewline + 1)..lastFence].Trim();
        }
        return trimmed;
    }
}
