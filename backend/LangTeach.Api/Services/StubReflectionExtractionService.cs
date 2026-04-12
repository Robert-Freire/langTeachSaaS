using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public class StubReflectionExtractionService : IReflectionExtractionService
{
    public Task<ExtractedReflectionDto> ExtractAsync(string text, IReadOnlyList<string>? knownDifficulties = null, CancellationToken ct = default) =>
        Task.FromResult(new ExtractedReflectionDto(
            WhatWasCovered: "[Extracted] What was covered",
            AreasToImprove: "[Extracted] Areas to improve",
            EmotionalSignals: "[Extracted] Emotional signals",
            HomeworkAssigned: "[Extracted] Homework assigned",
            NextLessonIdeas: "[Extracted] Next lesson ideas",
            SessionDate: null,
            SuggestedDifficulties: [],
            RawExtractionJson: null,
            SessionTitle: null,
            TopicTags: [],
            PreviousHomeworkStatus: null,
            TeachingTodos: [],
            TeacherFollowups: [],
            LevelReassessment: null,
            DurationMinutes: null,
            IsCancelled: null,
            DifficultiesWorkedOn: []
        ));
}
