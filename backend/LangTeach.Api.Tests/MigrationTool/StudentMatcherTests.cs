extern alias MigTool;
using FluentAssertions;
using MigTool::LangTeach.MigrationTool;

namespace LangTeach.Api.Tests.MigrationTool;

public class StudentMatcherTests
{
    // --- NormalizeLevel ---

    [Theory]
    [InlineData("A0", "A1")]
    [InlineData("A0+", "A1")]
    [InlineData("A1", "A1")]
    [InlineData("A1+", "A1")]
    [InlineData("A2", "A2")]
    [InlineData("A2+", "A2")]
    [InlineData("B1", "B1")]
    [InlineData("B1+", "B1")]
    [InlineData("B2", "B2")]
    [InlineData("B2+", "B2")]
    [InlineData("C1", "C1")]
    [InlineData("C1+", "C1")]
    [InlineData("C2", "C2")]
    [InlineData("C2+", "C2")]
    public void NormalizeLevel_ReturnsBaseBand(string rawLevel, string expected)
    {
        StudentMatcher.NormalizeLevel(rawLevel).Should().Be(expected);
    }

    [Fact]
    public void NormalizeLevel_Null_ReturnsNull()
    {
        StudentMatcher.NormalizeLevel(null).Should().BeNull();
    }

    [Theory]
    [InlineData("a1+", "A1")]
    [InlineData("b2+", "B2")]
    public void NormalizeLevel_LowercaseInput_ReturnsUpperBase(string rawLevel, string expected)
    {
        StudentMatcher.NormalizeLevel(rawLevel).Should().Be(expected);
    }

    // --- ParseLevelFromText ---

    [Theory]
    [InlineData("C1", "C1")]
    [InlineData("B1+", "B1")]
    [InlineData("A0+", "A1")]
    [InlineData("Preply A2", "A2")]
    [InlineData("A2.3", "A2")]
    [InlineData("  B2  ", "B2")]
    [InlineData("preply b1", "B1")]
    public void ParseLevelFromText_RecognisedPatterns_ReturnsNormalisedLevel(string text, string expected)
    {
        StudentMatcher.ParseLevelFromText(text).Should().Be(expected);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("no level here")]
    [InlineData("D1")]
    public void ParseLevelFromText_UnrecognisedPatterns_ReturnsNull(string text)
    {
        StudentMatcher.ParseLevelFromText(text).Should().BeNull();
    }

    // --- ParseSheetName ---

    [Theory]
    [InlineData("Nataliya B1", "Nataliya", "B1")]
    [InlineData("PaulaB2", "Paula", "B2")]
    [InlineData("Alex. Brasis B1+", "Alex. Brasis", "B1+")]
    [InlineData("Erika b1", "Erika", "B1")]
    public void ParseSheetName_WithLevel_ReturnsNameAndLevel(string sheetName, string expectedName, string expectedLevel)
    {
        var (name, level) = StudentMatcher.ParseSheetName(sheetName);
        name.Should().Be(expectedName);
        level.Should().Be(expectedLevel);
    }

    [Theory]
    [InlineData("Alice", "Alice")]
    [InlineData("Alex. Brasis", "Alex. Brasis")]
    [InlineData("Sandy", "Sandy")]
    public void ParseSheetName_WithoutLevel_ReturnsNameAndNullLevel(string sheetName, string expectedName)
    {
        var (name, level) = StudentMatcher.ParseSheetName(sheetName);
        name.Should().Be(expectedName);
        level.Should().BeNull();
    }
}
