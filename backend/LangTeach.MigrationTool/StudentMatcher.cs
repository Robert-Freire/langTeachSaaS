using LangTeach.Api.Data.Models;

namespace LangTeach.MigrationTool;

/// <summary>
/// Matches Excel sheet names to existing students in the database.
/// Sheet name format: "Nataliya B1", "PaulaB2" (name + optional space + CEFR level).
/// </summary>
internal static class StudentMatcher
{
    private static readonly string[] CefrSuffixes =
        ["C2", "C1", "B2", "B1", "A2", "A1"];

    public static string StripCefrSuffix(string sheetName)
    {
        var trimmed = sheetName.Trim();
        foreach (var suffix in CefrSuffixes)
        {
            if (trimmed.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
            {
                var candidate = trimmed[..^suffix.Length].TrimEnd();
                if (candidate.Length > 0)
                    return candidate;
            }
        }
        return trimmed;
    }

    /// <summary>
    /// Returns the matching student, null if no match, or throws if multiple students
    /// share the same normalized name (to prevent silently importing to the wrong student).
    /// </summary>
    public static Student? FindStudent(string sheetName, IReadOnlyList<Student> students)
    {
        var nameFromSheet = StripCefrSuffix(sheetName);

        var matches = students
            .Where(s => string.Equals(s.Name.Trim(), nameFromSheet, StringComparison.OrdinalIgnoreCase))
            .Take(2)
            .ToList();

        return matches.Count switch
        {
            0 => null,
            1 => matches[0],
            _ => throw new InvalidOperationException(
                $"Ambiguous sheet match for \"{sheetName}\" (normalized: \"{nameFromSheet}\") — " +
                "multiple students with this name. Resolve manually before importing.")
        };
    }
}
