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

    // Whether the level filter kept this tag in the student-facing view or removed it as
    // above the student's CEFR level. Removed tags are persisted (not discarded) so the
    // teacher can opt into an all-errors view. Default "kept" backfills pre-#1351 rows.
    public string FilterStatus { get; set; } = CorrectionTagFilterStatus.Kept;

    public Correction Correction { get; set; } = null!;
}
