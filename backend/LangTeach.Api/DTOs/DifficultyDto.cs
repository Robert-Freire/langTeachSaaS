namespace LangTeach.Api.DTOs;

public record DifficultyDto(
    string Id,
    string Description,
    string Competency,
    string Subcategory,
    string Severity,
    string Trend,
    string Status
);
