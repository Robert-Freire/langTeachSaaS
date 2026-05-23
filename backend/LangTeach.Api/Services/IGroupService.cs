using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface IGroupService
{
    Task<PagedResult<GroupDto>> ListAsync(Guid teacherId, GroupListQuery query, CancellationToken ct = default);
    Task<GroupDto?> GetByIdAsync(Guid teacherId, Guid groupId, CancellationToken ct = default);
    Task<GroupDto> CreateAsync(Guid teacherId, CreateGroupRequest request, CancellationToken ct = default);
    Task<GroupDto?> UpdateAsync(Guid teacherId, Guid groupId, UpdateGroupRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid teacherId, Guid groupId, CancellationToken ct = default);
    Task<GroupDto?> AddMemberAsync(Guid teacherId, Guid groupId, Guid studentId, CancellationToken ct = default);
    Task<GroupDto?> RemoveMemberAsync(Guid teacherId, Guid groupId, Guid studentId, CancellationToken ct = default);
    Task<GroupTeachingIdeaDto?> AppendTeachingIdeaAsync(Guid teacherId, Guid groupId, string text, CancellationToken ct = default);
    Task<GroupDto?> PatchTeachingNotesAsync(Guid teacherId, Guid groupId, string? notes, CancellationToken ct = default);
    Task<List<GroupSummaryDto>> GetGroupsForStudentAsync(Guid teacherId, Guid studentId, CancellationToken ct = default);
}
