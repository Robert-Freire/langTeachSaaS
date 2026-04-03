namespace LangTeach.Api.Services;

/// <summary>
/// Shared CEFR level normalization logic used by both SectionProfileService, PedagogyConfigService,
/// and the MigrationTool importer.
/// Accepts "A1", "A1.1", "B2+", "A0+" etc. and returns the canonical major band (e.g. "A1", "B2").
/// A0/A0+ are mapped to A1 (absolute beginners are served by A1 content).
/// </summary>
public static class CefrLevelNormalizer
{
    private static readonly string[] KnownLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];

    public static string Normalize(string cefrLevel)
    {
        if (string.IsNullOrWhiteSpace(cefrLevel)) return string.Empty;
        var upper = cefrLevel.Trim().ToUpperInvariant();
        // A0 is not a system level; map to A1
        if (upper == "A0" || upper.StartsWith("A0", StringComparison.Ordinal)) return "A1";
        if (KnownLevels.Contains(upper, StringComparer.Ordinal)) return upper;
        foreach (var known in KnownLevels)
        {
            if (upper.StartsWith(known, StringComparison.Ordinal))
                return known;
        }
        return upper; // Return as-is; profile lookup will miss and return empty/default
    }
}
