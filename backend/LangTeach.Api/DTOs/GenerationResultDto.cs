using LangTeach.Api.Data.Models;

namespace LangTeach.Api.DTOs;

public record GenerationResultDto(Guid Id, ContentBlockType BlockType, string GeneratedContent);
