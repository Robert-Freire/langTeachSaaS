namespace LangTeach.Api.Services.PdfExport;

public enum PdfExportMode
{
    Teacher,
    Student
}

public interface IPdfExportService
{
    byte[] GeneratePdf(PdfLessonData lesson, PdfExportMode mode);
}
