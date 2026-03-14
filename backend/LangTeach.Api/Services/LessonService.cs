using System.Text.Json;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class LessonService : ILessonService
{
    private readonly AppDbContext _db;
    private readonly ILogger<LessonService> _logger;

    public LessonService(AppDbContext db, ILogger<LessonService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<PagedResult<LessonDto>> ListAsync(Guid teacherId, LessonListQuery query, CancellationToken cancellationToken = default)
    {
        var page = Math.Max(query.Page, 1);
        var pageSize = query.PageSize;

        var q = _db.Lessons
            .Include(l => l.Sections)
            .Where(l => l.TeacherId == teacherId && !l.IsDeleted);

        if (!string.IsNullOrWhiteSpace(query.Language))
            q = q.Where(l => l.Language == query.Language);

        if (!string.IsNullOrWhiteSpace(query.CefrLevel))
            q = q.Where(l => l.CefrLevel == query.CefrLevel);

        if (!string.IsNullOrWhiteSpace(query.Status))
            q = q.Where(l => l.Status == query.Status);

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

        return MapToDto(lesson);
    }

    public async Task<LessonUpdateResult> UpdateAsync(Guid teacherId, Guid lessonId, UpdateLessonRequest request, CancellationToken cancellationToken = default)
    {
        var lesson = await _db.Lessons
            .Include(l => l.Sections)
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
        lesson.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Lesson updated. TeacherId={TeacherId} LessonId={LessonId}", teacherId, lesson.Id);

        return new LessonUpdateResult.Success(MapToDto(lesson));
    }

    public async Task<LessonDto?> UpdateSectionsAsync(Guid teacherId, Guid lessonId, UpdateLessonSectionsRequest request, CancellationToken cancellationToken = default)
    {
        var lesson = await _db.Lessons
            .Include(l => l.Sections)
            .FirstOrDefaultAsync(l => l.Id == lessonId && l.TeacherId == teacherId && !l.IsDeleted, cancellationToken);

        if (lesson is null)
            return null;

        _db.LessonSections.RemoveRange(lesson.Sections);

        var now = DateTime.UtcNow;
        var newSections = request.Sections.Select(s => new LessonSection
        {
            Id = Guid.NewGuid(),
            LessonId = lessonId,
            SectionType = s.SectionType,
            OrderIndex = s.OrderIndex,
            Notes = s.Notes,
            CreatedAt = now,
            UpdatedAt = now,
        }).ToList();

        _db.LessonSections.AddRange(newSections);
        lesson.UpdatedAt = now;

        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Lesson sections updated. TeacherId={TeacherId} LessonId={LessonId} SectionCount={Count}",
            teacherId, lessonId, newSections.Count);

        lesson.Sections = newSections;
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

        return MapToDto(copy);
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
        l.Sections.OrderBy(s => s.OrderIndex).Select(MapSectionToDto).ToList(),
        l.CreatedAt,
        l.UpdatedAt
    );

    private static LessonSectionDto MapSectionToDto(LessonSection s) => new(
        s.Id,
        s.SectionType,
        s.OrderIndex,
        s.Notes
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
