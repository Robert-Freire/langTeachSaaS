using System.Text.Json;
using System.Text.Json.Serialization;

namespace LangTeach.Api.Data.Models;

public enum ContentBlockType
{
    LessonPlan,
    Vocabulary,
    Grammar,
    Exercises,
    Conversation,
    Reading,
    Homework,
}

public static class ContentBlockTypeExtensions
{
    private static readonly Dictionary<ContentBlockType, string> ToKebabMap = new()
    {
        [ContentBlockType.LessonPlan]   = "lesson-plan",
        [ContentBlockType.Vocabulary]   = "vocabulary",
        [ContentBlockType.Grammar]      = "grammar",
        [ContentBlockType.Exercises]    = "exercises",
        [ContentBlockType.Conversation] = "conversation",
        [ContentBlockType.Reading]      = "reading",
        [ContentBlockType.Homework]     = "homework",
    };

    private static readonly Dictionary<string, ContentBlockType> FromKebabMap =
        ToKebabMap.ToDictionary(kv => kv.Value, kv => kv.Key);

    public static string ToKebabCase(this ContentBlockType type) =>
        ToKebabMap.TryGetValue(type, out var s) ? s : throw new ArgumentOutOfRangeException(nameof(type), $"No kebab-case mapping for ContentBlockType.{type}");

    public static ContentBlockType FromKebabCase(string value) =>
        FromKebabMap.TryGetValue(value, out var t) ? t : throw new ArgumentException($"Unknown block type: {value}");

    public static bool TryFromKebabCase(string value, out ContentBlockType type) =>
        FromKebabMap.TryGetValue(value, out type);
}

public class ContentBlockTypeJsonConverter : JsonConverter<ContentBlockType>
{
    public override ContentBlockType Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType is not JsonTokenType.String)
            throw new JsonException($"Expected string for {nameof(ContentBlockType)}.");

        var value = reader.GetString() ?? string.Empty;
        if (ContentBlockTypeExtensions.TryFromKebabCase(value, out var type))
            return type;
        throw new JsonException($"Unknown ContentBlockType: '{value}'");
    }

    public override void Write(Utf8JsonWriter writer, ContentBlockType value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.ToKebabCase());
}
