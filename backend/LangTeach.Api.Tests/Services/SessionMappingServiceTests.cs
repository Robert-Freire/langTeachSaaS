using FluentAssertions;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;

namespace LangTeach.Api.Tests.Services;

public class SessionMappingServiceTests
{
    private readonly SessionMappingService _sut = new();

    private static CurriculumTemplateUnit MakeUnit(string title, params string[] grammar) =>
        new(0, title, "Goal", grammar.ToList(), [], [], []);

    private static IReadOnlyList<CurriculumTemplateUnit> FourUnits() =>
    [
        MakeUnit("En el aula", "Verbo llamarse"),
        MakeUnit("Nosotros", "El género", "Las tres conjugaciones", "Los verbos ser"),
        MakeUnit("Quiero aprender español", "El presente de indicativo", "El artículo"),
        MakeUnit("¿Dónde está Santiago?", "Algunos usos de hay", "El verbo estar"),
    ];

    [Fact]
    public void Exact_FourUnitsForFourSessions_ReturnsFourEntries_ExactStrategy()
    {
        var result = _sut.Compute(FourUnits(), 4);

        result.Strategy.Should().Be("exact");
        result.Sessions.Should().HaveCount(4);
        result.ExcludedUnits.Should().BeEmpty();
        result.SessionCount.Should().Be(4);
        result.UnitCount.Should().Be(4);
        for (int i = 0; i < 4; i++)
            result.Sessions[i].SessionIndex.Should().Be(i + 1);
    }

    [Fact]
    public void Exact_SessionTopicMatchesUnitTitle()
    {
        var result = _sut.Compute(FourUnits(), 4);

        result.Sessions[0].UnitRef.Should().Be("En el aula");
        result.Sessions[0].SubFocus.Should().Be("En el aula");
    }

    [Fact]
    public void Expand_TwelveSessionsForFourUnits_ReturnsTwelveEntries_ExpandStrategy()
    {
        var result = _sut.Compute(FourUnits(), 12);

        result.Strategy.Should().Be("expand");
        result.Sessions.Should().HaveCount(12);
        result.ExcludedUnits.Should().BeEmpty();
        result.SessionCount.Should().Be(12);
    }

    [Fact]
    public void Expand_TwelveSessionsForFourUnits_EvenDistribution_ThreeSessionsPerUnit()
    {
        var result = _sut.Compute(FourUnits(), 12);

        // 12 / 4 = 3 sessions per unit, no remainder
        var groupedByUnit = result.Sessions.GroupBy(s => s.UnitRef).ToList();
        groupedByUnit.Should().HaveCount(4);
        foreach (var group in groupedByUnit)
            group.Should().HaveCount(3);
    }

    [Fact]
    public void Expand_TenSessionsForFourUnits_DistributesRemainder()
    {
        var result = _sut.Compute(FourUnits(), 10);

        // 10 / 4 = 2 base, remainder 2 → first 2 units get 3 sessions, last 2 get 2
        var groups = result.Sessions.GroupBy(s => s.UnitRef).ToList();
        groups[0].Should().HaveCount(3);
        groups[1].Should().HaveCount(3);
        groups[2].Should().HaveCount(2);
        groups[3].Should().HaveCount(2);
    }

    [Fact]
    public void Expand_SessionIndexIsSequential()
    {
        var result = _sut.Compute(FourUnits(), 8);

        for (int i = 0; i < result.Sessions.Count; i++)
            result.Sessions[i].SessionIndex.Should().Be(i + 1);
    }

    [Fact]
    public void Expand_ThreeSessionUnit_UsesIntroductionPracticeProductionLabels()
    {
        var result = _sut.Compute(FourUnits(), 12);

        // Each unit gets 3 sessions → Introduction / Practice / Production
        var group = result.Sessions.Where(s => s.UnitRef == "En el aula").ToList();
        group[0].SubFocus.Should().Contain("Introduction");
        group[1].SubFocus.Should().Contain("Practice");
        group[2].SubFocus.Should().Contain("Production");
    }

