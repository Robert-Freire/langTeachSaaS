using FluentAssertions;
using LangTeach.Api.AI;

namespace LangTeach.Api.Tests.AI;

public class SpanishGrammarValidationServiceTests
{
    private readonly SpanishGrammarValidationService _sut = new();

    // --- Empty/whitespace input ---

    [Fact]
    public void Validate_EmptyContent_ReturnsEmpty()
    {
        _sut.Validate("", "ser vs estar").Should().BeEmpty();
    }

    [Fact]
    public void Validate_WhitespaceContent_ReturnsEmpty()
    {
        _sut.Validate("   ", "").Should().BeEmpty();
    }

    // --- Group 1: Ser/estar confusions ---

    [Fact]
    public void Validate_EresDeAcuerdo_ReturnsWarning()
    {
        var warnings = _sut.Validate("¿Eres de acuerdo con esto?", "vocabulary");
        warnings.Should().ContainMatch("*Ser/estar error*eres de acuerdo*");
    }

    [Fact]
    public void Validate_EstaDeAcuerdo_NoWarning()
    {
        var warnings = _sut.Validate("¿Estás de acuerdo con esto?", "vocabulary");
        warnings.Should().NotContainMatch("*eres de acuerdo*");
    }

    [Fact]
    public void Validate_EraDeprimida_ReturnsWarning()
    {
        var warnings = _sut.Validate("Ella era deprimida porque perdió el trabajo.", "ser vs estar");
        warnings.Should().ContainMatch("*Ser/estar error*era deprimida/o*");
    }

    [Fact]
    public void Validate_EstabaDeprimida_NoWarning()
    {
        var warnings = _sut.Validate("Ella estaba deprimida ayer.", "ser vs estar");
        warnings.Should().NotContainMatch("*era deprimida*");
    }

    [Fact]
    public void Validate_SoyBien_ReturnsWarning()
    {
        var warnings = _sut.Validate("Hola, soy bien gracias.", "greetings");
        warnings.Should().ContainMatch("*Ser/estar error*temporary states*");
    }

    [Fact]
    public void Validate_EstoyBien_NoWarning()
    {
        var warnings = _sut.Validate("Hola, estoy bien gracias.", "greetings");
        warnings.Should().NotContainMatch("*soy bien*");
    }

    [Fact]
    public void Validate_EraBien_ReturnsWarning()
    {
        var warnings = _sut.Validate("Antes era bien con mi familia.", "imperfect tense");
        warnings.Should().ContainMatch("*Ser/estar error*era [state]*");
    }

    [Fact]
    public void Validate_SonMal_ReturnsWarning()
    {
        var warnings = _sut.Validate("Los estudiantes son mal hoy.", "ser vs estar");
        warnings.Should().ContainMatch("*Ser/estar error*temporary states*");
    }

    // --- Group 2: Indicative after WEIRDO triggers ---

    [Fact]
    public void Validate_EsperoQueTiene_ReturnsWarning()
    {
        var warnings = _sut.Validate("Espero que tiene tiempo para venir.", "present tense");
        warnings.Should().ContainMatch("*subjunctive error*wish/doubt*");
    }

    [Fact]
    public void Validate_EsperoQueTengaNoWarning()
    {
        var warnings = _sut.Validate("Espero que tenga tiempo para venir.", "subjunctive");
        warnings.Should().NotContainMatch("*que tiene*");
    }

    [Fact]
    public void Validate_EsImportanteQuePuede_ReturnsWarning()
    {
        var warnings = _sut.Validate("Es importante que puede hablar bien.", "conversation");
        warnings.Should().ContainMatch("*subjunctive error*impersonal*");
    }

    [Fact]
    public void Validate_EsImportanteQuePuedaNoWarning()
    {
        var warnings = _sut.Validate("Es importante que pueda hablar bien.", "subjunctive");
        warnings.Should().NotContainMatch("*que puede*");
    }

    // --- Group 3: Gender agreement ---

