using System.Text.Json;
using FluentAssertions;
using LangTeach.Api.AI;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.AI;

public class ContentSchemaServiceTests
{
    private readonly ContentSchemaService _sut = new(NullLogger<ContentSchemaService>.Instance);

    private static readonly string[] ExpectedKeys =
    [
        "vocabulary", "grammar", "exercises", "conversation",
        "reading", "homework", "lesson-plan"
    ];

    [Theory]
    [MemberData(nameof(ExpectedKeys_Data))]
    public void GetSchema_ReturnsNonNull_ForAllExpectedContentTypes(string key)
    {
        _sut.GetSchema(key).Should().NotBeNullOrWhiteSpace(
            because: $"schema file for '{key}' must be embedded as a resource");
    }

    public static TheoryData<string> ExpectedKeys_Data()
    {
        var data = new TheoryData<string>();
        foreach (var key in ExpectedKeys) data.Add(key);
        return data;
    }

    [Theory]
    [MemberData(nameof(ExpectedKeys_Data))]
    public void GetSchema_ReturnsValidJson_ForAllExpectedContentTypes(string key)
    {
        var schema = _sut.GetSchema(key)!;
        var act = () => JsonDocument.Parse(schema);
        act.Should().NotThrow(because: $"schema for '{key}' must be valid JSON");
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

    [Theory]
    [MemberData(nameof(ExpectedKeys_Data))]
    public void GetSchema_ContainsDraftSevenSchemaDeclaration(string key)
    {
        var schema = _sut.GetSchema(key)!;
        schema.Should().Contain("json-schema.org/draft-07",
            because: $"all schemas should declare JSON Schema draft-07 for '{key}'");
    }
}