    [Fact]
    public void Expand_TwoSessionUnit_UsesFoundationExtendedPracticeLabels()
    {
        // 10 sessions, 4 units: last 2 units get 2 sessions each
        var result = _sut.Compute(FourUnits(), 10);

        var group = result.Sessions.Where(s => s.UnitRef == "¿Dónde está Santiago?").ToList();
        group[0].SubFocus.Should().Contain("Foundation");
        group[1].SubFocus.Should().Contain("Extended Practice");
    }

    [Fact]
    public void Expand_RationaleIsNonEmpty()
    {
        var result = _sut.Compute(FourUnits(), 12);

        foreach (var s in result.Sessions)
            s.Rationale.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void Compress_FourSessionsForEightUnits_ReturnsFirstFourAndExcludesRest()
    {
        var units = Enumerable.Range(1, 8)
            .Select(i => MakeUnit($"Unit {i}", $"Grammar {i}"))
            .ToList();

        var result = _sut.Compute(units, 4);

        result.Strategy.Should().Be("compress");
        result.Sessions.Should().HaveCount(4);
        result.ExcludedUnits.Should().HaveCount(4);
        result.ExcludedUnits.Should().BeEquivalentTo(["Unit 5", "Unit 6", "Unit 7", "Unit 8"]);
    }

    [Fact]
    public void Compress_PreservesGrammarProgressionOrder()
    {
        var units = Enumerable.Range(1, 6)
            .Select(i => MakeUnit($"Unit {i}", $"Grammar {i}"))
            .ToList();

        var result = _sut.Compute(units, 3);

        result.Sessions.Select(s => s.UnitRef).Should().Equal("Unit 1", "Unit 2", "Unit 3");
    }

    [Fact]
    public void Compress_RationaleContainsExcludedUnitInfo()
    {
        var units = Enumerable.Range(1, 6)
            .Select(i => MakeUnit($"Unit {i}"))
            .ToList();

        var result = _sut.Compute(units, 3);

        result.Sessions[0].Rationale.Should().Contain("Not included");
    }

    [Fact]
    public void Edge_OneSession_ReturnsFirstUnit()
    {
        var result = _sut.Compute(FourUnits(), 1);

        result.Strategy.Should().Be("compress");
        result.Sessions.Should().HaveCount(1);
        result.Sessions[0].UnitRef.Should().Be("En el aula");
        result.ExcludedUnits.Should().HaveCount(3);
    }

    [Fact]
    public void Edge_OneUnitManySessions_SplitsIntoSubFocuses()
    {
        var units = new[] { MakeUnit("Nosotros", "El género", "Conjugaciones") };

        var result = _sut.Compute(units, 5);

        result.Strategy.Should().Be("expand");
        result.Sessions.Should().HaveCount(5);
        result.Sessions.All(s => s.UnitRef == "Nosotros").Should().BeTrue();
        // 5 sessions: Introduction, Practice 1, Practice 2, Practice 3, Production
        result.Sessions[0].SubFocus.Should().Contain("Introduction");
        result.Sessions[4].SubFocus.Should().Contain("Production");
    }

    [Fact]
    public void GrammarFocus_IsStringJoinedFromUnit()
    {
        var unit = MakeUnit("Test Unit", "Grammar A", "Grammar B", "Grammar C");
        var result = _sut.Compute([unit], 1);

        result.Sessions[0].GrammarFocus.Should().Be("Grammar A, Grammar B, Grammar C");
    }

    [Fact]
    public void GrammarFocus_IsNullWhenUnitHasNoGrammar()
    {
        var unit = new CurriculumTemplateUnit(0, "Empty Unit", "Goal", [], [], [], []);
        var result = _sut.Compute([unit], 1);

        result.Sessions[0].GrammarFocus.Should().BeNull();
    }
}
