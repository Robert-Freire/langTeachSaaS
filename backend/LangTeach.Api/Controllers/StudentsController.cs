using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/students")]
[Authorize]
public class StudentsController : ControllerBase
{
    private readonly IStudentService _studentService;
    private readonly ILessonNoteService _lessonNoteService;
    private readonly IProfileService _profileService;
    private readonly ILogger<StudentsController> _logger;

    public StudentsController(
        IStudentService studentService,
        ILessonNoteService lessonNoteService,
        IProfileService profileService,
        ILogger<StudentsController> logger)
    {
        _studentService = studentService;
        _lessonNoteService = lessonNoteService;
        _profileService = profileService;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] StudentListQuery query, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var result = await _studentService.ListAsync(teacherId, query, cancellationToken);
        _logger.LogInformation(
            "GET /api/students. TeacherId={TeacherId} Language={Language} CefrLevel={CefrLevel} TotalCount={TotalCount}",
            teacherId, query.Language, query.CefrLevel, result.TotalCount);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateStudentRequest request, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid)
        {
            _logger.LogWarning("POST /api/students validation failed. Auth0Id={Auth0Id} Errors={Errors}",
                Auth0Id, ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
            return BadRequest(ModelState);
        }

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        try
        {
            var student = await _studentService.CreateAsync(teacherId, request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = student.Id }, student);
        }
        catch (ValidationException ex)
        {
            return ValidationProblem(ex.Message);
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var student = await _studentService.GetByIdAsync(teacherId, id, cancellationToken);

        if (student is null)
        {
            _logger.LogWarning("GET /api/students/{StudentId} not found or forbidden. TeacherId={TeacherId}",
                id, teacherId);
            return NotFound();
        }

        return Ok(student);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateStudentRequest request, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid)
        {
            _logger.LogWarning("PUT /api/students/{StudentId} validation failed. Auth0Id={Auth0Id} Errors={Errors}",
                id, Auth0Id, ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
            return BadRequest(ModelState);
        }

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        try
        {
            var updated = await _studentService.UpdateAsync(teacherId, id, request, cancellationToken);

            if (updated is null)
            {
                _logger.LogWarning("PUT /api/students/{StudentId} not found or forbidden. TeacherId={TeacherId}",
                    id, teacherId);
                return NotFound();
            }

            return Ok(updated);
        }
        catch (ValidationException ex)
        {
            return ValidationProblem(ex.Message);
        }
    }

    [HttpGet("{studentId:guid}/lesson-history")]
    public async Task<IActionResult> GetLessonHistory(Guid studentId, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var history = await _lessonNoteService.GetLessonHistoryAsync(teacherId, studentId, cancellationToken);
        _logger.LogInformation(
            "GET /api/students/{StudentId}/lesson-history. TeacherId={TeacherId} Count={Count}",
            studentId, teacherId, history.Count);
        return Ok(history);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var deleted = await _studentService.DeleteAsync(teacherId, id, cancellationToken);

        if (!deleted)
        {
            _logger.LogWarning("DELETE /api/students/{StudentId} not found or forbidden. TeacherId={TeacherId}",
                id, teacherId);
            return NotFound();
        }

        return NoContent();
    }
}
