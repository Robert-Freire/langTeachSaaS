using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface IStudentProfileExtractionService
{
    Task<ExtractedStudentProfileDto> ExtractAsync(string text, CancellationToken ct = default);
}
