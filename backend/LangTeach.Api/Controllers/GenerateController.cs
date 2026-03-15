using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.Json;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/generate")]
[Authorize]
public class GenerateController : ControllerBase
{
    private readonly IProfileService _profileService;
    private readonly IStudentService _studentService;
    private readonly IPromptService _promptService;
    private readonly IClaudeClient _claudeClient;
    private readonly AppDbContext _db;
    private readonly ILogger<GenerateController> _logger;

    public GenerateController(
        IProfileService profileService,
        IStudentService studentService,
        IPromptService promptService,
        IClaudeClient claudeClient,
        AppDbContext db,
        ILogger<GenerateController> logger)
    {
        _profileService = profileService;
        _studentService = studentService;
        _promptService = promptService;
        _claudeClient = claudeClient;
        _db = db;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpPost("lesson-plan")]
    public Task<IActionResult> LessonPlan([FromBody] GenerateRequest request, CancellationToken ct) =>
        Generate(request, "lesson-plan", ctx => _promptService.BuildLessonPlanPrompt(ctx), ct);

    [HttpPost("vocabulary")]
    public Task<IActionResult> Vocabulary([FromBody] GenerateRequest request, CancellationToken ct) =>
        Generate(request, "vocabulary", ctx => _promptService.BuildVocabularyPrompt(ctx), ct);

    [HttpPost("grammar")]
    public Task<IActionResult> Grammar([FromBody] GenerateRequest request, CancellationToken ct) =>
        Generate(request, "grammar", ctx => _promptService.BuildGrammarPrompt(ctx), ct);

    [HttpPost("exercises")]
    public Task<IActionResult> Exercises([FromBody] GenerateRequest request, CancellationToken ct) =>
        Generate(request, "exercises", ctx => _promptService.BuildExercisesPrompt(ctx), ct);

    [HttpPost("conversation")]
    public Task<IActionResult> Conversation([FromBody] GenerateRequest request, CancellationToken ct) =>
        Generate(request, "conversation", ctx => _promptService.BuildConversationPrompt(ctx), ct);

    [HttpPost("reading")]
    public Task<IActionResult> Reading([FromBody] GenerateRequest request, CancellationToken ct) =>
        Generate(request, "reading", ctx => _promptService.BuildReadingPrompt(ctx), ct);

    [HttpPost("homework")]
    public Task<IActionResult> Homework([FromBody] GenerateRequest request, CancellationToken ct) =>
        Generate(request, "homework", ctx => _promptService.BuildHomeworkPrompt(ctx), ct);

    private async Task<IActionResult> Generate(
        GenerateRequest request,
        string blockType,
        Func<GenerationContext, ClaudeRequest> buildPrompt,
        CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var teacher = await _db.Teachers.FindAsync(new object[] { teacherId }, ct);
        if (teacher is null || !teacher.IsApproved)
        {
            _logger.LogWarning("Generate/{BlockType} rejected: teacher not approved. TeacherId={TeacherId}", blockType, teacherId);
            return Forbid();
        }

        var lesson = await _db.Lessons.FindAsync(new object[] { request.LessonId }, ct);
        if (lesson is null || lesson.TeacherId != teacherId || lesson.IsDeleted)
        {
            _logger.LogWarning("Generate/{BlockType} lesson not found. LessonId={LessonId} TeacherId={TeacherId}", blockType, request.LessonId, teacherId);
            return NotFound("Lesson not found.");
        }

        StudentDto? student = null;
        if (request.StudentId.HasValue)
        {
            student = await _studentService.GetByIdAsync(teacherId, request.StudentId.Value, ct);
            if (student is null)
            {
                _logger.LogWarning("Generate/{BlockType} student not found. StudentId={StudentId} TeacherId={TeacherId}", blockType, request.StudentId, teacherId);
                return NotFound("Student not found.");
            }
        }

        var ctx = new GenerationContext(
            Language: request.Language,
            CefrLevel: request.CefrLevel,
            Topic: request.Topic,
            Style: request.Style,
            DurationMinutes: lesson.DurationMinutes,
            StudentName: student?.Name,
            StudentNativeLanguage: student?.NativeLanguage,
            StudentInterests: student?.Interests.ToArray(),
            StudentGoals: student?.LearningGoals.ToArray(),
            StudentWeaknesses: student?.Weaknesses.ToArray(),
            ExistingNotes: request.ExistingNotes
        );

        var claudeRequest = buildPrompt(ctx);
        var response = await _claudeClient.CompleteAsync(claudeRequest, ct);

        var block = new LessonContentBlock
        {
            Id = Guid.NewGuid(),
            LessonId = lesson.Id,
            LessonSectionId = null,
            BlockType = blockType,
            GeneratedContent = response.Content,
            GenerationParams = JsonSerializer.Serialize(request),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.LessonContentBlocks.Add(block);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Generate/{BlockType} succeeded. LessonId={LessonId} BlockId={BlockId} InputTokens={InputTokens} OutputTokens={OutputTokens}",
            blockType, lesson.Id, block.Id, response.InputTokens, response.OutputTokens);

        return Ok(new GenerationResultDto(block.Id, block.BlockType, block.GeneratedContent));
    }
}
