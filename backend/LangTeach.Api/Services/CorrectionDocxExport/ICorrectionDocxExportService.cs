using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services.CorrectionDocxExport;

public interface ICorrectionDocxExportService
{
    // includeAboveLevel: when false (student handout) above-level "removed" tags are omitted,
    // preserving the level-filtered view the student receives. When true (teacher
    // full-diagnostic) they are rendered, clearly separated as above-level errors (#1351).
    byte[] Generate(CorrectionDetailDto correction, string studentName, bool includeAboveLevel = false);
}
