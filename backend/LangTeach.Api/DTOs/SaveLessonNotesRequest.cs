using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class SaveLessonNotesRequest
{
    [MaxLength(2000)]
    public string? WhatWasCovered { get; set; }
    [MaxLength(2000)]
    public string? HomeworkAssigned { get; set; }
    [MaxLength(2000)]
    public string? AreasToImprove { get; set; }
    [MaxLength(2000)]
    public string? NextLessonIdeas { get; set; }
    [MaxLength(2000)]
    public string? EmotionalSignals { get; set; }
}
