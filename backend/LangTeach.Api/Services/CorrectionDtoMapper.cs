using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

/// <summary>
/// Shared Correction → CorrectionDetailDto mapping. Used by CorrectionService
/// (CRUD lifecycle) and RedaccionCorrectionService (post-generation read-back).
/// </summary>
internal static class CorrectionDtoMapper
{
    public static CorrectionDetailDto ToDetail(Correction c, IEnumerable<CorrectionTag> tags) =>
        new(
            c.Id,
            c.StudentId,
            c.SchemaVersion,
            c.Status,
            c.AssignmentTitle,
            c.AssignmentPrompt,
            c.StudentText,
            c.MarkedUpOutput,
            tags.OrderBy(t => t.OrderIndex)
                .Select(t => new CorrectionTagDto(
                    t.Category, t.SpannedText, t.StartIndex, t.EndIndex,
                    t.Explanation, t.CorrectedForm, t.OrderIndex))
                .ToList(),
            c.CreatedAt,
            c.UpdatedAt,
            c.CorrectedAt,
            SourceImageUrl: c.SourceImageUrl);
}
