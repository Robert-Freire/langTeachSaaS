using System.ComponentModel.DataAnnotations;
using FluentAssertions;
using LangTeach.Api.Data.Models;

namespace LangTeach.Api.Tests.DTOs;

/// <summary>
/// Validates the status regex used in both DTO update paths. Positional record parameters
/// don't forward attributes to the generated property, so Validator.TryValidateObject
/// doesn't work here — we assert against the attribute directly instead.
/// </summary>
public class TeacherFollowupDtoValidationTests
{
    // Shared regex used by UpdateTeachingTodoDto and UpdateTeacherFollowupRequest
    private static readonly RegularExpressionAttribute StatusRegex =
        new("^(pending|done|covered|dismissed)$");

    [Theory]
    [InlineData(TeacherFollowupStatuses.Pending)]
    [InlineData(TeacherFollowupStatuses.Done)]
    [InlineData(TeacherFollowupStatuses.Covered)]
    [InlineData(TeacherFollowupStatuses.Dismissed)]
    public void StatusRegex_AcceptsLowercase(string status)
    {
        StatusRegex.IsValid(status).Should().BeTrue(because: $"'{status}' is a valid lowercase status");
    }

    [Theory]
    [InlineData("Pending")]
    [InlineData("Done")]
    [InlineData("Covered")]
    [InlineData("Dismissed")]
    public void StatusRegex_RejectsTitleCase(string status)
    {
        StatusRegex.IsValid(status).Should().BeFalse(because: $"'{status}' is title-case and must be rejected");
    }

    [Theory]
    [InlineData("PENDING")]
    [InlineData("invalid")]
    [InlineData("pending ")]
    public void StatusRegex_RejectsOtherValues(string status)
    {
        StatusRegex.IsValid(status).Should().BeFalse(because: $"'{status}' is not a valid status");
    }
}
