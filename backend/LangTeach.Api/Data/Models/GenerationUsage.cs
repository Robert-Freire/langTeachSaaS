namespace LangTeach.Api.Data.Models;

public class GenerationUsage
{
    public Guid Id { get; set; }
    public Guid TeacherId { get; set; }
    public ContentBlockType BlockType { get; set; }
    public DateTime CreatedAt { get; set; }

    public Teacher Teacher { get; set; } = null!;
}
