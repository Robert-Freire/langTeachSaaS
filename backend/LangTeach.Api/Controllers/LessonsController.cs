using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/lessons")]
[Authorize]
public class LessonsController : ControllerBase
{
    private readonly ILessonService _lessonService;
    private readonly IProfileService _profileService;
    private readonly ILogger<LessonsController> _logger;

    public LessonsController(
        ILessonService lessonService,
        IProfileService profileService,
        ILogger<LessonsController> logger)
    {
        _lessonService = lessonService;
        _profileService = profileService;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] LessonListQuery query, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email!);
        var result = await _lessonService.ListAsync(teacherId, query, cancellationToken);
        _logger.LogInformation(
            "GET /api/lessons. TeacherId={TeacherId} Status={Status} Search={Search} TotalCount={TotalCount}",
            teacherId, query.Status, query.Search, result.TotalCount);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLessonRequest request, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid)
        {
            _logger.LogWarning("POST /api/lessons validation failed. Auth0Id={Auth0Id} Errors={Errors}",
                Auth0Id, ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
            return BadRequest(ModelState);
        }

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var lesson = await _lessonService.CreateAsync(teacherId, request, cancellationToken);

        if (lesson is null)
        {
            _logger.LogWarning("POST /api/lessons create failed (invalid StudentId?). TeacherId={TeacherId}", teacherId);
            return BadRequest("Invalid StudentId: student not found or does not belong to you.");
        }

        return CreatedAtAction(nameof(GetById), new { id = lesson.Id }, lesson);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email!);
        var lesson = await _lessonService.GetByIdAsync(teacherId, id, cancellationToken);

        if (lesson is null)
        {
            _logger.LogWarning("GET /api/lessons/{LessonId} not found or forbidden. TeacherId={TeacherId}",
                id, teacherId);
            return NotFound();
        }

        return Ok(lesson);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateLessonRequest request, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid)
        {
            _logger.LogWarning("PUT /api/lessons/{LessonId} validation failed. Auth0Id={Auth0Id} Errors={Errors}",
                id, Auth0Id, ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
            return BadRequest(ModelState);
        }

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var result = await _lessonService.UpdateAsync(teacherId, id, request, cancellationToken);

        return result switch
        {
            LessonUpdateResult.NotFound => NotFound(),
            LessonUpdateResult.InvalidStudent => BadRequest("Invalid StudentId: student not found or does not belong to you."),
            LessonUpdateResult.Success s => Ok(s.Lesson),
            _ => StatusCode(500),
        };
    }

    [HttpPut("{id:guid}/sections")]
    public async Task<IActionResult> UpdateSections(Guid id, [FromBody] UpdateLessonSectionsRequest request, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid)
        {
            _logger.LogWarning("PUT /api/lessons/{LessonId}/sections validation failed. Auth0Id={Auth0Id} Errors={Errors}",
                id, Auth0Id, ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
            return BadRequest(ModelState);
        }

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var updated = await _lessonService.UpdateSectionsAsync(teacherId, id, request, cancellationToken);

        if (updated is null)
        {
            _logger.LogWarning("PUT /api/lessons/{LessonId}/sections not found or forbidden. TeacherId={TeacherId}",
                id, teacherId);
            return NotFound();
        }

        return Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email!);
        var deleted = await _lessonService.DeleteAsync(teacherId, id, cancellationToken);

        if (!deleted)
        {
            _logger.LogWarning("DELETE /api/lessons/{LessonId} not found or forbidden. TeacherId={TeacherId}",
                id, teacherId);
            return NotFound();
        }

        return NoContent();
    }

    [HttpPost("{id:guid}/duplicate")]
    public async Task<IActionResult> Duplicate(Guid id, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email!);
        var copy = await _lessonService.DuplicateAsync(teacherId, id, cancellationToken);

        if (copy is null)
        {
            _logger.LogWarning("POST /api/lessons/{LessonId}/duplicate not found or forbidden. TeacherId={TeacherId}",
                id, teacherId);
            return NotFound();
        }

        return CreatedAtAction(nameof(GetById), new { id = copy.Id }, copy);
    }
}
