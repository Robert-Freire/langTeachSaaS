using FluentAssertions;
using LangTeach.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

public class SectionProfileServiceTests
{
    private readonly SectionProfileService _sut = new(NullLogger<SectionProfileService>.Instance);

    // --- Profile loading ---

    [Theory]
    [InlineData("warmup")]
    [InlineData("presentation")]
    [InlineData("practice")]
    [InlineData("production")]
    [InlineData("wrapup")]
    public void AllFiveSectionProfiles_AreLoaded(string section)
    {
        // GetGuidance for a known level should return non-empty guidance
        _sut.GetGuidance(section, "B1").Should().NotBeNullOrEmpty();
    }

    [Theory]
    [InlineData("warmup")]
    [InlineData("presentation")]
    [InlineData("practice")]
    [InlineData("production")]
    [InlineData("wrapup")]
    public void AllProfiles_HaveAllSixCefrLevels(string section)
    {
        foreach (var level in new[] { "A1", "A2", "B1", "B2", "C1", "C2" })
        {
            _sut.GetGuidance(section, level).Should().NotBeNullOrEmpty(
                because: $"section '{section}' should have guidance for level '{level}'");
        }
    }

    // --- GetGuidance ---

    [Fact]
    public void GetGuidance_WarmUp_A1_ReturnsGuidanceContainingYesNo()
    {
        _sut.GetGuidance("warmup", "A1").Should().Contain("yes/no", because: "A1 WarmUp uses yes/no questions");
    }

    [Fact]
    public void GetGuidance_WarmUp_C1_ContainsEthicalDilemmaAndCircumlocution()
    {
        var guidance = _sut.GetGuidance("warmup", "C1");
        guidance.Should().Contain("ethical dilemma");
        guidance.Should().Contain("circumlocution");
    }

    [Fact]
    public void GetGuidance_WarmUp_B2_ContainsAgreeDisagree()
    {
        _sut.GetGuidance("warmup", "B2").Should().Contain("agree/disagree");
    }

    [Fact]
    public void GetGuidance_Practice_A1_MentionsWordBank()
    {
        _sut.GetGuidance("practice", "A1").Should().Contain("word bank");
    }

    [Fact]
    public void GetGuidance_Practice_B1_MentionsTwoDifferentFormats()
    {
        _sut.GetGuidance("practice", "B1").Should().Contain("at least 2 different exercise formats");
    }

    [Fact]
    public void GetGuidance_Practice_C1_MentionsMinimizeMechanical()
    {
        var guidance = _sut.GetGuidance("practice", "C1");
        guidance.Should().Contain("Minimize purely mechanical");
    }

    [Fact]
    public void GetGuidance_Production_A1_MentionsGuidedWriting()
    {
        var guidance = _sut.GetGuidance("production", "A1");
        guidance.Should().Contain("guided writing");
        guidance.Should().Contain("3-5 sentences");
    }

    [Fact]
    public void GetGuidance_Production_B1_MentionsCommunicativeTask()
    {
        _sut.GetGuidance("production", "B1").Should().Contain("communicative task");
    }

    [Fact]
    public void GetGuidance_A1_And_A2_HaveDistinctGuidance_ForPractice()
    {
        var a1 = _sut.GetGuidance("practice", "A1");
        var a2 = _sut.GetGuidance("practice", "A2");
        a1.Should().NotBe(a2, because: "A1 and A2 must have distinct practice guidance");
    }

    [Fact]
    public void GetGuidance_A1_And_A2_HaveDistinctGuidance_ForProduction()
    {
        var a1 = _sut.GetGuidance("production", "A1");
        var a2 = _sut.GetGuidance("production", "A2");
        a1.Should().NotBe(a2, because: "A1 and A2 must have distinct production guidance");
    }

    [Fact]
    public void GetGuidance_UnknownSection_ReturnsEmpty()
    {
        _sut.GetGuidance("unknownsection", "B1").Should().BeEmpty();
    }

