using LangTeach.Api.Data.Models;
using System.Text.Json;

namespace LangTeach.Api.Tests.Helpers;

internal static class TestJsonOptions
{
    public static readonly JsonSerializerOptions Default = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new ContentBlockTypeJsonConverter() },
    };
}
