using LangTeach.Api.AI;
using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public enum ReorderResult { Success, CourseNotFound, InvalidEntryIds }

public interface ICourseService
{
    Task<IReadOnlyList<CourseSummaryDto>> ListAsync(Guid teacherId, CancellationToken ct = default);
    Task<CourseDto?> GetByIdAsync(Guid teacherId, Guid courseId, CancellationToken ct = default);

    /// <summary>Throws ValidationException for bad input. Propagates CurriculumGenerationException / JsonException on AI failure.</summary>
    Task<(CourseDto dto, List<CurriculumWarning> warnings)> CreateAsync(Guid teacherId, CreateCourseRequest request, CancellationToken ct = default);

    Task<bool> DismissWarningAsync(Guid teacherId, Guid courseId, string warningKey, CancellationToken ct = default);
    Task<bool> UpdateAsync(Guid teacherId, Guid courseId, UpdateCourseRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid teacherId, Guid courseId, CancellationToken ct = default);
    Task<(bool courseFound, CurriculumEntryDto? entry)> AddEntryAsync(Guid teacherId, Guid courseId, AddCurriculumEntryRequest request, CancellationToken ct = default);
    Task<(bool courseFound, bool entryFound)> DeleteEntryAsync(Guid teacherId, Guid courseId, Guid entryId, CancellationToken ct = default);
    Task<ReorderResult> ReorderEntriesAsync(Guid teacherId, Guid courseId, ReorderCurriculumRequest request, CancellationToken ct = default);
    Task<(bool courseFound, CurriculumEntryDto? entry)> UpdateEntryAsync(Guid teacherId, Guid courseId, Guid entryId, UpdateCurriculumEntryRequest request, CancellationToken ct = default);
    Task<Guid?> GenerateLessonFromEntryAsync(Guid teacherId, Guid courseId, Guid entryId, CancellationToken ct = default);
}
