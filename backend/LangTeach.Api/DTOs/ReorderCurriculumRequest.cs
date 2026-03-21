using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class ReorderCurriculumRequest
{
    [Required]
    public List<Guid> OrderedEntryIds { get; set; } = [];
}
