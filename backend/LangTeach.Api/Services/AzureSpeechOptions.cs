using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.Services;

public class AzureSpeechOptions
{
    public const string SectionName = "AzureSpeech";

    [Required]
    public string ApiKey { get; set; } = string.Empty;

    [Required]
    public string Region { get; set; } = string.Empty;

    /// <summary>
    /// BCP-47 language code for transcription. Defaults to es-ES (Spanish Spain).
    /// Azure Speech real-time REST supports audio up to 60 seconds.
    /// For longer recordings the teacher should record in shorter segments.
    /// </summary>
    public string Language { get; set; } = "es-ES";
}
