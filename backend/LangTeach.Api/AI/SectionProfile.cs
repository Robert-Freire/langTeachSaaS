namespace LangTeach.Api.AI;

public record SectionProfile(
    string SectionType,
    Dictionary<string, SectionLevelProfile> Levels,
    string? WeaknessTargetingGuidance = null
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
    int? MinExerciseVariety = null,
    string? Scope = null
);

public record DurationRange(int Min, int Max);

/// <summary>
/// Exactly one of <see cref="Id"/> or <see cref="Pattern"/> must be non-null.
/// Use <see cref="Id"/> for an exact exercise type ID match (e.g. "GR-01").
/// Use <see cref="Pattern"/> for a trailing-wildcard glob match (e.g. "GR-*" forbids all GR-xx IDs).
/// </summary>
public record ForbiddenExerciseType(string? Id, string? Pattern, string Reason);

public record LevelSpecificNote(string ExerciseTypeId, string Note);
