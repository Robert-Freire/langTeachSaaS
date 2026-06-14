using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text.Json;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/students/{studentId:guid}/sessions")]
[Authorize]
public class SessionLogsController : ControllerBase
{
    private readonly ISessionLogService _sessionLogService;
    private readonly IProfileService _profileService;
    private readonly ILogger<SessionLogsController> _logger;

    public SessionLogsController(
        ISessionLogService sessionLogService,
        IProfileService profileService,
        ILogger<SessionLogsController> logger)
    {
        _sessionLogService = sessionLogService;
        _profileService = profileService;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpGet]
    public async Task<IActionResult> List(Guid studentId, [FromQuery] bool includeGroups = false, CancellationToken cancellationToken = default)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        try
        {
            List<SessionLogDto> sessions;
            if (includeGroups)
                sessions = await _sessionLogService.ListForStudentIncludingGroupsAsync(teacherId, studentId, cancellationToken);
            else
                sessions = await _sessionLogService.ListAsync(teacherId, studentId, cancellationToken);

            _logger.LogInformation(
                "GET /api/students/{StudentId}/sessions?includeGroups={IncludeGroups}. TeacherId={TeacherId} Count={Count}",
                studentId, includeGroups, teacherId, sessions.Count);
            return Ok(sessions);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("{sessionId:guid}")]
    public async Task<IActionResult> GetById(Guid studentId, Guid sessionId, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var session = await _sessionLogService.GetByIdAsync(teacherId, studentId, sessionId, cancellationToken);

        if (session is null)
        {
            _logger.LogWarning(
                "GET /api/students/{StudentId}/sessions/{SessionId} not found. TeacherId={TeacherId}",
                studentId, sessionId, teacherId);
            return NotFound();
        }

        return Ok(session);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid studentId, [FromBody] CreateSessionLogRequest request, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        try
        {
            var session = await _sessionLogService.CreateAsync(teacherId, studentId, request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { studentId, sessionId = session.Id }, session);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (ValidationException ex)
        {
            ModelState.AddModelError(string.Empty, ex.Message);
            return BadRequest(ModelState);
        }
    }

    [HttpPut("{sessionId:guid}")]
    public async Task<IActionResult> Update(Guid studentId, Guid sessionId, [FromBody] UpdateSessionLogRequest request, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        try
        {
            var updated = await _sessionLogService.UpdateAsync(teacherId, studentId, sessionId, request, cancellationToken);

            if (updated is null)
            {
                _logger.LogWarning(
                    "PUT /api/students/{StudentId}/sessions/{SessionId} not found. TeacherId={TeacherId}",
                    studentId, sessionId, teacherId);
                return NotFound();
            }

            return Ok(updated);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (ValidationException ex)
        {
            ModelState.AddModelError(string.Empty, ex.Message);
            return BadRequest(ModelState);
        }
    }

    [HttpPatch("{sessionId:guid}")]
    public async Task<IActionResult> PatchSession(Guid studentId, Guid sessionId, [FromBody] PatchSessionRequest patch, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var session = await _sessionLogService.GetByIdAsync(teacherId, studentId, sessionId, cancellationToken);
        if (session is null) return NotFound();

        // Pre-populate all fields from current state, then overwrite only provided fields.
        var request = MapSessionToUpdateRequest(session);
        if (patch.Title is not null) request.Title = patch.Title;
        if (patch.ActualContent is not null) request.ActualContent = patch.ActualContent;
        if (patch.GeneralNotes is not null) request.GeneralNotes = patch.GeneralNotes;
        if (patch.HomeworkAssigned is not null) request.HomeworkAssigned = patch.HomeworkAssigned;
        if (patch.NextSessionTopics is not null) request.NextSessionTopics = patch.NextSessionTopics;
        if (patch.Duration is not null) request.Duration = patch.Duration;
        if (patch.TopicTags is not null) request.TopicTags = patch.TopicTags;

        try
        {
            var updated = await _sessionLogService.UpdateAsync(teacherId, studentId, sessionId, request, cancellationToken);
            if (updated is null) return NotFound();
            return Ok(updated);
        }
        catch (ValidationException ex)
        {
            ModelState.AddModelError(string.Empty, ex.Message);
            return BadRequest(ModelState);
        }
    }

    private static readonly JsonSerializerOptions _caseInsensitive =
        new() { PropertyNameCaseInsensitive = true };

    private static UpdateSessionLogRequest MapSessionToUpdateRequest(SessionLogDto s)
    {
        // MentionedDifficultyPairs and SuggestedDifficulties are stored as JSON strings in the DTO.
        // Deserialize them so UpdateAsync round-trips the existing data rather than clearing it.
        var pairs = TryDeserialize<List<DifficultyPairDto>>(s.MentionedDifficultyPairs);
        var difficulties = TryDeserialize<List<SuggestedDifficultyDto>>(s.SuggestedDifficulties);

        return new UpdateSessionLogRequest
        {
            SessionDate = s.SessionDate,
            PlannedContent = s.PlannedContent,
            ActualContent = s.ActualContent,
            HomeworkAssigned = s.HomeworkAssigned,
            PreviousHomeworkStatus = s.PreviousHomeworkStatus,
            NextSessionTopics = s.NextSessionTopics,
            GeneralNotes = s.GeneralNotes,
            LevelReassessmentSkill = s.LevelReassessmentSkill,
            LevelReassessmentLevel = s.LevelReassessmentLevel,
            LinkedLessonId = s.LinkedLessonId,
            TopicTags = s.TopicTags,
            IsCancelled = s.IsCancelled,
            Status = s.Status,
            Duration = s.Duration,
            Title = s.Title,
            MentionedDifficultyPairs = pairs,
            SuggestedDifficulties = difficulties,
        };
    }

    private static T? TryDeserialize<T>(string? json) where T : class
    {
        if (string.IsNullOrWhiteSpace(json) || json == "[]") return null;
        try { return JsonSerializer.Deserialize<T>(json, _caseInsensitive); }
        catch { return null; }
    }

    [HttpDelete("{sessionId:guid}")]
    public async Task<IActionResult> SoftDelete(Guid studentId, Guid sessionId, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var deleted = await _sessionLogService.SoftDeleteAsync(teacherId, studentId, sessionId, cancellationToken);

        if (!deleted)
        {
            _logger.LogWarning(
                "DELETE /api/students/{StudentId}/sessions/{SessionId} not found. TeacherId={TeacherId}",
                studentId, sessionId, teacherId);
            return NotFound();
        }

        return NoContent();
    }
}
