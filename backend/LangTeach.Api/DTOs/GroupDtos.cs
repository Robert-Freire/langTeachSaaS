using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public record GroupSummaryDto(Guid Id, string Name, string? CefrLevel);

public record GroupTeachingIdeaDto(
    Guid Id,
    string Text,
    string Status,
    DateTime CreatedAt
);

public record CreateGroupTeachingIdeaRequest(
    [Required, MinLength(1), MaxLength(500)] string Text
);

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
    List<StudentSummaryDto>? Members,
    List<StudentSummaryDto>? MemberPreview = null,
    DateTime? LastSessionDate = null,
    DateTime? NextSessionDate = null,
    List<GroupTeachingIdeaDto>? TeachingIdeas = null,
    string? TeachingNotes = null,
    string? ReasonForStudying = null,
    string? Interests = null,
    string? CommonFocusAreas = null
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

    [MaxLength(500)]
    public string? ReasonForStudying { get; set; }

    public string? Interests { get; set; }

    public string? CommonFocusAreas { get; set; }
}

/// <remarks>
/// Full-replace semantics: every field must be included in the request body.
/// Omitted nullable fields are set to null; omitted IsActive defaults to false
/// per .NET model binding (clients must send IsActive explicitly).
/// </remarks>
public class UpdateGroupRequest
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(10)]
    public string? CefrLevel { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    public bool IsActive { get; set; }

    [MaxLength(500)]
    public string? ReasonForStudying { get; set; }

    public string? Interests { get; set; }

    public string? CommonFocusAreas { get; set; }
}

public class AddGroupMemberRequest
{
    [Required]
    public Guid StudentId { get; set; }
}

public class PatchGroupTeachingNotesRequest
{
    public string? TeachingNotes { get; set; }
}

public class GroupListQuery
{
    public string? Search { get; set; }
    public string? CefrLevel { get; set; }
    public bool IncludeInactive { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}
