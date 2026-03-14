namespace LangTeach.Api.DTOs;

public record ProfileDto(
    Guid Id,
    string DisplayName,
    List<string> TeachingLanguages,
    List<string> CefrLevels,
    string PreferredStyle
);
