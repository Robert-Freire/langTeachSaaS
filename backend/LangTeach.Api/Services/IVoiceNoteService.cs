using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface IVoiceNoteService
{
    Task<VoiceNoteDto> UploadAsync(Guid teacherId, Stream audio, string fileName, string contentType, long sizeBytes, CancellationToken ct = default);
    Task<VoiceNoteDto?> GetByIdAsync(Guid teacherId, Guid id, CancellationToken ct = default);
    Task<VoiceNoteDto?> UpdateTranscriptionAsync(Guid teacherId, Guid id, string transcription, CancellationToken ct = default);
    Task<string?> GetAudioUrlAsync(Guid teacherId, Guid id, CancellationToken ct = default);
}
