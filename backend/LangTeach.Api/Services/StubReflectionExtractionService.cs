using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public class StubReflectionExtractionService : IReflectionExtractionService
{
    private readonly ILogger<StubReflectionExtractionService> _logger;

    public StubReflectionExtractionService(ILogger<StubReflectionExtractionService> logger)
    {
        _logger = logger;
    }

    public Task<ExtractedReflectionDto> ExtractAsync(string text, IReadOnlyList<string>? knownDifficulties = null, CancellationToken ct = default)
    {
        _logger.LogInformation("StubReflectionExtractionService.ExtractAsync called with {Length} chars", text.Length);
        return Task.FromResult(new ExtractedReflectionDto(
            WhatWasCovered: new ExtractedTextFieldDto("[Extracted] What was covered", "replace"),
            AreasToImprove: new ExtractedTextFieldDto("[Extracted] Areas to improve", "replace"),
            EmotionalSignals: "[Extracted] Emotional signals",
            HomeworkAssigned: new ExtractedTextFieldDto("[Extracted] Homework assigned", "replace"),
            NextLessonIdeas: new ExtractedTextFieldDto("[Extracted] Next lesson ideas", "append"),
            SessionDate: "2026-01-15",
            SuggestedDifficulties: [],
            RawExtractionJson: null,
            SessionTitle: "[Extracted] Session title",
            TopicTags: [new TopicTagDto("[Extracted] Topic", null)],
            PreviousHomeworkStatus: null,
            TeachingTodos: [],
            TeacherFollowups: [],
            LevelReassessment: null,
            DurationMinutes: null,
            IsCancelled: null,
            DifficultiesWorkedOn: [],
            SessionStartTime: "09:00"
        ));
    }
}
