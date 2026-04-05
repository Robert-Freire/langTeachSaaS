using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Helpers;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class CourseService : ICourseService
{
    private readonly AppDbContext _db;
    private readonly ICurriculumGenerationService _curriculumService;
    private readonly ICurriculumTemplateService _templateService;
    private readonly ILogger<CourseService> _logger;

    public CourseService(
        AppDbContext db,
        ICurriculumGenerationService curriculumService,
        ICurriculumTemplateService templateService,
        ILogger<CourseService> logger)
    {
        _db = db;
        _curriculumService = curriculumService;
        _templateService = templateService;
        _logger = logger;
    }

    public async Task<IReadOnlyList<CourseSummaryDto>> ListAsync(Guid teacherId, CancellationToken ct = default)
    {
        var courses = await _db.Courses
            .Include(c => c.Student)
            .Include(c => c.Entries)
            .Where(c => c.TeacherId == teacherId && !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(ct);

        return courses.Select(MapToSummary).ToList();
    }

    public async Task<CourseDto?> GetByIdAsync(Guid teacherId, Guid courseId, CancellationToken ct = default)
    {
        var course = await _db.Courses
            .Include(c => c.Student)
            .Include(c => c.Entries)
            .FirstOrDefaultAsync(c => c.Id == courseId && c.TeacherId == teacherId && !c.IsDeleted, ct);

        if (course is null) return null;

        var warnings = JsonStorageHelper.DeserializeListNullable<CurriculumWarning>(course.GenerationWarnings);
        var dismissedKeys = JsonStorageHelper.DeserializeListNullable<string>(course.DismissedWarnings);

        return MapToDto(course, warnings, dismissedKeys);
    }

    public async Task<(CourseDto dto, List<CurriculumWarning> warnings)> CreateAsync(Guid teacherId, CreateCourseRequest request, CancellationToken ct = default)
    {
        if (request.Mode == "exam-prep" && string.IsNullOrWhiteSpace(request.TargetExam))
            throw new ValidationException("TargetExam is required when Mode is 'exam-prep'.");

        if (request.Mode == "general" && string.IsNullOrWhiteSpace(request.TargetCefrLevel)
            && string.IsNullOrEmpty(request.TemplateLevel))
            throw new ValidationException("TargetCefrLevel is required when Mode is 'general'.");

        Student? student = null;
        if (request.StudentId.HasValue)
        {
            student = await _db.Students
                .FirstOrDefaultAsync(s => s.Id == request.StudentId.Value && s.TeacherId == teacherId && !s.IsDeleted, ct);
            if (student is null)
                throw new ValidationException("Invalid StudentId: student not found or does not belong to you.");
        }

        if (!string.IsNullOrEmpty(request.TemplateLevel) && request.Mode != "general")
            throw new ValidationException("TemplateLevel can only be used with mode 'general'.");

        string? resolvedCefrLevel = request.TargetCefrLevel;
        if (!string.IsNullOrEmpty(request.TemplateLevel))
        {
            var templateData = _templateService.GetByLevel(request.TemplateLevel);
            if (templateData is null)
                throw new ValidationException($"Template '{request.TemplateLevel}' not found.");

            if (!string.IsNullOrEmpty(request.TargetCefrLevel) &&
                !string.Equals(request.TargetCefrLevel, templateData.CefrLevel, StringComparison.OrdinalIgnoreCase))
                throw new ValidationException(
                    $"TargetCefrLevel '{request.TargetCefrLevel}' does not match template CEFR level '{templateData.CefrLevel}'.");

            resolvedCefrLevel = templateData.CefrLevel;
        }

        var ctx = BuildCurriculumContext(request, student, resolvedCefrLevel);
        var (entries, generationWarnings) = await _curriculumService.GenerateAsync(ctx, ct);

        var resolvedSessionCount = !string.IsNullOrEmpty(request.TemplateLevel)
            ? entries.Count
            : request.SessionCount;

        var now = DateTime.UtcNow;
        var course = new Course
        {
            Id = Guid.NewGuid(),
            TeacherId = teacherId,
            StudentId = request.StudentId,
            Name = request.Name,
            Description = request.Description,
            Language = request.Language,
            Mode = request.Mode,
            TargetCefrLevel = resolvedCefrLevel,
            TargetExam = request.TargetExam,
            ExamDate = request.ExamDate,
            SessionCount = resolvedSessionCount,
            CreatedAt = now,
            UpdatedAt = now,
            GenerationWarnings = generationWarnings.Count > 0
                ? JsonSerializer.Serialize(generationWarnings)
                : null,
        };

        foreach (var entry in entries)
            entry.CourseId = course.Id;

        _db.Courses.Add(course);
        _db.CurriculumEntries.AddRange(entries);
        await _db.SaveChangesAsync(ct);

        course.Student = student;
        course.Entries = entries;

        return (MapToDto(course, generationWarnings.Count > 0 ? generationWarnings : null, null), generationWarnings);
    }

    public async Task<bool> DismissWarningAsync(Guid teacherId, Guid courseId, string warningKey, CancellationToken ct = default)
    {
        var course = await _db.Courses
            .FirstOrDefaultAsync(c => c.Id == courseId && c.TeacherId == teacherId && !c.IsDeleted, ct);

        if (course is null) return false;

        var dismissed = JsonStorageHelper.DeserializeListNullable<string>(course.DismissedWarnings) ?? [];

        if (!dismissed.Contains(warningKey))
        {
            dismissed.Add(warningKey);
            course.DismissedWarnings = JsonStorageHelper.Serialize(dismissed);
            await _db.SaveChangesAsync(ct);
        }

        return true;
    }

    public async Task<bool> UpdateAsync(Guid teacherId, Guid courseId, UpdateCourseRequest request, CancellationToken ct = default)
    {
        var course = await _db.Courses
            .FirstOrDefaultAsync(c => c.Id == courseId && c.TeacherId == teacherId && !c.IsDeleted, ct);

        if (course is null) return false;

        if (request.Name is not null) course.Name = request.Name;
        if (request.Description is not null) course.Description = request.Description;
        course.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> DeleteAsync(Guid teacherId, Guid courseId, CancellationToken ct = default)
    {
        var course = await _db.Courses
            .FirstOrDefaultAsync(c => c.Id == courseId && c.TeacherId == teacherId && !c.IsDeleted, ct);

        if (course is null) return false;

        course.IsDeleted = true;
        course.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<(bool courseFound, CurriculumEntryDto? entry)> AddEntryAsync(Guid teacherId, Guid courseId, AddCurriculumEntryRequest request, CancellationToken ct = default)
    {
        var course = await _db.Courses
            .Include(c => c.Entries)
            .FirstOrDefaultAsync(c => c.Id == courseId && c.TeacherId == teacherId && !c.IsDeleted, ct);

        if (course is null) return (false, null);

        var maxIndex = course.Entries.Where(e => !e.IsDeleted).Select(e => (int?)e.OrderIndex).Max() ?? 0;
        var entry = new CurriculumEntry
        {
            Id = Guid.NewGuid(),
            CourseId = courseId,
            Topic = request.Topic,
            GrammarFocus = request.GrammarFocus,
            Competencies = request.Competencies ?? string.Empty,
            LessonType = request.LessonType,
            OrderIndex = maxIndex + 1,
            Status = "planned",
        };

        _db.CurriculumEntries.Add(entry);
        course.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return (true, MapEntryToDto(entry));
    }

    public async Task<(bool courseFound, bool entryFound)> DeleteEntryAsync(Guid teacherId, Guid courseId, Guid entryId, CancellationToken ct = default)
    {
        var course = await _db.Courses
            .Include(c => c.Entries)
            .FirstOrDefaultAsync(c => c.Id == courseId && c.TeacherId == teacherId && !c.IsDeleted, ct);

        if (course is null) return (false, false);

        var entry = course.Entries.FirstOrDefault(e => e.Id == entryId && !e.IsDeleted);
        if (entry is null) return (true, false);

        entry.IsDeleted = true;

        var remaining = course.Entries
            .Where(e => !e.IsDeleted)
            .OrderBy(e => e.OrderIndex)
            .ToList();
        for (var i = 0; i < remaining.Count; i++)
            remaining[i].OrderIndex = i + 1;

        course.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return (true, true);
    }

    public async Task<ReorderResult> ReorderEntriesAsync(Guid teacherId, Guid courseId, ReorderCurriculumRequest request, CancellationToken ct = default)
    {
        var course = await _db.Courses
            .Include(c => c.Entries)
            .FirstOrDefaultAsync(c => c.Id == courseId && c.TeacherId == teacherId && !c.IsDeleted, ct);

        if (course is null) return ReorderResult.CourseNotFound;

        var entryMap = course.Entries.Where(e => !e.IsDeleted).ToDictionary(e => e.Id);
        if (request.OrderedEntryIds.Count != entryMap.Count ||
            request.OrderedEntryIds.Distinct().Count() != entryMap.Count ||
            request.OrderedEntryIds.Any(eid => !entryMap.ContainsKey(eid)))
            return ReorderResult.InvalidEntryIds;

        for (var i = 0; i < request.OrderedEntryIds.Count; i++)
            entryMap[request.OrderedEntryIds[i]].OrderIndex = i + 1;

        course.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return ReorderResult.Success;
    }

    public async Task<(bool courseFound, CurriculumEntryDto? entry)> UpdateEntryAsync(Guid teacherId, Guid courseId, Guid entryId, UpdateCurriculumEntryRequest request, CancellationToken ct = default)
    {
        var course = await _db.Courses
            .FirstOrDefaultAsync(c => c.Id == courseId && c.TeacherId == teacherId && !c.IsDeleted, ct);
        if (course is null) return (false, null);

        var entry = await _db.CurriculumEntries
            .FirstOrDefaultAsync(e => e.Id == entryId && e.CourseId == courseId && !e.IsDeleted, ct);
        if (entry is null) return (true, null);

        entry.Topic = request.Topic;
        entry.GrammarFocus = request.GrammarFocus;
        entry.Competencies = request.Competencies ?? string.Empty;
        entry.LessonType = request.LessonType;
        if (request.Status is not null) entry.Status = request.Status;
        course.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return (true, MapEntryToDto(entry));
    }

    public async Task<Guid?> GenerateLessonFromEntryAsync(Guid teacherId, Guid courseId, Guid entryId, CancellationToken ct = default)
    {
        var course = await _db.Courses
            .FirstOrDefaultAsync(c => c.Id == courseId && c.TeacherId == teacherId && !c.IsDeleted, ct);
        if (course is null) return null;

        var entry = await _db.CurriculumEntries
            .FirstOrDefaultAsync(e => e.Id == entryId && e.CourseId == courseId && !e.IsDeleted, ct);
        if (entry is null) return null;

        var now = DateTime.UtcNow;
        var objectiveParts = new List<string>();
        if (!string.IsNullOrEmpty(entry.GrammarFocus))
            objectiveParts.Add($"Grammar: {entry.GrammarFocus}");
        if (!string.IsNullOrEmpty(entry.Competencies))
            objectiveParts.Add($"Communicative skills: {entry.Competencies}");
        if (!string.IsNullOrEmpty(entry.CompetencyFocus))
            objectiveParts.Add($"CEFR skill focus: {entry.CompetencyFocus}");
        var objectives = objectiveParts.Count > 0 ? string.Join(". ", objectiveParts) : null;

        var lesson = new Lesson
        {
            Id = Guid.NewGuid(),
            TeacherId = teacherId,
            StudentId = course.StudentId,
            Title = entry.Topic,
            Language = course.Language,
            CefrLevel = course.TargetCefrLevel ?? "B1",
            Topic = entry.Topic,
            DurationMinutes = 60,
            Objectives = objectives,
            Status = "Draft",
            CreatedAt = now,
            UpdatedAt = now,
        };

        _db.Lessons.Add(lesson);

        entry.LessonId = lesson.Id;
        entry.Status = "created";
        course.UpdatedAt = now;

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Lesson created from curriculum entry. CourseId={CourseId} EntryId={EntryId} LessonId={LessonId}",
            courseId, entryId, lesson.Id);

        return lesson.Id;
    }

    private static CurriculumContext BuildCurriculumContext(CreateCourseRequest req, Student? student, string? resolvedCefrLevel) =>
        new(
            Language: req.Language,
            Mode: req.Mode,
            SessionCount: req.SessionCount,
            TargetCefrLevel: resolvedCefrLevel,
            TargetExam: req.TargetExam,
            ExamDate: req.ExamDate,
            StudentName: student?.Name,
            StudentNativeLanguage: student?.NativeLanguage,
            StudentInterests: student is not null
                ? JsonStorageHelper.DeserializeList<string>(student.Interests).ToArray()
                : null,
            StudentGoals: student is not null
                ? JsonStorageHelper.DeserializeList<string>(student.LearningGoals).ToArray()
                : null,
            TemplateLevel: string.IsNullOrWhiteSpace(req.TemplateLevel) ? null : req.TemplateLevel,
            TemplateUnits: null,
            StudentWeaknesses: student is not null
                ? JsonStorageHelper.DeserializeList<string>(student.Weaknesses).ToArray()
                : null,
            StudentDifficulties: student is not null
                ? JsonStorageHelper.DeserializeList<DifficultyDto>(student.Difficulties).ToArray()
                : null,
            TeacherNotes: req.TeacherNotes
        );

    private static CurriculumEntryDto MapEntryToDto(CurriculumEntry e) =>
        new(
            e.Id,
            e.OrderIndex,
            e.Topic,
            e.GrammarFocus,
            e.Competencies,
            e.LessonType,
            e.LessonId,
            e.Status,
            e.TemplateUnitRef,
            e.CompetencyFocus,
            JsonStorageHelper.DeserializeWithFallback<ContextDescriptionData>(
                e.ContextDescription,
                text => new ContextDescriptionData { Setting = string.Empty, Scenario = text }),
            JsonStorageHelper.DeserializeWithFallback<PersonalizationNotesData>(
                e.PersonalizationNotes,
                text => new PersonalizationNotesData { EmphasisAreas = [text] }),
            e.VocabularyThemes);

    private static CourseDto MapToDto(Course c, List<CurriculumWarning>? warnings = null, List<string>? dismissedKeys = null) =>
        new(
            c.Id, c.Name, c.Description, c.Language, c.Mode,
            c.TargetCefrLevel, c.TargetExam, c.ExamDate,
            c.SessionCount, c.StudentId, c.Student?.Name,
            LessonsCreated: c.Entries.Count(e => !e.IsDeleted && (e.Status == "created" || e.Status == "taught")),
            c.CreatedAt, c.UpdatedAt,
            c.Entries.Where(e => !e.IsDeleted).OrderBy(e => e.OrderIndex).Select(MapEntryToDto).ToList(),
            warnings,
            dismissedKeys
        );

    private static CourseSummaryDto MapToSummary(Course c) =>
        new(
            c.Id, c.Name, c.Description, c.Language, c.Mode,
            c.TargetCefrLevel, c.TargetExam,
            c.SessionCount, c.StudentId, c.Student?.Name,
            LessonsCreated: c.Entries.Count(e => !e.IsDeleted && (e.Status == "created" || e.Status == "taught")),
            c.CreatedAt
        );
}
