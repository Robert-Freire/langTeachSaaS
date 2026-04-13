using FluentAssertions;
using LangTeach.Api.Helpers;

namespace LangTeach.Api.Tests.Services;

public class LearningGoalHelperTests
{
    [Fact]
    public void Deserialize_NullInput_ReturnsEmptyList()
    {
        var result = LearningGoalHelper.Deserialize(null);
        result.Should().BeEmpty();
    }

    [Fact]
    public void Deserialize_LegacyStringArray_ReturnsSingleGoalWithText()
    {
        var result = LearningGoalHelper.Deserialize("""["speak confidently"]""");
        result.Should().ContainSingle();
        result[0].Text.Should().Be("speak confidently");
        result[0].Children.Should().BeEmpty();
    }

    [Fact]
    public void Deserialize_JsonArray_ReturnsStructuredGoals()
    {
        var json = """[{"id":"1","text":"grammar","children":[{"id":"2","text":"subjunctive","children":[]}]}]""";
        var result = LearningGoalHelper.Deserialize(json);
        result.Should().ContainSingle();
        result[0].Text.Should().Be("grammar");
        result[0].Children.Should().ContainSingle().Which.Text.Should().Be("subjunctive");
    }

    [Fact]
    public void FlattenGoals_NullInput_ReturnsEmptyArray()
    {
        var result = LearningGoalHelper.FlattenGoals(null);
        result.Should().BeEmpty();
    }

    [Fact]
    public void FlattenGoals_LegacyStringArray_ReturnsSingleElement()
    {
        var result = LearningGoalHelper.FlattenGoals("""["speak confidently"]""");
        result.Should().Equal("speak confidently");
    }

    [Fact]
    public void FlattenGoals_JsonArrayWithChildren_FlattensParentAndChildren()
    {
        var json = """[{"id":"1","text":"grammar","children":[{"id":"2","text":"subjunctive","children":[]}]},{"id":"3","text":"vocabulary","children":[]}]""";
        var result = LearningGoalHelper.FlattenGoals(json);
        result.Should().Equal("grammar", "subjunctive", "vocabulary");
    }
}
