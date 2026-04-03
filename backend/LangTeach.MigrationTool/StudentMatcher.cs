using LangTeach.Api.Data.Models;

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
