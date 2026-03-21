using System.Text.Json;
using LangTeach.Api.AI;
using LangTeach.Api.Data.Models;

namespace LangTeach.Api.Services;

public class CurriculumGenerationService : ICurriculumGenerationService
{
    private readonly IClaudeClient _claude;
    private readonly IPromptService _prompts;
    private readonly ILogger<CurriculumGenerationService> _logger;

    public CurriculumGenerationService(
        IClaudeClient claude,
        IPromptService prompts,
        ILogger<CurriculumGenerationService> logger)
    {
        _claude = claude;
        _prompts = prompts;
        _logger = logger;
    }

    public async Task<List<CurriculumEntry>> GenerateAsync(CurriculumContext ctx, CancellationToken ct = default)
    {
        var request = _prompts.BuildCurriculumPrompt(ctx);
        var response = await _claude.CompleteAsync(request, ct);

        List<AiEntryDto>? aiEntries;
        try
        {
            aiEntries = JsonSerializer.Deserialize<List<AiEntryDto>>(
                response.Content.Trim(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse curriculum JSON from AI. Content={Content}", response.Content);
            throw new CurriculumGenerationException("AI returned invalid JSON for the curriculum.", ex);
        }

        if (aiEntries is null || aiEntries.Count == 0)
            throw new CurriculumGenerationException("AI returned an empty curriculum.");

        return aiEntries.Select((e, i) => new CurriculumEntry
        {
            Id = Guid.NewGuid(),
            OrderIndex = e.OrderIndex > 0 ? e.OrderIndex : i + 1,
            Topic = e.Topic ?? $"Session {i + 1}",
            GrammarFocus = e.GrammarFocus,
            Competencies = e.Competencies is { Count: > 0 }
                ? string.Join(",", e.Competencies)
                : string.Empty,
            LessonType = e.LessonType,
            Status = "planned"
        }).ToList();
    }

    private record AiEntryDto(
        int OrderIndex,
        string? Topic,
        string? GrammarFocus,
        List<string>? Competencies,
        string? LessonType
    );
}

public class CurriculumGenerationException : Exception
{
    public CurriculumGenerationException(string message) : base(message) { }
    public CurriculumGenerationException(string message, Exception inner) : base(message, inner) { }
}
