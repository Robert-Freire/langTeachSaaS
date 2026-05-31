using System.Security.Claims;
using System.Text.Json;
using LangTeach.Api.AI;
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
    private readonly IPedagogyConfigService _pedagogy;
    private readonly IAssistantFeedbackService _feedbackService;
    private readonly IAssistantTargetResolver _targetResolver;
    private readonly ILogger<AssistantController> _logger;

    public AssistantController(
        IStudentService studentService,
        ISessionLogService sessionLogService,
        IStudentProfileExtractionService studentExtractionService,
        IReflectionExtractionService reflectionExtractionService,
        IProfileService profileService,
        IPedagogyConfigService pedagogy,
        IAssistantFeedbackService feedbackService,
        IAssistantTargetResolver targetResolver,
        ILogger<AssistantController> logger)
    {
        _studentService = studentService;
        _sessionLogService = sessionLogService;
        _studentExtractionService = studentExtractionService;
        _reflectionExtractionService = reflectionExtractionService;
        _profileService = profileService;
        _pedagogy = pedagogy;
        _feedbackService = feedbackService;
        _targetResolver = targetResolver;
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
        var reflectionTask = _reflectionExtractionService.ExtractAsync(request.Text, knownDifficulties, hasOpenSession: request.SessionLogId.HasValue, ct);

        await Task.WhenAll(studentTask, reflectionTask);

        var studentExtraction = await studentTask;
        var reflectionExtraction = await reflectionTask;

        SessionLogDto? session = null;
        if (student != null && request.SessionLogId.HasValue)
            session = await _sessionLogService.GetByIdAsync(teacherId, student.Id, request.SessionLogId.Value, ct);

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
                    proposals.Add(new ProposalDto(Guid.NewGuid().ToString(), "todo", "text", "Teaching Idea", null, todo.Text, Payload: null));
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

        // Resolve group target from transcript if a group mention was extracted.
        ResolvedTarget? resolvedTarget = null;
        bool hasAdminIntent = false;
        string? adminMemberName = null;
        if (!string.IsNullOrWhiteSpace(reflectionExtraction.RawGroupMention))
        {
            resolvedTarget = await _targetResolver.ResolveAsync(reflectionExtraction.RawGroupMention, teacherId, ct);

            // Detect administrative intent: student names from the extraction appearing alongside a group mention.
            // This signals "log session for the group + offer 1-to-1 for a named student" flow.
            var extractedStudentName = studentExtraction.Name?.Trim();
            if (!string.IsNullOrWhiteSpace(extractedStudentName) && student == null)
            {
                hasAdminIntent = true;
                adminMemberName = extractedStudentName;
            }
        }

        proposals.AddRange(ReflectionMapper.ToSessionFieldProposals(
            reflectionExtraction, session, _pedagogy.ProposalFields,
            resolvedTarget, hasAdminIntent, adminMemberName));

        Guid? suggestedSessionLogId = null;
        if (student != null && !request.SessionLogId.HasValue)
        {
            var sessions = await _sessionLogService.ListAsync(teacherId, student.Id, ct);
            suggestedSessionLogId = sessions
                .Where(s => !s.IsCancelled)
                .OrderByDescending(s => s.SessionDate ?? s.CreatedAt)
                .Select(s => (Guid?)s.Id)
                .FirstOrDefault();
        }

        // Provide the extracted session date+time so the frontend can use it when creating a new session
        // via the picker, regardless of whether a newSession proposal was generated.
        string? extractedSessionDate = null;
        if (reflectionExtraction.SessionDate is { } sd)
        {
            // sd is yyyy-MM-dd; st is HH:mm -- both guaranteed by the extraction schema.
            extractedSessionDate = reflectionExtraction.SessionStartTime is { } st
                ? $"{sd}T{st}"
                : sd;
        }

        return Ok(new AssistantProposeResponse(proposals, request.VoiceNoteId, suggestedSessionLogId, extractedSessionDate));
    }

    [HttpPost("voice-notes/{voiceNoteId:guid}/feedback")]
    public async Task<IActionResult> SubmitFeedback(Guid voiceNoteId, [FromBody] AssistantFeedbackRequest request, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var result = await _feedbackService.SubmitAsync(
            teacherId,
            voiceNoteId,
            request.Rating,
            request.Reason,
            request.StudentId,
            request.SessionLogId,
            request.ProposalsJson,
            ct);

        return result switch
        {
            AssistantFeedbackResult.VoiceNoteNotFound => NotFound(),
            _ => NoContent(),
        };
    }

    private static void EmitProposal(
        List<ProposalDto> proposals,
        string type,
        string field,
        string label,
        string? oldValue,
        string? newValue)
    {
        var proposal = ReflectionMapper.MakeFieldProposal(type, field, label, oldValue, newValue);
        if (proposal is not null) proposals.Add(proposal);
    }
}
