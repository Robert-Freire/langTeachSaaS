using System.Text.Json;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Helpers;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class SessionLogService : ISessionLogService
{
    private readonly AppDbContext _db;
    private readonly IDifficultyTrendService _trendService;
    private readonly ILogger<SessionLogService> _logger;

    private static readonly HashSet<string> ValidSkills = new(StringComparer.OrdinalIgnoreCase)
        { "Speaking", "Writing", "Reading", "Listening" };


    // TODO: source CEFR sub-levels from config if the set ever changes
    private static readonly HashSet<string> ValidCefrSubLevels = new(StringComparer.OrdinalIgnoreCase)
        { "A1.1", "A1.2", "A2.1", "A2.2", "B1.1", "B1.2", "B2.1", "B2.2", "C1.1", "C1.2", "C2.1", "C2.2" };

    private static readonly JsonSerializerOptions JsonOptions =
        new() { PropertyNameCaseInsensitive = true };

    private static readonly JsonSerializerOptions CamelCaseOptions =
        new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public SessionLogService(AppDbContext db, IDifficultyTrendService trendService, ILogger<SessionLogService> logger)
    {
        _db = db;
        _trendService = trendService;
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
            .OrderBy(sl => sl.SessionDate.HasValue)
            .ThenByDescending(sl => sl.SessionDate)
            .Select(sl => ToDto(sl))
            .ToListAsync(cancellationToken);

        return sessions;
    }

    public async Task<SessionLogDto?> GetByIdAsync(Guid teacherId, Guid studentId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        var session = await _db.SessionLogs
            .Where(sl => sl.Id == sessionId && sl.StudentId == studentId && sl.TeacherId == teacherId && !sl.IsDeleted && !sl.Student.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        return session is null ? null : ToDto(session);
    }

    public async Task<SessionLogDto> CreateAsync(Guid teacherId, Guid studentId, CreateSessionLogRequest request, CancellationToken cancellationToken = default)
    {
        if (!Enum.IsDefined(request.PreviousHomeworkStatus))
            throw new System.ComponentModel.DataAnnotations.ValidationException(
                $"Invalid PreviousHomeworkStatus value: {(int)request.PreviousHomeworkStatus}");

        if (!Enum.IsDefined(request.Status))
            throw new System.ComponentModel.DataAnnotations.ValidationException(
                $"Invalid Status value: {(int)request.Status}");

        if (request.Status == SessionLogStatus.Draft && request.IsCancelled)
            throw new System.ComponentModel.DataAnnotations.ValidationException(
                "Draft sessions cannot be cancelled.");

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
        var sanitizedDifficulties = SanitizeSuggestedDifficulties(request.SuggestedDifficulties, _logger);
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
            MentionedDifficultyPairs = SerializePairs(request.MentionedDifficultyPairs),
            SuggestedDifficulties = SerializeSuggestedDifficulties(sanitizedDifficulties),
            IsCancelled = request.IsCancelled,
            Status = request.Status,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.SessionLogs.Add(entity);

        if (request.LevelReassessmentSkill is not null && request.LevelReassessmentLevel is not null)
            PropagateReassessment(student, request.LevelReassessmentSkill, request.LevelReassessmentLevel, _logger);

        if (request.Status == SessionLogStatus.Confirmed && sanitizedDifficulties.Count > 0)
            UpsertDifficulties(student, sanitizedDifficulties, _logger);

        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Created SessionLog {SessionLogId} for Student {StudentId}", entity.Id, studentId);

        try { await _trendService.RecomputeAsync(teacherId, studentId, cancellationToken); }
        catch (Exception ex) { _logger.LogError(ex, "Trend recompute failed for Student {StudentId} after session create", studentId); }

        return ToDto(entity);
    }

    public async Task<SessionLogDto?> UpdateAsync(Guid teacherId, Guid studentId, Guid sessionId, UpdateSessionLogRequest request, CancellationToken cancellationToken = default)
    {
        if (!Enum.IsDefined(request.PreviousHomeworkStatus))
            throw new System.ComponentModel.DataAnnotations.ValidationException(
                $"Invalid PreviousHomeworkStatus value: {(int)request.PreviousHomeworkStatus}");

        if (!Enum.IsDefined(request.Status))
            throw new System.ComponentModel.DataAnnotations.ValidationException(
                $"Invalid Status value: {(int)request.Status}");

        if (request.Status == SessionLogStatus.Draft && request.IsCancelled)
            throw new System.ComponentModel.DataAnnotations.ValidationException(
                "Draft sessions cannot be cancelled.");

        ValidateReassessment(request.LevelReassessmentSkill, request.LevelReassessmentLevel);

        var entity = await _db.SessionLogs
            .Where(sl => sl.Id == sessionId && sl.StudentId == studentId && sl.TeacherId == teacherId && !sl.IsDeleted && !sl.Student.IsDeleted)
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

        var sanitizedDifficulties = SanitizeSuggestedDifficulties(request.SuggestedDifficulties, _logger);

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
        entity.MentionedDifficultyPairs = SerializePairs(request.MentionedDifficultyPairs);
        entity.SuggestedDifficulties = SerializeSuggestedDifficulties(sanitizedDifficulties);
        entity.IsCancelled = request.IsCancelled;
        entity.Status = request.Status;
        entity.UpdatedAt = DateTime.UtcNow;

        Student? studentForUpdate = null;

        if (request.LevelReassessmentSkill is not null && request.LevelReassessmentLevel is not null)
        {
            studentForUpdate = await _db.Students
                .Where(s => s.Id == studentId && s.TeacherId == teacherId)
                .FirstOrDefaultAsync(cancellationToken);

            if (studentForUpdate is not null)
                PropagateReassessment(studentForUpdate, request.LevelReassessmentSkill, request.LevelReassessmentLevel, _logger);
        }

        if (request.Status == SessionLogStatus.Confirmed && sanitizedDifficulties.Count > 0)
        {
            studentForUpdate ??= await _db.Students
                .Where(s => s.Id == studentId && s.TeacherId == teacherId)
                .FirstOrDefaultAsync(cancellationToken);

            if (studentForUpdate is not null)
                UpsertDifficulties(studentForUpdate, sanitizedDifficulties, _logger);
        }

        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Updated SessionLog {SessionLogId}", sessionId);

        try { await _trendService.RecomputeAsync(teacherId, studentId, cancellationToken); }
        catch (Exception ex) { _logger.LogError(ex, "Trend recompute failed for Student {StudentId} after session update", studentId); }

        return ToDto(entity);
    }

    public async Task<bool> SoftDeleteAsync(Guid teacherId, Guid studentId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        var entity = await _db.SessionLogs
            .Where(sl => sl.Id == sessionId && sl.StudentId == studentId && sl.TeacherId == teacherId && !sl.IsDeleted && !sl.Student.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        if (entity is null)
            return false;

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Soft-deleted SessionLog {SessionLogId}", sessionId);

        try { await _trendService.RecomputeAsync(teacherId, studentId, cancellationToken); }
        catch (Exception ex) { _logger.LogError(ex, "Trend recompute failed for Student {StudentId} after session delete", studentId); }

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

    private static void PropagateReassessment(Student student, string skill, string level, ILogger logger)
    {
        var overrides = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            var existing = JsonSerializer.Deserialize<Dictionary<string, string>>(student.SkillLevelOverrides, JsonOptions);
            if (existing is not null)
                foreach (var kv in existing)
                    overrides[kv.Key] = kv.Value;
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Student {StudentId} has corrupt SkillLevelOverrides; resetting to empty before propagation", student.Id);
        }

        overrides[skill.ToLowerInvariant()] = level;
        student.SkillLevelOverrides = JsonSerializer.Serialize(overrides);
    }

    public async Task<StudentSessionSummaryDto> GetSummaryAsync(Guid teacherId, Guid studentId, CancellationToken cancellationToken = default)
    {
        var student = await _db.Students
            .Where(s => s.Id == studentId && s.TeacherId == teacherId && !s.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        if (student is null)
            throw new KeyNotFoundException($"Student {studentId} not found.");

        var totalSessions = await _db.SessionLogs
            .CountAsync(sl => sl.StudentId == studentId && sl.TeacherId == teacherId && !sl.IsDeleted && !sl.IsCancelled && sl.Status == SessionLogStatus.Confirmed, cancellationToken);

        var recentSessions = await _db.SessionLogs
            .Where(sl => sl.StudentId == studentId && sl.TeacherId == teacherId && !sl.IsDeleted && !sl.IsCancelled && sl.Status == SessionLogStatus.Confirmed && sl.SessionDate.HasValue)
            .OrderByDescending(sl => sl.SessionDate)
            .Take(3)
            .ToListAsync(cancellationToken);

        string? lastSessionDate = null;
        int? daysSinceLastSession = null;
        var openActionItems = new List<string>();

        if (recentSessions.Count > 0)
        {
            var mostRecent = recentSessions[0];
            lastSessionDate = mostRecent.SessionDate!.Value.ToString("yyyy-MM-dd");
            daysSinceLastSession = (int)(DateTime.UtcNow.Date - mostRecent.SessionDate.Value.Date).TotalDays;

            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var session in recentSessions)
            {
                if (string.IsNullOrWhiteSpace(session.NextSessionTopics)) continue;
                foreach (var line in session.NextSessionTopics.Split('\n', StringSplitOptions.RemoveEmptyEntries))
                {
                    var item = line.Trim();
                    if (item.Length > 0 && seen.Add(item))
                        openActionItems.Add(item);
                }
            }
        }

        var skillOverrides = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            var parsed = JsonSerializer.Deserialize<Dictionary<string, string>>(student.SkillLevelOverrides, JsonOptions);
            if (parsed is not null)
                foreach (var kv in parsed)
                    skillOverrides[kv.Key] = kv.Value;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Student {StudentId} has corrupt SkillLevelOverrides", studentId);
        }

        var levelReassessmentPending = SkillLevelHelper.IsReassessmentPending(skillOverrides, student.CefrLevel);

        return new StudentSessionSummaryDto(
            totalSessions,
            lastSessionDate,
            daysSinceLastSession,
            openActionItems,
            levelReassessmentPending,
            skillOverrides
        );
    }

    private static SessionLogDto ToDto(SessionLog sl) => new(
        sl.Id,
        sl.StudentId,
        sl.TeacherId,
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
        sl.TopicTags,
        sl.IsCancelled,
        sl.Status,
        sl.Status.ToString(),
        sl.MentionedDifficultyPairs,
        sl.SuggestedDifficulties
    );

    private static string SerializePairs(List<DifficultyPairDto>? pairs) =>
        pairs is null or { Count: 0 } ? "[]" : JsonStorageHelper.Serialize(pairs);

    // Serialize with camelCase so the raw JSON column matches the API response casing the frontend expects.
    private static string SerializeSuggestedDifficulties(List<SuggestedDifficultyDto> items) =>
        items.Count == 0 ? "[]" : JsonSerializer.Serialize(items, CamelCaseOptions);

    // Filter out entries with invalid competency/severity before storing or upserting,
    // so the SessionLog column never contains data that would silently break on rehydration.
    private static List<SuggestedDifficultyDto> SanitizeSuggestedDifficulties(
        List<SuggestedDifficultyDto>? items, ILogger logger)
    {
        if (items is null or { Count: 0 }) return [];
        var result = new List<SuggestedDifficultyDto>(items.Count);
        foreach (var item in items)
        {
            if (!DifficultyConstants.ValidCompetencies.Contains(item.Competency) ||
                !DifficultyConstants.ValidSeverities.Contains(item.Severity))
            {
                logger.LogWarning("Dropping suggested difficulty with invalid fields: Competency={Competency}, Severity={Severity}", item.Competency, item.Severity);
                continue;
            }
            result.Add(item);
        }
        return result;
    }

    private static void UpsertDifficulties(Student student, List<SuggestedDifficultyDto> suggested, ILogger logger)
    {
        var existing = JsonStorageHelper.DeserializeList<DifficultyDto>(student.Difficulties);
        foreach (var s in suggested)
        {
            if (!DifficultyConstants.ValidCompetencies.Contains(s.Competency) || !DifficultyConstants.ValidSeverities.Contains(s.Severity))
            {
                logger.LogWarning("Skipping suggested difficulty with invalid fields: Competency={Competency}, Severity={Severity}", s.Competency, s.Severity);
                continue;
            }
            var match = existing.FirstOrDefault(d =>
                string.Equals(d.Competency, s.Competency, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(d.Subcategory, s.Subcategory, StringComparison.OrdinalIgnoreCase));
            if (match is not null)
            {
                var idx = existing.IndexOf(match);
                existing[idx] = match with { Description = s.Description, Severity = s.Severity, Status = "Active" };
            }
            else
            {
                existing.Add(new DifficultyDto(
                    Id: Guid.NewGuid().ToString(),
                    Description: s.Description,
                    Competency: s.Competency,
                    Subcategory: s.Subcategory,
                    Severity: s.Severity,
                    Trend: "stable",
                    Status: "Active"
                ));
            }
        }
        student.Difficulties = JsonStorageHelper.Serialize(existing);
        student.UpdatedAt = DateTime.UtcNow;
    }
}
