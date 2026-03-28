namespace LangTeach.Api.AI;

public record SectionProfile(
    string SectionType,
    Dictionary<string, SectionLevelProfile> Levels
);

public record SectionLevelProfile(
    string[] ContentTypes,
    string Guidance,
    DurationRange? Duration,
    string[] Competencies,
    string Scaffolding,
    string InteractionPattern,
    string[]? ValidExerciseTypes = null,
    ForbiddenExerciseType[]? ForbiddenExerciseTypes = null,
    LevelSpecificNote[]? LevelSpecificNotes = null,
    int? MinExerciseVariety = null
);

public record DurationRange(int Min, int Max);

public record ForbiddenExerciseType(string? Id, string? Pattern, string Reason);

public record LevelSpecificNote(string ExerciseTypeId, string Note);
