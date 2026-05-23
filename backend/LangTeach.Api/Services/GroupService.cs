using System.ComponentModel.DataAnnotations;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class GroupService : IGroupService
{
    private readonly AppDbContext _db;
    private readonly ILogger<GroupService> _logger;

    private static readonly HashSet<string> ValidCefrLevels =
        new(CefrConstants.AllLevels, StringComparer.OrdinalIgnoreCase);

    public GroupService(AppDbContext db, ILogger<GroupService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<PagedResult<GroupDto>> ListAsync(Guid teacherId, GroupListQuery query, CancellationToken ct = default)
    {
        var page = Math.Max(query.Page, 1);
        var pageSize = query.PageSize <= 0 ? 20 : Math.Min(query.PageSize, 100);

        var q = _db.Groups.Where(g => g.TeacherId == teacherId && !g.IsDeleted);

        if (!query.IncludeInactive)
            q = q.Where(g => g.IsActive);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            q = q.Where(g => g.Name.Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(query.CefrLevel))
            q = q.Where(g => g.CefrLevel == query.CefrLevel);

        var totalCount = await q.CountAsync(ct);
        var now = DateTime.UtcNow;

        var rows = await q
            .OrderBy(g => g.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(g => new
            {
                Group = g,
                MemberCount = g.StudentGroups.Count(sg => !sg.Student.IsDeleted),
                MemberPreview = g.StudentGroups
                    .Where(sg => !sg.Student.IsDeleted)
                    .OrderBy(sg => sg.Student.Name)
                    .Take(4)
                    .Select(sg => new StudentSummaryDto(sg.Student.Id, sg.Student.Name, sg.Student.CefrLevel))
                    .ToList(),
                // Lifecycle filters mirror DashboardService active-students projection
                // (LastSession excludes soft-deleted; NextSession also excludes cancelled
                // and unconfirmed drafts).
                LastSessionDate = (DateTime?)g.SessionLogs
                    .Where(sl => !sl.IsDeleted && sl.SessionDate != null && sl.SessionDate < now)
                    .Max(sl => sl.SessionDate),
                NextSessionDate = (DateTime?)g.SessionLogs
                    .Where(sl => !sl.IsDeleted
                              && !sl.IsCancelled
                              && sl.Status == SessionLogStatus.Confirmed
                              && sl.SessionDate != null
                              && sl.SessionDate >= now)
                    .Min(sl => sl.SessionDate),
            })
            .ToListAsync(ct);

        var items = rows
            .Select(r => MapToDto(
                r.Group,
                r.MemberCount,
                members: null,
                memberPreview: r.MemberPreview,
                lastSessionDate: r.LastSessionDate,
                nextSessionDate: r.NextSessionDate))
            .ToList();

        return new PagedResult<GroupDto>(items, totalCount, page, pageSize);
    }

    public async Task<GroupDto?> GetByIdAsync(Guid teacherId, Guid groupId, CancellationToken ct = default)
    {
        var group = await _db.Groups
            .Where(g => g.Id == groupId && g.TeacherId == teacherId && !g.IsDeleted)
            .FirstOrDefaultAsync(ct);

        if (group is null) return null;

        var members = await _db.StudentGroups
            .Where(sg => sg.GroupId == groupId)
            .Join(_db.Students.Where(s => !s.IsDeleted),
                  sg => sg.StudentId,
                  s => s.Id,
                  (_, s) => new StudentSummaryDto(s.Id, s.Name, s.CefrLevel))
            .OrderBy(s => s.Name)
            .ToListAsync(ct);

        return MapToDto(group, members.Count, members);
    }

    public async Task<GroupDto> CreateAsync(Guid teacherId, CreateGroupRequest request, CancellationToken ct = default)
    {
        ValidateCefr(request.CefrLevel);

        var now = DateTime.UtcNow;
        var group = new Group
        {
            Id = Guid.NewGuid(),
            TeacherId = teacherId,
            Name = request.Name.Trim(),
            CefrLevel = string.IsNullOrWhiteSpace(request.CefrLevel) ? null : request.CefrLevel,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description,
            IsActive = request.IsActive,
            IsDeleted = false,
            CreatedAt = now,
            UpdatedAt = now,
        };

        _db.Groups.Add(group);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Group created. TeacherId={TeacherId} GroupId={GroupId}", teacherId, group.Id);

        return MapToDto(group, memberCount: 0, members: []);
    }

    public async Task<GroupDto?> UpdateAsync(Guid teacherId, Guid groupId, UpdateGroupRequest request, CancellationToken ct = default)
    {
        ValidateCefr(request.CefrLevel);

        var group = await _db.Groups
            .FirstOrDefaultAsync(g => g.Id == groupId && g.TeacherId == teacherId && !g.IsDeleted, ct);

        if (group is null) return null;

        group.Name = request.Name.Trim();
        group.CefrLevel = string.IsNullOrWhiteSpace(request.CefrLevel) ? null : request.CefrLevel;
        group.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description;
        group.IsActive = request.IsActive;
        group.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        var memberCount = await _db.StudentGroups.CountAsync(sg => sg.GroupId == groupId, ct);
        return MapToDto(group, memberCount, members: null);
    }

    public async Task<bool> DeleteAsync(Guid teacherId, Guid groupId, CancellationToken ct = default)
    {
        var group = await _db.Groups
            .FirstOrDefaultAsync(g => g.Id == groupId && g.TeacherId == teacherId && !g.IsDeleted, ct);

        if (group is null) return false;

        group.IsDeleted = true;
        group.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Group soft-deleted. GroupId={GroupId}", groupId);
        return true;
    }

    public async Task<GroupDto?> AddMemberAsync(Guid teacherId, Guid groupId, Guid studentId, CancellationToken ct = default)
    {
        var group = await _db.Groups
            .FirstOrDefaultAsync(g => g.Id == groupId && g.TeacherId == teacherId && !g.IsDeleted, ct);

        if (group is null) return null;

        var studentBelongs = await _db.Students
            .AnyAsync(s => s.Id == studentId && s.TeacherId == teacherId && !s.IsDeleted, ct);

        if (!studentBelongs)
            throw new ValidationException("Student does not belong to this teacher or has been deleted.");

        var alreadyMember = await _db.StudentGroups
            .AnyAsync(sg => sg.GroupId == groupId && sg.StudentId == studentId, ct);

        if (!alreadyMember)
        {
            _db.StudentGroups.Add(new StudentGroup
            {
                StudentId = studentId,
                GroupId = groupId,
                CreatedAt = DateTime.UtcNow,
            });
            try
            {
                await _db.SaveChangesAsync(ct);
                _logger.LogInformation("Student {StudentId} added to Group {GroupId}", studentId, groupId);
            }
            catch (DbUpdateException ex) when (IsCompositePkViolation(ex))
            {
                // Race: a concurrent AddMember inserted the same (StudentId, GroupId) row.
                // Composite PK violation -- treat as idempotent success.
                _logger.LogInformation("Concurrent add-member race for Student {StudentId}/Group {GroupId} resolved as idempotent.", studentId, groupId);
            }
        }

        return await GetByIdAsync(teacherId, groupId, ct);
    }

    public async Task<GroupDto?> RemoveMemberAsync(Guid teacherId, Guid groupId, Guid studentId, CancellationToken ct = default)
    {
        var group = await _db.Groups
            .FirstOrDefaultAsync(g => g.Id == groupId && g.TeacherId == teacherId && !g.IsDeleted, ct);

        if (group is null) return null;

        var membership = await _db.StudentGroups
            .FirstOrDefaultAsync(sg => sg.GroupId == groupId && sg.StudentId == studentId, ct);

        if (membership is not null)
        {
            _db.StudentGroups.Remove(membership);
            await _db.SaveChangesAsync(ct);
            _logger.LogInformation("Student {StudentId} removed from Group {GroupId}", studentId, groupId);
        }

        return await GetByIdAsync(teacherId, groupId, ct);
    }

    // SQL Server unique-key/PK violation error numbers.
    private static bool IsCompositePkViolation(DbUpdateException ex) =>
        ex.InnerException is Microsoft.Data.SqlClient.SqlException sql &&
        (sql.Number == 2627 || sql.Number == 2601);

    private static void ValidateCefr(string? cefr)
    {
        if (cefr is not null && !ValidCefrLevels.Contains(cefr))
            throw new ValidationException(
                $"Invalid CefrLevel '{cefr}'. Allowed: {string.Join(", ", CefrConstants.AllLevels)}.");
    }

    private static GroupDto MapToDto(
        Group g,
        int memberCount,
        List<StudentSummaryDto>? members,
        List<StudentSummaryDto>? memberPreview = null,
        DateTime? lastSessionDate = null,
        DateTime? nextSessionDate = null) => new(
        g.Id,
        g.TeacherId,
        g.Name,
        g.CefrLevel,
        g.Description,
        memberCount,
        g.IsActive,
        g.CreatedAt,
        g.UpdatedAt,
        members,
        memberPreview,
        lastSessionDate,
        nextSessionDate
    );
}
