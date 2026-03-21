using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class UpdateCourseRequest
{
    [MaxLength(200)]
    public string? Name { get; set; }

    [MaxLength(1000)]
    public string? Description { get; set; }
}
