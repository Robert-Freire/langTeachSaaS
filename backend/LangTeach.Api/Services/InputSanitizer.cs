namespace LangTeach.Api.Services;

/// <summary>
/// Shared prompt input sanitization: strips control characters (below 0x20, except tab)
/// to prevent prompt injection via user-sourced values interpolated into AI prompts.
/// </summary>
internal static class InputSanitizer
{
    internal static string Sanitize(string? value) =>
        value is null ? string.Empty : string.Concat(value.Where(c => c >= ' ' || c == '\t')).Trim();
}
