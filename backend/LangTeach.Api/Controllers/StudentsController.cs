using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using LangTeach.Api.AI;
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
    private const string DefaultDifficultySeverity = "medium";
    private const string DefaultDifficultyTrend = "stable";
    private const string DefaultDifficultyStatus = "Active";
    private const int MaxProfileListCount = 50;

    private readonly IStudentService _studentService;
    private readonly ILessonNoteService _lessonNoteService;
    private readonly IProfileService _profileService;
    private readonly IStudentProfileExtractionService _extractionService;
    private readonly ILogger<StudentsController> _logger;

    public StudentsController(
        IStudentService studentService,
        ILessonNoteService lessonNoteService,
        IProfileService profileService,
        IStudentProfileExtractionService extractionService,
        ILogger<StudentsController> logger)
    {
        _studentService = studentService;
        _lessonNoteService = lessonNoteService;
        _profileService = profileService;
        _extractionService = extractionService;
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
            ModelState.AddModelError(string.Empty, ex.Message);
            return BadRequest(ModelState);
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
            ModelState.AddModelError(string.Empty, ex.Message);
            return BadRequest(ModelState);
        }
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> PatchStudent(Guid id, [FromBody] PatchStudentRequest patch, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var student = await _studentService.GetByIdAsync(teacherId, id, cancellationToken);
        if (student is null) return NotFound();

        // Pre-populate all required fields from current state, then overwrite only provided fields.
        var request = MapStudentToUpdateRequest(student);
        if (patch.CefrLevel is not null) request.CefrLevel = patch.CefrLevel;
        if (patch.Profession is not null) request.Profession = patch.Profession;
        if (patch.CountryOfResidence is not null) request.CountryOfResidence = patch.CountryOfResidence;
        if (patch.SkillLevelReading is not null) request.SkillLevelOverrides["Reading"] = patch.SkillLevelReading;
        if (patch.SkillLevelWriting is not null) request.SkillLevelOverrides["Writing"] = patch.SkillLevelWriting;
        if (patch.SkillLevelSpeaking is not null) request.SkillLevelOverrides["Speaking"] = patch.SkillLevelSpeaking;
        if (patch.SkillLevelListening is not null) request.SkillLevelOverrides["Listening"] = patch.SkillLevelListening;

        try
        {
            var updated = await _studentService.UpdateAsync(teacherId, id, request, cancellationToken);
            if (updated is null) return NotFound();
            return Ok(updated);
        }
        catch (ValidationException ex)
        {
            ModelState.AddModelError(string.Empty, ex.Message);
            return BadRequest(ModelState);
        }
    }

    private static UpdateStudentRequest MapStudentToUpdateRequest(StudentDto s) => new()
    {
        Name = s.Name,
        LearningLanguage = s.LearningLanguage,
        CefrLevel = s.Level.CefrLevel,
        OfficialCefrLevel = s.Level.OfficialCefrLevel,
        SkillLevelOverrides = s.Level.SkillLevelOverrides,
        Interests = s.Profile.Interests,
        NativeLanguages = s.Languages.NativeLanguages,
        SpokenLanguages = s.Languages.SpokenLanguages,
        LearningGoals = s.Profile.LearningGoals,
        Weaknesses = s.Profile.Weaknesses,
        Difficulties = s.Profile.Difficulties,
        PersonalNotes = s.Profile.PersonalNotes,
        TeachingNotes = s.Profile.TeachingNotes,
        ShortTermObjectives = s.Profile.ShortTermObjectives,
        TeachingTodos = s.Profile.TeachingTodos,
        BirthYear = s.Identity.BirthYear,
        Profession = s.Identity.Profession,
        CountryOfOrigin = s.Identity.CountryOfOrigin,
        CityOfOrigin = s.Identity.CityOfOrigin,
        CountryOfResidence = s.Identity.CountryOfResidence,
        CityOfResidence = s.Identity.CityOfResidence,
        ReasonForStudying = s.Profile.ReasonForStudying,
        IsActive = s.Commercial.IsActive,
        IsCorporate = s.Commercial.IsCorporate,
        Rate = s.Commercial.Rate,
    };

    [HttpPatch("{id:guid}/profile")]
    public async Task<IActionResult> PatchStudentProfile(Guid id, [FromBody] PatchStudentProfileRequest patch, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var student = await _studentService.GetByIdAsync(teacherId, id, cancellationToken);
        if (student is null) return NotFound();

        var request = MapStudentToUpdateRequest(student);

        if (patch.AppendInterests is { Count: > 0 })
        {
            var existing = new HashSet<string>(request.Interests, StringComparer.OrdinalIgnoreCase);
            foreach (var interest in patch.AppendInterests)
            {
                if (!string.IsNullOrWhiteSpace(interest) && existing.Add(interest))
                    request.Interests.Add(interest);
            }
            if (request.Interests.Count > MaxProfileListCount)
            {
                ModelState.AddModelError(nameof(patch.AppendInterests), $"Cannot exceed {MaxProfileListCount} interests.");
                return BadRequest(ModelState);
            }
        }

        if (patch.AppendDifficulties is { Count: > 0 })
        {
            var newDiffs = patch.AppendDifficulties
                .Select(d => new DifficultyDto(
                    Id: Guid.NewGuid().ToString(),
                    Description: d.Description,
                    Competency: d.Competency,
                    Subcategory: d.Subcategory,
                    Severity: DefaultDifficultySeverity,
                    Trend: DefaultDifficultyTrend,
                    Status: DefaultDifficultyStatus))
                .ToList();
            request.Difficulties = request.Difficulties.Concat(newDiffs).ToList();
            if (request.Difficulties.Count > MaxProfileListCount)
            {
                ModelState.AddModelError(nameof(patch.AppendDifficulties), $"Cannot exceed {MaxProfileListCount} difficulties.");
                return BadRequest(ModelState);
            }
        }

        if (patch.LearningGoals is { Count: > 0 })
        {
            request.LearningGoals = patch.LearningGoals
                .Select(text => new LearningGoalDto(Guid.NewGuid().ToString(), text, []))
                .ToList();
        }

        if (!string.IsNullOrWhiteSpace(patch.AppendTeachingNotes))
        {
            request.TeachingNotes = string.IsNullOrWhiteSpace(request.TeachingNotes)
                ? patch.AppendTeachingNotes
                : $"{request.TeachingNotes.TrimEnd()} {patch.AppendTeachingNotes}";
        }

        try
        {
            var updated = await _studentService.UpdateAsync(teacherId, id, request, cancellationToken);
            if (updated is null) return NotFound();
            return Ok(updated);
        }
        catch (ValidationException ex)
        {
            ModelState.AddModelError(string.Empty, ex.Message);
            return BadRequest(ModelState);
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

    [HttpPost("{id:guid}/teaching-todos")]
    public async Task<IActionResult> AppendTeachingTodo(Guid id, [FromBody] CreateTeachingTodoDto request, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        try
        {
            var student = await _studentService.AppendTeachingTodoAsync(teacherId, id, request, cancellationToken);
            if (student is null)
            {
                _logger.LogWarning("POST /api/students/{StudentId}/teaching-todos not found or forbidden. TeacherId={TeacherId}", id, teacherId);
                return NotFound();
            }
            return Ok(student);
        }
        catch (System.ComponentModel.DataAnnotations.ValidationException ex)
        {
            ModelState.AddModelError(string.Empty, ex.Message);
            return BadRequest(ModelState);
        }
    }

    [HttpPatch("{id:guid}/teaching-todos/{todoId}")]
    public async Task<IActionResult> UpdateTeachingTodo(Guid id, string todoId, [FromBody] UpdateTeachingTodoDto request, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        try
        {
            var student = await _studentService.UpdateTeachingTodoAsync(teacherId, id, todoId, request, cancellationToken);
            if (student is null)
            {
                _logger.LogWarning("PATCH /api/students/{StudentId}/teaching-todos/{TodoId} not found or forbidden. TeacherId={TeacherId}", id, todoId, teacherId);
                return NotFound();
            }
            return Ok(student);
        }
        catch (System.ComponentModel.DataAnnotations.ValidationException ex)
        {
            ModelState.AddModelError(string.Empty, ex.Message);
            return BadRequest(ModelState);
        }
    }

    [HttpDelete("{id:guid}/teaching-todos/{todoId}")]
    public async Task<IActionResult> DeleteTeachingTodo(Guid id, string todoId, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var student = await _studentService.DeleteTeachingTodoAsync(teacherId, id, todoId, cancellationToken);
        if (student is null)
        {
            _logger.LogWarning("DELETE /api/students/{StudentId}/teaching-todos/{TodoId} not found or forbidden. TeacherId={TeacherId}", id, todoId, teacherId);
            return NotFound();
        }
        return Ok(student);
    }

    [HttpPost("extract-profile")]
    public async Task<IActionResult> ExtractProfile([FromBody] ExtractStudentProfileRequest request, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        _logger.LogInformation("POST /api/students/extract-profile. TeacherId={TeacherId} TextLength={TextLength}", teacherId, request.Text.Length);
        try
        {
            var extracted = await _extractionService.ExtractAsync(request.Text, cancellationToken);
            return Ok(extracted);
        }
        catch (ClaudeRateLimitException ex)
        {
            _logger.LogWarning(ex, "POST /api/students/extract-profile rate limited. TeacherId={TeacherId}", teacherId);
            return StatusCode(429, new { message = "Rate limit reached. Please try again later.", retryAfter = (int?)ex.RetryAfter?.TotalSeconds });
        }
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
