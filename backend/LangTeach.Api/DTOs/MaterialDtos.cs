namespace LangTeach.Api.DTOs;

public record MaterialDto(
    Guid Id,
    string FileName,
    string ContentType,
    long SizeBytes,
    string BlobPath,
    string? PreviewUrl,
    DateTime CreatedAt
);
