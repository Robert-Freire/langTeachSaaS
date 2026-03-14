using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface IStudentService
{
    Task<PagedResult<StudentDto>> ListAsync(Guid teacherId, StudentListQuery query, CancellationToken cancellationToken = default);
    Task<StudentDto?> GetByIdAsync(Guid teacherId, Guid studentId, CancellationToken cancellationToken = default);
    Task<StudentDto> CreateAsync(Guid teacherId, CreateStudentRequest request, CancellationToken cancellationToken = default);
    Task<StudentDto?> UpdateAsync(Guid teacherId, Guid studentId, UpdateStudentRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid teacherId, Guid studentId, CancellationToken cancellationToken = default);
}
