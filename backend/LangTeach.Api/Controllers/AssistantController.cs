using System.Security.Claims;
using System.Text.Json;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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
    private readonly ILogger<AssistantController> _logger;

    public AssistantController(
        IStudentService studentService,
        ISessionLogService sessionLogService,
        IStudentProfileExtractionService studentExtractionService,
        IReflectionExtractionService reflectionExtractionService,
        IProfileService profileService,
        ILogger<AssistantController> logger)
    {
        _studentService = studentService;
        _sessionLogService = sessionLogService;
        _studentExtractionService = studentExtractionService;
        _reflectionExtractionService = reflectionExtractionService;
        _profileService = profileService;
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

        if (isNewStudentIntent)
        {
            var newStudentPayload = new
            {
                name = extractedName,
                birthYear = studentExtraction.BirthYear,
                profession = studentExtraction.Profession,
                cityOfResidence = studentExtraction.CityOfResidence,
                nativeLanguages = studentExtraction.NativeLanguages,
                learningLanguage = studentExtraction.LearningLanguage,
                cefrLevel = studentExtraction.CefrLevel,
                reasonForStudying = studentExtraction.ReasonForStudying,
            };
            var payloadElement = JsonSerializer.SerializeToElement(newStudentPayload, camelCaseOpts);
            proposals.Add(new ProposalDto(Guid.NewGuid().ToString(), "newStudent", "profile", "New Student", null, extractedName!, payloadElement));
        }

        if (student != null)
        {
            EmitProposal(proposals, "student", "cefrLevel", "CEFR Level", student.Level.CefrLevel, studentExtraction.CefrLevel);
            EmitProposal(proposals, "student", "profession", "Profession", student.Identity.Profession, studentExtraction.Profession);
            EmitProposal(proposals, "student", "countryOfResidence", "Country of Residence", student.Identity.CountryOfResidence, studentExtraction.CountryOfResidence);

            student.Level.SkillLevelOverrides.TryGetValue("Reading", out var curReading);
            student.Level.SkillLevelOverrides.TryGetValue("Writing", out var curWriting);
            student.Level.SkillLevelOverrides.TryGetValue("Speaking", out var curSpeaking);
            student.Level.SkillLevelOverrides.TryGetValue("Listening", out var curListening);
            EmitProposal(proposals, "student", "skillLevel.reading", "Reading Level", curReading, studentExtraction.SkillLevelReading);
            EmitProposal(proposals, "student", "skillLevel.writing", "Writing Level", curWriting, studentExtraction.SkillLevelWriting);
            EmitProposal(proposals, "student", "skillLevel.speaking", "Speaking Level", curSpeaking, studentExtraction.SkillLevelSpeaking);
            EmitProposal(proposals, "student", "skillLevel.listening", "Listening Level", curListening, studentExtraction.SkillLevelListening);

            foreach (var todo in reflectionExtraction.TeachingTodos)
            {
                if (!string.IsNullOrWhiteSpace(todo))
                    proposals.Add(new ProposalDto(Guid.NewGuid().ToString(), "todo", "text", "Teaching Todo", null, todo));
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

        EmitProposal(proposals, "session", "title", "Session Title", session?.Title, reflectionExtraction.SessionTitle);
        EmitProposal(proposals, "session", "actualContent", "What Was Covered", session?.ActualContent, reflectionExtraction.WhatWasCovered?.Value);
        EmitProposal(proposals, "session", "generalNotes", "Areas to Improve", session?.GeneralNotes, reflectionExtraction.AreasToImprove?.Value);
        EmitProposal(proposals, "session", "homeworkAssigned", "Homework Assigned", session?.HomeworkAssigned, reflectionExtraction.HomeworkAssigned?.Value);

        if (!string.IsNullOrWhiteSpace(reflectionExtraction.NewSessionTitle))
        {
            var sessionDate = reflectionExtraction.NewSessionDate
                ?? DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");
            var newSessionPayload = new { title = reflectionExtraction.NewSessionTitle, sessionDate };
            var payloadElement = JsonSerializer.SerializeToElement(newSessionPayload, camelCaseOpts);
            proposals.Add(new ProposalDto(
                Guid.NewGuid().ToString(),
                "newSession",
                "newSession",
                "New Session",
                null,
                reflectionExtraction.NewSessionTitle,
                payloadElement));
        }

        return Ok(new AssistantProposeResponse(proposals));
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
