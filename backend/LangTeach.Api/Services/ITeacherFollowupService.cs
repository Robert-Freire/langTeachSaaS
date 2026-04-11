using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface ITeacherFollowupService
{
    Task<List<TeacherFollowupDto>> GetAllAsync(Guid teacherId, CancellationToken cancellationToken);
    Task<List<TeacherFollowupDto>> GetByStudentAsync(Guid teacherId, Guid studentId, CancellationToken cancellationToken);
    Task<TeacherFollowupDto> CreateAsync(Guid teacherId, CreateTeacherFollowupRequest request, CancellationToken cancellationToken);
    Task<TeacherFollowupDto?> UpdateStatusAsync(Guid teacherId, Guid followupId, UpdateTeacherFollowupRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid teacherId, Guid followupId, CancellationToken cancellationToken);
}
