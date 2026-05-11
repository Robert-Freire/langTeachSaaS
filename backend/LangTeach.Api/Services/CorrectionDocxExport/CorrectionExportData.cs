using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services.CorrectionDocxExport;

public record CorrectionExportData(CorrectionDetailDto Detail, string StudentName);
