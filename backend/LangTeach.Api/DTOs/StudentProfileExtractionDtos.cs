using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class ExtractStudentProfileRequest
{
    [Required, MaxLength(10000)]
    public string Text { get; set; } = string.Empty;
}

// All fields nullable/empty by design — extraction is best-effort.
public record ExtractedStudentProfileDto(
    string? Name,
    int? BirthYear,
    string? Profession,
    string? CountryOfResidence,
    string? CityOfResidence,
    string? ReasonForStudying,
    List<string> NativeLanguages,
    List<string> SpokenLanguages,
    string? CefrLevel,
    string? OfficialCefrLevel,
    List<ExtractedObjectiveDto> ShortTermObjectives,
    List<ExtractedDifficultyDto> Difficulties,
    List<string> TeachingTodoTexts,
    List<string> Interests
);

public record ExtractedObjectiveDto(string Text, string? TargetDate);

public record ExtractedDifficultyDto(string Description, string Competency, string Subcategory);
