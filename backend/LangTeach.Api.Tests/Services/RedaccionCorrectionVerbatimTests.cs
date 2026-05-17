using FluentAssertions;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Tests.Helpers;

namespace LangTeach.Api.Tests.Services;

/// <summary>
/// Issue #1166: verbatim originalText echo on a representative B1 (~140-word) redacción
/// must succeed via the real Claude API, after the temperature=0 + delimited-input fix.
/// Opt-in via [SkipIfNoClaudeApiKey].
/// </summary>
public class RedaccionCorrectionVerbatimTests
{
    private static string LoadSeedText(string fileName = "RedaccionMoatSeed.es.txt") =>
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "TestData", fileName));

    [SkipIfNoClaudeApiKey]
    public async Task Verbatim_OnB1_FixtureSucceeds()
    {
        var seedText = LoadSeedText();
        await using var run = await CorrectionTestHarness.RunCorregirAsync(seedText, "B1", "German", "verbatim");

        // Issue #1166 scope: the verbatim originalText echo (and therefore the strict
        // ordinal guard in RedaccionCorrectionService) must succeed on a representative
        // ~140-word B1 redacción. The status flipping to Corregida is the proof that the
        // echo passed the guard - that is what this test pins down.
        //
        // Tag count is deliberately NOT asserted here: separate, pre-existing model
        // behavior gives offset-accurate tags only some of the time on longer / accented
        // texts, and the service correctly drops offset-mismatched tags (covered by the
        // BadOffsetTag unit test). That's a different problem from verbatim echo and is
        // tracked in plan/observed-issues.md.
        run.Result.Status.Should().Be(CorrectionStatus.Corregida);
    }

    [SkipIfNoClaudeApiKey]
    public async Task Verbatim_OnB2_180WordFixtureSucceeds()
    {
        // AC #2 from the issue body: "Corregir succeeds on a representative B2 (~180 word)
        // redacción." Same logic as the B1 case - the assertion is that the strict ordinal
        // guard passes on a longer text. Tag count is not asserted (see comment above).
        var seedText = LoadSeedText("RedaccionMoatSeedB2.es.txt");
        await using var run = await CorrectionTestHarness.RunCorregirAsync(seedText, "B2", "German", "verbatim");

        run.Result.Status.Should().Be(CorrectionStatus.Corregida);
    }

    [SkipIfNoClaudeApiKey]
    public async Task Verbatim_PreservesMisspellingTildeAndPreposition_InOriginalTextEcho()
    {
        // AC #4 from the issue body: misspelling preservation. We seed three auto-fix-tempting
        // errors (`ablar` for `hablar`, `esta` for `está`, `voy en mi casa` for `voy a casa`)
        // and assert each appears verbatim in the persisted MarkedUpOutput's originalText.
        // Going through MarkedUpOutput rather than Result.Tags is intentional: the strict
        // ordinal guard already proves the model echoed studentText byte-for-byte (otherwise
        // the service would have thrown), and the model's tag-offset accuracy on accented
        // text is a separate, pre-existing issue logged in plan/observed-issues.md.
        var text = "Hoy ablar con mi amigo. Mi casa esta cerca del parque. Yo voy en mi casa todos los días.";
        await using var run = await CorrectionTestHarness.RunCorregirAsync(text, "B1", "German", "verbatim");

        run.Result.Status.Should().Be(CorrectionStatus.Corregida);
        // MarkedUpOutput is the raw JSON written by the service; its originalText must equal
        // studentText byte-for-byte (enforced by the strict ordinal guard during Corregir).
        var markedUp = run.Result.MarkedUpOutput;
        markedUp.Should().NotBeNullOrEmpty();
        markedUp.Should().Contain("\"ablar\"", "the misspelling must be preserved verbatim, not silently fixed to 'hablar'");
        markedUp.Should().Contain("Mi casa esta cerca", "the missing-tilde 'esta' (vs 'está') must be preserved verbatim");
        markedUp.Should().Contain("voy en mi casa", "the wrong-preposition 'en mi casa' must be preserved verbatim");
    }
}
