namespace LangTeach.Api.Services;

public class OcrOptions
{
    public const string SectionName = "Ocr";

    public long MaxBytes { get; set; } = 10_485_760;
    public int MinExtractedChars { get; set; } = 10;
    public string[] AcceptedContentTypes { get; set; } =
    [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    // Separate from MaxBytes (upload limit) -- Claude API has its own document size constraints.
    public long PdfClaudeMaxFileBytes { get; set; } = 10_485_760;
}
