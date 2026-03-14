using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class UpdateLessonSectionsRequest
{
    public List<SectionInput> Sections { get; set; } = [];
}

public class SectionInput
{
    [Required]
    [RegularExpression(@"^(WarmUp|Presentation|Practice|Production|WrapUp)$",
        ErrorMessage = "SectionType must be one of: WarmUp, Presentation, Practice, Production, WrapUp.")]
    public string SectionType { get; set; } = "";

    [Range(0, int.MaxValue, ErrorMessage = "OrderIndex must be non-negative.")]
    public int OrderIndex { get; set; }

    [MaxLength(5000)]
    public string? Notes { get; set; }
}
