using LangTeach.Api.Data.Models;

namespace LangTeach.Api.DTOs;

public record StudyLessonDto(
    Guid Id,
    string Title,
    string Language,
    string CefrLevel,
    string Topic,
    IReadOnlyList<StudySectionDto> Sections);

public record StudySectionDto(
    Guid Id,
    string SectionType,
    int OrderIndex,
    string? Notes,
    IReadOnlyList<StudyBlockDto> Blocks);

public record StudyBlockDto(
    Guid Id,
    ContentBlockType BlockType,
    object? ParsedContent,
    string DisplayContent);
