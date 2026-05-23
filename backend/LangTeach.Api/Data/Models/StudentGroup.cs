namespace LangTeach.Api.Data.Models;

public class StudentGroup
{
    public Guid StudentId { get; set; }
    public Guid GroupId { get; set; }
    public DateTime CreatedAt { get; set; }

    public Student Student { get; set; } = null!;
    public Group Group { get; set; } = null!;
}
