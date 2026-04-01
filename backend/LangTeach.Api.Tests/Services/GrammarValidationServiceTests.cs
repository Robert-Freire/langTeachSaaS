using LangTeach.Api.Helpers;
using LangTeach.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

public class GrammarValidationServiceTests
{
    private static GrammarValidationService CreateService() =>
        new GrammarValidationService(NullLogger<GrammarValidationService>.Instance);

    [Fact]
    public void Validate_SpanishContent_DetectsSerEstarDeAcuerdo()
    {
        var svc = CreateService();
        var warnings = svc.Validate("El estudiante dice: eres de acuerdo con este punto.", "Spanish", null);
        Assert.Single(warnings);
        Assert.Equal("ser-estar-de-acuerdo", warnings[0].RuleId);
        Assert.Equal("high", warnings[0].Severity);
        Assert.Contains("eres de acuerdo", warnings[0].MatchedText, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Validate_SpanishContent_DetectsSerEstarStateAdjective()
    {
        var svc = CreateService();
        var warnings = svc.Validate("In the text, 'era deprimida' is presented as the correct MC answer.", "Spanish", null);
        Assert.Single(warnings);
        Assert.Equal("ser-estar-state-adjective", warnings[0].RuleId);
        Assert.Equal("high", warnings[0].Severity);
    }

    [Fact]
    public void Validate_NonSpanishContent_ReturnsNoWarnings()
    {
        var svc = CreateService();
        var warnings = svc.Validate("Tu es d'accord avec cela.", "French", null);
        Assert.Empty(warnings);
    }

    [Fact]
    public void Validate_SpanishContent_NoViolation_ReturnsEmpty()
    {
        var svc = CreateService();
        var warnings = svc.Validate("La profesora explica el vocabulario nuevo a los estudiantes.", "Spanish", null);
        Assert.Empty(warnings);
    }

    [Fact]
    public void Validate_NullGrammarFocus_UsesBaselineSeverity()
    {
        var svc = CreateService();
        var warnings = svc.Validate("Prefiero estudiar por mejorar mis notas.", "Spanish", null);
        var warning = warnings.FirstOrDefault(w => w.RuleId == "por-purpose-clause");
        Assert.NotNull(warning);
        Assert.Equal("medium", warning!.Severity);
    }

    [Fact]
    public void Validate_MatchingGrammarFocus_ElevatesSeverity()
    {
        var svc = CreateService();
        // por-purpose-clause is medium by default; grammar focus "por/para" should elevate to high
        var warnings = svc.Validate("Estudio por mejorar mi español.", "Spanish", "por/para usage");
        var warning = warnings.FirstOrDefault(w => w.RuleId == "por-purpose-clause");
        Assert.NotNull(warning);
        Assert.Equal("high", warning!.Severity);
    }

    [Fact]
    public void Validate_UnrelatedGrammarFocus_KeepsBaselineSeverity()
    {
        var svc = CreateService();
        var warnings = svc.Validate("Estudio por mejorar mi español.", "Spanish", "past tense formation");
        var warning = warnings.FirstOrDefault(w => w.RuleId == "por-purpose-clause");
        Assert.NotNull(warning);
        Assert.Equal("medium", warning!.Severity);
    }

    [Fact]
    public void Validate_LanguageCaseInsensitive_SpanishEquals()
    {
        var svc = CreateService();
        var lower = svc.Validate("eres de acuerdo", "spanish", null);
        var upper = svc.Validate("eres de acuerdo", "SPANISH", null);
        Assert.Equal(lower.Length, upper.Length);
        Assert.Equal(lower[0].RuleId, upper[0].RuleId);
    }

    [Fact]
    public void Validate_MultipleViolations_ReturnsSeparateWarnings()
    {
        var svc = CreateService();
        // Both ser/estar violations in one text
        var warnings = svc.Validate("Si eres de acuerdo y era deprimida, dímelo.", "Spanish", null);
        Assert.Equal(2, warnings.Length);
        Assert.Contains(warnings, w => w.RuleId == "ser-estar-de-acuerdo");
        Assert.Contains(warnings, w => w.RuleId == "ser-estar-state-adjective");
    }

    [Fact]
    public void Constructor_LoadsRulesFile_DoesNotThrow()
    {
        // Verifies the embedded resource loads successfully and all rules have valid regex patterns
        var ex = Record.Exception(() => CreateService());
        Assert.Null(ex);
    }

    [Fact]
    public void ReadStringProperty_ValidJson_ReturnsValue()
    {
        var json = """{"grammarConstraints":"ser/estar distinction","language":"Spanish"}""";
        var result = JsonStorageHelper.ReadStringProperty(json, "grammarConstraints");
        Assert.Equal("ser/estar distinction", result);
    }

    [Fact]
    public void ReadStringProperty_NullJson_ReturnsNull()
    {
        var result = JsonStorageHelper.ReadStringProperty(null, "grammarConstraints");
        Assert.Null(result);
    }

    [Fact]
    public void ReadStringProperty_MissingKey_ReturnsNull()
    {
        var json = """{"language":"Spanish","cefrLevel":"B1"}""";
        var result = JsonStorageHelper.ReadStringProperty(json, "grammarConstraints");
        Assert.Null(result);
    }
}
