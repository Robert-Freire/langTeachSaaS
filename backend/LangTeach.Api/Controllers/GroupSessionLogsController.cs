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
    private readonly ILogger<GroupSessionLogsController> _logger;

    public GroupSessionLogsController(
        ISessionLogService sessionLogService,
        IProfileService profileService,
        ILogger<GroupSessionLogsController> logger)
    {
        _sessionLogService = sessionLogService;
        _profileService = profileService;
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
}
