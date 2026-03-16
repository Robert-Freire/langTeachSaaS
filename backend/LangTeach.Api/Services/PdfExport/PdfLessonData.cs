using LangTeach.Api.Data.Models;

namespace LangTeach.Api.Services.PdfExport;

public record PdfLessonData(
    string Title,
    string Language,
    string CefrLevel,
    string Topic,
    string? StudentName,
    DateTime CreatedAt,
    List<PdfSectionData> Sections);

public record PdfSectionData(
    string SectionType,
    int OrderIndex,
    string? Notes,
    List<PdfBlockData> Blocks);

public record PdfBlockData(
    ContentBlockType BlockType,
    string? RawContent);