    [Fact]
    public void Validate_LaProblema_ReturnsWarning()
    {
        var warnings = _sut.Validate("La problema principal es la comunicación.", "gender agreement");
        warnings.Should().ContainMatch("*Gender error*la [word]*masculine*el*");
    }

    [Fact]
    public void Validate_ElProblema_NoWarning()
    {
        var warnings = _sut.Validate("El problema principal es la comunicación.", "gender");
        warnings.Should().NotContainMatch("*la problema*");
    }

    [Fact]
    public void Validate_ElMano_ReturnsWarning()
    {
        var warnings = _sut.Validate("Le di el mano al director.", "body parts");
        warnings.Should().ContainMatch("*Gender error*el [word]*feminine*la*");
    }

    [Fact]
    public void Validate_LaMano_NoWarning()
    {
        var warnings = _sut.Validate("Le di la mano al director.", "body parts");
        warnings.Should().NotContainMatch("*el mano*");
    }

    // --- Group 4: Por/para misuse ---

    [Fact]
    public void Validate_GraciasPara_ReturnsWarning()
    {
        var warnings = _sut.Validate("Muchas gracias para tu ayuda.", "por vs para");
        warnings.Should().ContainMatch("*Por/para error*gracias por*");
    }

    [Fact]
    public void Validate_GraciasPor_NoWarning()
    {
        var warnings = _sut.Validate("Muchas gracias por tu ayuda.", "por vs para");
        warnings.Should().NotContainMatch("*gracias para*");
    }

    [Fact]
    public void Validate_PorElPropositoDe_ReturnsWarning()
    {
        var warnings = _sut.Validate("Lo hago por el propósito de aprender.", "prepositions");
        warnings.Should().ContainMatch("*Por/para error*purpose*para*");
    }

    // --- Group 5: False cognates ---

    [Fact]
    public void Validate_Eventualmente_ReturnsWarning()
    {
        var warnings = _sut.Validate("Eventualmente aprenderás a hablar bien.", "vocabulary");
        warnings.Should().ContainMatch("*False cognate*eventualmente*possibly*");
    }

    [Fact]
    public void Validate_RealizarQue_ReturnsWarning()
    {
        var warnings = _sut.Validate("Ella realizó que estaba equivocada.", "false cognates");
        warnings.Should().ContainMatch("*False cognate*realizar*darse cuenta*");
    }

    // --- Context-awareness: critical note appended when topic matches ---

    [Fact]
    public void Validate_SerEstarError_WithMatchingTopic_AppendsCriticalNote()
    {
        var warnings = _sut.Validate("¿Eres de acuerdo?", "ser vs estar");
        warnings.Should().ContainMatch("*critical*grammar focus*");
    }

    [Fact]
    public void Validate_SerEstarError_WithNonMatchingTopic_NoCriticalNote()
    {
        var warnings = _sut.Validate("¿Eres de acuerdo?", "past tense");
        warnings.Should().NotContainMatch("*critical*");
    }

    [Fact]
    public void Validate_SubjunctiveError_WithMatchingTopic_AppendsCriticalNote()
    {
        var warnings = _sut.Validate("Espero que tiene tiempo.", "subjuntivo presente");
        warnings.Should().ContainMatch("*critical*");
    }

    [Fact]
    public void Validate_GenderError_WithMatchingTopic_AppendsCriticalNote()
    {
        var warnings = _sut.Validate("La problema es grave.", "género y concordancia");
        warnings.Should().ContainMatch("*critical*");
    }

    // --- Multiple errors detected ---

    [Fact]
    public void Validate_MultipleErrors_ReturnsAllWarnings()
    {
        var content = "Soy bien y espero que tiene dinero. La problema es grave.";
        var warnings = _sut.Validate(content, "grammar review");
        warnings.Count.Should().BeGreaterThanOrEqualTo(3);
    }

    // --- Clean content has no warnings ---

    [Fact]
    public void Validate_CorrectSpanish_ReturnsEmpty()
    {
        var content = "Estoy bien. Espero que puedas venir. El problema es difícil. Gracias por todo.";
        _sut.Validate(content, "general review").Should().BeEmpty();
    }
}
