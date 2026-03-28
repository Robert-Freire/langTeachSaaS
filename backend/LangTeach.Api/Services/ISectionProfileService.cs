using LangTeach.Api.AI;

namespace LangTeach.Api.Services;

public interface ISectionProfileService
{
    /// <summary>
    /// Returns the guidance string for a section at the given CEFR level.
    /// Returns an empty string if the section or level is not found.
    /// </summary>
    string GetGuidance(string sectionType, string cefrLevel);

    /// <summary>
    /// Returns true if the content type is allowed for the given section at the given CEFR level.
    /// Checks only the specific level's contentTypes array.
    /// Returns true for unknown sections (permissive for forward compatibility).
    /// </summary>
    bool IsAllowed(string sectionType, string contentType, string cefrLevel);

    /// <summary>
    /// Returns the allowed content types for a section at the given CEFR level.
    /// Returns an empty array if the section or level is not found.
    /// </summary>
    string[] GetAllowedContentTypes(string sectionType, string cefrLevel);

    /// <summary>
    /// Returns the valid exercise type IDs for a section at the given CEFR level.
    /// Returns null if the section or level is not found (no filter defined).
    /// Used by PedagogyConfigService for composition.
    /// </summary>
    string[]? GetRawValidExerciseTypes(string sectionType, string cefrLevel);

    /// <summary>
    /// Returns the raw ForbiddenExerciseType entries for a section at the given CEFR level.
    /// Patterns (e.g. "GR-*") are returned unexpanded. Returns empty if not found.
    /// Used by PedagogyConfigService for pattern expansion and composition.
    /// </summary>
    ForbiddenExerciseType[] GetRawForbiddenExerciseTypes(string sectionType, string cefrLevel);

    /// <summary>
    /// Returns the duration range for a section at the given CEFR level.
    /// Returns null if the section, level, or duration field is not found.
    /// </summary>
    DurationRange? GetDuration(string sectionType, string cefrLevel);

    /// <summary>
    /// Returns the scope value for a section at the given CEFR level.
    /// Returns null if the scope field is not set in the section profile (caller defaults to "full").
    /// </summary>
    string? GetScope(string sectionType, string cefrLevel);
}
