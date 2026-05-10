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
    /// Uses balanced-brace counting to find the true end of the JSON object, so post-JSON prose
    /// (e.g. model self-checks that contain '}' characters) does not corrupt the result.
    /// </summary>
    public static string? StripFencesAndPreamble(string? content)
    {
        var stripped = StripFences(content);
        if (string.IsNullOrEmpty(stripped)) return stripped;
        var objectStart = stripped.IndexOf('{');
        if (objectStart < 0) return stripped;

        // Walk from the first '{' counting balanced braces to find the true JSON end.
        int depth = 0;
        bool inString = false;
        bool escaped = false;
        for (int i = objectStart; i < stripped.Length; i++)
        {
            char c = stripped[i];
            if (escaped) { escaped = false; continue; }
            if (c == '\\' && inString) { escaped = true; continue; }
            if (c == '"') { inString = !inString; continue; }
            if (inString) continue;
            if (c == '{') depth++;
            else if (c == '}')
            {
                depth--;
                if (depth == 0)
                    return stripped[objectStart..(i + 1)];
            }
        }
        // Fallback: return from the first '{' to end (partial JSON).
        return stripped[objectStart..];
    }
}
