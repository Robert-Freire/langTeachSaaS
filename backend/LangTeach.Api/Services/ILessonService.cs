using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface ILessonService
{
    Task<PagedResult<LessonDto>> ListAsync(Guid teacherId, LessonListQuery query, CancellationToken cancellationToken = default);
    Task<LessonDto?> GetByIdAsync(Guid teacherId, Guid lessonId, CancellationToken cancellationToken = default);
    Task<LessonDto?> CreateAsync(Guid teacherId, CreateLessonRequest request, CancellationToken cancellationToken = default);
    Task<LessonUpdateResult> UpdateAsync(Guid teacherId, Guid lessonId, UpdateLessonRequest request, CancellationToken cancellationToken = default);
    Task<LessonDto?> UpdateSectionsAsync(Guid teacherId, Guid lessonId, UpdateLessonSectionsRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid teacherId, Guid lessonId, CancellationToken cancellationToken = default);
    Task<LessonDto?> DuplicateAsync(Guid teacherId, Guid lessonId, CancellationToken cancellationToken = default);
    Task<LessonDto?> UpdateLearningTargetsAsync(Guid teacherId, Guid lessonId, string[]? labels, CancellationToken cancellationToken = default);
    Task EnsureLearningTargetsAsync(Lesson lesson, CancellationToken cancellationToken = default);
}
