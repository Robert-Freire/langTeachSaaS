using System.Text.Json;
using LangTeach.Api.Helpers;

namespace LangTeach.Api.Services;

public class ContentValidationService : IContentValidationService
{
    public string? ValidateExercisesContent(string generatedContent)
    {
        try
        {
            var stripped = ContentJsonHelper.StripFences(generatedContent);
            if (stripped is null) return null;

            using var doc = JsonDocument.Parse(stripped);
            if (!doc.RootElement.TryGetProperty("trueFalse", out var trueFalseArray))
                return null;

            foreach (var item in trueFalseArray.EnumerateArray())
            {
                if (!item.TryGetProperty("sourcePassage", out var sourcePassage) ||
                    string.IsNullOrWhiteSpace(sourcePassage.GetString()))
                    return "All trueFalse items must have a non-empty sourcePassage field.";
            }

            return null;
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
