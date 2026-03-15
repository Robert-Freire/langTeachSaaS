using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class UpdateEditedContentRequest
{
    [Required, MinLength(1)]
    public string EditedContent { get; set; } = string.Empty;
}
