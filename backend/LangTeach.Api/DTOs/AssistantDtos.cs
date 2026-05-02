using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace LangTeach.Api.DTOs;

public class AssistantProposeRequest
{
    [Required, MaxLength(5000)]
    public string Text { get; set; } = "";

    public Guid? StudentId { get; set; }
    public Guid? SessionId { get; set; }
}

// Payload carries structured data for compound or append proposal types.
// Scalar replace proposals leave Payload null.
// Action is "replace" (default) or "append".
public record ProposalDto(
    string Id,
    string Type,
    string Field,
    string Label,
    string? OldValue,
    string NewValue,
    JsonElement? Payload = null,
    string Action = "replace"
);

public record AssistantProposeResponse(List<ProposalDto> Proposals);

public class PatchStudentRequest
{
    [RegularExpression(@"^(A1|A2|B1|B2|C1|C2)$", ErrorMessage = "CefrLevel must be one of: A1, A2, B1, B2, C1, C2.")]
    public string? CefrLevel { get; set; }

    [MaxLength(128)]
    public string? Profession { get; set; }

    [MaxLength(64)]
    public string? CountryOfResidence { get; set; }
}

public class PatchStudentProfileRequest
{
    public List<string>? AppendInterests { get; set; }
    public List<AppendDifficultyItem>? AppendDifficulties { get; set; }
    public List<string>? ReplaceLearningGoals { get; set; }
    public string? AppendTeachingNotes { get; set; }
}

public class AppendDifficultyItem
{
    public string Description { get; set; } = "";
    public string Competency { get; set; } = "";
    public string Subcategory { get; set; } = "";
}

public class PatchSessionRequest
{
    [MaxLength(120)]
    public string? Title { get; set; }

    [MaxLength(5000)]
    public string? ActualContent { get; set; }

    [MaxLength(5000)]
    public string? GeneralNotes { get; set; }

    [MaxLength(2000)]
    public string? HomeworkAssigned { get; set; }
}
