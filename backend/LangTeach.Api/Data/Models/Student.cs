namespace LangTeach.Api.Data.Models;

public class Student
{
    public Guid Id { get; set; }
    public Guid TeacherId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string LearningLanguage { get; set; } = string.Empty;
    public string CefrLevel { get; set; } = string.Empty;
    public string Interests { get; set; } = "[]";
    public string? NativeLanguage { get; set; }
    public string LearningGoals { get; set; } = "[]";
    public string Weaknesses { get; set; } = "[]";
    public string? Notes { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Teacher Teacher { get; set; } = null!;
    public ICollection<Lesson> Lessons { get; set; } = [];
    public ICollection<Course> Courses { get; set; } = [];
}
