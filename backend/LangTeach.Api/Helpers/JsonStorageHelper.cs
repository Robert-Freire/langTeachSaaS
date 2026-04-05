using System.Text.Json;

namespace LangTeach.Api.Helpers;

internal static class JsonStorageHelper
{
    private static readonly JsonSerializerOptions CaseInsensitive = new() { PropertyNameCaseInsensitive = true };

    /// <summary>
    /// Deserializes a JSON string into a list. Returns an empty list on null, empty, or malformed input.
    /// </summary>
    public static List<T> DeserializeList<T>(string? json)
    {
        if (string.IsNullOrEmpty(json)) return [];
        try { return JsonSerializer.Deserialize<List<T>>(json, CaseInsensitive) ?? []; }
        catch (JsonException) { return []; }
    }

    /// <summary>
    /// Deserializes a JSON string into a nullable list. Returns null on null, empty, or malformed input.
    /// </summary>
    public static List<T>? DeserializeListNullable<T>(string? json)
    {
        if (string.IsNullOrEmpty(json)) return null;
        try { return JsonSerializer.Deserialize<List<T>>(json, CaseInsensitive); }
        catch (JsonException) { return null; }
    }

    public static string Serialize<T>(List<T> list) => JsonSerializer.Serialize(list);

    public static string Serialize<T>(T value) => JsonSerializer.Serialize(value);

    /// <summary>
    /// Deserializes a JSON string into a typed object.
    /// Returns null on null or empty input.
    /// Falls back to <paramref name="legacyCoerce"/> when the string is not valid JSON or cannot be deserialized.
    /// </summary>
    public static T? DeserializeWithFallback<T>(string? json, Func<string, T> legacyCoerce) where T : class
    {
        if (string.IsNullOrEmpty(json)) return null;
        try { return JsonSerializer.Deserialize<T>(json, CaseInsensitive); }
        catch (JsonException) { return legacyCoerce(json); }
    }

    /// <summary>
    /// Reads a top-level string property from a JSON object.
    /// Returns null on null/empty input, missing key, non-string value, or parse error.
    /// </summary>
    public static string? ReadStringProperty(string? json, string propertyName)
    {
        if (string.IsNullOrEmpty(json)) return null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty(propertyName, out var el) &&
                el.ValueKind == JsonValueKind.String)
                return el.GetString();
        }
        catch (JsonException) { }
        return null;
    }
}
