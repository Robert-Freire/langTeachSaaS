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
        var reflectionTask = _reflectionExtractionService.ExtractAsync(request.Text, knownDifficulties, ct);

        await Task.WhenAll(studentTask, reflectionTask);

        var studentExtraction = await studentTask;
        var reflectionExtraction = await reflectionTask;

        SessionLogDto? session = null;
        if (student != null && request.SessionId.HasValue)
            session = await _sessionLogService.GetByIdAsync(teacherId, student.Id, request.SessionId.Value, ct);

        var proposals = new List<ProposalDto>();

        // Detect new student intent: extracted name is present and differs from current student context
        var extractedName = studentExtraction.Name?.Trim();
        bool isNewStudentIntent = !string.IsNullOrWhiteSpace(extractedName)
            && (student == null
                || !string.Equals(student.Name.Trim(), extractedName, StringComparison.OrdinalIgnoreCase));

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

            foreach (var todo in reflectionExtraction.TeachingTodos)
            {
                if (!string.IsNullOrWhiteSpace(todo))
                    proposals.Add(new ProposalDto(Guid.NewGuid().ToString(), "todo", "text", "Teaching Todo", null, todo));
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
