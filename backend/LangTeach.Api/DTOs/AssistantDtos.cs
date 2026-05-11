using LangTeach.Api.Services;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace LangTeach.Api.DTOs;

public class AssistantProposeRequest
{
    [Required, MaxLength(5000)]
    public string Text { get; set; } = "";

    public Guid? StudentId { get; set; }
    public Guid? SessionId { get; set; }
    public Guid? VoiceNoteId { get; set; }
}

public class AssistantFeedbackRequest
{
    [Required, RegularExpression("^(up|down)$", ErrorMessage = "Rating must be 'up' or 'down'.")]
    public string Rating { get; set; } = "";

    [MaxLength(2000)]
    public string? Reason { get; set; }

    public Guid? StudentId { get; set; }
    public Guid? SessionLogId { get; set; }

    [Required]
    public string ProposalsJson { get; set; } = "";
}

// Payload carries structured data for compound or append proposal types.
// Scalar replace proposals leave Payload null.
// Action is "replace" (default) or "append".
// NewStudentPayload is set only for Type == "newStudent"; Payload is null in that case.
public record ProposalDto(
    string Id,
    string Type,
    string Field,
    string Label,
    string? OldValue,
    string NewValue,
    JsonElement? Payload = null,
    string Action = "replace",
    JsonElement? NewStudentPayload = null
);

public record AssistantProposeResponse(List<ProposalDto> Proposals, Guid? VoiceNoteId = null, Guid? SessionLogId = null, string? ExtractedSessionDate = null);

public class PatchStudentRequest
{
    [RegularExpression(CefrConstants.ValidationPattern, ErrorMessage = "CefrLevel must be one of: A1, A2, B1, B2, C1, C2.")]
    public string? CefrLevel { get; set; }

    [MaxLength(128)]
    public string? Profession { get; set; }

    [MaxLength(64)]
    public string? CountryOfResidence { get; set; }

    [MaxLength(10)]
    public string? SkillLevelReading { get; set; }

    [MaxLength(10)]
    public string? SkillLevelWriting { get; set; }

    [MaxLength(10)]
    public string? SkillLevelSpeaking { get; set; }

    [MaxLength(10)]
    public string? SkillLevelListening { get; set; }

    // Voice-update path fields (replace semantics when non-null)
    [RegularExpression(CefrConstants.ValidationPattern, ErrorMessage = "OfficialCefrLevel must be one of: A1, A2, B1, B2, C1, C2.")]
    public string? OfficialCefrLevel { get; set; }

    [MaxLength(500)]
    public string? ReasonForStudying { get; set; }

    public int? BirthYear { get; set; }

    [MaxLength(64)]
    public string? CityOfResidence { get; set; }

    public List<string>? NativeLanguages { get; set; }
    public List<string>? SpokenLanguages { get; set; }
    public List<string>? Interests { get; set; }
    public List<ShortTermObjectiveDto>? ShortTermObjectives { get; set; }
    public List<DifficultyDto>? Difficulties { get; set; }
    public List<TeachingTodoDto>? TeachingTodos { get; set; }
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
