namespace LangTeach.Api.Data.Models;

public class TeacherSettings
{
    public Guid Id { get; set; }
    public Guid TeacherId { get; set; }
    public string TeachingLanguages { get; set; } = "[]";
    public string CefrLevels { get; set; } = "[]";
    public string PreferredStyle { get; set; } = "Conversational";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Teacher Teacher { get; set; } = null!;
}
