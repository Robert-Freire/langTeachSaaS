using System.Text.Json;
using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class ReplanSuggestionService : IReplanSuggestionService
{
    private readonly AppDbContext _db;
    private readonly IClaudeClient _claude;
    private readonly IPromptService _prompts;
    private readonly ILogger<ReplanSuggestionService> _logger;

    private const int MaxSuggestions = 5;

    public ReplanSuggestionService(
        AppDbContext db,
        IClaudeClient claude,
        IPromptService prompts,
        ILogger<ReplanSuggestionService> logger)
    {
        _db = db;
        _claude = claude;
        _prompts = prompts;
        _logger = logger;
    }

    public async Task<List<CourseSuggestionDto>> GenerateSuggestionsAsync(
        Guid courseId, Guid teacherId, CancellationToken ct = default)
    {
        var course = await _db.Courses
            .Include(c => c.Entries.Where(e => !e.IsDeleted))
            .Include(c => c.Student)
            .FirstOrDefaultAsync(c => c.Id == courseId && c.TeacherId == teacherId && !c.IsDeleted, ct);

        if (course is null)
            throw new KeyNotFoundException($"Course {courseId} not found.");

        // Get lesson notes for taught entries in this course, via the join path:
        // LessonNote.LessonId -> CurriculumEntry.LessonId -> CurriculumEntry.CourseId
        var taughtLessonIds = course.Entries
            .Where(e => e.Status == "taught" && e.LessonId.HasValue)
            .Select(e => e.LessonId!.Value)
            .ToList();

        var lessonNotes = taughtLessonIds.Count > 0
            ? await _db.LessonNotes
                .Where(n => taughtLessonIds.Contains(n.LessonId))
                .ToListAsync(ct)
            : [];

        // Build context for the AI prompt
        var taughtEntries = course.Entries
            .Where(e => e.Status == "taught")
            .OrderBy(e => e.OrderIndex)
            .Select(e =>
            {
                var note = lessonNotes.FirstOrDefault(n => n.LessonId == e.LessonId);
                return new TaughtEntryContext(e.Topic, e.GrammarFocus, note?.WhatWasCovered, note?.AreasToImprove);
            })
            .ToList();

        var plannedEntries = course.Entries
            .Where(e => e.Status == "planned" || e.Status == "created")
            .OrderBy(e => e.OrderIndex)
            .Select(e => new PlannedEntryContext(e.Id, e.OrderIndex, e.Topic, e.GrammarFocus))
            .ToList();

        var difficulties = new List<string>();
        if (course.Student is not null)
        {
            try
            {
                var parsed = JsonSerializer.Deserialize<List<JsonElement>>(course.Student.Difficulties);
                if (parsed is not null)
                {
                    foreach (var item in parsed)
                    {
                        if (item.TryGetProperty("description", out var desc))
                            difficulties.Add(desc.GetString() ?? "");
                    }
                }
            }
            catch (JsonException) { /* malformed, skip */ }
        }

        var promptContext = new ReplanSuggestionContext(
            course.Name, course.Language, course.TargetCefrLevel, course.Student?.Name,
            taughtEntries, plannedEntries, difficulties, MaxSuggestions);

        var request = _prompts.BuildReplanSuggestionPrompt(promptContext) with { CallSite = "replanning" };

        ClaudeResponse response;
        try
        {
            response = await _claude.CompleteAsync(request, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Claude API call failed during replan suggestion generation for course {CourseId}", courseId);
            throw;
        }

        var plannedEntryIds = plannedEntries.Select(e => e.Id).ToHashSet();
        var suggestions = ParseSuggestions(response.Content, courseId, plannedEntryIds);

        if (suggestions is null)
        {
            _logger.LogWarning(
                "Keeping existing pending suggestions because replan parsing failed for course {CourseId}",
                courseId);
            return await GetSuggestionsAsync(courseId, teacherId, ct);
        }

        // Replace existing pending suggestions for this course
        var existingPending = await _db.CourseSuggestions
            .Where(s => s.CourseId == courseId && s.Status == "pending")
            .ToListAsync(ct);
        _db.CourseSuggestions.RemoveRange(existingPending);
        _db.CourseSuggestions.AddRange(suggestions);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Generated {Count} replan suggestions for course {CourseId}, teacher {TeacherId}",
            suggestions.Count, courseId, teacherId);

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
            .ThenBy(s => s.CurriculumEntry == null ? 999 : s.CurriculumEntry.OrderIndex)
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

    /// <summary>
    /// Returns a list of parsed suggestions on success (may be empty if the model found no gaps),
    /// or null if the AI response was malformed so callers can preserve existing pending suggestions.
    /// </summary>
    internal List<CourseSuggestion>? ParseSuggestions(
        string json,
        Guid courseId,
        HashSet<Guid> validPlannedEntryIds)
    {
        var now = DateTime.UtcNow;
        var result = new List<CourseSuggestion>();

        try
        {
            using var doc = JsonDocument.Parse(json.Trim());
            var root = doc.RootElement;

            if (!root.TryGetProperty("suggestions", out var suggestionsEl) ||
                suggestionsEl.ValueKind != JsonValueKind.Array)
            {
                _logger.LogWarning(
                    "Replan AI response missing 'suggestions' array for course {CourseId}. PayloadLength={PayloadLength}",
                    courseId, json.Length);
                return null;
            }

            foreach (var item in suggestionsEl.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object)
                    continue;

                var proposed = item.TryGetProperty("proposedChange", out var pc) &&
                               pc.ValueKind == JsonValueKind.String
                    ? pc.GetString()
                    : null;
                var reasoning = item.TryGetProperty("reasoning", out var r) &&
                                r.ValueKind == JsonValueKind.String
                    ? r.GetString()
                    : null;

                if (string.IsNullOrWhiteSpace(proposed) || string.IsNullOrWhiteSpace(reasoning))
                    continue;

                Guid? entryId = null;
                if (item.TryGetProperty("curriculumEntryId", out var eid) &&
                    eid.ValueKind == JsonValueKind.String &&
                    Guid.TryParse(eid.GetString(), out var parsedId) &&
                    validPlannedEntryIds.Contains(parsedId))
                {
                    entryId = parsedId;
                }

                result.Add(new CourseSuggestion
                {
                    Id = Guid.NewGuid(),
                    CourseId = courseId,
                    CurriculumEntryId = entryId,
                    ProposedChange = proposed!,
                    Reasoning = reasoning!,
                    Status = "pending",
                    GeneratedAt = now,
                });

                if (result.Count >= MaxSuggestions)
                    break;
            }
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to parse replan suggestion JSON for course {CourseId}. PayloadLength={PayloadLength}",
                courseId, json.Length);
            return null;
        }

        return result;
    }

}

