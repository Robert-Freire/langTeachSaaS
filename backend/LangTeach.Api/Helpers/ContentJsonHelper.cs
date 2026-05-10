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

    /// <summary>
    /// Like StripFences, but also strips any prose preamble by advancing to the first '{'.
    /// Use for JSON-object responses where the model may emit reasoning text before the object.
    /// </summary>
    public static string? StripFencesAndPreamble(string? content)
    {
        var stripped = StripFences(content);
        if (string.IsNullOrEmpty(stripped)) return stripped;
        var objectStart = stripped.IndexOf('{');
        if (objectStart > 0)
            stripped = stripped[objectStart..];
        // Drop trailing fence/prose after the JSON object when present.
        var objectEnd = stripped.LastIndexOf('}');
        return objectEnd >= 0 ? stripped[..(objectEnd + 1)] : stripped;
    }
}
