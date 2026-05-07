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

    /// <summary>ISO-639-1 language hint for Whisper (e.g. "es", "en"). Empty string = auto-detect.</summary>
    public string Language { get; set; } = "es";
}
