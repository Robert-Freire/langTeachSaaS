using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/courses")]
[Authorize]
public class CoursesController : ControllerBase
{
    private static readonly JsonSerializerOptions CaseInsensitiveOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly IProfileService _profileService;
    private readonly ICurriculumGenerationService _curriculumService;
    private readonly ICurriculumTemplateService _templateService;
    private readonly AppDbContext _db;
    private readonly ILogger<CoursesController> _logger;

    public CoursesController(
        IProfileService profileService,
        ICurriculumGenerationService curriculumService,
        ICurriculumTemplateService templateService,
        AppDbContext db,
        ILogger<CoursesController> logger)
    {
        _profileService = profileService;
        _curriculumService = curriculumService;
        _templateService = templateService;
        _db = db;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var courses = await _db.Courses
            .Include(c => c.Student)
            .Include(c => c.Entries)
            .Where(c => c.TeacherId == teacherId && !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(ct);

        return Ok(courses.Select(MapToSummary));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCourseRequest request, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        if (request.Mode == "exam-prep" && string.IsNullOrWhiteSpace(request.TargetExam))
            return BadRequest("TargetExam is required when Mode is 'exam-prep'.");

        // When a template is provided it supplies the CEFR level; otherwise require it explicitly.
        if (request.Mode == "general" && string.IsNullOrWhiteSpace(request.TargetCefrLevel)
            && string.IsNullOrEmpty(request.TemplateLevel))
            return BadRequest("TargetCefrLevel is required when Mode is 'general'.");

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        Student? student = null;
        if (request.StudentId.HasValue)
        {
            student = await _db.Students
                .FirstOrDefaultAsync(s => s.Id == request.StudentId.Value && s.TeacherId == teacherId && !s.IsDeleted, ct);
            if (student is null)
                return BadRequest("Invalid StudentId: student not found or does not belong to you.");
        }

        if (!string.IsNullOrEmpty(request.TemplateLevel) && request.Mode != "general")
            return BadRequest("TemplateLevel can only be used with mode 'general'.");

        // Resolve CEFR level from template (authoritative) or from the request.
        string? resolvedCefrLevel = request.TargetCefrLevel;
        if (!string.IsNullOrEmpty(request.TemplateLevel))
        {
            var templateData = _templateService.GetByLevel(request.TemplateLevel);
            if (templateData is null)
                return BadRequest($"Template '{request.TemplateLevel}' not found.");

            // Reject mismatches: if the caller supplied a CEFR level it must match the template's.
            if (!string.IsNullOrEmpty(request.TargetCefrLevel) &&
                !string.Equals(request.TargetCefrLevel, templateData.CefrLevel, StringComparison.OrdinalIgnoreCase))
                return BadRequest(
                    $"TargetCefrLevel '{request.TargetCefrLevel}' does not match template CEFR level '{templateData.CefrLevel}'.");

            resolvedCefrLevel = templateData.CefrLevel;
        }

        List<CurriculumEntry> entries;
        int resolvedSessionCount;

        var ctx = BuildCurriculumContext(request, student, resolvedCefrLevel);
        try
        {
            entries = await _curriculumService.GenerateAsync(ctx, ct);
        }
        catch (CurriculumGenerationException ex)
        {
            _logger.LogError(ex, "Curriculum generation failed for TeacherId={TeacherId}", teacherId);
            return StatusCode(502, new { error = "Curriculum generation failed. Please try again." });
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Curriculum generation returned invalid JSON for TeacherId={TeacherId}", teacherId);
            return StatusCode(502, new { error = "Curriculum generation failed. Please try again." });
        }

        resolvedSessionCount = !string.IsNullOrEmpty(request.TemplateLevel)
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
        };

        foreach (var entry in entries)
            entry.CourseId = course.Id;

        _db.Courses.Add(course);
        _db.CurriculumEntries.AddRange(entries);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "POST /api/courses created. CourseId={CourseId} TeacherId={TeacherId} Entries={Entries}",
            course.Id, teacherId, entries.Count);

        course.Student = student;
        course.Entries = entries;
        return CreatedAtAction(nameof(GetById), new { id = course.Id }, MapToDto(course));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var course = await _db.Courses
            .Include(c => c.Student)
            .Include(c => c.Entries)
            .FirstOrDefaultAsync(c => c.Id == id && c.TeacherId == teacherId && !c.IsDeleted, ct);

        if (course is null) return NotFound();
        return Ok(MapToDto(course));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCourseRequest request, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var course = await _db.Courses
            .FirstOrDefaultAsync(c => c.Id == id && c.TeacherId == teacherId && !c.IsDeleted, ct);

        if (course is null) return NotFound();

        if (request.Name is not null) course.Name = request.Name;
        if (request.Description is not null) course.Description = request.Description;
        course.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var course = await _db.Courses
            .FirstOrDefaultAsync(c => c.Id == id && c.TeacherId == teacherId && !c.IsDeleted, ct);

        if (course is null) return NotFound();

