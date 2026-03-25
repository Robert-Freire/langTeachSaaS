namespace LangTeach.Api.DTOs;

public record CurriculumWarning(
    int SessionIndex,
    string GrammarFocus,
    string FlagReason,
    string? SuggestedLevel
);

public record DismissWarningRequest(string WarningKey);
