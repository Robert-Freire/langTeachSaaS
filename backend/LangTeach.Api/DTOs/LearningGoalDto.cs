namespace LangTeach.Api.DTOs;

public record LearningGoalDto(
    string Id,
    string Text,
    List<LearningGoalDto> Children
);
