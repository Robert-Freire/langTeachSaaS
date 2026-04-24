using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public record TeachingTodoDto(
    string Id,
    string Text,
    DateTime CreatedAt,
    string? SourceSessionLogId,
    string Status,
    string? CoveredInSessionLogId);

public record CreateTeachingTodoDto(
    [MaxLength(500)] string Text,
    string? SourceSessionLogId);

public record UpdateTeachingTodoDto(
    [Required]
    // Allowed values defined in TeacherFollowupStatuses; regex must stay as string literal for attributes
    [RegularExpression("^(pending|done|covered|dismissed)$",
        ErrorMessage = "Status must be 'pending', 'done', 'covered', or 'dismissed'.")]
    string Status,
    string? CoveredInSessionLogId,
    [MaxLength(500)] string? Text);
