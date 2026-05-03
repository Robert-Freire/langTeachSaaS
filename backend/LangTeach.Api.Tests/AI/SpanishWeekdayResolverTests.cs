using LangTeach.Api.AI;

namespace LangTeach.Api.Tests.AI;

public class SpanishWeekdayResolverTests
{
    // Reference: Saturday 2026-05-02 (DayOfWeek.Saturday)
    private static readonly DateOnly Saturday = new(2026, 5, 2);

    // (a) Next weekday from weekend reference — TC-28
    [Fact]
    public void BuildWeekdayFactsBlock_BareElLunes_FromSaturday_ResolvesToNextMonday()
    {
        var result = SpanishWeekdayResolver.BuildWeekdayFactsBlock(
            "Programa una sesión para el lunes sobre los pronombres.", Saturday);

        Assert.NotNull(result);
        Assert.Contains("2026-05-04", result);
    }

    // TC-28 exact scenario
    [Fact]
    public void TC28_ElLunes_FromSaturday_ResolvesToMonday2026_05_04()
    {
        var result = SpanishWeekdayResolver.BuildWeekdayFactsBlock(
            "Programa una sesión para el lunes sobre los pronombres de objeto directo.", Saturday);

        Assert.NotNull(result);
        Assert.Contains("2026-05-04", result);
    }

    // TC-32 exact scenario
    [Fact]
    public void TC32_ElJueves_FromSaturday_ResolvesToThursday2026_05_07()
    {
        var result = SpanishWeekdayResolver.BuildWeekdayFactsBlock(
            "Programa para el jueves una sesión de refuerzo.", Saturday);

        Assert.NotNull(result);
        Assert.Contains("2026-05-07", result);
    }

    // (b) Past weekday — "pasado" post-modifier
    [Fact]
    public void BuildWeekdayFactsBlock_ElLunesPasado_FromSaturday_ResolvesToPreviousMonday()
    {
        var result = SpanishWeekdayResolver.BuildWeekdayFactsBlock(
            "Apunta una sesión del el lunes pasado sobre conectores.", Saturday);

        Assert.NotNull(result);
        Assert.Contains("2026-04-27", result);
    }

    // (b2) Past weekday — pre-modifier "el pasado lunes"
    [Fact]
    public void BuildWeekdayFactsBlock_ElPasadoLunes_FromSaturday_ResolvesToPreviousMonday()
    {
        var result = SpanishWeekdayResolver.BuildWeekdayFactsBlock(
            "Que se me olvidó registrar el pasado lunes.", Saturday);

        Assert.NotNull(result);
        Assert.Contains("2026-04-27", result);
    }

    // (c) Future with "que viene"
    [Fact]
    public void BuildWeekdayFactsBlock_ElJuevesQueViene_FromSaturday_ResolvesToNextThursday()
    {
        var result = SpanishWeekdayResolver.BuildWeekdayFactsBlock(
            "El jueves que viene haremos repaso.", Saturday);

        Assert.NotNull(result);
        Assert.Contains("2026-05-07", result);
    }

    // (c2) Future with "próximo"
    [Fact]
    public void BuildWeekdayFactsBlock_ElProximoLunes_FromSaturday_ResolvesToNextMonday()
    {
        var result = SpanishWeekdayResolver.BuildWeekdayFactsBlock(
            "El próximo lunes empezamos con el subjuntivo.", Saturday);

        Assert.NotNull(result);
        Assert.Contains("2026-05-04", result);
    }

    // (c3) Future with "próximo" pre-modifier ("el lunes próximo")
    [Fact]
    public void BuildWeekdayFactsBlock_ElLunesProximo_FromSaturday_ResolvesToNextMonday()
    {
        var result = SpanishWeekdayResolver.BuildWeekdayFactsBlock(
            "Programa el lunes próximo.", Saturday);

        Assert.NotNull(result);
        Assert.Contains("2026-05-04", result);
    }

    // (d) No weekday phrase — returns null
    [Fact]
    public void BuildWeekdayFactsBlock_NoWeekdayPhrase_ReturnsNull()
    {
        var result = SpanishWeekdayResolver.BuildWeekdayFactsBlock(
            "Hoy hemos trabajado el subjuntivo. Le ha costado bastante.", Saturday);

        Assert.Null(result);
    }

