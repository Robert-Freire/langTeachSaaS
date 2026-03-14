using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface ILessonService
{
    Task<PagedResult<LessonDto>> ListAsync(Guid teacherId, LessonListQuery query);
    Task<LessonDto?> GetByIdAsync(Guid teacherId, Guid lessonId);
    Task<LessonDto?> CreateAsync(Guid teacherId, CreateLessonRequest request);
    Task<LessonUpdateResult> UpdateAsync(Guid teacherId, Guid lessonId, UpdateLessonRequest request);
    Task<LessonDto?> UpdateSectionsAsync(Guid teacherId, Guid lessonId, UpdateLessonSectionsRequest request);
    Task<bool> DeleteAsync(Guid teacherId, Guid lessonId);
    Task<LessonDto?> DuplicateAsync(Guid teacherId, Guid lessonId);
}