    [Fact]
    public void GetGuidance_UnknownLevel_ReturnsEmpty()
    {
        _sut.GetGuidance("warmup", "X9").Should().BeEmpty();
    }

    [Fact]
    public void GetGuidance_LevelPrefixNormalization_A1SubLevel()
    {
        // "A1.1" should resolve to "A1"
        _sut.GetGuidance("warmup", "A1.1").Should().NotBeNullOrEmpty();
        _sut.GetGuidance("warmup", "A1.1").Should().Be(_sut.GetGuidance("warmup", "A1"));
    }

    // --- IsAllowed ---

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
    [InlineData("WrapUp", "free-text")]
    [InlineData("Presentation", "exercises")]
    [InlineData("Production", "exercises")]
    [InlineData("Production", "grammar")]
    [InlineData("Production", "vocabulary")]
    public void IsAllowed_ReturnsFalse_ForDisallowedCombinations(string sectionType, string contentType)
    {
        _sut.IsAllowed(sectionType, contentType).Should().BeFalse();
    }

    [Theory]
    [InlineData("WarmUp", "conversation")]
    [InlineData("Practice", "exercises")]
    [InlineData("Practice", "conversation")]
    [InlineData("WrapUp", "conversation")]
    [InlineData("Presentation", "grammar")]
    [InlineData("Presentation", "vocabulary")]
    [InlineData("Presentation", "reading")]
    [InlineData("Presentation", "conversation")]
    [InlineData("Production", "conversation")]
    [InlineData("Production", "reading")]
    public void IsAllowed_ReturnsTrue_ForAllowedCombinations(string sectionType, string contentType)
    {
        _sut.IsAllowed(sectionType, contentType).Should().BeTrue();
    }

    [Theory]
    [InlineData("warmup", "conversation")]
    [InlineData("WARMUP", "conversation")]
    [InlineData("WarmUp", "CONVERSATION")]
    [InlineData("WRAPUP", "conversation")]
    [InlineData("wrapup", "CONVERSATION")]
    public void IsAllowed_IsCaseInsensitive(string sectionType, string contentType)
    {
        _sut.IsAllowed(sectionType, contentType).Should().BeTrue();
    }

    [Theory]
    [InlineData("UnknownSection", "vocabulary")]
    [InlineData("UnknownSection", "exercises")]
    [InlineData("", "grammar")]
    [InlineData("SomeOtherSection", "free-text")]
    public void IsAllowed_ReturnsTrue_ForUnknownSection(string sectionType, string contentType)
    {
        _sut.IsAllowed(sectionType, contentType).Should().BeTrue();
    }

    // --- GetAllowedContentTypes ---

    [Fact]
    public void GetAllowedContentTypes_WarmUp_AllLevels_ReturnsOnlyConversation()
    {
        foreach (var level in new[] { "A1", "A2", "B1", "B2", "C1", "C2" })
        {
            var types = _sut.GetAllowedContentTypes("warmup", level);
            types.Should().BeEquivalentTo(new[] { "conversation" },
                because: $"WarmUp at {level} should only allow conversation");
        }
    }

    [Fact]
    public void GetAllowedContentTypes_WrapUp_AllLevels_ReturnsOnlyConversation()
    {
        foreach (var level in new[] { "A1", "A2", "B1", "B2", "C1", "C2" })
        {
            var types = _sut.GetAllowedContentTypes("wrapup", level);
            types.Should().BeEquivalentTo(new[] { "conversation" },
                because: $"WrapUp at {level} should only allow conversation");
        }
    }

    [Fact]
    public void GetAllowedContentTypes_Production_B2_IncludesReading()
    {
        var types = _sut.GetAllowedContentTypes("production", "B2");
        types.Should().Contain("reading");
        types.Should().Contain("conversation");
    }

    [Fact]
    public void GetAllowedContentTypes_Production_A1_DoesNotIncludeReading()
    {
        var types = _sut.GetAllowedContentTypes("production", "A1");
        types.Should().NotContain("reading");
    }
}
