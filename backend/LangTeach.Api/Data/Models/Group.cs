namespace LangTeach.Api.Data.Models;

public class Group
{
    public Guid Id { get; set; }
    public Guid TeacherId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? CefrLevel { get; set; }
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public string? TeachingNotes { get; set; }

    public Teacher Teacher { get; set; } = null!;
    public ICollection<StudentGroup> StudentGroups { get; set; } = [];
    public ICollection<SessionLog> SessionLogs { get; set; } = [];
    public ICollection<TeacherFollowup> Followups { get; set; } = [];
}
