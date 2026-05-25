namespace LangTeach.Api.AI;

internal static class PromptSanitizer
{
    // Whitespace-only: replaces \n/\r with spaces (1-to-1 swap keeps char offsets intact).
    // Use when the caller validates span offsets into the sanitised string (e.g. ScopeAffirmer).
    // Do NOT use where prompt-injection via quotes or angle brackets is a concern.
    internal static string SanitizeForOffsetTracking(string s) =>
        s.Replace('\n', ' ').Replace('\r', ' ');

    // Full sanitization: strips newlines AND replaces " < > with safe surrogates.
    // Use for student-controlled text interpolated into prompts where the caller does NOT
    // validate span offsets back into the original text (e.g. LevelFilter tag text).
    internal static string SanitizeForPrompt(string s) =>
        s.Replace('\n', ' ').Replace('\r', ' ').Replace('"', '\'').Replace('<', ' ').Replace('>', ' ');
}
