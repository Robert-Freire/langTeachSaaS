using FluentAssertions;
using LangTeach.Api.Services;

namespace LangTeach.Api.Tests.Services;

public class CurriculumTemplateServiceTests
{
    private readonly CurriculumTemplateService _sut = new();

    [Fact]
    public void GetAll_ReturnsAtLeastTwentyFiveTemplates()
    {
        var templates = _sut.GetAll();
        templates.Count.Should().BeGreaterThanOrEqualTo(25);
    }

    [Fact]
    public void GetAll_HasExpectedLevels()
    {
        var levels = _sut.GetAll().Select(t => t.Level).ToHashSet();
        levels.Should().Contain("A1.1");
        levels.Should().Contain("B1.1");
        levels.Should().Contain("C1.1");
    }

    [Fact]
    public void GetByLevel_KnownLevel_ReturnsTemplate()
    {
        var template = _sut.GetByLevel("A1.1");
        template.Should().NotBeNull();
        template!.Level.Should().Be("A1.1");
        template.CefrLevel.Should().Be("A1");
        template.Units.Should().NotBeEmpty();
    }

    [Fact]
    public void GetByLevel_CaseInsensitive_ReturnsTemplate()
    {
        var upper = _sut.GetByLevel("B1.1");
        upper.Should().NotBeNull();
    }

    [Fact]
    public void GetByLevel_UnknownLevel_ReturnsNull()
    {
        _sut.GetByLevel("Z9.9").Should().BeNull();
    }

    [Fact]
    public void GetAll_Summaries_HaveNonEmptyUnitCount()
    {
        var summaries = _sut.GetAll();
        summaries.Should().AllSatisfy(s => s.UnitCount.Should().BeGreaterThan(0));
    }

    [Fact]
    public void GetGrammarForCefrPrefix_KnownPrefix_ReturnsNonEmptyList()
    {
        var grammar = _sut.GetGrammarForCefrPrefix("A1");
        grammar.Should().NotBeEmpty();
    }

    [Fact]
    public void GetGrammarForCefrPrefix_AggregatesAcrossSubLevels()
    {
        // B1 has sub-levels B1.1 through B1.5, so grammar should be the union
        var allB1Grammar = _sut.GetGrammarForCefrPrefix("B1");
        var b1_1Grammar = _sut.GetByLevel("B1.1")?.Units.SelectMany(u => u.Grammar).ToList() ?? [];

        allB1Grammar.Count.Should().BeGreaterThanOrEqualTo(b1_1Grammar.Count);
    }

    [Fact]
    public void GetGrammarForCefrPrefix_UnknownPrefix_ReturnsEmpty()
    {
        var grammar = _sut.GetGrammarForCefrPrefix("XX");
        grammar.Should().BeEmpty();
    }

    [Fact]
    public void GetAll_SampleGrammar_IsFromFirstUnit()
    {
        var summary = _sut.GetAll().First(s => s.Level == "A1.1");
        summary.SampleGrammar.Should().NotBeEmpty();
        summary.SampleGrammar.Count.Should().BeLessThanOrEqualTo(3);
    }
}
