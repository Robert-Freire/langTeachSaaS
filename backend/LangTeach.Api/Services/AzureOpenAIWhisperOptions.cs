using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.Services;

public class AzureOpenAIWhisperOptions
{
    public const string SectionName = "AzureOpenAIWhisper";

    [Required]
    public string Endpoint { get; set; } = string.Empty;

    [Required]
    public string ApiKey { get; set; } = string.Empty;

    [Required]
    public string DeploymentName { get; set; } = string.Empty;
}
