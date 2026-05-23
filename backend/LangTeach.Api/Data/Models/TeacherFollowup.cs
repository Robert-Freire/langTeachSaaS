namespace LangTeach.Api.Data.Models;

public class TeacherFollowup
{
    public Guid Id { get; set; }
    public Guid TeacherId { get; set; }
    public Guid? StudentId { get; set; }
    public string Text { get; set; } = string.Empty;
    public string Status { get; set; } = TeacherFollowupStatuses.Pending;
    public string Kind { get; set; } = TeacherFollowupKinds.Operational; // see TeacherFollowupKinds
    public DateTime CreatedAt { get; set; }
    public DateOnly? DueDate { get; set; }
    public DateTime? CompletedAt { get; set; }
    public Guid? SourceSessionLogId { get; set; }
    public Guid? CoveredInSessionLogId { get; set; }

    public Guid? GroupId { get; set; }

    public Teacher Teacher { get; set; } = null!;
    public Student? Student { get; set; }
    public Group? Group { get; set; }
    public SessionLog? SourceSessionLog { get; set; }
    public SessionLog? CoveredInSessionLog { get; set; }
}
