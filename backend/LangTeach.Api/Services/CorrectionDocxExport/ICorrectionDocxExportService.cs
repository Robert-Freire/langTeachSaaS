using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services.CorrectionDocxExport;

public interface ICorrectionDocxExportService
{
    byte[] Generate(CorrectionDetailDto correction, string studentName);
}
