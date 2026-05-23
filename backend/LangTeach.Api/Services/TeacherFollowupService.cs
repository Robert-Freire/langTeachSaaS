using System.ComponentModel.DataAnnotations;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class TeacherFollowupService(AppDbContext db) : ITeacherFollowupService
{
    public async Task<List<TeacherFollowupDto>> GetAllAsync(Guid teacherId, CancellationToken cancellationToken)
    {
        return await db.TeacherFollowups
            .Where(f => f.TeacherId == teacherId && f.Kind == TeacherFollowupKinds.Operational)
            .Include(f => f.Student)
            .OrderBy(f => f.CreatedAt)
            .Select(f => ToDto(f, f.Student != null ? f.Student.Name : null))
            .ToListAsync(cancellationToken);
    }

    public async Task<List<TeacherFollowupDto>> GetPendingAsync(Guid teacherId, CancellationToken cancellationToken)
    {
        return await db.TeacherFollowups
            .Where(f => f.TeacherId == teacherId && f.Status == TeacherFollowupStatuses.Pending && f.Kind == TeacherFollowupKinds.Operational)
            .Include(f => f.Student)
            .OrderBy(f => f.CreatedAt)
            .Select(f => ToDto(f, f.Student != null ? f.Student.Name : null))
            .ToListAsync(cancellationToken);
    }

    public async Task<List<TeacherFollowupDto>> GetByStudentAsync(Guid teacherId, Guid studentId, CancellationToken cancellationToken)
    {
        return await db.TeacherFollowups
            .Where(f => f.TeacherId == teacherId && f.StudentId == studentId && f.Kind == TeacherFollowupKinds.Operational)
            .OrderBy(f => f.CreatedAt)
            .Select(f => ToDto(f, null))
            .ToListAsync(cancellationToken);
    }

    public async Task<List<TeacherFollowupDto>> GetByGroupAsync(Guid teacherId, Guid groupId, string? kind, CancellationToken cancellationToken)
    {
        var groupExists = await db.Groups
            .AnyAsync(g => g.Id == groupId && g.TeacherId == teacherId && !g.IsDeleted, cancellationToken);
        if (!groupExists)
            throw new ValidationException("Group not found.");

        var q = db.TeacherFollowups
            .Where(f => f.TeacherId == teacherId && f.GroupId == groupId);
        if (kind is not null)
            q = q.Where(f => f.Kind == kind);

        return await q
            .OrderBy(f => f.CreatedAt)
            .Select(f => ToDto(f, null))
            .ToListAsync(cancellationToken);
    }

    public async Task<TeacherFollowupDto> CreateAsync(Guid teacherId, CreateTeacherFollowupRequest request, CancellationToken cancellationToken)
    {
        if (request.StudentId.HasValue && request.GroupId.HasValue)
            throw new ValidationException("A followup cannot be scoped to both a student and a group.");

        string? studentName = null;
        if (request.StudentId.HasValue)
        {
            studentName = await db.Students
                .Where(s => s.Id == request.StudentId.Value && s.TeacherId == teacherId)
                .Select(s => s.Name)
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw new ValidationException("Student not found.");
        }

        if (request.GroupId.HasValue)
        {
            var groupExists = await db.Groups
                .AnyAsync(g => g.Id == request.GroupId.Value && g.TeacherId == teacherId && !g.IsDeleted, cancellationToken);
            if (!groupExists)
                throw new ValidationException("Group not found.");
        }

        if (request.SourceSessionLogId.HasValue)
        {
            var sessionExists = await db.SessionLogs
                .AnyAsync(sl => sl.Id == request.SourceSessionLogId.Value && sl.TeacherId == teacherId, cancellationToken);
            if (!sessionExists)
                throw new ValidationException("Session log not found.");
        }

        var followup = new TeacherFollowup
        {
            Id = Guid.NewGuid(),
            TeacherId = teacherId,
            StudentId = request.StudentId,
            GroupId = request.GroupId,
            Text = request.Text,
            Status = TeacherFollowupStatuses.Pending,
            Kind = request.Kind ?? TeacherFollowupKinds.Operational,
            CreatedAt = DateTime.UtcNow,
            DueDate = request.DueDate,
            SourceSessionLogId = request.SourceSessionLogId,
        };

        db.TeacherFollowups.Add(followup);
        await db.SaveChangesAsync(cancellationToken);

        return ToDto(followup, studentName);
    }

    public async Task<TeacherFollowupDto?> UpdateStatusAsync(Guid teacherId, Guid followupId, UpdateTeacherFollowupRequest request, CancellationToken cancellationToken)
    {
        var followup = await db.TeacherFollowups
            .Include(f => f.Student)
            .FirstOrDefaultAsync(f => f.Id == followupId && f.TeacherId == teacherId, cancellationToken);

        if (followup is null) return null;

        // .ToLowerInvariant() guards against any title-case values that bypassed DTO validation
        followup.Status = request.Status.ToLowerInvariant();
        followup.CompletedAt = followup.Status is TeacherFollowupStatuses.Done or TeacherFollowupStatuses.Covered ? DateTime.UtcNow : null;

        await db.SaveChangesAsync(cancellationToken);
        return ToDto(followup, followup.Student?.Name);
    }

    public async Task<bool> DeleteAsync(Guid teacherId, Guid followupId, CancellationToken cancellationToken)
    {
        var followup = await db.TeacherFollowups
            .FirstOrDefaultAsync(f => f.Id == followupId && f.TeacherId == teacherId, cancellationToken);

        if (followup is null) return false;

        db.TeacherFollowups.Remove(followup);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static TeacherFollowupDto ToDto(TeacherFollowup f, string? studentName) =>
        new(f.Id.ToString(),
            f.StudentId?.ToString(),
            studentName,
            f.Text,
            f.Status,
            f.CreatedAt,
            f.DueDate,
            f.CompletedAt,
            f.SourceSessionLogId?.ToString(),
            f.Kind,
            f.GroupId?.ToString());
}
