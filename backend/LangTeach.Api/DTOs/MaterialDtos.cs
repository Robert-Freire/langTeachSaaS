using System.Text.Json.Serialization;

namespace LangTeach.Api.DTOs;

public record MaterialDto(
    Guid Id,
    string FileName,
    string ContentType,
    long SizeBytes,
    [property: JsonIgnore] string BlobPath,
    string? PreviewUrl,
    DateTime CreatedAt
);
