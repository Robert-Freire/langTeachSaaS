namespace LangTeach.Api.DTOs;

public record UsageStatusDto(
    int UsedThisMonth,
    int MonthlyLimit,
    string Tier,
    DateTime ResetsAt
);
