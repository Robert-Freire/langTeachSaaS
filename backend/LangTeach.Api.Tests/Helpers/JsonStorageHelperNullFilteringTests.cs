using FluentAssertions;
using LangTeach.Api.Helpers;

namespace LangTeach.Api.Tests.Helpers;

public class JsonStorageHelperNullFilteringTests
{
    [Fact]
    public void DeserializeList_FiltersNullStringEntries()
    {
        var json = """["a", null, "b"]""";
        var result = JsonStorageHelper.DeserializeList<string>(json);
        result.Should().BeEquivalentTo(["a", "b"]);
    }

    [Fact]
    public void DeserializeList_AllNulls_ReturnsEmpty()
    {
        var json = "[null, null]";
        var result = JsonStorageHelper.DeserializeList<string>(json);
        result.Should().BeEmpty();
    }

    [Fact]
    public void DeserializeList_FiltersNullObjectEntries()
    {
        var json = """[{"name":"A"}, null, {"name":"B"}]""";
        var result = JsonStorageHelper.DeserializeList<SampleDto>(json);
        result.Should().HaveCount(2);
        result.Should().NotContainNulls();
    }

    [Fact]
    public void DeserializeListNullable_FiltersNullStringEntries()
    {
        var json = """["x", null, "y"]""";
        var result = JsonStorageHelper.DeserializeListNullable<string>(json);
        result.Should().BeEquivalentTo(["x", "y"]);
    }

    [Fact]
    public void DeserializeListNullable_AllNulls_ReturnsEmpty()
    {
        var json = "[null]";
        var result = JsonStorageHelper.DeserializeListNullable<string>(json);
        result.Should().NotBeNull().And.BeEmpty();
    }

    private sealed record SampleDto(string Name);
}
