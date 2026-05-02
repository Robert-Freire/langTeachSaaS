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

        // Emit a newSession proposal when the text contains the trigger phrase used in tests.
        var newSessionTitle = text.Contains("[schedule-new-session]")
            ? "[Extracted] New Session Title"
            : null;
        var newSessionDate = newSessionTitle is not null ? "2026-05-19" : null;

        return Task.FromResult(new ExtractedReflectionDto(
            WhatWasCovered: new ExtractedTextFieldDto("[Extracted] What was covered", ExtractionMode.Replace),
            AreasToImprove: new ExtractedTextFieldDto("[Extracted] Areas to improve", ExtractionMode.Replace),
            EmotionalSignals: "[Extracted] Emotional signals",
            HomeworkAssigned: new ExtractedTextFieldDto("[Extracted] Homework assigned", ExtractionMode.Replace),
            NextLessonIdeas: new ExtractedTextFieldDto("[Extracted] Next lesson ideas", ExtractionMode.Append),
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
            SessionStartTime: "09:00",
            NewSessionTitle: newSessionTitle,
            NewSessionDate: newSessionDate
        ));
    }
}
