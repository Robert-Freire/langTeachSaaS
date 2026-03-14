using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public record UpdateProfileRequest(
    [Required][MaxLength(100)] string DisplayName,
    [Required] List<string> TeachingLanguages,
    [Required] List<string> CefrLevels,
    [Required] string PreferredStyle
);
