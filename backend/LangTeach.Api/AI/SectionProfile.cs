namespace LangTeach.Api.AI;

public record SectionProfile(
    string SectionType,
    string[] HardConstraints,
    Dictionary<string, SectionLevelProfile> Levels
);

public record SectionLevelProfile(
    string[] ContentTypes,
    string Guidance,
    DurationRange? Duration,
    string[] Competencies,
    string Scaffolding,
    string InteractionPattern
);

public record DurationRange(int Min, int Max);