        course.IsDeleted = true;
        course.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPut("{id:guid}/curriculum/reorder")]
    public async Task<IActionResult> Reorder(Guid id, [FromBody] ReorderCurriculumRequest request, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var course = await _db.Courses
            .Include(c => c.Entries)
            .FirstOrDefaultAsync(c => c.Id == id && c.TeacherId == teacherId && !c.IsDeleted, ct);

        if (course is null) return NotFound();

        var entryMap = course.Entries.ToDictionary(e => e.Id);
        if (request.OrderedEntryIds.Count != entryMap.Count ||
            request.OrderedEntryIds.Distinct().Count() != entryMap.Count ||
            request.OrderedEntryIds.Any(eid => !entryMap.ContainsKey(eid)))
            return BadRequest("OrderedEntryIds must contain all entry IDs for this course exactly once.");

        for (var i = 0; i < request.OrderedEntryIds.Count; i++)
            entryMap[request.OrderedEntryIds[i]].OrderIndex = i + 1;

        course.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPut("{id:guid}/curriculum/{entryId:guid}")]
    public async Task<IActionResult> UpdateEntry(Guid id, Guid entryId, [FromBody] UpdateCurriculumEntryRequest request, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var course = await _db.Courses
            .FirstOrDefaultAsync(c => c.Id == id && c.TeacherId == teacherId && !c.IsDeleted, ct);
        if (course is null) return NotFound();

        var entry = await _db.CurriculumEntries
            .FirstOrDefaultAsync(e => e.Id == entryId && e.CourseId == id, ct);
        if (entry is null) return NotFound();

        entry.Topic = request.Topic;
        entry.GrammarFocus = request.GrammarFocus;
        entry.Competencies = request.Competencies ?? string.Empty;
        entry.LessonType = request.LessonType;
        if (request.Status is not null) entry.Status = request.Status;
        course.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return Ok(MapEntryToDto(entry));
    }

    [HttpPost("{id:guid}/curriculum/{entryId:guid}/lesson")]
    public async Task<IActionResult> GenerateLessonFromEntry(Guid id, Guid entryId, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var course = await _db.Courses
            .FirstOrDefaultAsync(c => c.Id == id && c.TeacherId == teacherId && !c.IsDeleted, ct);
        if (course is null) return NotFound();

        var entry = await _db.CurriculumEntries
            .FirstOrDefaultAsync(e => e.Id == entryId && e.CourseId == id, ct);
        if (entry is null) return NotFound();

        var now = DateTime.UtcNow;
        var objectives = entry.GrammarFocus is not null
            ? $"Grammar: {entry.GrammarFocus}. Competencies: {entry.Competencies}."
            : $"Competencies: {entry.Competencies}.";
        if (!string.IsNullOrEmpty(entry.CompetencyFocus))
            objectives += $" Skill focus: {entry.CompetencyFocus}.";

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
            "POST /api/courses/{CourseId}/curriculum/{EntryId}/lesson created LessonId={LessonId}",
            id, entryId, lesson.Id);

        return Ok(new { lessonId = lesson.Id });
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
                ? TryDeserializeStringArray(student.Interests)
                : null,
            StudentGoals: student is not null
                ? TryDeserializeStringArray(student.LearningGoals)
                : null,
            TemplateLevel: string.IsNullOrWhiteSpace(req.TemplateLevel) ? null : req.TemplateLevel,
            TemplateUnits: null,
            StudentWeaknesses: student is not null
                ? TryDeserializeStringArray(student.Weaknesses)
                : null,
            StudentDifficulties: student is not null
                ? TryDeserializeDifficultyArray(student.Difficulties)
                : null,
            TeacherNotes: req.TeacherNotes
        );

    private static CurriculumEntryDto MapEntryToDto(CurriculumEntry e) =>
        new(e.Id, e.OrderIndex, e.Topic, e.GrammarFocus, e.Competencies, e.LessonType, e.LessonId, e.Status, e.TemplateUnitRef, e.CompetencyFocus, e.ContextDescription, e.PersonalizationNotes, e.VocabularyThemes);

    private static CourseDto MapToDto(Course c) =>
        new(
            c.Id, c.Name, c.Description, c.Language, c.Mode,
            c.TargetCefrLevel, c.TargetExam, c.ExamDate,
            c.SessionCount, c.StudentId, c.Student?.Name,
            LessonsCreated: c.Entries.Count(e => e.Status == "created" || e.Status == "taught"),
            c.CreatedAt, c.UpdatedAt,
            c.Entries.OrderBy(e => e.OrderIndex).Select(MapEntryToDto).ToList()
        );

    private static string[] TryDeserializeStringArray(string json)
    {
        try { return JsonSerializer.Deserialize<string[]>(json) ?? []; }
        catch (JsonException) { return []; }
    }

    private static DifficultyDto[] TryDeserializeDifficultyArray(string json)
    {
        try { return JsonSerializer.Deserialize<DifficultyDto[]>(json, CaseInsensitiveOptions) ?? []; }
        catch (JsonException) { return []; }
    }

    private static CourseSummaryDto MapToSummary(Course c) =>
        new(
            c.Id, c.Name, c.Description, c.Language, c.Mode,
            c.TargetCefrLevel, c.TargetExam,
            c.SessionCount, c.StudentId, c.Student?.Name,
            LessonsCreated: c.Entries.Count(e => e.Status == "created" || e.Status == "taught"),
            c.CreatedAt
        );
}
