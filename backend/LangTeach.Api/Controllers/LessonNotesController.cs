using System.Security.Claims;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/lessons/{lessonId:guid}/notes")]
[Authorize]
public class LessonNotesController : ControllerBase
{
    private readonly ILessonNoteService _lessonNoteService;
    private readonly IProfileService _profileService;
    private readonly ILogger<LessonNotesController> _logger;

    public LessonNotesController(
        ILessonNoteService lessonNoteService,
        IProfileService profileService,
        ILogger<LessonNotesController> logger)
    {
        _lessonNoteService = lessonNoteService;
        _profileService = profileService;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpGet]
    public async Task<IActionResult> Get(Guid lessonId, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var notes = await _lessonNoteService.GetByLessonIdAsync(teacherId, lessonId, cancellationToken);

        if (notes is null)
        {
            _logger.LogInformation("GET /api/lessons/{LessonId}/notes returned 204. TeacherId={TeacherId}", lessonId, teacherId);
            return NoContent();
        }

        return Ok(notes);
    }

    [HttpPut]
    public async Task<IActionResult> Upsert(Guid lessonId, [FromBody] SaveLessonNotesRequest request, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        try
        {
            var result = await _lessonNoteService.UpsertAsync(teacherId, lessonId, request, cancellationToken);
            _logger.LogInformation("PUT /api/lessons/{LessonId}/notes upserted. TeacherId={TeacherId}", lessonId, teacherId);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
