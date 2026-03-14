namespace LangTeach.Api.Data.Models;

public class LessonTemplate
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string DefaultSections { get; set; } = "[]";

    public ICollection<Lesson> Lessons { get; set; } = [];
}
