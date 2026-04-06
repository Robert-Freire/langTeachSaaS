namespace LangTeach.Api.Data.Models;

/// <summary>
/// Structured form of CurriculumEntry.ContextDescription.
/// Stored as JSON in the nvarchar(max) column.
/// </summary>
public class ContextDescriptionData
{
    public string Setting { get; init; } = string.Empty;
    public string Scenario { get; init; } = string.Empty;
}

/// <summary>
/// Structured form of CurriculumEntry.PersonalizationNotes.
/// Stored as JSON in the nvarchar(max) column.
/// </summary>
public class PersonalizationNotesData
{
    public List<string> EmphasisAreas { get; init; } = [];
    public List<string> Constraints { get; init; } = [];
    public List<string> L1Notes { get; init; } = [];
}
