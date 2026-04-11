using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public record TeacherFollowupDto(
    string Id,
    string? StudentId,
    string? StudentName,
    string Text,
    string Status,
    DateTime CreatedAt,
    DateOnly? DueDate,
    DateTime? CompletedAt,
    string? SourceSessionLogId);

public record CreateTeacherFollowupRequest(
    [MaxLength(500)] string Text,
    Guid? StudentId,
    DateOnly? DueDate,
    Guid? SourceSessionLogId);

public record UpdateTeacherFollowupRequest(
    [Required]
    [RegularExpression("^(pending|done)$", ErrorMessage = "Status must be 'pending' or 'done'.")]
    string Status);
