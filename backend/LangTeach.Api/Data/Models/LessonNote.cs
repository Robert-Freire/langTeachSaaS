namespace LangTeach.Api.Data.Models;

public class LessonNote
{
    public Guid Id { get; set; }
    public Guid LessonId { get; set; }
    public Guid StudentId { get; set; }
    public Guid TeacherId { get; set; }
    public string? WhatWasCovered { get; set; }
    public string? HomeworkAssigned { get; set; }
    public string? AreasToImprove { get; set; }
    public string? NextLessonIdeas { get; set; }
    public string? EmotionalSignals { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Lesson Lesson { get; set; } = null!;
    public Student Student { get; set; } = null!;
    public Teacher Teacher { get; set; } = null!;
}
