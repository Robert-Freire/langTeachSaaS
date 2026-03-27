namespace LangTeach.Api.AI;

public static class SectionContentTypeAllowlist
{
    private static readonly Dictionary<string, HashSet<string>> _allowlist = new(StringComparer.OrdinalIgnoreCase)
    {
        ["warmup"]       = new(StringComparer.OrdinalIgnoreCase) { "free-text", "conversation" },
        ["presentation"] = new(StringComparer.OrdinalIgnoreCase) { "grammar", "vocabulary", "reading", "conversation", "free-text" },
        ["practice"]     = new(StringComparer.OrdinalIgnoreCase) { "exercises", "conversation" },
        ["production"]   = new(StringComparer.OrdinalIgnoreCase) { "free-text", "conversation", "reading" },
        ["wrapup"]       = new(StringComparer.OrdinalIgnoreCase) { "free-text" },
    };

    /// <summary>
    /// Returns true if the content type is allowed for the given section.
    /// Returns true when the section is unknown (permissive for forward compatibility).
    /// </summary>
    public static bool IsAllowed(string sectionType, string contentType)
    {
        // Frontend sends PascalCase ("WarmUp"); normalise to lowercase ("warmup") to match dictionary keys.
        var key = sectionType.Replace(" ", "", StringComparison.Ordinal).ToLowerInvariant();
        if (!_allowlist.TryGetValue(key, out var allowed)) return true;
        return allowed.Contains(contentType);
    }
}
