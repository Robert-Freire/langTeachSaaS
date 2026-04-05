namespace LangTeach.Api.DTOs;

public record LessonNotesDto(
    Guid Id,
    Guid LessonId,
    string? WhatWasCovered,
    string? HomeworkAssigned,
    string? AreasToImprove,
    string? NextLessonIdeas,
    string? EmotionalSignals
);
