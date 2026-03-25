namespace LangTeach.Api.DTOs;

public record SessionMappingEntry(
    int SessionIndex,
    string UnitRef,
    string SubFocus,
    string Rationale,
    string? GrammarFocus
);

public record SessionMappingResult(
    string Strategy,
    int SessionCount,
    int UnitCount,
    List<SessionMappingEntry> Sessions,
    List<string> ExcludedUnits
);
