using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
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
    public async Task<IActionResult> List(Guid studentId, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        try
        {
            var sessions = await _sessionLogService.ListAsync(teacherId, studentId, cancellationToken);
            _logger.LogInformation(
                "GET /api/students/{StudentId}/sessions. TeacherId={TeacherId} Count={Count}",
                studentId, teacherId, sessions.Count);
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
            return ValidationProblem(ex.Message);
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
            return ValidationProblem(ex.Message);
        }
    }
}
