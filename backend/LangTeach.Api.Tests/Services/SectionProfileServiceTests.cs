using System.Text.Json;
using FluentAssertions;
using LangTeach.Api.AI;
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
    [InlineData("WarmUp", "vocabulary", "B1")]
    [InlineData("WarmUp", "grammar", "B1")]
    [InlineData("WarmUp", "exercises", "B1")]
    [InlineData("WarmUp", "homework", "B1")]
    [InlineData("Practice", "grammar", "B1")]
    [InlineData("Practice", "vocabulary", "B1")]
    [InlineData("Practice", "reading", "B1")]
    [InlineData("Practice", "free-text", "B1")]
    [InlineData("WrapUp", "exercises", "B1")]
    [InlineData("WrapUp", "vocabulary", "B1")]
    [InlineData("WrapUp", "grammar", "B1")]
    [InlineData("WrapUp", "free-text", "B1")]
    [InlineData("Presentation", "exercises", "B1")]
    [InlineData("Production", "grammar", "B1")]
    [InlineData("Production", "vocabulary", "B1")]
    public void IsAllowed_ReturnsFalse_ForDisallowedCombinations(string sectionType, string contentType, string cefrLevel)
    {
        _sut.IsAllowed(sectionType, contentType, cefrLevel).Should().BeFalse();
    }

    [Theory]
    [InlineData("WarmUp", "conversation", "B1")]
    [InlineData("Practice", "exercises", "B1")]
    [InlineData("Practice", "conversation", "B1")]
    [InlineData("WrapUp", "conversation", "B1")]
    [InlineData("Presentation", "grammar", "B1")]
    [InlineData("Presentation", "vocabulary", "B1")]
    [InlineData("Presentation", "reading", "B1")]
    [InlineData("Presentation", "conversation", "B1")]
    [InlineData("Production", "conversation", "B1")]
    [InlineData("Production", "exercises", "B1")]
    [InlineData("Production", "exercises", "B2")]
    [InlineData("Production", "reading", "B2")]
    public void IsAllowed_ReturnsTrue_ForAllowedCombinations(string sectionType, string contentType, string cefrLevel)
    {
        _sut.IsAllowed(sectionType, contentType, cefrLevel).Should().BeTrue();
    }

    [Theory]
    [InlineData("warmup", "conversation", "B1")]
    [InlineData("WARMUP", "conversation", "B1")]
    [InlineData("WarmUp", "CONVERSATION", "B1")]
    [InlineData("WRAPUP", "conversation", "B1")]
    [InlineData("wrapup", "CONVERSATION", "B1")]
    public void IsAllowed_IsCaseInsensitive(string sectionType, string contentType, string cefrLevel)
    {
        _sut.IsAllowed(sectionType, contentType, cefrLevel).Should().BeTrue();
    }

    [Theory]
    [InlineData("UnknownSection", "vocabulary", "B1")]
    [InlineData("UnknownSection", "exercises", "B1")]
    [InlineData("", "grammar", "B1")]
    [InlineData("SomeOtherSection", "free-text", "B1")]
    public void IsAllowed_ReturnsTrue_ForUnknownSection(string sectionType, string contentType, string cefrLevel)
    {
        _sut.IsAllowed(sectionType, contentType, cefrLevel).Should().BeTrue();
    }

    [Fact]
    public void IsAllowed_Production_Reading_A1_ReturnsFalse()
    {
        // Reading is only allowed in Production at B2+ — an A1 student must not be able to request it
        _sut.IsAllowed("Production", "reading", "A1").Should().BeFalse();
    }

    [Fact]
    public void IsAllowed_Production_Reading_B2_ReturnsTrue()
    {
        _sut.IsAllowed("Production", "reading", "B2").Should().BeTrue();
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

    // --- Exercise type reference validation ---

    private static readonly JsonSerializerOptions _catalogJsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString,
    };

    private record ExerciseCatalogDoc(ExerciseCatalogEntry[] ExerciseTypes);
    private record ExerciseCatalogEntry(string Id, string Name);

    private static HashSet<string> LoadCatalogIds()
    {
        var assembly = typeof(SectionProfileService).Assembly;
        var stream = assembly.GetManifestResourceStream("LangTeach.Api.Pedagogy.exercise-types.json")
            ?? throw new InvalidOperationException(
                "exercise-types.json must be embedded in the API assembly as LangTeach.Api.Pedagogy.exercise-types.json");
        using var _ = stream;
        var catalog = JsonSerializer.Deserialize<ExerciseCatalogDoc>(stream, _catalogJsonOpts);
        catalog.Should().NotBeNull();
        return catalog!.ExerciseTypes.Select(e => e.Id).ToHashSet(StringComparer.Ordinal);
    }

    private static IEnumerable<(string Section, string Level, SectionLevelProfile Data)> LoadAllLevelProfiles()
    {
        // Discover dynamically — consistent with SectionProfileService and picks up future profiles automatically
        var assembly = typeof(SectionProfileService).Assembly;
        const string prefix = "LangTeach.Api.SectionProfiles.";
        var resourceNames = assembly.GetManifestResourceNames()
            .Where(n => n.StartsWith(prefix, StringComparison.Ordinal) && n.EndsWith(".json", StringComparison.Ordinal));

        foreach (var resourceName in resourceNames)
        {
            using var stream = assembly.GetManifestResourceStream(resourceName);
            if (stream is null) continue;
            var profile = JsonSerializer.Deserialize<SectionProfile>(stream, _catalogJsonOpts);
            if (profile is null) continue;
            var sectionName = profile.SectionType.ToLowerInvariant();
            foreach (var (level, data) in profile.Levels)
                yield return (sectionName, level, data);
        }
    }

    [Fact]
    public void ExerciseTypeReferences_ForbiddenEntries_RequireExactlyOneSelector()
    {
        var failures = new List<string>();

        foreach (var (section, level, data) in LoadAllLevelProfiles())
        {
            foreach (var entry in data.ForbiddenExerciseTypes ?? [])
            {
                var hasId = !string.IsNullOrWhiteSpace(entry.Id);
                var hasPattern = !string.IsNullOrWhiteSpace(entry.Pattern);
                if (hasId == hasPattern)
                    failures.Add($"{section}/{level}: forbiddenExerciseTypes entry must set exactly one of 'id' or 'pattern'");
            }
        }

        failures.Should().BeEmpty(because: "each forbiddenExerciseTypes entry must provide a single selector");
    }

    private static bool MatchesForbiddenPattern(string id, string pattern)
    {
        // Supports trailing wildcard only: "GR-*" matches any ID starting with "GR-"
        if (pattern.EndsWith('*'))
            return id.StartsWith(pattern[..^1], StringComparison.Ordinal);
        return id.Equals(pattern, StringComparison.Ordinal);
    }

    [Fact]
    public void ExerciseTypeReferences_ValidIds_AllExistInCatalog()
    {
        var knownIds = LoadCatalogIds();
        var failures = new List<string>();

        foreach (var (section, level, data) in LoadAllLevelProfiles())
        {
            if (data.ValidExerciseTypes is null) continue;
            foreach (var id in data.ValidExerciseTypes)
            {
                if (!knownIds.Contains(id))
                    failures.Add($"{section}/{level}: validExerciseTypes contains unknown ID '{id}'");
            }
        }

        failures.Should().BeEmpty(because: "every ID in validExerciseTypes must exist in exercise-types.json");
    }

    [Fact]
    public void ExerciseTypeReferences_ForbiddenExplicitIds_AllExistInCatalog()
    {
        var knownIds = LoadCatalogIds();
        var failures = new List<string>();

        foreach (var (section, level, data) in LoadAllLevelProfiles())
        {
            if (data.ForbiddenExerciseTypes is null) continue;
            foreach (var entry in data.ForbiddenExerciseTypes)
            {
                if (entry.Id is null) continue; // pattern-only entry; skip
                if (!knownIds.Contains(entry.Id))
                    failures.Add($"{section}/{level}: forbiddenExerciseTypes contains unknown explicit ID '{entry.Id}'");
            }
        }

        failures.Should().BeEmpty(because: "every explicit id in forbiddenExerciseTypes must exist in exercise-types.json");
    }

    [Fact]
    public void ExerciseTypeReferences_NoIdAppearsInBothValidAndForbidden()
    {
        var knownIds = LoadCatalogIds();
        var failures = new List<string>();

        foreach (var (section, level, data) in LoadAllLevelProfiles())
        {
            var validSet = (data.ValidExerciseTypes ?? []).ToHashSet(StringComparer.Ordinal);

            var forbiddenIds = new HashSet<string>(StringComparer.Ordinal);
            foreach (var entry in data.ForbiddenExerciseTypes ?? [])
            {
                if (entry.Id is not null)
                {
                    forbiddenIds.Add(entry.Id);
                }
                else if (entry.Pattern is not null)
                {
                    // Expand glob pattern against the full catalog
                    foreach (var catalogId in knownIds)
                    {
                        if (MatchesForbiddenPattern(catalogId, entry.Pattern))
                            forbiddenIds.Add(catalogId);
                    }
                }
            }

            foreach (var conflict in validSet.Intersect(forbiddenIds))
                failures.Add($"{section}/{level}: ID '{conflict}' appears in both validExerciseTypes and forbiddenExerciseTypes");
        }

        failures.Should().BeEmpty(because: "no exercise type ID should be in both valid and forbidden lists for the same section/level");
    }

    // --- GetDuration ---

    [Fact]
    public void GetDuration_WarmUp_A1_ReturnsCorrectRange()
    {
        var duration = _sut.GetDuration("warmup", "A1");

        duration.Should().NotBeNull();
        duration!.Min.Should().Be(2);
        duration.Max.Should().Be(3);
    }

    [Fact]
    public void GetDuration_UnknownSection_ReturnsNull()
    {
        _sut.GetDuration("nosuchsection", "B1").Should().BeNull();
    }

    [Fact]
    public void GetDuration_UnknownLevel_ReturnsNull()
    {
        _sut.GetDuration("warmup", "Z9").Should().BeNull();
    }

    // --- GetScope ---

    [Theory]
    [InlineData("A1")]
    [InlineData("A2")]
    [InlineData("B1")]
    [InlineData("B2")]
    [InlineData("C1")]
    [InlineData("C2")]
    public void GetScope_WarmUp_ReturnsBrief_AtAllLevels(string level)
    {
        _sut.GetScope("warmup", level).Should().Be("brief");
    }

    [Theory]
    [InlineData("A1")]
    [InlineData("A2")]
    [InlineData("B1")]
    [InlineData("B2")]
    [InlineData("C1")]
    [InlineData("C2")]
    public void GetScope_WrapUp_ReturnsBrief_AtAllLevels(string level)
    {
        _sut.GetScope("wrapup", level).Should().Be("brief");
    }

    [Theory]
    [InlineData("practice")]
    [InlineData("presentation")]
    [InlineData("production")]
    public void GetScope_NonBriefSections_ReturnsNull(string section)
    {
        _sut.GetScope(section, "B1").Should().BeNull(
            because: $"section '{section}' has no scope set and should return null (defaults to full)");
    }

    [Fact]
    public void GetScope_UnknownSection_ReturnsNull()
    {
        _sut.GetScope("unknown", "B1").Should().BeNull();
    }

    [Fact]
    public void GetScope_UnknownLevel_ReturnsNull()
    {
        _sut.GetScope("warmup", "Z9").Should().BeNull();
    }

    // --- GetInteractionPattern ---

    [Theory]
    [InlineData("warmup",  "A1", "teacher-led")]
    [InlineData("warmup",  "B1", "student-led")]
    [InlineData("wrapup",  "A1", "teacher-led")]
    [InlineData("wrapup",  "B1", "student-led")]
    public void GetInteractionPattern_KnownSectionAndLevel_ReturnsExpectedPattern(string section, string level, string expected)
    {
        _sut.GetInteractionPattern(section, level).Should().Be(expected);
    }

    [Fact]
    public void GetInteractionPattern_UnknownSection_ReturnsEmptyString()
    {
        _sut.GetInteractionPattern("nosuchsection", "B1").Should().BeEmpty();
    }

    [Fact]
    public void GetInteractionPattern_UnknownLevel_ReturnsEmptyString()
    {
        _sut.GetInteractionPattern("warmup", "Z9").Should().BeEmpty();
    }
}
