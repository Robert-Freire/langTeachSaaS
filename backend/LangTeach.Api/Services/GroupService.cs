using System.ComponentModel.DataAnnotations;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Helpers;
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
            .Where(sg => sg.GroupId == groupId && !sg.Student.IsDeleted && sg.Student.TeacherId == teacherId)
            .OrderBy(sg => sg.Student.Name)
            .Select(sg => new StudentSummaryDto(sg.Student.Id, sg.Student.Name, sg.Student.CefrLevel))
            .ToListAsync(ct);

        var teachingIdeas = await _db.TeacherFollowups
            .Where(f => f.GroupId == groupId && f.TeacherId == teacherId && f.Kind == TeacherFollowupKinds.Pedagogical)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new GroupTeachingIdeaDto(f.Id, f.Text, f.Status, f.CreatedAt))
            .ToListAsync(ct);

        return MapToDto(group, members.Count, members, teachingIdeas: teachingIdeas);
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
            ReasonForStudying = string.IsNullOrWhiteSpace(request.ReasonForStudying) ? null : request.ReasonForStudying,
            Interests = JsonStorageHelper.Serialize(request.Interests),
            CommonFocusAreas = JsonStorageHelper.Serialize(request.CommonFocusAreas),
            Aliases = JsonStorageHelper.Serialize(NormalizeAliases(request.Aliases)),
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
        group.ReasonForStudying = string.IsNullOrWhiteSpace(request.ReasonForStudying) ? null : request.ReasonForStudying;
        group.Interests = JsonStorageHelper.Serialize(request.Interests);
        group.CommonFocusAreas = JsonStorageHelper.Serialize(request.CommonFocusAreas);
        group.Aliases = JsonStorageHelper.Serialize(request.Aliases);
        group.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        var memberCount = await _db.StudentGroups.CountAsync(sg => sg.GroupId == groupId && !sg.Student.IsDeleted, ct);
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

    // Teaching ideas are stored as TeacherFollowup rows with Kind=Pedagogical and GroupId set (StudentId=null).
    // There is no separate TeachingIdea entity; GroupTeachingIdeaDto is the UI-facing projection.
    public async Task<GroupTeachingIdeaDto?> AppendTeachingIdeaAsync(Guid teacherId, Guid groupId, string text, CancellationToken ct = default)
    {
        var normalizedText = text.Trim();
        if (string.IsNullOrEmpty(normalizedText))
            throw new ValidationException("Teaching idea text is required.");
        if (normalizedText.Length > 500)
            throw new ValidationException("Teaching idea text must be 500 characters or fewer.");

        var exists = await _db.Groups
            .AnyAsync(g => g.Id == groupId && g.TeacherId == teacherId && !g.IsDeleted, ct);

        if (!exists) return null;

        var idea = new TeacherFollowup
        {
            Id = Guid.NewGuid(),
            TeacherId = teacherId,
            GroupId = groupId,
            Text = normalizedText,
            Status = TeacherFollowupStatuses.Pending,
            Kind = TeacherFollowupKinds.Pedagogical,
            CreatedAt = DateTime.UtcNow,
        };

        _db.TeacherFollowups.Add(idea);
        await _db.SaveChangesAsync(ct);

        return new GroupTeachingIdeaDto(idea.Id, idea.Text, idea.Status, idea.CreatedAt);
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

    // Normalize aliases: trim whitespace, drop empties/duplicates, cap per-item length and total count.
    private static List<string> NormalizeAliases(List<string> aliases) =>
        aliases
            .Select(a => a.Trim())
            .Where(a => a.Length > 0)
            .Select(a => a.Length > 100 ? a[..100] : a)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(20)
            .ToList();

    public async Task<GroupDto?> PatchTeachingNotesAsync(Guid teacherId, Guid groupId, string? notes, CancellationToken ct = default)
    {
        var group = await _db.Groups
            .FirstOrDefaultAsync(g => g.Id == groupId && g.TeacherId == teacherId && !g.IsDeleted, ct);

        if (group is null) return null;

        group.TeachingNotes = string.IsNullOrWhiteSpace(notes) ? null : notes;
        group.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        var memberCount = await _db.StudentGroups.CountAsync(sg => sg.GroupId == groupId && !sg.Student.IsDeleted, ct);
        return MapToDto(group, memberCount, members: null);
    }

    private static GroupDto MapToDto(
        Group g,
        int memberCount,
        List<StudentSummaryDto>? members,
        List<StudentSummaryDto>? memberPreview = null,
        DateTime? lastSessionDate = null,
        DateTime? nextSessionDate = null,
        List<GroupTeachingIdeaDto>? teachingIdeas = null) => new(
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
        nextSessionDate,
        teachingIdeas,
        g.TeachingNotes,
        g.ReasonForStudying,
        JsonStorageHelper.DeserializeList<string>(g.Interests),
        JsonStorageHelper.DeserializeList<string>(g.CommonFocusAreas),
        JsonStorageHelper.DeserializeList<string>(g.Aliases)
    );

    public async Task<List<GroupForResolutionDto>> GetAllActiveAsync(Guid teacherId, CancellationToken ct = default)
    {
        var rows = await _db.Groups
            .Where(g => g.TeacherId == teacherId && g.IsActive && !g.IsDeleted)
            .Select(g => new { g.Id, g.Name, g.Aliases, g.CefrLevel })
            .ToListAsync(ct);

        return rows
            .Select(g => new GroupForResolutionDto(
                g.Id,
                g.Name,
                JsonStorageHelper.DeserializeList<string>(g.Aliases),
                g.CefrLevel))
            .ToList();
    }

    public async Task<List<GroupSummaryDto>> GetGroupsForStudentAsync(Guid teacherId, Guid studentId, CancellationToken ct = default)
    {
        return await _db.StudentGroups
            .Where(sg =>
                sg.StudentId == studentId &&
                sg.Student.TeacherId == teacherId &&
                !sg.Student.IsDeleted &&
                sg.Group.TeacherId == teacherId &&
                !sg.Group.IsDeleted)
            .Select(sg => new GroupSummaryDto(sg.Group.Id, sg.Group.Name, sg.Group.CefrLevel))
            .ToListAsync(ct);
    }
}
