using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public class StubStudentProfileExtractionService : IStudentProfileExtractionService
{
    private readonly ILogger<StubStudentProfileExtractionService> _logger;

    public StubStudentProfileExtractionService(ILogger<StubStudentProfileExtractionService> logger)
    {
        _logger = logger;
    }

    public Task<ExtractedStudentProfileDto> ExtractAsync(string text, CancellationToken ct = default)
    {
        _logger.LogInformation("StubStudentProfileExtractionService.ExtractAsync called with {Length} chars", text.Length);
        var suppressName = text.Contains("[schedule-new-session]") || text.Contains("[schedule-new-session-no-date]");
        var newStudentIntent = text.Contains("[new-student-intent]");
        var hasInterests = text.Contains("[has-interests]");
        var hasDifficulties = text.Contains("[has-difficulties]");
        var hasLearningGoals = text.Contains("[has-learning-goals]");
        var hasTeachingNotes = text.Contains("[has-teaching-notes]");

        return Task.FromResult(new ExtractedStudentProfileDto(
            Name: suppressName ? null : "[Extracted] María García",
            BirthYear: 1990,
            Profession: "[Extracted] Engineer",
            CountryOfResidence: "[Extracted] Spain",
            CityOfResidence: "[Extracted] Madrid",
            ReasonForStudying: "[Extracted] Work promotion",
            NativeLanguages: ["Spanish"],
            SpokenLanguages: ["English"],
            LearningLanguage: "[Extracted] English",
            CefrLevel: "B2",
            OfficialCefrLevel: null,
            ShortTermObjectives: hasLearningGoals
                ? [new ExtractedObjectiveDto("[Extracted] Presentaciones en español", null)]
                : [new ExtractedObjectiveDto("[Extracted] Pass B2 exam", "2026-06-30")],
            Difficulties: hasDifficulties
                ? [new ExtractedDifficultyDto("[Extracted] Indefinido vs perfecto", "Grammar", "past tense")]
                : [new ExtractedDifficultyDto("[Extracted] Subjunctive usage", "Grammar", "subjunctive")],
            TeachingTodoTexts: ["[Extracted] Send subjunctive exercises"],
            Interests: hasInterests
                ? ["[Extracted] Flamenco", "[Extracted] Cine de Almodóvar"]
                : ["[Extracted] Travel", "[Extracted] Cooking"],
            NewStudentIntent: newStudentIntent,
            TeachingNotes: hasTeachingNotes ? "[Extracted] Aprende bien a través de la música" : null,
            SkillLevelReading: ParseSkillMarker(text, "reading"),
            SkillLevelWriting: ParseSkillMarker(text, "writing"),
            SkillLevelSpeaking: ParseSkillMarker(text, "speaking"),
            SkillLevelListening: ParseSkillMarker(text, "listening")
        ));
    }

    private static string? ParseSkillMarker(string text, string key)
    {
        var marker = $"[skill-{key}=";
        var idx = text.IndexOf(marker, StringComparison.Ordinal);
        if (idx < 0) return null;
        var start = idx + marker.Length;
        var end = text.IndexOf(']', start);
        if (end < 0) return null;
        var value = text.Substring(start, end - start).Trim();
        return string.IsNullOrEmpty(value) ? null : value;
    }
}
