using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/voice-notes")]
[Authorize]
public class VoiceNotesController : ControllerBase
{
    private readonly IVoiceNoteService _voiceNoteService;
    private readonly IProfileService _profileService;
    private readonly ILogger<VoiceNotesController> _logger;

    public VoiceNotesController(
        IVoiceNoteService voiceNoteService,
        IProfileService profileService,
        ILogger<VoiceNotesController> logger)
    {
        _voiceNoteService = voiceNoteService;
        _profileService = profileService;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpPost]
    [RequestSizeLimit(51 * 1024 * 1024)]
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        try
        {
            var note = await _voiceNoteService.UploadAsync(teacherId, file, ct);
            _logger.LogInformation("POST voice-note uploaded. TeacherId={TeacherId} Id={Id}", teacherId, note.Id);
            return CreatedAtAction(nameof(GetById), new { id = note.Id }, note);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("POST voice-note upload failed. TeacherId={TeacherId} Error={Error}", teacherId, ex.Message);
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var note = await _voiceNoteService.GetByIdAsync(teacherId, id, ct);
        if (note is null)
        {
            _logger.LogWarning("GET voice-note not found. TeacherId={TeacherId} Id={Id}", teacherId, id);
            return NotFound();
        }

        return Ok(note);
    }

    [HttpPatch("{id:guid}/transcription")]
    public async Task<IActionResult> UpdateTranscription(Guid id, [FromBody] UpdateTranscriptionRequest request, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var note = await _voiceNoteService.UpdateTranscriptionAsync(teacherId, id, request.Transcription, ct);
        if (note is null)
        {
            _logger.LogWarning("PATCH voice-note/transcription not found. TeacherId={TeacherId} Id={Id}", teacherId, id);
            return NotFound();
        }

        return Ok(note);
    }

    [HttpGet("{id:guid}/audio")]
    public async Task<IActionResult> GetAudio(Guid id, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var url = await _voiceNoteService.GetAudioUrlAsync(teacherId, id, ct);
        if (url is null)
        {
            _logger.LogWarning("GET voice-note/audio not found. TeacherId={TeacherId} Id={Id}", teacherId, id);
            return NotFound();
        }

        return Redirect(url);
    }
}
