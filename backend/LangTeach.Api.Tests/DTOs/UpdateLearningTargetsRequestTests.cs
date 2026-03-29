using System.ComponentModel.DataAnnotations;
using FluentAssertions;
using LangTeach.Api.DTOs;

namespace LangTeach.Api.Tests.DTOs;

public class UpdateLearningTargetsRequestTests
{
    private static IList<ValidationResult> Validate(UpdateLearningTargetsRequest request)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(request, new ValidationContext(request), results, validateAllProperties: true);
        return results;
    }

    [Fact]
    public void LearningTargets_With50Items_IsValid()
    {
        var request = new UpdateLearningTargetsRequest
        {
            LearningTargets = Enumerable.Range(0, 50).Select(i => $"goal {i}").ToArray()
        };

        var results = Validate(request);

        results.Should().BeEmpty();
    }

    [Fact]
    public void LearningTargets_With51Items_FailsValidation()
    {
        var request = new UpdateLearningTargetsRequest
        {
            LearningTargets = Enumerable.Range(0, 51).Select(i => $"goal {i}").ToArray()
        };

        var results = Validate(request);

        results.Should().ContainSingle()
            .Which.MemberNames.Should().Contain("LearningTargets");
    }

    [Fact]
    public void LearningTargets_WhenNull_IsValid()
    {
        var request = new UpdateLearningTargetsRequest { LearningTargets = null };

        var results = Validate(request);

        results.Should().BeEmpty();
    }
}
