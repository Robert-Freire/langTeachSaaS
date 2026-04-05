using LangTeach.Api.DTOs;
using Microsoft.AspNetCore.Http;

namespace LangTeach.Api.Services;

public interface IVoiceNoteService
{
    Task<VoiceNoteDto> UploadAsync(Guid teacherId, IFormFile file, CancellationToken ct = default);
    Task<VoiceNoteDto?> GetByIdAsync(Guid teacherId, Guid id, CancellationToken ct = default);
    Task<VoiceNoteDto?> UpdateTranscriptionAsync(Guid teacherId, Guid id, string transcription, CancellationToken ct = default);
    Task<string?> GetAudioUrlAsync(Guid teacherId, Guid id, CancellationToken ct = default);
}
