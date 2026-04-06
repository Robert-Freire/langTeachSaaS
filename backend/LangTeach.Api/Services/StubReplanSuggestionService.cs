using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

/// <summary>
/// E2E/testing stub: returns deterministic suggestions without calling Claude.
/// </summary>
public class StubReplanSuggestionService : IReplanSuggestionService
{
    private readonly AppDbContext _db;
    private readonly ILogger<StubReplanSuggestionService> _logger;

    public StubReplanSuggestionService(AppDbContext db, ILogger<StubReplanSuggestionService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<List<CourseSuggestionDto>> GenerateSuggestionsAsync(
        Guid courseId, Guid teacherId, CancellationToken ct = default)
    {
        var course = await _db.Courses
            .Include(c => c.Entries.Where(e => !e.IsDeleted))
            .FirstOrDefaultAsync(c => c.Id == courseId && c.TeacherId == teacherId && !c.IsDeleted, ct);

        if (course is null)
            throw new KeyNotFoundException($"Course {courseId} not found.");

        // Remove existing pending suggestions
        var existingPending = await _db.CourseSuggestions
            .Where(s => s.CourseId == courseId && s.Status == "pending")
            .ToListAsync(ct);
        _db.CourseSuggestions.RemoveRange(existingPending);

        var plannedEntry = course.Entries
            .Where(e => e.Status == "planned" || e.Status == "created")
            .OrderBy(e => e.OrderIndex)
            .FirstOrDefault();

        var now = DateTime.UtcNow;
        var suggestions = new List<CourseSuggestion>
        {
            new()
            {
                Id = Guid.NewGuid(),
                CourseId = courseId,
                CurriculumEntryId = plannedEntry?.Id,
                ProposedChange = "Add a 10-minute subjunctive review activity at the start of this session.",
                Reasoning = "Student struggled with subjunctive in the previous lesson (AreasToImprove: subjunctive mood).",
                Status = "pending",
                GeneratedAt = now,
            },
            new()
            {
                Id = Guid.NewGuid(),
                CourseId = courseId,
                CurriculumEntryId = null,
                ProposedChange = "Increase speaking practice time in upcoming lessons by 15 minutes.",
                Reasoning = "Student has a speaking difficulty noted in their profile and recent lessons under-covered oral production.",
                Status = "pending",
                GeneratedAt = now,
            },
        };

        _db.CourseSuggestions.AddRange(suggestions);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Stub: generated {Count} replan suggestions for course {CourseId}", suggestions.Count, courseId);

        return await GetSuggestionsAsync(courseId, teacherId, ct);
    }

    public async Task<List<CourseSuggestionDto>> GetSuggestionsAsync(
        Guid courseId, Guid teacherId, CancellationToken ct = default)
    {
        var course = await _db.Courses
            .FirstOrDefaultAsync(c => c.Id == courseId && c.TeacherId == teacherId && !c.IsDeleted, ct);

        if (course is null)
            throw new KeyNotFoundException($"Course {courseId} not found.");

        var suggestions = await _db.CourseSuggestions
            .Include(s => s.CurriculumEntry)
            .Where(s => s.CourseId == courseId)
            .OrderByDescending(s => s.GeneratedAt)
            .ToListAsync(ct);

        return suggestions.Select(ReplanSuggestionResponder.ToDto).ToList();
    }

    public async Task<CourseSuggestionDto?> RespondAsync(
        Guid courseId, Guid suggestionId, Guid teacherId, string action, string? teacherEdit, CancellationToken ct = default)
    {
        var suggestion = await _db.CourseSuggestions
            .Include(s => s.Course)
            .Include(s => s.CurriculumEntry)
            .FirstOrDefaultAsync(s => s.Id == suggestionId && s.CourseId == courseId && s.Course.TeacherId == teacherId, ct);

        if (suggestion is null)
            return null;

        ReplanSuggestionResponder.Apply(suggestion, action, teacherEdit);

        await _db.SaveChangesAsync(ct);
        return ReplanSuggestionResponder.ToDto(suggestion);
    }
}
