using System.Text.Json;
using LangTeach.Api.AI;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public class CurriculumGenerationService : ICurriculumGenerationService
{
    private readonly IClaudeClient _claude;
    private readonly IPromptService _prompts;
    private readonly ICurriculumTemplateService _templateService;
    private readonly ILogger<CurriculumGenerationService> _logger;

    public CurriculumGenerationService(
        IClaudeClient claude,
        IPromptService prompts,
        ICurriculumTemplateService templateService,
        ILogger<CurriculumGenerationService> logger)
    {
        _claude = claude;
        _prompts = prompts;
        _templateService = templateService;
        _logger = logger;
    }

    public async Task<List<CurriculumEntry>> GenerateAsync(CurriculumContext ctx, CancellationToken ct = default)
    {
        if (ctx.TemplateLevel is not null)
        {
            var template = _templateService.GetByLevel(ctx.TemplateLevel)
                ?? throw new CurriculumGenerationException($"Template '{ctx.TemplateLevel}' not found.");

            var skeletons = template.Units.Select((u, i) => new CurriculumEntry
            {
                Id = Guid.NewGuid(),
                OrderIndex = i + 1,
                Topic = u.CommunicativeFunctions.Count > 0
                    ? $"{u.Title}: {string.Join(", ", u.CommunicativeFunctions.Take(2))}"
                    : u.Title,
                GrammarFocus = u.Grammar.Count > 0 ? string.Join(", ", u.Grammar) : null,
                Competencies = u.CompetencyFocus.Count > 0
                    ? string.Join(",", u.CompetencyFocus.Select(CefrCodeToSkill).Distinct())
                    : "reading,writing,listening,speaking",
                CompetencyFocus = u.CompetencyFocus.Count > 0
                    ? string.Join(",", u.CompetencyFocus)
                    : null,
                TemplateUnitRef = u.Title,
                LessonType = "Communicative",
                Status = "planned"
            }).ToList();

            if (ctx.StudentName is not null)
            {
                var templateUnits = template.Units
                    .Select((u, i) => new TemplateUnitContext(
                        i + 1,
                        u.Title,
                        u.Grammar.Count > 0 ? string.Join(", ", u.Grammar) : null,
                        u.CompetencyFocus))
                    .ToList();

                var personalizationCtx = ctx with { TemplateUnits = templateUnits };
                var request = _prompts.BuildCurriculumPrompt(personalizationCtx);
                var response = await _claude.CompleteAsync(request, ct);
                ApplyPersonalizedTopics(skeletons, response.Content);
            }

            return skeletons;
        }

        // Free AI generation path
        var aiRequest = _prompts.BuildCurriculumPrompt(ctx);
        var aiResponse = await _claude.CompleteAsync(aiRequest, ct);

        List<AiEntryDto>? aiEntries;
        try
        {
            aiEntries = JsonSerializer.Deserialize<List<AiEntryDto>>(
                aiResponse.Content.Trim(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (JsonException ex)
        {
            var excerpt = aiResponse.Content.Length > 200 ? aiResponse.Content[..200] + "..." : aiResponse.Content;
            _logger.LogError(ex, "Failed to parse curriculum JSON from AI. ContentLength={Length} Excerpt={Excerpt}",
                aiResponse.Content.Length, excerpt);
            throw new CurriculumGenerationException("AI returned invalid JSON for the curriculum.", ex);
        }

        if (aiEntries is null || aiEntries.Count == 0)
            throw new CurriculumGenerationException("AI returned an empty curriculum.");

        return aiEntries.Select((e, i) => new CurriculumEntry
        {
            Id = Guid.NewGuid(),
            OrderIndex = i + 1,
            Topic = e.Topic ?? $"Session {i + 1}",
            GrammarFocus = e.GrammarFocus,
            Competencies = e.Competencies is { Count: > 0 }
                ? string.Join(",", e.Competencies)
                : string.Empty,
            LessonType = e.LessonType,
            Status = "planned"
        }).ToList();
    }

    private void ApplyPersonalizedTopics(List<CurriculumEntry> skeletons, string aiContent)
    {
        List<PersonalizationDto>? personalizedTopics;
        try
        {
            personalizedTopics = JsonSerializer.Deserialize<List<PersonalizationDto>>(
                aiContent.Trim(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse personalization JSON; keeping original template topics.");
            return;
        }

        if (personalizedTopics is null || personalizedTopics.Count == 0)
        {
            _logger.LogWarning("AI returned empty personalization response; keeping original template topics.");
            return;
        }

        var topicByOrder = personalizedTopics
            .Where(p => !string.IsNullOrWhiteSpace(p.Topic))
            .ToDictionary(p => p.OrderIndex, p => p.Topic!);

        foreach (var skeleton in skeletons)
        {
            if (topicByOrder.TryGetValue(skeleton.OrderIndex, out var personalizedTopic))
                skeleton.Topic = personalizedTopic;
            // If not matched, keep the original template topic (graceful degradation)
        }
    }

    private static string CefrCodeToSkill(string code) => CefrSkillCodes.ToSkillName(code);

    private record AiEntryDto(
        int OrderIndex,
        string? Topic,
        string? GrammarFocus,
        List<string>? Competencies,
        string? LessonType
    );

    private record PersonalizationDto(
        int OrderIndex,
        string? Topic
    );
}

public class CurriculumGenerationException : Exception
{
    public CurriculumGenerationException(string message) : base(message) { }
    public CurriculumGenerationException(string message, Exception inner) : base(message, inner) { }
}
