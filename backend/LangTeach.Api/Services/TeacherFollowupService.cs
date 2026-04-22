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
            .Where(f => f.TeacherId == teacherId)
            .Include(f => f.Student)
            .OrderBy(f => f.CreatedAt)
            .Select(f => ToDto(f, f.Student != null ? f.Student.Name : null))
            .ToListAsync(cancellationToken);
    }

    public async Task<List<TeacherFollowupDto>> GetPendingAsync(Guid teacherId, CancellationToken cancellationToken)
    {
        return await db.TeacherFollowups
            .Where(f => f.TeacherId == teacherId && f.Status == "pending")
            .Include(f => f.Student)
            .OrderBy(f => f.CreatedAt)
            .Select(f => ToDto(f, f.Student != null ? f.Student.Name : null))
            .ToListAsync(cancellationToken);
    }

    public async Task<List<TeacherFollowupDto>> GetByStudentAsync(Guid teacherId, Guid studentId, CancellationToken cancellationToken)
    {
        return await db.TeacherFollowups
            .Where(f => f.TeacherId == teacherId && f.StudentId == studentId)
            .OrderBy(f => f.CreatedAt)
            .Select(f => ToDto(f, null))
            .ToListAsync(cancellationToken);
    }

    public async Task<TeacherFollowupDto> CreateAsync(Guid teacherId, CreateTeacherFollowupRequest request, CancellationToken cancellationToken)
    {
        string? studentName = null;
        if (request.StudentId.HasValue)
        {
            studentName = await db.Students
                .Where(s => s.Id == request.StudentId.Value && s.TeacherId == teacherId)
                .Select(s => s.Name)
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw new ValidationException("Student not found.");
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
            Text = request.Text,
            Status = "pending",
            Kind = request.Kind ?? "operational",
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

        followup.Status = request.Status.ToLowerInvariant();
        followup.CompletedAt = followup.Status is "done" or "covered" ? DateTime.UtcNow : null;

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
            f.Kind);
}
