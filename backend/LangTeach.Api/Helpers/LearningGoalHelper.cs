using LangTeach.Api.DTOs;

namespace LangTeach.Api.Helpers;

public static class LearningGoalHelper
{
    public static List<LearningGoalDto> Deserialize(string? json) =>
        JsonStorageHelper.DeserializeListWithStringFallback<LearningGoalDto>(
            json,
            text => new LearningGoalDto(Guid.NewGuid().ToString(), text, []));

    public static string[] FlattenGoals(string? json) =>
        Deserialize(json)
            .SelectMany(g => new[] { g.Text }.Concat(g.Children.Select(c => c.Text)))
            .ToArray();
}
