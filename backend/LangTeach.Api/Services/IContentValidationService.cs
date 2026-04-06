namespace LangTeach.Api.Services;

public interface IContentValidationService
{
    /// <summary>
    /// Returns an error message when the exercises content contains trueFalse items
    /// with a missing or empty sourcePassage field; null means valid.
    /// </summary>
    string? ValidateExercisesContent(string generatedContent);
}
