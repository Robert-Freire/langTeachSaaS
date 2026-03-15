namespace LangTeach.Api.Data.Models;

public class Teacher
{
    public Guid Id { get; set; }
    public string Auth0UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public bool IsApproved { get; set; } = false;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public TeacherSettings? Settings { get; set; }
    public ICollection<Student> Students { get; set; } = [];
    public ICollection<Lesson> Lessons { get; set; } = [];
}
