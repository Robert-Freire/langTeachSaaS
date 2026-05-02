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
        // Suppress student name when only scheduling a new session (avoids spurious newStudent proposals in tests).
        var suppressName = text.Contains("[schedule-new-session]") || text.Contains("[schedule-new-session-no-date]");
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
            ShortTermObjectives: [new ExtractedObjectiveDto("[Extracted] Pass B2 exam", "2026-06-30")],
            Difficulties: [new ExtractedDifficultyDto("[Extracted] Subjunctive usage", "Grammar", "subjunctive")],
            TeachingTodoTexts: ["[Extracted] Send subjunctive exercises"],
            Interests: ["[Extracted] Travel", "[Extracted] Cooking"]
        ));
    }
}
