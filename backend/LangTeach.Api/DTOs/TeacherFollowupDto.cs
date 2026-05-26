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
    string Kind,
    string? GroupId = null);

public record CreateTeacherFollowupRequest(
    [Required]
    [MaxLength(500)]
    [RegularExpression(@".*\S.*", ErrorMessage = "Text cannot be blank.")]
    string Text,
    Guid? StudentId,
    DateOnly? DueDate,
    Guid? SourceSessionLogId,
    // Allowed values defined in TeacherFollowupKinds; regex must stay as a string literal for attributes
    [MinLength(1, ErrorMessage = "Kind must be 'pedagogical', 'operational', or 'objective'.")]
    [RegularExpression("^(pedagogical|operational|objective)$",
        ErrorMessage = "Kind must be 'pedagogical', 'operational', or 'objective'.")]
    string? Kind = null,
    Guid? GroupId = null);

public record UpdateTeacherFollowupRequest(
    [Required]
    // Allowed values defined in TeacherFollowupStatuses; regex must stay as string literal for attributes
    [RegularExpression("^(pending|done|covered|dismissed)$",
        ErrorMessage = "Status must be 'pending', 'done', 'covered', or 'dismissed'.")]
    string Status);
