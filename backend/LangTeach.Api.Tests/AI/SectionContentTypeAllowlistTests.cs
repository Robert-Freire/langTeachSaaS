using FluentAssertions;
using LangTeach.Api.AI;

namespace LangTeach.Api.Tests.AI;

public class SectionContentTypeAllowlistTests
{
    [Theory]
    [InlineData("WarmUp", "vocabulary")]
    [InlineData("WarmUp", "grammar")]
    [InlineData("WarmUp", "exercises")]
    [InlineData("WarmUp", "homework")]
    [InlineData("Practice", "grammar")]
    [InlineData("Practice", "vocabulary")]
    [InlineData("Practice", "reading")]
    [InlineData("Practice", "free-text")]
    [InlineData("WrapUp", "exercises")]
    [InlineData("WrapUp", "vocabulary")]
    [InlineData("WrapUp", "grammar")]
    [InlineData("WrapUp", "conversation")]
    [InlineData("Presentation", "exercises")]
    [InlineData("Production", "exercises")]
    [InlineData("Production", "grammar")]
    [InlineData("Production", "vocabulary")]
    public void IsAllowed_ReturnsFalse_ForDisallowedCombinations(string sectionType, string contentType)
    {
        SectionContentTypeAllowlist.IsAllowed(sectionType, contentType).Should().BeFalse();
    }

    [Theory]
    [InlineData("WarmUp", "free-text")]
    [InlineData("WarmUp", "conversation")]
    [InlineData("Practice", "exercises")]
    [InlineData("Practice", "conversation")]
    [InlineData("WrapUp", "free-text")]
    [InlineData("Presentation", "grammar")]
    [InlineData("Presentation", "vocabulary")]
    [InlineData("Presentation", "reading")]
    [InlineData("Presentation", "conversation")]
    [InlineData("Presentation", "free-text")]
    [InlineData("Production", "free-text")]
    [InlineData("Production", "conversation")]
    [InlineData("Production", "reading")]
    public void IsAllowed_ReturnsTrue_ForAllowedCombinations(string sectionType, string contentType)
    {
        SectionContentTypeAllowlist.IsAllowed(sectionType, contentType).Should().BeTrue();
    }

    [Theory]
    [InlineData("warmup", "free-text")]
    [InlineData("WARMUP", "free-text")]
    [InlineData("WarmUp", "FREE-TEXT")]
    [InlineData("WRAPUP", "free-text")]
    [InlineData("wrapup", "FREE-TEXT")]
    public void IsAllowed_IsCaseInsensitive(string sectionType, string contentType)
    {
        SectionContentTypeAllowlist.IsAllowed(sectionType, contentType).Should().BeTrue();
    }

    [Theory]
    [InlineData("UnknownSection", "vocabulary")]
    [InlineData("UnknownSection", "exercises")]
    [InlineData("", "grammar")]
    [InlineData("SomeOtherSection", "free-text")]
    public void IsAllowed_ReturnsTrue_ForUnknownSection(string sectionType, string contentType)
    {
        SectionContentTypeAllowlist.IsAllowed(sectionType, contentType).Should().BeTrue();
    }
}
