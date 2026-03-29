namespace LangTeach.Api.AI;

public interface ISpanishGrammarValidationService
{
    /// <summary>
    /// Validates the generated content for common Spanish grammar errors.
    /// </summary>
    /// <param name="content">The AI-generated content to validate.</param>
    /// <param name="grammarTopic">The lesson's grammar topic (e.g. "ser vs estar"). Used to add context to warnings.</param>
    /// <returns>A list of human-readable warning strings (empty if no issues found).</returns>
    IReadOnlyList<string> Validate(string content, string grammarTopic);
}
