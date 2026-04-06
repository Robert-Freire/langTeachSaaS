using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface IReplanSuggestionService
{
    Task<List<CourseSuggestionDto>> GenerateSuggestionsAsync(Guid courseId, Guid teacherId, CancellationToken ct = default);
    Task<List<CourseSuggestionDto>> GetSuggestionsAsync(Guid courseId, Guid teacherId, CancellationToken ct = default);
    Task<CourseSuggestionDto?> RespondAsync(Guid courseId, Guid suggestionId, Guid teacherId, string action, string? teacherEdit, CancellationToken ct = default);
}
