namespace LangTeach.Api.DTOs;

public record TeachingTodoDto(
    string Id,
    string Text,
    DateTime CreatedAt,
    string? SourceSessionLogId,
    string Status,
    string? CoveredInSessionLogId);

public record CreateTeachingTodoDto(string Text, string? SourceSessionLogId);

public record UpdateTeachingTodoDto(string Status, string? CoveredInSessionLogId);
