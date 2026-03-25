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
    private readonly ISessionMappingService _sessionMapping;
    private readonly ILogger<CurriculumGenerationService> _logger;

    public CurriculumGenerationService(
        IClaudeClient claude,
        IPromptService prompts,
        ICurriculumTemplateService templateService,
        ISessionMappingService sessionMapping,
        ILogger<CurriculumGenerationService> logger)
    {
        _claude = claude;
        _prompts = prompts;
        _templateService = templateService;
        _sessionMapping = sessionMapping;
        _logger = logger;
    }

    public async Task<List<CurriculumEntry>> GenerateAsync(CurriculumContext ctx, CancellationToken ct = default)
    {
        if (ctx.TemplateLevel is not null)
        {
            var template = _templateService.GetByLevel(ctx.TemplateLevel)
                ?? throw new CurriculumGenerationException($"Template '{ctx.TemplateLevel}' not found.");

            var mapping = _sessionMapping.Compute(template.Units, ctx.SessionCount);

            // Build one skeleton entry per session (not per unit), using the mapping result.
            // For expand: multiple sessions per unit with sub-focus labels.
            // For compress: only the first N units are included.
            // For exact: 1:1, same as previous behaviour.
            var unitByTitle = template.Units.ToDictionary(u => u.Title, StringComparer.OrdinalIgnoreCase);

            var skeletons = mapping.Sessions.Select(s =>
            {
                unitByTitle.TryGetValue(s.UnitRef, out var unit);
                var competencyFocus = unit?.CompetencyFocus ?? [];
                var vocabularyThemes = unit?.VocabularyThemes ?? [];
                return new CurriculumEntry
                {
                    Id = Guid.NewGuid(),
                    OrderIndex = s.SessionIndex,
                    Topic = s.SubFocus,
                    GrammarFocus = s.GrammarFocus,
                    Competencies = competencyFocus.Count > 0
                        ? string.Join(",", competencyFocus.Select(CefrCodeToSkill).Distinct())
                        : "reading,writing,listening,speaking",
                    CompetencyFocus = competencyFocus.Count > 0
                        ? string.Join(",", competencyFocus)
                        : null,
                    TemplateUnitRef = s.UnitRef,
                    VocabularyThemes = vocabularyThemes.Count > 0 ? string.Join(",", vocabularyThemes) : null,
                    LessonType = "Communicative",
                    Status = "planned"
                };
            }).ToList();

            if (ctx.StudentName is not null)
            {
                var templateUnits = skeletons
                    .Select(e => new TemplateUnitContext(
                        e.OrderIndex,
                        e.Topic,
                        e.GrammarFocus,
                        string.IsNullOrEmpty(e.CompetencyFocus)
                            ? []
                            : e.CompetencyFocus.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList()))
                    .ToList();

                var personalizationCtx = ctx with { TemplateUnits = templateUnits };
                try
                {
                    var request = _prompts.BuildCurriculumPrompt(personalizationCtx);
                    var response = await _claude.CompleteAsync(request, ct);
                    ApplyPersonalization(skeletons, response.Content);
                }
                catch (OperationCanceledException) when (ct.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Curriculum personalization failed for template-based curriculum; returning base template.");
                }
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

        var freeEntries = aiEntries.Select((e, i) => new CurriculumEntry
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

        if (ctx.StudentName is not null)
        {
            var templateUnits = freeEntries
                .Select(e => new TemplateUnitContext(
                    e.OrderIndex,
                    e.Topic,
                    e.GrammarFocus,
                    string.IsNullOrEmpty(e.Competencies)
                        ? []
                        : e.Competencies.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList()))
                .ToList();

            var personalizationCtx = ctx with { TemplateUnits = templateUnits };
            try
            {
                var personalizationRequest = _prompts.BuildCurriculumPrompt(personalizationCtx);
                var personalizationResponse = await _claude.CompleteAsync(personalizationRequest, ct);
                ApplyPersonalization(freeEntries, personalizationResponse.Content);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Curriculum personalization failed for free-generated curriculum; returning base curriculum.");
            }
        }

        return freeEntries;
    }

    private void ApplyPersonalization(List<CurriculumEntry> skeletons, string aiContent)
    {
        List<PersonalizationDto>? personalization;
        try
        {
            personalization = JsonSerializer.Deserialize<List<PersonalizationDto>>(
                aiContent.Trim(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse personalization JSON; keeping original topics.");
            return;
        }

        if (personalization is null || personalization.Count == 0)
        {
            _logger.LogWarning("AI returned empty personalization response; keeping original topics.");
            return;
        }

        var byOrder = new Dictionary<int, PersonalizationDto>();
        foreach (var p in personalization)
        {
            if (p.OrderIndex <= 0 || !byOrder.TryAdd(p.OrderIndex, p))
            {
                _logger.LogWarning(
                    "Ignoring personalization item with invalid or duplicate OrderIndex={OrderIndex}.",
                    p.OrderIndex);
            }
        }

        foreach (var skeleton in skeletons)
        {
            if (!byOrder.TryGetValue(skeleton.OrderIndex, out var p))
                continue;

            if (!string.IsNullOrWhiteSpace(p.Topic))
                skeleton.Topic = p.Topic!;
            if (!string.IsNullOrWhiteSpace(p.ContextDescription))
                skeleton.ContextDescription = p.ContextDescription;
            if (!string.IsNullOrWhiteSpace(p.PersonalizationNotes))
                skeleton.PersonalizationNotes = p.PersonalizationNotes;
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
        string? Topic,
        string? ContextDescription,
        string? PersonalizationNotes
    );
}

public class CurriculumGenerationException : Exception
{
    public CurriculumGenerationException(string message) : base(message) { }
    public CurriculumGenerationException(string message, Exception inner) : base(message, inner) { }
}
