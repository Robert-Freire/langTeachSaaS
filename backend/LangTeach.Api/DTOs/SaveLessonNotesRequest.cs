namespace LangTeach.Api.DTOs;

public class SaveLessonNotesRequest
{
    public string? WhatWasCovered { get; set; }
    public string? HomeworkAssigned { get; set; }
    public string? AreasToImprove { get; set; }
    public string? NextLessonIdeas { get; set; }
}
