using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/students")]
[Authorize]
public class StudentsController : ControllerBase
{
    private readonly IStudentService _studentService;
    private readonly IProfileService _profileService;
    private readonly ILogger<StudentsController> _logger;

    public StudentsController(
        IStudentService studentService,
        IProfileService profileService,
        ILogger<StudentsController> logger)
    {
        _studentService = studentService;
        _profileService = profileService;
        _logger = logger;
    }

    private string Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] StudentListQuery query)
    {
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var result = await _studentService.ListAsync(teacherId, query);
        _logger.LogInformation(
            "GET /api/students. TeacherId={TeacherId} Language={Language} CefrLevel={CefrLevel} TotalCount={TotalCount}",
            teacherId, query.Language, query.CefrLevel, result.TotalCount);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateStudentRequest request)
    {
        if (!ModelState.IsValid)
        {
            _logger.LogWarning("POST /api/students validation failed. Auth0Id={Auth0Id} Errors={Errors}",
                Auth0Id, ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
            return BadRequest(ModelState);
        }

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var student = await _studentService.CreateAsync(teacherId, request);
        return CreatedAtAction(nameof(GetById), new { id = student.Id }, student);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var student = await _studentService.GetByIdAsync(teacherId, id);

        if (student is null)
        {
            _logger.LogWarning("GET /api/students/{StudentId} not found or forbidden. TeacherId={TeacherId}",
                id, teacherId);
            return NotFound();
        }

        return Ok(student);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateStudentRequest request)
    {
        if (!ModelState.IsValid)
        {
            _logger.LogWarning("PUT /api/students/{StudentId} validation failed. Auth0Id={Auth0Id} Errors={Errors}",
                id, Auth0Id, ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
            return BadRequest(ModelState);
        }

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var updated = await _studentService.UpdateAsync(teacherId, id, request);

        if (updated is null)
        {
            _logger.LogWarning("PUT /api/students/{StudentId} not found or forbidden. TeacherId={TeacherId}",
                id, teacherId);
            return NotFound();
        }

        return Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var deleted = await _studentService.DeleteAsync(teacherId, id);

        if (!deleted)
        {
            _logger.LogWarning("DELETE /api/students/{StudentId} not found or forbidden. TeacherId={TeacherId}",
                id, teacherId);
            return NotFound();
        }

        return NoContent();
    }
}
