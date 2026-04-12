namespace LangTeach.Api.Data.Models;

public class TeacherFollowup
{
    public Guid Id { get; set; }
    public Guid TeacherId { get; set; }
    public Guid? StudentId { get; set; }
    public string Text { get; set; } = string.Empty;
    public string Status { get; set; } = "pending"; // pending | done
    public DateTime CreatedAt { get; set; }
    public DateOnly? DueDate { get; set; }
    public DateTime? CompletedAt { get; set; }
    public Guid? SourceSessionLogId { get; set; }

    public Teacher Teacher { get; set; } = null!;
    public Student? Student { get; set; }
    public SessionLog? SourceSessionLog { get; set; }
}
