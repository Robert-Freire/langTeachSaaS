namespace LangTeach.Api.Data.Models;

public class CorrectionTag
{
    public Guid Id { get; set; }
    public Guid CorrectionId { get; set; }
    public string Category { get; set; } = string.Empty;
    public string SpannedText { get; set; } = string.Empty;
    public int StartIndex { get; set; }
    public int EndIndex { get; set; }
    public string? Explanation { get; set; }
    public string? CorrectedForm { get; set; }
    public int OrderIndex { get; set; }

    public Correction Correction { get; set; } = null!;
}
