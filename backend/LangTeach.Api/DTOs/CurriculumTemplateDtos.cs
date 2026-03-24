namespace LangTeach.Api.DTOs;

public record CurriculumTemplateSummary(
    string Level,
    string CefrLevel,
    int UnitCount,
    IReadOnlyList<string> SampleGrammar
);

public record CurriculumTemplateData(
    string Level,
    string CefrLevel,
    IReadOnlyList<CurriculumTemplateUnit> Units
);

public record CurriculumTemplateUnit(
    int UnitNumber,
    string Title,
    string OverallGoal,
    IReadOnlyList<string> Grammar,
    IReadOnlyList<string> VocabularyThemes,
    IReadOnlyList<string> CommunicativeFunctions,
    IReadOnlyList<string> CompetencyFocus
);
