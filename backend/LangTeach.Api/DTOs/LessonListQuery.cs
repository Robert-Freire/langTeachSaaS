using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class LessonListQuery : IValidatableObject
{
    public string? Language { get; set; }
    public string? CefrLevel { get; set; }
    public string? Status { get; set; }
    public string? Search { get; set; }
    private int _page = 1;
    public int Page
    {
        get => _page;
        set => _page = Math.Max(value, 1);
    }

    private int _pageSize = 20;
    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = Math.Clamp(value, 1, 100);
    }

    public DateTime? ScheduledFrom { get; set; }
    public DateTime? ScheduledTo { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (ScheduledFrom.HasValue && ScheduledTo.HasValue && ScheduledFrom > ScheduledTo)
        {
            yield return new ValidationResult(
                "scheduledFrom must be earlier than or equal to scheduledTo.",
                [nameof(ScheduledFrom), nameof(ScheduledTo)]);
        }
    }
}