    // (e) Multiple phrases — both appear in facts block
    [Fact]
    public void BuildWeekdayFactsBlock_MultipleWeekdays_AllResolved()
    {
        var result = SpanishWeekdayResolver.BuildWeekdayFactsBlock(
            "El lunes vemos subjuntivo y el jueves hacemos repaso.", Saturday);

        Assert.NotNull(result);
        Assert.Contains("2026-05-04", result); // Monday
        Assert.Contains("2026-05-07", result); // Thursday
    }

    // Bare weekday mentioned twice — deduplicated (same day only once in ambiguous set)
    [Fact]
    public void BuildWeekdayFactsBlock_SameBareWeekdayTwice_OnlyOneAmbiguousEntry()
    {
        var result = SpanishWeekdayResolver.BuildWeekdayFactsBlock(
            "El lunes empezamos y el lunes terminamos.", Saturday);

        Assert.NotNull(result);
        // Bare "el lunes" produces one "next/previous" line — exactly one occurrence of "next ="
        var count = result!.Split("next =").Length - 1;
        Assert.Equal(1, count);
    }

    // Bare + modified of same day — both entries present (different deduplication buckets)
    [Fact]
    public void BuildWeekdayFactsBlock_BareAndModifiedSameDay_BothPresent()
    {
        var result = SpanishWeekdayResolver.BuildWeekdayFactsBlock(
            "El lunes y también el lunes próximo.", Saturday);

        Assert.NotNull(result);
        // Bare "el lunes" produces "next = ..., previous = ..." and
        // "el lunes próximo" produces a directed "→ 2026-05-04" line.
        Assert.Contains("next =", result);
        Assert.Contains("2026-05-04", result);
    }

    // Past and future of same day — both distinct entries
    [Fact]
    public void BuildWeekdayFactsBlock_PastAndFutureSameDay_TwoEntries()
    {
        var result = SpanishWeekdayResolver.BuildWeekdayFactsBlock(
            "El lunes pasado vi dificultades, el lunes haremos repaso.", Saturday);

        Assert.NotNull(result);
        Assert.Contains("2026-04-27", result); // past Monday
        Assert.Contains("2026-05-04", result); // next Monday
    }

    // Accent variant: "miércoles" with accent
    [Fact]
    public void BuildWeekdayFactsBlock_Miercoles_WithAccent_Resolves()
    {
        var result = SpanishWeekdayResolver.BuildWeekdayFactsBlock(
            "El miércoles hacemos la revisión.", Saturday);

        Assert.NotNull(result);
        Assert.Contains("2026-05-06", result); // next Wednesday
    }

    // Accent variant: "miercoles" without accent
    [Fact]
    public void BuildWeekdayFactsBlock_Miercoles_WithoutAccent_Resolves()
    {
        var result = SpanishWeekdayResolver.BuildWeekdayFactsBlock(
            "El miercoles hacemos la revisión.", Saturday);

        Assert.NotNull(result);
        Assert.Contains("2026-05-06", result);
    }

    // Resolver must NOT mutate text — only returns a fact block
    [Fact]
    public void BuildWeekdayFactsBlock_DoesNotModifyInputText()
    {
        const string text = "Programa una sesión para el lunes.";
        SpanishWeekdayResolver.BuildWeekdayFactsBlock(text, Saturday);
        Assert.Equal("Programa una sesión para el lunes.", text);
    }

    // Next weekday when reference is exactly that weekday
    [Fact]
    public void BuildWeekdayFactsBlock_ElLunes_FromMonday_ResolvesToFollowingMonday()
    {
        var monday = new DateOnly(2026, 5, 4); // Monday
        var result = SpanishWeekdayResolver.BuildWeekdayFactsBlock(
            "El lunes hacemos repaso.", monday);

        Assert.NotNull(result);
        Assert.Contains("2026-05-11", result); // next Monday (strictly after)
    }

    // Previous weekday when reference is exactly that weekday
    [Fact]
    public void BuildWeekdayFactsBlock_ElLunesPasado_FromMonday_ResolvesToPreviousMonday()
    {
        var monday = new DateOnly(2026, 5, 4);
        var result = SpanishWeekdayResolver.BuildWeekdayFactsBlock(
            "El lunes pasado vi dificultades.", monday);

        Assert.NotNull(result);
        Assert.Contains("2026-04-27", result); // strictly before
    }
}
