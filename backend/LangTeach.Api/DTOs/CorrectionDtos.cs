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
    DateTime? CorrectedAt,
    string? SourceImageUrl = null);

public class CreateCorrectionRequest
{
    [MaxLength(200)]
    public string? AssignmentTitle { get; set; }

    [MaxLength(2000)]
    public string? AssignmentPrompt { get; set; }

    [MaxLength(StudentTextMaxLength)]
    public string? StudentText { get; set; }

    [MaxLength(2048)]
    public string? SourceImageUrl { get; set; }

    public const int StudentTextMaxLength = 10_000;
}

public class UpdateCorrectionRequest
{
    // PATCH semantics: only non-null fields are applied.
    [MaxLength(200)]
    public string? AssignmentTitle { get; set; }

    [MaxLength(2000)]
    public string? AssignmentPrompt { get; set; }

    [MaxLength(CreateCorrectionRequest.StudentTextMaxLength)]
    public string? StudentText { get; set; }
}

public class CorrectionFeedbackRequest
{
    [Required, RegularExpression("^(up|down)$", ErrorMessage = "Rating must be 'up' or 'down'.")]
    public string Rating { get; set; } = "";

    [MaxLength(2000)]
    public string? Reason { get; set; }
}
