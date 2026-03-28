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
}