/// <summary>
/// Shared accept/dismiss logic used by both ReplanSuggestionService and StubReplanSuggestionService.
/// </summary>
internal static class ReplanSuggestionResponder
{
    internal static void Apply(CourseSuggestion suggestion, string action, string? teacherEdit)
    {
        if (suggestion.Status != "pending")
            throw new InvalidOperationException($"Only pending suggestions can be responded to. Current status: {suggestion.Status}.");

        if (action == "accept")
        {
            suggestion.Status = "accepted";
            suggestion.TeacherEdit = teacherEdit;
            suggestion.RespondedAt = DateTime.UtcNow;

            if (suggestion.CurriculumEntry is not null)
            {
                var changeText = string.IsNullOrWhiteSpace(teacherEdit)
                    ? suggestion.ProposedChange
                    : teacherEdit;
                var existing = suggestion.CurriculumEntry.PersonalizationNotes;
                suggestion.CurriculumEntry.PersonalizationNotes = string.IsNullOrWhiteSpace(existing)
                    ? $"[Adaptive replan] {changeText}"
                    : $"{existing}\n[Adaptive replan] {changeText}";
            }
        }
        else if (action == "dismiss")
        {
            suggestion.Status = "dismissed";
            suggestion.RespondedAt = DateTime.UtcNow;
        }
        else
        {
            throw new ArgumentException($"Invalid action '{action}'. Must be 'accept' or 'dismiss'.");
        }
    }

    internal static CourseSuggestionDto ToDto(CourseSuggestion s) =>
        new(
            s.Id,
            s.CourseId,
            s.CurriculumEntryId,
            s.CurriculumEntry?.Topic,
            s.CurriculumEntry?.OrderIndex,
            s.ProposedChange,
            s.Reasoning,
            s.Status,
            s.TeacherEdit,
            s.GeneratedAt,
            s.RespondedAt
        );
}
