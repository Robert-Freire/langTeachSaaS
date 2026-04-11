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
    [Required]
    [MaxLength(500)]
    [RegularExpression(@".*\S.*", ErrorMessage = "Text cannot be blank.")]
    string Text,
    Guid? StudentId,
    DateOnly? DueDate,
    Guid? SourceSessionLogId);

public record UpdateTeacherFollowupRequest(
    [Required]
    [RegularExpression("^(pending|done)$", ErrorMessage = "Status must be 'pending' or 'done'.")]
    string Status);
