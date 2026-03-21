using LangTeach.Api.DTOs;
using Microsoft.AspNetCore.Http;

namespace LangTeach.Api.Services;

public record MaterialContent(string FileName, string ContentType, byte[] Data);

public interface IMaterialService
{
    Task<MaterialDto> UploadAsync(Guid teacherId, Guid lessonId, Guid sectionId, IFormFile file, CancellationToken cancellationToken = default);
    Task<List<MaterialDto>> ListAsync(Guid teacherId, Guid lessonId, Guid sectionId, CancellationToken cancellationToken = default);
    Task<string?> GetDownloadUrlAsync(Guid teacherId, Guid lessonId, Guid sectionId, Guid materialId, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid teacherId, Guid lessonId, Guid sectionId, Guid materialId, CancellationToken cancellationToken = default);
    Task DeleteBlobsForSectionsAsync(IEnumerable<Guid> sectionIds, CancellationToken cancellationToken = default);
    Task EnrichWithPreviewUrls(List<LessonSectionDto> sections);
    Task<List<MaterialContent>> GetMaterialContentsAsync(Guid teacherId, Guid lessonId, CancellationToken cancellationToken = default);
}
