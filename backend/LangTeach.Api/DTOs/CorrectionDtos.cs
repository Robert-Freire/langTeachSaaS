using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public record CorrectionSummaryDto(
    Guid Id,
    string AssignmentTitle,
    string Status,
    DateTime CreatedAt,
    DateTime? CorrectedAt);

public record CorrectionTagDto(
    string Category,
    string SpannedText,
    int StartIndex,
    int EndIndex,
    string? Explanation,
    string? CorrectedForm,
    int OrderIndex);

public record CorrectionDetailDto(
    Guid Id,
    Guid StudentId,
    int SchemaVersion,
    string Status,
    string AssignmentTitle,
    string? AssignmentPrompt,
    string? StudentText,
    string? MarkedUpOutput,
    IReadOnlyList<CorrectionTagDto> Tags,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? CorrectedAt);

public class CreateCorrectionRequest
{
    [MaxLength(200)]
    public string? AssignmentTitle { get; set; }

    [MaxLength(2000)]
    public string? AssignmentPrompt { get; set; }

    public string? StudentText { get; set; }
}

public class UpdateCorrectionRequest
{
    // PATCH semantics: only non-null fields are applied.
    [MaxLength(200)]
    public string? AssignmentTitle { get; set; }

    [MaxLength(2000)]
    public string? AssignmentPrompt { get; set; }

    public string? StudentText { get; set; }
}
