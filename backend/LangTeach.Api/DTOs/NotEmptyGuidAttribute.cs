using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class NotEmptyGuidAttribute : ValidationAttribute
{
    public NotEmptyGuidAttribute() : base("The {0} field must not be an empty GUID.") { }

    public override bool IsValid(object? value) =>
        value is Guid g && g != Guid.Empty;
}
