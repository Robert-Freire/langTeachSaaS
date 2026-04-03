using System.Text.RegularExpressions;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Services;

namespace LangTeach.MigrationTool;

/// <summary>
/// Matches Excel sheet names to existing students in the database.
/// Sheet name format: "Nataliya B1", "PaulaB2" (name + optional space + CEFR level).
/// </summary>
internal static class StudentMatcher
{
    // Order matters: longer/more-specific suffixes first so "B1+" matches before "B1"
    private static readonly string[] CefrSuffixes =
        ["C2+", "C1+", "B2+", "B1+", "A2+", "A1+", "A0+", "C2", "C1", "B2", "B1", "A2", "A1", "A0"];

    // Matches A0-C2 with optional plus or dot-subband (e.g. "A2.3", "B1+", "C1")
    private static readonly Regex CefrLevelRegex =
        new(@"\b(A0|A1|A2|B1|B2|C1|C2)(?:[+]|[.]\d)?\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>
    /// Normalizes a raw CEFR level to a base band accepted by the system.
    /// Delegates to CefrLevelNormalizer: A0/A0+ -> A1; B1+ -> B1; A2.3 -> A2; null -> null.
    /// </summary>
    public static string? NormalizeLevel(string? rawLevel)
    {
        if (rawLevel is null) return null;
        var normalized = CefrLevelNormalizer.Normalize(rawLevel);
        return string.IsNullOrEmpty(normalized) ? null : normalized;
    }

    /// <summary>
    /// Parses a freeform text (e.g. "Preply A2", "C1", "A0+", "A2.3") and returns
    /// the first recognised, normalised CEFR level, or null if none found.
    /// </summary>
    public static string? ParseLevelFromText(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var match = CefrLevelRegex.Match(text);
        return match.Success ? NormalizeLevel(match.Value.ToUpperInvariant()) : null;
    }

    /// <summary>
    /// Parses a sheet name into student name and CEFR level (uppercased, e.g. "B1").
    /// Level is null if no recognised suffix is found.
    /// </summary>
    public static (string Name, string? Level) ParseSheetName(string sheetName)
    {
        var trimmed = sheetName.Trim();
        foreach (var suffix in CefrSuffixes)
        {
            if (trimmed.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
            {
                var candidate = trimmed[..^suffix.Length].TrimEnd();
                if (candidate.Length > 0)
                    return (candidate, suffix.ToUpperInvariant());
            }
        }
        return (trimmed, null);
    }

    /// <summary>
    /// Returns the matching student, null if no match, or throws if multiple students
    /// share the same normalized name (to prevent silently importing to the wrong student).
    /// </summary>
    public static Student? FindStudent(string sheetName, IReadOnlyList<Student> students)
    {
        var (name, _) = ParseSheetName(sheetName);

        var matches = students
            .Where(s => string.Equals(s.Name.Trim(), name, StringComparison.OrdinalIgnoreCase))
            .Take(2)
            .ToList();

        return matches.Count switch
        {
            0 => null,
            1 => matches[0],
            _ => throw new InvalidOperationException(
                $"Ambiguous sheet match for \"{sheetName}\" (normalized: \"{name}\") — " +
                "multiple students with this name. Resolve manually before importing.")
        };
    }
}
