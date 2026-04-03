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

    public static Student? FindStudent(string sheetName, IReadOnlyList<Student> students)
    {
        var nameFromSheet = StripCefrSuffix(sheetName);

        return students.FirstOrDefault(s =>
            string.Equals(s.Name.Trim(), nameFromSheet, StringComparison.OrdinalIgnoreCase));
    }
}
