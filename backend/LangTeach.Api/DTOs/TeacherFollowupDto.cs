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
    string? SourceSessionLogId,
    string Kind);

public record CreateTeacherFollowupRequest(
    [Required]
    [MaxLength(500)]
    [RegularExpression(@".*\S.*", ErrorMessage = "Text cannot be blank.")]
    string Text,
    Guid? StudentId,
    DateOnly? DueDate,
    Guid? SourceSessionLogId,
    [RegularExpression("^(pedagogical|operational)$",
        ErrorMessage = "Kind must be 'pedagogical' or 'operational'.")]
    string? Kind = null);

public record UpdateTeacherFollowupRequest(
    [Required]
    [RegularExpression("^(pending|done|covered|dismissed)$",
        ErrorMessage = "Status must be 'pending', 'done', 'covered', or 'dismissed'.")]
    string Status);
