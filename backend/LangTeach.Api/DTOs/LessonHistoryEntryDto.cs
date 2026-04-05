using LangTeach.Api.Data.Models;

namespace LangTeach.Api.DTOs;

public record LessonHistoryEntryDto(
    Guid LessonId,
    string Title,
    string? TemplateName,
    DateTime LessonDate,
    string? WhatWasCovered,
    string? HomeworkAssigned,
    string? AreasToImprove,
    string? NextLessonIdeas,
    string? EmotionalSignals,
    HomeworkStatus? FollowingSessionHomeworkStatus,
    string? FollowingSessionHomeworkStatusName
);
