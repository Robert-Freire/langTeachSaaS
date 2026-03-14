using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

/// <summary>
/// Validates that every string element in a collection does not exceed the specified maximum length.
/// </summary>
[AttributeUsage(AttributeTargets.Property)]
public sealed class MaxStringLengthEachAttribute(int maxLength) : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext context)
    {
        if (value is not IEnumerable<string> items)
            return ValidationResult.Success;

        foreach (var item in items)
        {
            if (item is not null && item.Length > maxLength)
                return new ValidationResult(
                    $"Each interest cannot exceed {maxLength} characters.",
                    [context.MemberName!]);
        }

        return ValidationResult.Success;
    }
}
