using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.Services;

public class GenerationLimitsOptions
{
    public const string SectionName = "GenerationLimits";
    [Range(1, int.MaxValue, ErrorMessage = "FreeTierMonthlyLimit must be >= 1.")]
    public int FreeTierMonthlyLimit { get; set; } = 50;
    [Range(-1, int.MaxValue, ErrorMessage = "ProTierMonthlyLimit must be -1 (unlimited) or >= 0.")]
    public int ProTierMonthlyLimit { get; set; } = -1;
}
