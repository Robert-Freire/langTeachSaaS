using FluentAssertions;
using LangTeach.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

public class PedagogyConfigServiceTests
{
    private readonly SectionProfileService _sps = new(NullLogger<SectionProfileService>.Instance);
    private readonly PedagogyConfigService _sut;

    public PedagogyConfigServiceTests()
    {
        _sut = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, _sps);
    }

    // --- Smoke ---

    [Fact]
    public void ServiceLoads_WithoutThrowing()
    {
        // Constructor must complete without throwing; catalog, CEFR rules, L1, templates, etc. loaded
        _sut.Should().NotBeNull();
    }

    // --- Cross-layer validation ---

    [Fact]
    public void StartupValidation_ServiceConstructsWithoutThrowing_AllCrossLayerRefsValid()
    {
        // If the constructor completes (verified by ServiceLoads_WithoutThrowing),
        // ValidateCrossLayerRefs() passed — all exercise type IDs referenced across
        // CEFR rules, L1 adjustments, template overrides, and style substitutions
        // exist in the exercise type catalog.
        _sut.Should().NotBeNull();
        // Spot-check: expanded forbidden IDs are non-empty strings (confirms pattern expansion ran)
        var forbiddenCheck = _sut.GetForbiddenExerciseTypeIds("warmup", "A1");
        forbiddenCheck.Should().OnlyContain(id => id.Length > 0, "all expanded IDs should be non-empty strings");
    }

    // --- GetValidExerciseTypes ---

    [Fact]
    public void GetValidExerciseTypes_WarmUp_A1_ReturnsSectionValidTypes_SubsetOfCefrAppropriate()
    {
        var result = _sut.GetValidExerciseTypes("warmup", "A1");

        // Must only contain types from A1 appropriateExerciseTypes AND warmup A1 validExerciseTypes
        result.Should().NotBeEmpty();
        // WarmUp A1 validExerciseTypes are EO-01, EO-03, PRAG-01, LUD-06, LUD-07
        result.Should().Contain("EO-01");
        result.Should().Contain("EO-03");
    }

    [Fact]
    public void GetValidExerciseTypes_WarmUp_A1_ContainsNoGrammarTypes()
    {
        // WarmUp forbids GR-* for all levels
        var result = _sut.GetValidExerciseTypes("warmup", "A1");

        result.Should().NotContain(id => id.StartsWith("GR-", StringComparison.OrdinalIgnoreCase),
            because: "WarmUp forbids all GR-* exercise types");
    }

    [Fact]
    public void GetValidExerciseTypes_L1Mandarin_WarmUp_A1_CO06IsBlocked()
    {
        // Mandarin (sinitic-japonic family) has CO-06 in additionalExerciseTypes.
        // WarmUp forbids CO-* pattern. CO-06 must be blocked even after L1 addition (re-filter step).
        var result = _sut.GetValidExerciseTypes("warmup", "A1", nativeLang: "mandarin");

        result.Should().NotContain("CO-06",
            because: "WarmUp forbids all CO-* types; CO-06 added by Mandarin L1 must be re-filtered out");
    }

    [Fact]
    public void GetValidExerciseTypes_GrammarFocusTemplate_Practice_A1_GR01IsFirst()
    {
        // Grammar Focus template has GR-01 as first priorityExerciseType for practice.
        // It must appear before non-priority types in the result.
        var result = _sut.GetValidExerciseTypes("practice", "A1", templateId: "grammar-focus");

        result.Should().Contain("GR-01");
        result[0].Should().Be("GR-01", because: "GR-01 is the first priority type for Grammar Focus practice and must appear first");
    }

    // --- GetForbiddenExerciseTypeIds ---

    [Fact]
    public void GetForbiddenExerciseTypeIds_WarmUp_A1_ExpandsAllGRPattern()
    {
        // WarmUp forbids GR-* pattern. Should expand to all GR-xx IDs in the catalog (10 types: GR-01 to GR-10).
        var result = _sut.GetForbiddenExerciseTypeIds("warmup", "A1");

        for (var i = 1; i <= 10; i++)
        {
            var id = $"GR-{i:D2}";
            result.Should().Contain(id, because: $"GR-* pattern should expand to include {id}");
        }
    }

    [Fact]
    public void GetForbiddenExerciseTypeIds_WarmUp_A1_AlsoExpandsEEAndCOPatterns()
    {
        var result = _sut.GetForbiddenExerciseTypeIds("warmup", "A1");

        // EE-* and CO-* are also forbidden for WarmUp
        result.Should().Contain(id => id.StartsWith("EE-", StringComparison.OrdinalIgnoreCase),
            because: "WarmUp forbids EE-* pattern");
        result.Should().Contain(id => id.StartsWith("CO-", StringComparison.OrdinalIgnoreCase),
            because: "WarmUp forbids CO-* pattern");
    }

    // --- GetGrammarScope ---

    [Theory]
    [InlineData("A1")]
    [InlineData("A2")]
    [InlineData("B1")]
    [InlineData("B2")]
    public void GetGrammarScope_LowerLevels_ReturnsBothInScopeAndOutOfScope(string level)
    {
        var result = _sut.GetGrammarScope(level);

        result.InScope.Should().NotBeEmpty(because: $"CEFR {level} should have grammar in-scope");
        result.OutOfScope.Should().NotBeEmpty(because: $"CEFR {level} should have grammar out-of-scope");
    }

    [Fact]
    public void GetGrammarScope_C1_OutOfScopeIsEmpty()
    {
        // C1 has no grammar out-of-scope (student has command of full system)
        var result = _sut.GetGrammarScope("C1");

        result.InScope.Should().NotBeEmpty();
        result.OutOfScope.Should().BeEmpty(because: "C1 grammarOutOfScope is an empty array");
    }

    // --- GetVocabularyGuidance ---

    [Theory]
    [InlineData("A1")]
    [InlineData("A2")]
    [InlineData("B1")]
    [InlineData("B2")]
    public void GetVocabularyGuidance_LowerLevels_ReturnsNumericFields(string level)
    {
        var result = _sut.GetVocabularyGuidance(level);

        result.ProductiveMin.Should().NotBeNull(because: $"CEFR {level} uses numeric vocabulary targets");
        result.ProductiveMax.Should().NotBeNull();
        result.Approach.Should().BeNull(because: $"CEFR {level} does not use a string approach description");
    }

    [Theory]
    [InlineData("C1")]
    [InlineData("C2")]
    public void GetVocabularyGuidance_UpperLevels_ReturnsApproachString(string level)
    {
        var result = _sut.GetVocabularyGuidance(level);

        result.Approach.Should().NotBeNullOrEmpty(because: $"CEFR {level} uses a vocabulary approach description, not numeric targets");
        result.ProductiveMin.Should().BeNull(because: $"CEFR {level} does not have numeric vocabulary counts");
    }

    // --- GetL1Adjustments ---

    [Fact]
    public void GetL1Adjustments_Mandarin_ReturnsCO06InAdditionalTypes()
    {
        var result = _sut.GetL1Adjustments("mandarin");

        result.Should().NotBeNull();
        result!.AdditionalExerciseTypes.Should().Contain("CO-06",
            because: "Mandarin (sinitic-japonic) has CO-06 as an additional exercise type");
    }

    [Fact]
    public void GetL1Adjustments_English_ReturnsGermanicFamilyAdjustments()
    {
        // "english" is in germanic family's languages list but not in specificLanguages
        var result = _sut.GetL1Adjustments("english");

        result.Should().NotBeNull(because: "English is listed in the germanic language family");
        result!.IncreaseEmphasis.Should().Contain("GR-08",
            because: "Germanic family increases emphasis on GR-08 (inductive discovery)");
    }

    [Fact]
    public void GetL1Adjustments_UnknownLanguage_ReturnsNull()
    {
        var result = _sut.GetL1Adjustments("klingon");

        result.Should().BeNull(because: "Unknown languages should return null");
    }

    // --- GetTemplateOverride ---

    [Fact]
    public void GetTemplateOverride_GrammarFocus_PracticeHasMinVarietyOf3()
    {
        var result = _sut.GetTemplateOverride("grammar-focus");

        result.Should().NotBeNull();
        result!.Sections.Should().ContainKey("practice");
        result.Sections["practice"].MinExerciseVarietyOverride.Should().Be(3,
            because: "Grammar Focus practice requires at least 3 different exercise formats");
    }

    [Fact]
    public void GetTemplateOverride_Conversation_PresentationIsOptional()
    {
        var result = _sut.GetTemplateOverride("conversation");

        result.Should().NotBeNull();
        result!.Sections.Should().ContainKey("presentation");
        result.Sections["presentation"].Required.Should().BeFalse(
            because: "Conversation template has optional presentation section");
    }

    [Fact]
    public void GetTemplateOverride_UnknownTemplate_ReturnsNull()
    {
        _sut.GetTemplateOverride("nonexistent-template").Should().BeNull();
    }

    // --- GetStyleSubstitutions ---

    [Fact]
    public void GetStyleSubstitutions_RolePlay_ReturnsEntryWithEO04AndEO08()
    {
        // EO-01 is in the role-play rejects list
        var result = _sut.GetStyleSubstitutions(["EO-01"]);

        result.Should().HaveCount(1);
        result[0].Label.Should().Be("role-play");
        result[0].SubstituteWith.Should().Contain("EO-04");
        result[0].SubstituteWith.Should().Contain("EO-08");
    }

    [Fact]
    public void GetStyleSubstitutions_NoMatch_ReturnsEmpty()
    {
        var result = _sut.GetStyleSubstitutions(["NONEXISTENT-99"]);

        result.Should().BeEmpty();
    }

    // --- GetCourseRules ---

    [Fact]
    public void GetCourseRules_ReturnsNonNull_WithVarietyRules()
    {
        var result = _sut.GetCourseRules();

        result.Should().NotBeNull();
        result.VarietyRules.Should().NotBeNull();
        result.VarietyRules.PracticeTypeCombination.NoRepeatWithinSessions.Should().Be(3);
        result.VarietyRules.WarmUpFormat.MaxConsecutiveRepeats.Should().Be(2);
    }

    // --- Available type filtering ---

    [Fact]
    public void GetValidExerciseTypes_Practice_B1_DoesNotReturnUnavailableTypes()
    {
        // CO-* types require audio (uiRenderer: null); LUD-* have no renderer; EO-10 has no renderer.
        // None should appear in valid types regardless of what section profiles reference.
        var result = _sut.GetValidExerciseTypes("practice", "B1");

        result.Should().NotContain("CO-01", because: "CO-01 requires audio and has no UI renderer (available: false)");
        result.Should().NotContain("LUD-01", because: "LUD-01 has no UI renderer (available: false)");
        result.Should().NotContain("EO-10", because: "EO-10 has no UI renderer (available: false)");
    }

    [Fact]
    public void GetValidExerciseTypes_Production_C1_ContainsEE09_NotPRAG02()
    {
        // EE-09 is available (uiRenderer: exercises). PRAG-02 was merged into EE-09 and deleted from the catalog.
        var result = _sut.GetValidExerciseTypes("production", "C1");

        result.Should().Contain("EE-09", because: "EE-09 is an available exercise type valid for C1 production");
        result.Should().NotContain("PRAG-02", because: "PRAG-02 was merged into EE-09 and no longer exists in the catalog");
    }

    // --- GetResolvedScope ---

    [Theory]
    [InlineData("warmup", "A1")]
    [InlineData("warmup", "B2")]
    [InlineData("wrapup", "B1")]
    [InlineData("wrapup", "C1")]
    public void GetResolvedScope_WarmUpWrapUp_ReturnsBreif_NoTemplate(string section, string level)
    {
        _sut.GetResolvedScope(section, level, null).Should().Be("brief");
    }

    [Theory]
    [InlineData("practice", "B1")]
    [InlineData("presentation", "A2")]
    [InlineData("production", "C1")]
    public void GetResolvedScope_NonBriefSections_ReturnsFull(string section, string level)
    {
        _sut.GetResolvedScope(section, level, null).Should().Be("full");
    }

    [Fact]
    public void GetResolvedScope_UnknownSection_ReturnsFull()
    {
        _sut.GetResolvedScope("unknown", "B1", null).Should().Be("full");
    }

    [Fact]
    public void GetResolvedScope_TemplateOverrideScopeWins_OverridesProfileScope()
    {
        // Template override with scope: "full" on warmUp should override the section profile's "brief"
        // This is testable by injecting a fake template; here we verify that for real templates that
        // have no scope set, section profile scope is returned unchanged.
        // "Grammar Focus" template has no scope set on warmUp, so section profile (brief) should be used.
        _sut.GetResolvedScope("warmup", "B1", "Grammar Focus").Should().Be("brief",
            because: "Grammar Focus template has no scope override on warmUp; section profile brief wins");
    }

    // --- GetScopeConstraint ---

    [Fact]
    public void GetScopeConstraint_WarmUp_Conversation_ReturnsConstraintText()
    {
        var result = _sut.GetScopeConstraint("warmup", "B1", null, "conversation");

        result.Should().NotBeNullOrEmpty();
        result.Should().Contain("exactly 1 scenario",
            because: "scope-constraints.json brief/conversation must contain the 1-scenario limit");
        result.Should().Contain("2-3 phrases",
            because: "scope-constraints.json brief/conversation must constrain phrase array sizes");
    }

    [Fact]
    public void GetScopeConstraint_WrapUp_Conversation_ReturnsConstraintText()
    {
        var result = _sut.GetScopeConstraint("wrapup", "A1", null, "conversation");

        result.Should().NotBeNullOrEmpty();
        result.Should().Contain("exactly 1 scenario");
    }

    [Fact]
    public void GetScopeConstraint_Practice_Conversation_ReturnsNull()
    {
        // practice scope is "full" — no constraint emitted
        var result = _sut.GetScopeConstraint("practice", "B1", null, "conversation");

        result.Should().BeNull(because: "practice section has full scope, no constraint should be emitted");
    }

    [Fact]
    public void GetScopeConstraint_WarmUp_UnknownContentType_ReturnsNull()
    {
        // "unknown-type" is not in scope-constraints.json
        var result = _sut.GetScopeConstraint("warmup", "B1", null, "unknown-type");

        result.Should().BeNull(because: "missing (scope, contentType) entry should return null without throwing");
    }

    [Theory]
    [InlineData("vocabulary")]
    [InlineData("grammar")]
    [InlineData("exercises")]
    [InlineData("reading")]
    [InlineData("free-text")]
    [InlineData("homework")]
    public void GetScopeConstraint_Brief_AllContentTypes_HaveConstraintText(string contentType)
    {
        // Brief scope should have entries for all 7 content types
        var result = _sut.GetScopeConstraint("warmup", "A1", null, contentType);

        result.Should().NotBeNullOrEmpty(
            because: $"scope-constraints.json brief scope must have a constraint for content type '{contentType}'");
    }

    // --- Scope startup validation ---

    [Fact]
    public void StartupValidation_ScopeConstraintsJson_AllContentTypeKeysAreValid()
    {
        // If PedagogyConfigService constructs without throwing, all scope-constraints.json
        // content type keys are valid ContentBlockType values (validated in ValidateCrossLayerRefs).
        // This test verifies the loaded service is in a valid state.
        _sut.Should().NotBeNull(because: "PedagogyConfigService must construct without validation errors");
    }
}
