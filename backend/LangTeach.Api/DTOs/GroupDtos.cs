using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public record GroupDto(
    Guid Id,
    Guid TeacherId,
    string Name,
    string? CefrLevel,
    string? Description,
    int MemberCount,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<StudentSummaryDto>? Members
);

public class CreateGroupRequest
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(10)]
    public string? CefrLevel { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;
}

public class UpdateGroupRequest
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(10)]
    public string? CefrLevel { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    public bool IsActive { get; set; }
}

public class AddGroupMemberRequest
{
    [Required]
    public Guid StudentId { get; set; }
}

public class GroupListQuery
{
    public string? Search { get; set; }
    public string? CefrLevel { get; set; }
    public bool IncludeInactive { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
