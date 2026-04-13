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
            .Where(g => g is not null)
            .SelectMany(g => new[] { g.Text }
                .Concat((g.Children ?? []).Where(c => c is not null).Select(c => c.Text))
                .Where(t => t is not null))
            .ToArray();
}
