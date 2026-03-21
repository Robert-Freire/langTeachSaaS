namespace LangTeach.Api.DTOs;

public record LessonSectionDto(
    Guid Id,
    string SectionType,
    int OrderIndex,
    string? Notes,
    List<MaterialDto> Materials
);
