using LangTeach.Api.AI;
using LangTeach.Api.Data.Models;

namespace LangTeach.Api.DTOs;

public record ContentBlockDto(
    Guid Id,
    Guid? LessonSectionId,
    ContentBlockType BlockType,
    string GeneratedContent,
    string? EditedContent,
    bool IsEdited,
    string? GenerationParams,
    object? ParsedContent,
    DateTime CreatedAt,
    GrammarWarning[]? GrammarWarnings = null);
