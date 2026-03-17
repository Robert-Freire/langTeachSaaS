using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface ILessonNoteService
{
    Task<LessonNotesDto?> GetByLessonIdAsync(Guid teacherId, Guid lessonId, CancellationToken cancellationToken = default);
    Task<LessonNotesDto> UpsertAsync(Guid teacherId, Guid lessonId, SaveLessonNotesRequest request, CancellationToken cancellationToken = default);
    Task<List<LessonHistoryEntryDto>> GetLessonHistoryAsync(Guid teacherId, Guid studentId, CancellationToken cancellationToken = default);
}
