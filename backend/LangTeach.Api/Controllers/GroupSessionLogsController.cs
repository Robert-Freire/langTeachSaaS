using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/groups/{groupId:guid}/sessions")]
[Authorize]
public class GroupSessionLogsController : ControllerBase
{
    private readonly ISessionLogService _sessionLogService;
    private readonly IProfileService _profileService;
    private readonly IReflectionExtractionService _extractionService;
    private readonly IGroupService _groupService;
    private readonly ILogger<GroupSessionLogsController> _logger;

    public GroupSessionLogsController(
        ISessionLogService sessionLogService,
        IProfileService profileService,
        IReflectionExtractionService extractionService,
        IGroupService groupService,
        ILogger<GroupSessionLogsController> logger)
    {
        _sessionLogService = sessionLogService;
        _profileService = profileService;
        _extractionService = extractionService;
        _groupService = groupService;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpGet]
    public async Task<IActionResult> List(Guid groupId, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        try
        {
            var sessions = await _sessionLogService.ListForGroupAsync(teacherId, groupId, ct);
            return Ok(sessions);
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("{sessionId:guid}")]
    public async Task<IActionResult> GetById(Guid groupId, Guid sessionId, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var session = await _sessionLogService.GetGroupSessionByIdAsync(teacherId, groupId, sessionId, ct);
        return session is null ? NotFound() : Ok(session);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid groupId, [FromBody] CreateSessionLogRequest request, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        try
        {
            var session = await _sessionLogService.CreateForGroupAsync(teacherId, groupId, request, ct);
            return CreatedAtAction(nameof(GetById), new { groupId, sessionId = session.Id }, session);
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (ValidationException ex)
        {
            ModelState.AddModelError(string.Empty, ex.Message);
            return BadRequest(ModelState);
        }
    }

    [HttpPut("{sessionId:guid}")]
    public async Task<IActionResult> Update(Guid groupId, Guid sessionId, [FromBody] UpdateSessionLogRequest request, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        try
        {
            var session = await _sessionLogService.UpdateGroupSessionAsync(teacherId, groupId, sessionId, request, ct);
            return session is null ? NotFound() : Ok(session);
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

    [HttpPost("extract")]
    public async Task<IActionResult> Extract(Guid groupId, [FromBody] ExtractReflectionRequest request, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (string.IsNullOrWhiteSpace(request.Text))
        {
            ModelState.AddModelError(nameof(request.Text), "Text is required.");
            return BadRequest(ModelState);
        }

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var group = await _groupService.GetByIdAsync(teacherId, groupId, ct);
        if (group is null) return NotFound();

        _logger.LogInformation("POST /api/groups/{GroupId}/sessions/extract. TeacherId={TeacherId}", groupId, teacherId);

        // Group sessions have no per-student difficulty context; pass empty list
        var extracted = await _extractionService.ExtractAsync(request.Text, [], hasOpenSession: true, ct);
        return Ok(extracted);
    }
}
