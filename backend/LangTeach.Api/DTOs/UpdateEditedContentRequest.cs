using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class UpdateEditedContentRequest
{
    [Required]
    public string EditedContent { get; set; } = string.Empty;
}
