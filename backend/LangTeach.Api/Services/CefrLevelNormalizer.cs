namespace LangTeach.Api.Services;

/// <summary>
/// Shared CEFR level normalization logic used by both SectionProfileService and PedagogyConfigService.
/// Accepts "A1", "A1.1", "B2.2" etc. and returns the canonical major band (e.g. "A1", "B2").
/// </summary>
internal static class CefrLevelNormalizer
{
    private static readonly string[] KnownLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];

    public static string Normalize(string cefrLevel)
    {
        if (string.IsNullOrWhiteSpace(cefrLevel)) return string.Empty;
        var upper = cefrLevel.Trim().ToUpperInvariant();
        if (KnownLevels.Contains(upper, StringComparer.Ordinal)) return upper;
        foreach (var known in KnownLevels)
        {
            if (upper.StartsWith(known, StringComparison.Ordinal))
                return known;
        }
        return upper; // Return as-is; profile lookup will miss and return empty/default
    }
}
