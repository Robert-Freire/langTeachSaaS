using System.Text.Json;
using FluentAssertions;
using LangTeach.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

public class ContentSchemaServiceTests
{
    private readonly ContentSchemaService _sut = new(NullLogger<ContentSchemaService>.Instance);

    /// Discovers keys directly from embedded resources so tests automatically cover new schema files.
    public static TheoryData<string> EmbeddedSchemaKeys_Data()
    {
        var assembly = typeof(ContentSchemaService).Assembly;
        const string prefix = "LangTeach.Api.ContentSchemas.";
        var data = new TheoryData<string>();
        foreach (var name in assembly.GetManifestResourceNames()
            .Where(n => n.StartsWith(prefix, StringComparison.Ordinal) && n.EndsWith(".json", StringComparison.Ordinal)))
        {
            data.Add(name[prefix.Length..^".json".Length]);
        }
        return data;
    }

    [Fact]
    public void LoadsAtLeastSevenSchemas()
    {
        EmbeddedSchemaKeys_Data().Count.Should().BeGreaterThanOrEqualTo(10,
            because: "vocabulary, grammar, exercises, conversation, reading, homework, lesson-plan, guided-writing, error-correction, noticing-task must all be present");
    }

    [Theory]
    [MemberData(nameof(EmbeddedSchemaKeys_Data))]
    public void GetSchema_ReturnsNonNull_ForAllEmbeddedKeys(string key)
    {
        _sut.GetSchema(key).Should().NotBeNullOrWhiteSpace(
            because: $"schema file for '{key}' must be loadable by key");
    }

    [Theory]
    [MemberData(nameof(EmbeddedSchemaKeys_Data))]
    public void GetSchema_ReturnsValidJson_ForAllEmbeddedKeys(string key)
    {
        var schema = _sut.GetSchema(key)!;
        using var doc = JsonDocument.Parse(schema);
        doc.Should().NotBeNull(because: $"schema for '{key}' must be valid JSON");
    }

    [Theory]
    [MemberData(nameof(EmbeddedSchemaKeys_Data))]
    public void GetSchema_ContainsDraftSevenSchemaDeclaration(string key)
    {
        var schema = _sut.GetSchema(key)!;
        schema.Should().Contain("json-schema.org/draft-07",
            because: $"all schemas should declare JSON Schema draft-07 for '{key}'");
    }

    [Fact]
    public void GetSchema_ReturnsNull_ForUnknownContentType()
    {
        _sut.GetSchema("nonexistent-type").Should().BeNull();
    }

    [Fact]
    public void GetSchema_IsCaseInsensitive()
    {
        _sut.GetSchema("Vocabulary").Should().NotBeNull();
        _sut.GetSchema("GRAMMAR").Should().NotBeNull();
    }
}
