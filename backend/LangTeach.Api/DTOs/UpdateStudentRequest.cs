using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class UpdateStudentRequest
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = "";

    [Required, MaxLength(100)]
    public string LearningLanguage { get; set; } = "";

    [Required]
    public string CefrLevel { get; set; } = "";

    [MaxLength(50, ErrorMessage = "Cannot have more than 50 interests.")]
    public List<string> Interests { get; set; } = [];

    [MaxLength(2000)]
    public string? Notes { get; set; }
}
