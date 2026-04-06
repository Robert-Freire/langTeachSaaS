using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public class StubReflectionExtractionService : IReflectionExtractionService
{
    public Task<ExtractedReflectionDto> ExtractAsync(string text, CancellationToken ct = default) =>
        Task.FromResult(new ExtractedReflectionDto(
            WhatWasCovered: "[Extracted] What was covered",
            AreasToImprove: "[Extracted] Areas to improve",
            EmotionalSignals: "[Extracted] Emotional signals",
            HomeworkAssigned: "[Extracted] Homework assigned",
            NextLessonIdeas: "[Extracted] Next lesson ideas"
        ));
}
