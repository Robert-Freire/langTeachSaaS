using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public record CurriculumWarning(
    int SessionIndex,
    string GrammarFocus,
    string FlagReason,
    string? SuggestedLevel
);

public record DismissWarningRequest([MaxLength(500)] string WarningKey);
