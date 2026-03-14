using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface IStudentService
{
    Task<PagedResult<StudentDto>> ListAsync(Guid teacherId, StudentListQuery query);
    Task<StudentDto?> GetByIdAsync(Guid teacherId, Guid studentId);
    Task<StudentDto> CreateAsync(Guid teacherId, CreateStudentRequest request);
    Task<StudentDto?> UpdateAsync(Guid teacherId, Guid studentId, UpdateStudentRequest request);
    Task<bool> DeleteAsync(Guid teacherId, Guid studentId);
}
