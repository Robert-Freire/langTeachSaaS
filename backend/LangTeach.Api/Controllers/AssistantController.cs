using System.Security.Claims;
using System.Text.Json;
using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssistantController : ControllerBase
{
    private readonly IStudentService _studentService;
    private readonly ISessionLogService _sessionLogService;
    private readonly IStudentProfileExtractionService _studentExtractionService;
    private readonly IReflectionExtractionService _reflectionExtractionService;
    private readonly IProfileService _profileService;
    private readonly IPedagogyConfigService _pedagogy;
    private readonly AppDbContext _db;
    private readonly ILogger<AssistantController> _logger;

    public AssistantController(
        IStudentService studentService,
        ISessionLogService sessionLogService,
        IStudentProfileExtractionService studentExtractionService,
        IReflectionExtractionService reflectionExtractionService,
        IProfileService profileService,
        IPedagogyConfigService pedagogy,
        AppDbContext db,
        ILogger<AssistantController> logger)
    {
        _studentService = studentService;
        _sessionLogService = sessionLogService;
        _studentExtractionService = studentExtractionService;
        _reflectionExtractionService = reflectionExtractionService;
        _profileService = profileService;
        _pedagogy = pedagogy;
        _db = db;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpPost("propose")]
    public async Task<IActionResult> Propose([FromBody] AssistantProposeRequest request, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest("Text is required.");

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        StudentDto? student = null;
        if (request.StudentId.HasValue)
            student = await _studentService.GetByIdAsync(teacherId, request.StudentId.Value, ct);

        var knownDifficulties = student?.Profile.Difficulties
            .Select(d => d.Description ?? "")
            .Where(d => !string.IsNullOrWhiteSpace(d))
            .ToList() as IReadOnlyList<string>;

        var studentTask = _studentExtractionService.ExtractAsync(request.Text, ct);
        var reflectionTask = _reflectionExtractionService.ExtractAsync(request.Text, knownDifficulties, hasOpenSession: request.SessionId.HasValue, ct);

        await Task.WhenAll(studentTask, reflectionTask);

        var studentExtraction = await studentTask;
        var reflectionExtraction = await reflectionTask;

        SessionLogDto? session = null;
        if (student != null && request.SessionId.HasValue)
            session = await _sessionLogService.GetByIdAsync(teacherId, student.Id, request.SessionId.Value, ct);

        var proposals = new List<ProposalDto>();

        // Detect new student intent via LLM flag or absence of context student with a name present.
        var extractedName = studentExtraction.Name?.Trim();
        bool isNewStudentIntent = studentExtraction.NewStudentIntent
            || (student == null && !string.IsNullOrWhiteSpace(extractedName));

        var camelCaseOpts = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        if (isNewStudentIntent && !string.IsNullOrWhiteSpace(extractedName))
        {
            var newStudentPayload = new
            {
                name = extractedName,
                birthYear = studentExtraction.BirthYear,
                profession = studentExtraction.Profession,
                cityOfResidence = studentExtraction.CityOfResidence,
                countryOfResidence = studentExtraction.CountryOfResidence,
                nativeLanguages = studentExtraction.NativeLanguages,
                learningLanguage = studentExtraction.LearningLanguage,
                cefrLevel = studentExtraction.CefrLevel,
                reasonForStudying = studentExtraction.ReasonForStudying,
            };
            var payloadElement = JsonSerializer.SerializeToElement(newStudentPayload, camelCaseOpts);
            proposals.Add(new ProposalDto(Guid.NewGuid().ToString(), "newStudent", "profile", "New Student", null, extractedName!, Payload: null, NewStudentPayload: payloadElement));
        }

        if (student != null)
        {
            var studentFieldValues = new Dictionary<string, (string? current, string? extracted)>
            {
                ["cefrLevel"] = (student.Level.CefrLevel, studentExtraction.CefrLevel),
                ["profession"] = (student.Identity.Profession, studentExtraction.Profession),
                ["countryOfResidence"] = (student.Identity.CountryOfResidence, studentExtraction.CountryOfResidence),
            };
            foreach (var f in _pedagogy.ProposalFields.StudentFields)
            {
                if (studentFieldValues.TryGetValue(f.Field, out var vals))
                    EmitProposal(proposals, "student", f.Field, f.Label, vals.current, vals.extracted);
            }

            var skillExtractedValues = new Dictionary<string, string?>
            {
                ["Reading"] = studentExtraction.SkillLevelReading,
                ["Writing"] = studentExtraction.SkillLevelWriting,
                ["Speaking"] = studentExtraction.SkillLevelSpeaking,
                ["Listening"] = studentExtraction.SkillLevelListening,
            };
            foreach (var f in _pedagogy.ProposalFields.SkillLevelFields)
            {
                student.Level.SkillLevelOverrides.TryGetValue(f.SkillKey, out var curVal);
                EmitProposal(proposals, "student", f.Field, f.Label, curVal, skillExtractedValues.GetValueOrDefault(f.SkillKey));
            }

            foreach (var todo in reflectionExtraction.TeachingTodos)
            {
                if (!string.IsNullOrWhiteSpace(todo.Text))
                {
                    var todoPayload = JsonSerializer.SerializeToElement(new { dueDate = todo.DueDate }, camelCaseOpts);
                    proposals.Add(new ProposalDto(Guid.NewGuid().ToString(), "todo", "text", "Teaching Todo", null, todo.Text, Payload: todoPayload));
                }
            }

            if (studentExtraction.Interests.Count > 0)
            {
                var interestsPayload = new { appendInterests = studentExtraction.Interests };
                var interestsElement = JsonSerializer.SerializeToElement(interestsPayload, camelCaseOpts);
                var interestsDisplay = string.Join(", ", studentExtraction.Interests);
                proposals.Add(new ProposalDto(Guid.NewGuid().ToString(), "student", "interests", "Interests",
                    null, interestsDisplay, interestsElement, "append"));
            }

            if (studentExtraction.Difficulties.Count > 0)
            {
                var diffItems = studentExtraction.Difficulties
                    .Select(d => new { description = d.Description, competency = d.Competency, subcategory = d.Subcategory })
                    .ToList();
                var diffsPayload = new { appendDifficulties = diffItems };
                var diffsElement = JsonSerializer.SerializeToElement(diffsPayload, camelCaseOpts);
                var diffsDisplay = string.Join("; ", studentExtraction.Difficulties.Select(d => d.Description));
                proposals.Add(new ProposalDto(Guid.NewGuid().ToString(), "student", "difficulties", "Difficulties",
                    null, diffsDisplay, diffsElement, "append"));
            }

            if (studentExtraction.ShortTermObjectives.Count > 0)
            {
                var goalsPayload = new { learningGoals = studentExtraction.ShortTermObjectives.Select(o => o.Text).ToList() };
                var goalsElement = JsonSerializer.SerializeToElement(goalsPayload, camelCaseOpts);
                var goalsDisplay = string.Join("; ", studentExtraction.ShortTermObjectives.Select(o => o.Text));
                proposals.Add(new ProposalDto(Guid.NewGuid().ToString(), "student", "learningGoals", "Learning Goals",
                    null, goalsDisplay, goalsElement, "replace"));
            }

            if (!string.IsNullOrWhiteSpace(studentExtraction.TeachingNotes))
            {
                var notesPayload = new { appendTeachingNotes = studentExtraction.TeachingNotes };
                var notesElement = JsonSerializer.SerializeToElement(notesPayload, camelCaseOpts);
                proposals.Add(new ProposalDto(Guid.NewGuid().ToString(), "student", "teachingNotes", "Teaching Notes",
                    student.Profile.TeachingNotes, studentExtraction.TeachingNotes, notesElement, "append"));
            }
        }

        var sessionFieldValues = new Dictionary<string, (string? current, string? extracted)>
        {
            ["title"] = (session?.Title, reflectionExtraction.SessionTitle),
            ["actualContent"] = (session?.ActualContent, reflectionExtraction.WhatWasCovered?.Value),
            ["generalNotes"] = (session?.GeneralNotes, reflectionExtraction.AreasToImprove?.Value),
            ["homeworkAssigned"] = (session?.HomeworkAssigned, reflectionExtraction.HomeworkAssigned?.Value),
        };
        foreach (var f in _pedagogy.ProposalFields.SessionFields)
        {
            if (sessionFieldValues.TryGetValue(f.Field, out var vals))
                EmitProposal(proposals, "session", f.Field, f.Label, vals.current, vals.extracted);
        }

        if (reflectionExtraction.ProposedNewSession is { } proposed)
        {
            var sessionDate = proposed.Date ?? DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");
            var newSessionPayload = new { title = proposed.Title, sessionDate };
            var payloadElement = JsonSerializer.SerializeToElement(newSessionPayload, camelCaseOpts);
            proposals.Add(new ProposalDto(
                Guid.NewGuid().ToString(),
                "newSession",
                "newSession",
                "New Session",
                null,
                proposed.Title,
                payloadElement));
        }

        return Ok(new AssistantProposeResponse(proposals, request.VoiceNoteId));
    }

    [HttpPost("voice-notes/{voiceNoteId:guid}/feedback")]
    public async Task<IActionResult> SubmitFeedback(Guid voiceNoteId, [FromBody] AssistantFeedbackRequest request, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var now = DateTime.UtcNow;

        var existing = await _db.AssistantTurnFeedbacks
            .FirstOrDefaultAsync(f => f.VoiceNoteId == voiceNoteId && f.TeacherId == teacherId, ct);

        if (existing is not null)
        {
            existing.Rating = request.Rating;
            existing.Reason = request.Reason;
            existing.ProposalsJson = request.ProposalsJson;
            existing.StudentId = request.StudentId;
            existing.SessionLogId = request.SessionLogId;
            existing.UpdatedAt = now;
        }
        else
        {
            _db.AssistantTurnFeedbacks.Add(new AssistantTurnFeedback
            {
                Id = Guid.NewGuid(),
                TeacherId = teacherId,
                VoiceNoteId = voiceNoteId,
                StudentId = request.StudentId,
                SessionLogId = request.SessionLogId,
                Rating = request.Rating,
                Reason = request.Reason,
                ProposalsJson = request.ProposalsJson,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static void EmitProposal(
        List<ProposalDto> proposals,
        string type,
        string field,
        string label,
        string? oldValue,
        string? newValue)
    {
        if (string.IsNullOrWhiteSpace(newValue)) return;
        if (string.Equals(oldValue?.Trim(), newValue.Trim(), StringComparison.OrdinalIgnoreCase)) return;
        proposals.Add(new ProposalDto(Guid.NewGuid().ToString(), type, field, label, oldValue, newValue));
    }
}
