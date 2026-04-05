namespace LangTeach.Api.Data.Models;

/// <summary>
/// Structured form of CurriculumEntry.ContextDescription.
/// Stored as JSON in the nvarchar(max) column.
/// </summary>
public record ContextDescriptionData(
    string Setting,
    string Scenario
);

/// <summary>
/// Structured form of CurriculumEntry.PersonalizationNotes.
/// Stored as JSON in the nvarchar(max) column.
/// </summary>
public record PersonalizationNotesData(
    List<string> EmphasisAreas,
    List<string> Constraints,
    List<string> L1Notes
);
