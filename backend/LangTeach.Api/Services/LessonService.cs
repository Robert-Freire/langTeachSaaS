using System.Text.Json;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class LessonService : ILessonService
{
    private readonly AppDbContext _db;
    private readonly IMaterialService _materialService;
    private readonly ILogger<LessonService> _logger;

    public LessonService(AppDbContext db, IMaterialService materialService, ILogger<LessonService> logger)
    {
        _db = db;
        _materialService = materialService;
        _logger = logger;
    }

    public async Task<PagedResult<LessonDto>> ListAsync(Guid teacherId, LessonListQuery query, CancellationToken cancellationToken = default)
    {
        var page = Math.Max(query.Page, 1);
        var pageSize = query.PageSize;

        var q = _db.Lessons
            .Include(l => l.Sections)
            .Include(l => l.Student)
            .Where(l => l.TeacherId == teacherId && !l.IsDeleted);

        if (!string.IsNullOrWhiteSpace(query.Language))
            q = q.Where(l => l.Language == query.Language);

        if (!string.IsNullOrWhiteSpace(query.CefrLevel))
            q = q.Where(l => l.CefrLevel == query.CefrLevel);

        if (!string.IsNullOrWhiteSpace(query.Status))
            q = q.Where(l => l.Status == query.Status);

        if (query.ScheduledFrom.HasValue)
            q = q.Where(l => l.ScheduledAt >= query.ScheduledFrom.Value);

        if (query.ScheduledTo.HasValue)
        {
            var scheduledToExclusive = query.ScheduledTo.Value.Date.AddDays(1);
            q = q.Where(l => l.ScheduledAt.HasValue && l.ScheduledAt.Value < scheduledToExclusive);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = $"%{query.Search}%";
            q = q.Where(l => EF.Functions.Like(l.Title, term) || EF.Functions.Like(l.Topic, term));
        }

        var totalCount = await q.CountAsync(cancellationToken);

        var items = await q
            .OrderByDescending(l => l.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<LessonDto>(
            items.Select(MapToDto).ToList(),
            totalCount,
            page,
            pageSize
        );
    }

    public async Task<LessonDto?> GetByIdAsync(Guid teacherId, Guid lessonId, CancellationToken cancellationToken = default)
    {
        var lesson = await _db.Lessons
            .Include(l => l.Sections)
                .ThenInclude(s => s.Materials)
            .Include(l => l.Student)
            .Include(l => l.Template)
            .FirstOrDefaultAsync(l => l.Id == lessonId && l.TeacherId == teacherId && !l.IsDeleted, cancellationToken);

        return lesson is null ? null : MapToDto(lesson);
    }

    public async Task<LessonDto?> CreateAsync(Guid teacherId, CreateLessonRequest request, CancellationToken cancellationToken = default)
    {
        if (request.StudentId.HasValue)
        {
            var studentExists = await _db.Students
                .AnyAsync(s => s.Id == request.StudentId.Value && s.TeacherId == teacherId && !s.IsDeleted, cancellationToken);

            if (!studentExists)
            {
                _logger.LogWarning(
                    "CreateLesson: StudentId={StudentId} not found or belongs to another teacher. TeacherId={TeacherId}",
                    request.StudentId.Value, teacherId);
                return null;
            }
        }

        var now = DateTime.UtcNow;
        var lesson = new Lesson
        {
            Id = Guid.NewGuid(),
            TeacherId = teacherId,
            StudentId = request.StudentId,
            TemplateId = null,
            Title = request.Title,
            Language = request.Language,
            CefrLevel = request.CefrLevel,
            Topic = request.Topic,
            DurationMinutes = request.DurationMinutes,
            Objectives = request.Objectives,
            Status = "Draft",
            ScheduledAt = request.ScheduledAt,
            CreatedAt = now,
            UpdatedAt = now,
        };

        if (request.TemplateId.HasValue)
        {
            var template = await _db.LessonTemplates
                .FirstOrDefaultAsync(t => t.Id == request.TemplateId.Value, cancellationToken);

            if (template is null)
            {
                _logger.LogWarning(
                    "CreateLesson: TemplateId={TemplateId} not found. TeacherId={TeacherId}",
                    request.TemplateId.Value, teacherId);
                return null;
            }

            lesson.TemplateId = request.TemplateId;
            lesson.Sections = DeserializeTemplateSections(template.DefaultSections).Select(s => new LessonSection
            {
                Id = Guid.NewGuid(),
                LessonId = lesson.Id,
                SectionType = s.SectionType,
                OrderIndex = s.OrderIndex,
                Notes = s.NotesPlaceholder,
                CreatedAt = now,
                UpdatedAt = now,
            }).ToList();
        }

        _db.Lessons.Add(lesson);
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Lesson created. TeacherId={TeacherId} LessonId={LessonId}", teacherId, lesson.Id);

        if (request.CourseId.HasValue && request.CourseEntryId.HasValue)
        {
            var entry = await _db.CurriculumEntries
                .Include(e => e.Course)
                .FirstOrDefaultAsync(
                    e => e.Id == request.CourseEntryId.Value
                      && e.CourseId == request.CourseId.Value
                      && e.Course.TeacherId == teacherId
                      && !e.IsDeleted,
                    cancellationToken);

            if (entry is not null)
            {
                entry.LessonId = lesson.Id;
                entry.Status = "created";
                await _db.SaveChangesAsync(cancellationToken);
                _logger.LogInformation(
                    "Linked lesson to course entry. TeacherId={TeacherId} LessonId={LessonId} EntryId={EntryId}",
                    teacherId, lesson.Id, entry.Id);
            }
            else
            {
                _logger.LogWarning(
                    "CourseEntryId={CourseEntryId} not found or not owned by teacher. LessonId={LessonId} TeacherId={TeacherId}",
                    request.CourseEntryId.Value, lesson.Id, teacherId);
            }
        }

        if (lesson.StudentId.HasValue)
            await _db.Entry(lesson).Reference(l => l.Student).LoadAsync(cancellationToken);

        return MapToDto(lesson);
    }

    public async Task<LessonUpdateResult> UpdateAsync(Guid teacherId, Guid lessonId, UpdateLessonRequest request, CancellationToken cancellationToken = default)
    {
        var lesson = await _db.Lessons
            .Include(l => l.Sections).ThenInclude(s => s.Materials)
            .Include(l => l.Student)
            .FirstOrDefaultAsync(l => l.Id == lessonId && l.TeacherId == teacherId && !l.IsDeleted, cancellationToken);

        if (lesson is null)
            return new LessonUpdateResult.NotFound();

        if (request.StudentId.HasValue)
        {
            var studentExists = await _db.Students
                .AnyAsync(s => s.Id == request.StudentId.Value && s.TeacherId == teacherId && !s.IsDeleted, cancellationToken);

            if (!studentExists)
            {
                _logger.LogWarning(
                    "UpdateLesson: StudentId={StudentId} not found or belongs to another teacher. TeacherId={TeacherId}",
                    request.StudentId.Value, teacherId);
                return new LessonUpdateResult.InvalidStudent();
            }
        }

        lesson.Title = request.Title;
        lesson.Language = request.Language;
        lesson.CefrLevel = request.CefrLevel;
        lesson.Topic = request.Topic;
        if (request.DurationMinutes.HasValue) lesson.DurationMinutes = request.DurationMinutes.Value;
        lesson.Objectives = request.Objectives;
        if (request.Status is not null) lesson.Status = request.Status;
        lesson.StudentId = request.StudentId;
        lesson.ScheduledAt = request.ScheduledAt;
        lesson.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Lesson updated. TeacherId={TeacherId} LessonId={LessonId}", teacherId, lesson.Id);

        return new LessonUpdateResult.Success(MapToDto(lesson));
    }

    public async Task<LessonDto?> UpdateSectionsAsync(Guid teacherId, Guid lessonId, UpdateLessonSectionsRequest request, CancellationToken cancellationToken = default)
    {
        var lesson = await _db.Lessons
            .Include(l => l.Sections).ThenInclude(s => s.Materials)
            .Include(l => l.Student)
            .FirstOrDefaultAsync(l => l.Id == lessonId && l.TeacherId == teacherId && !l.IsDeleted, cancellationToken);

        if (lesson is null)
            return null;

        // Reject empty section sets and duplicate section types
        if (request.Sections.Count == 0)
            return null;
        var incomingTypes = new HashSet<string>(request.Sections.Select(s => s.SectionType));
        if (incomingTypes.Count != request.Sections.Count)
            return null;

        var now = DateTime.UtcNow;
        var existingByType = lesson.Sections.ToDictionary(s => s.SectionType);

        // Remove sections no longer present (and their content blocks + material blobs)
        var removedSections = lesson.Sections.Where(s => !incomingTypes.Contains(s.SectionType)).ToList();
        var removedSectionIds = new HashSet<Guid>();
        if (removedSections.Count > 0)
        {
            removedSectionIds = removedSections.Select(s => s.Id).ToHashSet();

            var orphanedBlocks = await _db.LessonContentBlocks
                .Where(b => b.LessonSectionId.HasValue && removedSectionIds.Contains(b.LessonSectionId.Value))
                .ToListAsync(cancellationToken);
            if (orphanedBlocks.Count > 0)
                _db.LessonContentBlocks.RemoveRange(orphanedBlocks);
            _db.LessonSections.RemoveRange(removedSections);
        }

        // Upsert: update existing, create new
        var resultSections = new List<LessonSection>();
        foreach (var input in request.Sections)
        {
            if (existingByType.TryGetValue(input.SectionType, out var existing))
            {
                existing.Notes = input.Notes;
                existing.OrderIndex = input.OrderIndex;
                existing.UpdatedAt = now;
                resultSections.Add(existing);
            }
            else
            {
                var newSection = new LessonSection
                {
                    Id = Guid.NewGuid(),
                    LessonId = lessonId,
                    SectionType = input.SectionType,
                    OrderIndex = input.OrderIndex,
                    Notes = input.Notes,
                    CreatedAt = now,
                    UpdatedAt = now,
                };
                _db.LessonSections.Add(newSection);
                resultSections.Add(newSection);
            }
        }

        lesson.UpdatedAt = now;
        await _db.SaveChangesAsync(cancellationToken);

        // Clean up material blobs after DB commit (DB-first pattern)
        if (removedSectionIds.Count > 0)
            await _materialService.DeleteBlobsForSectionsAsync(removedSectionIds, cancellationToken);

        _logger.LogInformation("Lesson sections updated. TeacherId={TeacherId} LessonId={LessonId} SectionCount={Count}",
            teacherId, lessonId, resultSections.Count);

        lesson.Sections = resultSections;
        return MapToDto(lesson);
    }

    public async Task<bool> DeleteAsync(Guid teacherId, Guid lessonId, CancellationToken cancellationToken = default)
    {
        var lesson = await _db.Lessons
            .FirstOrDefaultAsync(l => l.Id == lessonId && l.TeacherId == teacherId && !l.IsDeleted, cancellationToken);

        if (lesson is null)
            return false;

        lesson.IsDeleted = true;
        lesson.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Lesson deleted. TeacherId={TeacherId} LessonId={LessonId}", teacherId, lesson.Id);

        return true;
    }

    public async Task<LessonDto?> DuplicateAsync(Guid teacherId, Guid lessonId, CancellationToken cancellationToken = default)
    {
        var original = await _db.Lessons
            .Include(l => l.Sections)
            .FirstOrDefaultAsync(l => l.Id == lessonId && l.TeacherId == teacherId && !l.IsDeleted, cancellationToken);

        if (original is null)
            return null;

        var now = DateTime.UtcNow;
        // ScheduledAt intentionally not copied: duplicate is for a different class time
        var copy = new Lesson
        {
            Id = Guid.NewGuid(),
            TeacherId = teacherId,
            StudentId = original.StudentId,
            TemplateId = original.TemplateId,
            Title = $"Copy of {original.Title}",
            Language = original.Language,
            CefrLevel = original.CefrLevel,
            Topic = original.Topic,
            DurationMinutes = original.DurationMinutes,
            Objectives = original.Objectives,
            Status = "Draft",
            CreatedAt = now,
            UpdatedAt = now,
            Sections = original.Sections.Select(s => new LessonSection
            {
                Id = Guid.NewGuid(),
                SectionType = s.SectionType,
                OrderIndex = s.OrderIndex,
                Notes = s.Notes,
                CreatedAt = now,
                UpdatedAt = now,
            }).ToList(),
        };

        _db.Lessons.Add(copy);
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Lesson duplicated. TeacherId={TeacherId} OriginalId={OriginalId} CopyId={CopyId}",
            teacherId, lessonId, copy.Id);

        if (copy.StudentId.HasValue)
            await _db.Entry(copy).Reference(l => l.Student).LoadAsync(cancellationToken);

        return MapToDto(copy);
    }

    public async Task<LessonDto?> UpdateLearningTargetsAsync(Guid teacherId, Guid lessonId, string[]? labels, CancellationToken cancellationToken = default)
    {
        var lesson = await _db.Lessons
            .Include(l => l.Sections).ThenInclude(s => s.Materials)
            .Include(l => l.Student)
            .FirstOrDefaultAsync(l => l.Id == lessonId && l.TeacherId == teacherId && !l.IsDeleted, cancellationToken);
        if (lesson is null) return null;

        // Sanitize: filter nulls, trim, and cap each label at 200 chars
        var sanitized = labels?
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .Select(l => l!.Trim())
            .Select(l => l.Length > 200 ? l[..200] : l)
            .ToArray();
        // Store "[]" for teacher-cleared (distinct from null = never initialized)
        lesson.LearningTargets = JsonSerializer.Serialize(sanitized ?? Array.Empty<string>());
        lesson.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Learning targets updated. TeacherId={TeacherId} LessonId={LessonId}", teacherId, lessonId);
        return MapToDto(lesson);
    }

    public async Task EnsureLearningTargetsAsync(Lesson lesson, CancellationToken cancellationToken = default)
    {
        // null = never initialized; any non-null value (including "[]" for teacher-cleared) = already decided
        if (lesson.LearningTargets is not null) return;
        var entry = await _db.CurriculumEntries
            .FirstOrDefaultAsync(e => e.LessonId == lesson.Id && !e.IsDeleted, cancellationToken);
        if (entry is null) return;

        var labels = new List<string>();
        if (!string.IsNullOrWhiteSpace(entry.GrammarFocus))
            labels.Add(entry.GrammarFocus.Trim());
        foreach (var c in (entry.Competencies ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (c.Length > 0)
                labels.Add(char.ToUpper(c[0]) + c[1..]);
        }
        if (labels.Count == 0) return;

        lesson.LearningTargets = JsonSerializer.Serialize(labels);
        lesson.UpdatedAt = DateTime.UtcNow;
    }

    private static LessonDto MapToDto(Lesson l) => new(
        l.Id,
        l.Title,
        l.Language,
        l.CefrLevel,
        l.Topic,
        l.DurationMinutes,
        l.Objectives,
        l.Status,
        l.StudentId,
        l.TemplateId,
        l.Template?.Name,
        l.Sections.OrderBy(s => s.OrderIndex).Select(MapSectionToDto).ToList(),
        l.CreatedAt,
        l.UpdatedAt,
        l.ScheduledAt,
        l.Student?.Name,
        DeserializeLearningTargets(l.LearningTargets)
    );

    private static string[]? DeserializeLearningTargets(string? json)
    {
        if (json is null) return null;
        try
        {
            var result = JsonSerializer.Deserialize<string[]>(json);
            // "[]" = teacher explicitly cleared; expose as null to the DTO
            return result is { Length: > 0 } ? result : null;
        }
        catch { return null; }
    }

    private static LessonSectionDto MapSectionToDto(LessonSection s) => new(
        s.Id,
        s.SectionType,
        s.OrderIndex,
        s.Notes,
        s.Materials?.Select(m => new MaterialDto(m.Id, m.FileName, m.ContentType, m.SizeBytes, m.BlobPath, null, m.CreatedAt)).ToList() ?? new()
    );

    private record TemplateSectionEntry(string SectionType, int OrderIndex, string NotesPlaceholder);

    private static List<TemplateSectionEntry> DeserializeTemplateSections(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<TemplateSectionEntry>>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
        }
        catch
        {
            return [];
        }
    }
}
