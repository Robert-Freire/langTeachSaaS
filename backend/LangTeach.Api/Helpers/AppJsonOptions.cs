using System.Text.Json;

namespace LangTeach.Api.Helpers;

internal static class AppJsonOptions
{
    internal static readonly JsonSerializerOptions CaseInsensitive = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    internal static readonly JsonSerializerOptions CaseInsensitiveWithComments = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
    };
}
