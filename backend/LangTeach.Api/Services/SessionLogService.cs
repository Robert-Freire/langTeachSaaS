using System.Text.Json;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class SessionLogService : ISessionLogService
{
    private readonly AppDbContext _db;
    private readonly ILogger<SessionLogService> _logger;

    private static readonly HashSet<string> ValidSkills = new(StringComparer.OrdinalIgnoreCase)
        { "Speaking", "Writing", "Reading", "Listening" };

    private static readonly HashSet<string> ValidCefrSubLevels = new(StringComparer.OrdinalIgnoreCase)
        { "A1.1", "A1.2", "A2.1", "A2.2", "B1.1", "B1.2", "B2.1", "B2.2", "C1.1", "C1.2", "C2.1", "C2.2" };

    public SessionLogService(AppDbContext db, ILogger<SessionLogService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<List<SessionLogDto>> ListAsync(Guid teacherId, Guid studentId, CancellationToken cancellationToken = default)
    {
        var studentExists = await _db.Students.AnyAsync(
            s => s.Id == studentId && s.TeacherId == teacherId && !s.IsDeleted,
            cancellationToken);

        if (!studentExists)
            throw new KeyNotFoundException($"Student {studentId} not found.");

        var sessions = await _db.SessionLogs
            .Where(sl => sl.StudentId == studentId && sl.TeacherId == teacherId && !sl.IsDeleted)
            .OrderByDescending(sl => sl.SessionDate)
            .Select(sl => ToDto(sl))
            .ToListAsync(cancellationToken);

        return sessions;
    }

    public async Task<SessionLogDto?> GetByIdAsync(Guid teacherId, Guid studentId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        var session = await _db.SessionLogs
            .Where(sl => sl.Id == sessionId && sl.StudentId == studentId && sl.TeacherId == teacherId && !sl.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        return session is null ? null : ToDto(session);
    }

    public async Task<SessionLogDto> CreateAsync(Guid teacherId, Guid studentId, CreateSessionLogRequest request, CancellationToken cancellationToken = default)
    {
        if (!Enum.IsDefined(request.PreviousHomeworkStatus))
            throw new System.ComponentModel.DataAnnotations.ValidationException(
                $"Invalid PreviousHomeworkStatus value: {(int)request.PreviousHomeworkStatus}");

        ValidateReassessment(request.LevelReassessmentSkill, request.LevelReassessmentLevel);

        var student = await _db.Students
            .Where(s => s.Id == studentId && s.TeacherId == teacherId && !s.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        if (student is null)
            throw new KeyNotFoundException($"Student {studentId} not found.");

        if (request.LinkedLessonId.HasValue)
        {
            var lessonExists = await _db.Lessons.AnyAsync(
                l => l.Id == request.LinkedLessonId.Value && l.TeacherId == teacherId && !l.IsDeleted,
                cancellationToken);

            if (!lessonExists)
                throw new KeyNotFoundException($"Lesson {request.LinkedLessonId.Value} not found.");
        }

        var now = DateTime.UtcNow;
        var entity = new SessionLog
        {
            Id = Guid.NewGuid(),
            StudentId = studentId,
            TeacherId = teacherId,
            SessionDate = request.SessionDate,
            PlannedContent = request.PlannedContent,
            ActualContent = request.ActualContent,
            HomeworkAssigned = request.HomeworkAssigned,
            PreviousHomeworkStatus = request.PreviousHomeworkStatus,
            NextSessionTopics = request.NextSessionTopics,
            GeneralNotes = request.GeneralNotes,
            LevelReassessmentSkill = request.LevelReassessmentSkill,
            LevelReassessmentLevel = request.LevelReassessmentLevel,
            LinkedLessonId = request.LinkedLessonId,
            TopicTags = request.TopicTags ?? "[]",
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.SessionLogs.Add(entity);

        if (request.LevelReassessmentSkill is not null && request.LevelReassessmentLevel is not null)
            PropagateReassessment(student, request.LevelReassessmentSkill, request.LevelReassessmentLevel);

        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Created SessionLog {SessionLogId} for Student {StudentId}", entity.Id, studentId);
        return ToDto(entity);
    }

    public async Task<SessionLogDto?> UpdateAsync(Guid teacherId, Guid studentId, Guid sessionId, UpdateSessionLogRequest request, CancellationToken cancellationToken = default)
    {
        if (!Enum.IsDefined(request.PreviousHomeworkStatus))
            throw new System.ComponentModel.DataAnnotations.ValidationException(
                $"Invalid PreviousHomeworkStatus value: {(int)request.PreviousHomeworkStatus}");

        ValidateReassessment(request.LevelReassessmentSkill, request.LevelReassessmentLevel);

        var entity = await _db.SessionLogs
            .Where(sl => sl.Id == sessionId && sl.StudentId == studentId && sl.TeacherId == teacherId && !sl.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        if (entity is null)
            return null;

        if (request.LinkedLessonId.HasValue)
        {
            var lessonExists = await _db.Lessons.AnyAsync(
                l => l.Id == request.LinkedLessonId.Value && l.TeacherId == teacherId && !l.IsDeleted,
                cancellationToken);

            if (!lessonExists)
                throw new KeyNotFoundException($"Lesson {request.LinkedLessonId.Value} not found.");
        }

        entity.SessionDate = request.SessionDate;
        entity.PlannedContent = request.PlannedContent;
        entity.ActualContent = request.ActualContent;
        entity.HomeworkAssigned = request.HomeworkAssigned;
        entity.PreviousHomeworkStatus = request.PreviousHomeworkStatus;
        entity.NextSessionTopics = request.NextSessionTopics;
        entity.GeneralNotes = request.GeneralNotes;
        entity.LevelReassessmentSkill = request.LevelReassessmentSkill;
        entity.LevelReassessmentLevel = request.LevelReassessmentLevel;
        entity.LinkedLessonId = request.LinkedLessonId;
        entity.TopicTags = request.TopicTags ?? "[]";
        entity.UpdatedAt = DateTime.UtcNow;

        if (request.LevelReassessmentSkill is not null && request.LevelReassessmentLevel is not null)
        {
            var student = await _db.Students
                .Where(s => s.Id == studentId && s.TeacherId == teacherId)
                .FirstOrDefaultAsync(cancellationToken);

            if (student is not null)
                PropagateReassessment(student, request.LevelReassessmentSkill, request.LevelReassessmentLevel);
        }

        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Updated SessionLog {SessionLogId}", sessionId);
        return ToDto(entity);
    }

    public async Task<bool> SoftDeleteAsync(Guid teacherId, Guid studentId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        var entity = await _db.SessionLogs
            .Where(sl => sl.Id == sessionId && sl.StudentId == studentId && sl.TeacherId == teacherId && !sl.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        if (entity is null)
            return false;

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Soft-deleted SessionLog {SessionLogId}", sessionId);
        return true;
    }

    private static void ValidateReassessment(string? skill, string? level)
    {
        if (skill is not null && !ValidSkills.Contains(skill))
            throw new System.ComponentModel.DataAnnotations.ValidationException(
                $"Invalid LevelReassessmentSkill '{skill}'. Valid values: {string.Join(", ", ValidSkills)}");

        if (level is not null && !ValidCefrSubLevels.Contains(level))
            throw new System.ComponentModel.DataAnnotations.ValidationException(
                $"Invalid LevelReassessmentLevel '{level}'. Valid values: {string.Join(", ", ValidCefrSubLevels)}");
    }

    private static void PropagateReassessment(Student student, string skill, string level)
    {
        var overrides = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            var existing = JsonSerializer.Deserialize<Dictionary<string, string>>(student.SkillLevelOverrides);
            if (existing is not null)
                foreach (var kv in existing)
                    overrides[kv.Key] = kv.Value;
        }
        catch (JsonException) { }

        overrides[skill.ToLowerInvariant()] = level;
        student.SkillLevelOverrides = JsonSerializer.Serialize(overrides);
    }

    private static SessionLogDto ToDto(SessionLog sl) => new(
        sl.Id,
        sl.StudentId,
        sl.SessionDate,
        sl.PlannedContent,
        sl.ActualContent,
        sl.HomeworkAssigned,
        sl.PreviousHomeworkStatus,
        sl.PreviousHomeworkStatus.ToString(),
        sl.NextSessionTopics,
        sl.GeneralNotes,
        sl.LevelReassessmentSkill,
        sl.LevelReassessmentLevel,
        sl.LinkedLessonId,
        sl.CreatedAt,
        sl.UpdatedAt,
        sl.TopicTags
    );
}
