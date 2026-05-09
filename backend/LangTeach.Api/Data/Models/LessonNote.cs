using System.ComponentModel.DataAnnotations.Schema;

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
    // DB column name preserved from the original "NextLessonIdeas" to avoid a migration.
    // C# property renamed to NextSessionTopics to align with SessionLog.NextSessionTopics.
    [Column("NextLessonIdeas")]
    public string? NextSessionTopics { get; set; }
    public string? EmotionalSignals { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Lesson Lesson { get; set; } = null!;
    public Student Student { get; set; } = null!;
    public Teacher Teacher { get; set; } = null!;
}
