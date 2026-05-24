namespace LangTeach.Api.Data.Models;

// Records whether the CEFR level filter (Pass 2) kept a tag in the student-facing view or
// removed it as above the student's level. Stored as a lowercase word so it surfaces
// verbatim in queries and JSON payloads. Softening is NOT a value here: a softened tag is
// already encoded by Category == MuyBien (with nulled Explanation/CorrectedForm), so a
// "softened" status would duplicate that fact (Sophy, #1351 model review).
public static class CorrectionTagFilterStatus
{
    public const string Kept = "kept";
    public const string Removed = "removed";

    public static bool IsValid(string value) =>
        value == Kept || value == Removed;
}
