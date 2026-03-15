using System.Collections;
using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

/// <summary>
/// Validates that a collection does not exceed the specified number of items.
/// Use this instead of [MaxLength] on collections — MaxLength checks item count but
/// its name implies string length, which confuses readers.
/// </summary>
[AttributeUsage(AttributeTargets.Property)]
public sealed class MaxCollectionCountAttribute(int max) : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext context)
    {
        if (value is ICollection col && col.Count > max)
            return new ValidationResult(
                $"{context.MemberName} cannot have more than {max} items.",
                [context.MemberName!]);

        return ValidationResult.Success;
    }
}
