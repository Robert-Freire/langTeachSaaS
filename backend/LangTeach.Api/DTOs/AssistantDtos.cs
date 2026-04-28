using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class AssistantProposeRequest
{
    [Required, MaxLength(5000)]
    public string Text { get; set; } = "";

    public Guid? StudentId { get; set; }
    public Guid? SessionId { get; set; }
}

public record ProposalDto(
    string Id,
    string Type,
    string Field,
    string Label,
    string? OldValue,
    string NewValue
);

public record AssistantProposeResponse(List<ProposalDto> Proposals);
