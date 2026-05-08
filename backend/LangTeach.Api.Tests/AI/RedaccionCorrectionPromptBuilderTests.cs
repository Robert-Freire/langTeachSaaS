using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.AI;

public class RedaccionCorrectionPromptBuilderTests
{
    private readonly RedaccionCorrectionPromptBuilder _builder;

    public RedaccionCorrectionPromptBuilderTests()
    {
        var sps = new SectionProfileService(NullLogger<SectionProfileService>.Instance);
        var pedagogy = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, sps);
        _builder = new RedaccionCorrectionPromptBuilder(pedagogy, NullLogger<RedaccionCorrectionPromptBuilder>.Instance);
    }

    [Fact]
    public void Build_WithA2FrenchAndDifficulties_IncludesAllPersonalizationBlocks()
    {
        var ctx = new RedaccionCorrectionPromptContext(
            StudentText: "Yo soy ir al cine.",
            StudentCefr: "A2",
            StudentL1: "French",
            StudentDifficulties: new[] { "ser vs estar", "preposiciones a/en" },
            AssignmentPrompt: "Describe tu fin de semana.");

        var req = _builder.Build(ctx);

        req.Model.Should().Be(ClaudeModel.Sonnet);
        req.SystemPrompt.Should().Contain("Cohesión");
        req.SystemPrompt.Should().Contain("Ortografía");
        req.SystemPrompt.Should().Contain("MuyBien");
        req.UserPrompt.Should().Contain("STUDENT LEVEL: A2");
        req.UserPrompt.Should().Contain("basic agreement");
        req.UserPrompt.Should().Contain("L1 INTERFERENCE: the student's native language is French");
        req.UserPrompt.Should().Contain("WEAK POINTS TO WATCH");
        req.UserPrompt.Should().Contain("ser vs estar");
        req.UserPrompt.Should().Contain("ASSIGNMENT CONTEXT: Describe tu fin de semana.");
        req.UserPrompt.Should().Contain("STUDENT TEXT");
        req.UserPrompt.Should().Contain("Yo soy ir al cine.");
    }

    [Fact]
    public void Build_WithB2NoL1NoDifficultiesNoPrompt_OmitsOptionalBlocks()
    {
        var ctx = new RedaccionCorrectionPromptContext(
            StudentText: "Texto del estudiante.",
            StudentCefr: "B2",
            StudentL1: null,
            StudentDifficulties: Array.Empty<string>(),
            AssignmentPrompt: null);

        var req = _builder.Build(ctx);

        req.UserPrompt.Should().Contain("STUDENT LEVEL: B2");
        req.UserPrompt.Should().Contain("cohesion");
        req.UserPrompt.Should().NotContain("L1 INTERFERENCE");
        req.UserPrompt.Should().NotContain("WEAK POINTS TO WATCH");
        req.UserPrompt.Should().NotContain("ASSIGNMENT CONTEXT");
    }

    [Fact]
    public void Build_C1CalibrationCueDiffersFromA1()
    {
        var a1 = _builder.Build(MakeCtx("A1")).UserPrompt;
        var c1 = _builder.Build(MakeCtx("C1")).UserPrompt;

        a1.Should().NotBe(c1);
        a1.Should().Contain("basic agreement");
        c1.Should().Contain("native peer");
    }

    [Fact]
    public void Build_DifficultiesCappedAtThree()
    {
        var ctx = MakeCtx("B1") with
        {
            StudentDifficulties = new[] { "one", "two", "three", "four", "five" },
        };

        var prompt = _builder.Build(ctx).UserPrompt;
        prompt.Should().Contain("- one");
        prompt.Should().Contain("- two");
        prompt.Should().Contain("- three");
        prompt.Should().NotContain("- four");
        prompt.Should().NotContain("- five");
    }

    [Fact]
    public void Build_SetsTemperatureToZero_ForVerbatimFidelity()
    {
        // Issue #1166: temperature=0 is the primary fix for the "model paraphrases
        // originalText on long inputs" failure mode. Removing this would re-open the bug.
        var req = _builder.Build(MakeCtx("B1"));
        req.Temperature.Should().Be(0);
    }

    [Fact]
    public void Build_WrapsStudentTextInVerbatimMarkers()
    {
        // Defense in depth alongside temperature=0: explicit delimiters + a "do not
        // normalize" instruction make it harder for the model to silently smooth the echo.
        var ctx = MakeCtx("B1") with { StudentText = "Hoy ablar con mi amigo." };
        var prompt = _builder.Build(ctx).UserPrompt;

        prompt.Should().Contain("<<<STUDENT_TEXT_VERBATIM>>>");
        prompt.Should().Contain("<<</STUDENT_TEXT_VERBATIM>>>");
        prompt.Should().Contain("Hoy ablar con mi amigo.");
        prompt.Should().Contain("byte-for-byte");
    }

    private static RedaccionCorrectionPromptContext MakeCtx(string cefr) =>
        new("Texto.", cefr, null, Array.Empty<string>(), null);
}
